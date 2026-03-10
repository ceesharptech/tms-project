# DDITS — Development Progress Tracker

> **Project:** Digital Driver Identification and Traffic Offence Penalty System
> **Last Updated:** 2026-03-10
> **Developer:** Solo (Final Year University Project)

---

## Current Phase

**Phase 8 — Strike Engine & Offence Issuance Workflow**

**Status:** COMPLETE ✅

---

## Current Tasks

All tasks complete. See completed section below.

---

## Blockers

- None currently identified

---

## Completed

### Phase 8 — Strike Engine & Offence Issuance Workflow

**Database (Supabase RPC / Stored Procedure)**

- [x] Created `supabase/migrations/004_issue_offence_rpc.sql` — `issue_offence_transaction(p_driver_id, p_officer_id, p_offence_type_id, p_notes)` PostgreSQL function; all 8 steps execute atomically: lock-fetch driver, fetch & validate offence type (must be active), calculate new strike count, find matching penalty rule (`BETWEEN min_strikes AND max_strikes`), calculate final fine (`base_fine × multiplier`), insert offence record, update driver (`strike_count`, `status`, `updated_at`), insert audit log (`OFFENCE_ISSUED`) — if ANY step fails the entire transaction rolls back via `RAISE`; returns complete JSONB result with `offence`, `driver`, `calculation` keys
- [x] Applied migration via MCP server — function confirmed live (`pronargs=4`)

**Backend**

- [x] Created `backend/routes/offences.js`:
  - `POST /api/offences/calculate-penalty` (officer + admin) — preview penalty without saving: fetches driver strike count + offence type details, queries penalty rules, returns `base_fine`, `multiplier`, `final_fine`, `current_strikes`, `strike_delta`, `new_strikes`, `current_status`, `new_status`, `tier_changed`
  - `POST /api/offences/issue` (officer + admin) — calls `issue_offence_transaction()` RPC; `officer_id` taken from JWT (never client); structured error mapping for `DRIVER_NOT_FOUND`, `OFFENCE_TYPE_INACTIVE`, `NO_PENALTY_RULE`, `TRANSACTION_FAILED`; UUID format validation; notes max 500 chars; returns 201 with full receipt data including officer info
  - `GET /api/offences` (officer + admin) — list offences with joined driver/officer/offence-type names; officers see only their own; supports `driver_id` filter for DriverProfile offence history
- [x] Updated `backend/server.js` — uncommented and activated `/api/offences` route

**Frontend Components**

- [x] Created `frontend/src/components/StepIndicator.jsx` — horizontal 4-step progress bar; completed steps show green checkmark; current step shows blue ring; responsive (stacks on mobile with label only for active step)
- [x] Created `frontend/src/components/PenaltyCalculation.jsx` — displays full penalty breakdown: strike weight, strike count change (X→Y with arrow), base fine, multiplier, total fine (large bold); status badges showing previous→new status; skeleton loader during fetch; warning banners for `Flagged` and `Suspended` escalations; colour-coded status changes

**Frontend Pages**

- [x] Created `frontend/src/pages/officer/IssueOffence.jsx` — 4-step wizard:
  - **Step 1 — Identify Driver**: reuses `DriverSearchBar`; lists search results with name/licence/plate/status/strikes; select driver shows summary card with photo, status badge, strike count; "Change Driver" button; accepts pre-populated driver from navigation state (from `IdentificationResult` / `DriverProfile`) and auto-skips to Step 2
  - **Step 2 — Select Offence**: fetches active offence types; searchable + filterable by severity; card grid with name/description/base-fine/strike-weight/severity badge; selected card highlighted with blue border + checkmark
  - **Step 3 — Review**: auto-calls `POST /api/offences/calculate-penalty` on load; shows offence summary card (blue), driver status card, full `PenaltyCalculation` component, optional notes textarea (max 500 chars); escalation confirmation modal appears if new status ∈ {Flagged, Suspended} before submitting
  - **Step 4 — Confirm**: success screen with green checkmark; offence receipt table (reference ID, date/time, driver, offence, fine, strikes added, new total strikes, new status badge, issuing officer); buttons: "View Driver Profile", "Issue Another Offence", "Return to Dashboard"
  - Cancel button at top prompts confirmation dialog before discarding progress

**Integration Updates**

- [x] Updated `frontend/src/components/IdentificationResult.jsx` — "Issue Offence" button now calls `onIssueOffence(driver.id, driver)` passing full driver object
- [x] Updated `frontend/src/pages/officer/IdentifyDriver.jsx` — `handleIssueOffence(driverId, driverObj)` navigates to `/dashboard/officer/issue-offence` with `{ state: { driver } }` so wizard opens at Step 2 (driver pre-selected)
- [x] Updated `frontend/src/pages/DriverProfile.jsx` — added amber "Issue Offence to This Driver" button visible to both officers and admins; navigates to wizard with full driver object in navigation state (skips Step 1)
- [x] Updated `frontend/src/components/Navigation.jsx` — added `TicketIcon` SVG; added "Issue Offence" as first item in `OFFICER_NAV` (enabled); added "Issue Offence" to `ADMIN_NAV` (enabled); route: `/dashboard/officer/issue-offence`
- [x] Updated `frontend/src/App.jsx` — imported `IssueOffence`; added route `officer/issue-offence` inside protected dashboard shell (accessible to both officer and admin)
- [x] Frontend production build: ✓ 124 modules, 0 errors, 0 warnings

**Transaction Atomicity**

- RPC function uses `FOR UPDATE` to lock the driver row during the transaction
- `RAISE` on any error causes PostgreSQL to automatically roll back all changes
- No partial updates possible: offence record and driver update always succeed or both roll back
- Audit log is part of the same transaction — always consistent

**Files Created / Affected — Phase 8**

| File                                               | Action                         |
| -------------------------------------------------- | ------------------------------ |
| `supabase/migrations/004_issue_offence_rpc.sql`    | Created                        |
| `backend/routes/offences.js`                       | Created                        |
| `backend/server.js`                                | Modified (route enabled)       |
| `frontend/src/components/StepIndicator.jsx`        | Created                        |
| `frontend/src/components/PenaltyCalculation.jsx`   | Created                        |
| `frontend/src/pages/officer/IssueOffence.jsx`      | Created                        |
| `frontend/src/components/IdentificationResult.jsx` | Modified (pass driver object)  |
| `frontend/src/pages/officer/IdentifyDriver.jsx`    | Modified (navigate with state) |
| `frontend/src/pages/DriverProfile.jsx`             | Modified (Issue Offence btn)   |
| `frontend/src/components/Navigation.jsx`           | Modified (Issue Offence link)  |
| `frontend/src/App.jsx`                             | Modified (new route)           |

### Phase 7 — Offence Types & Penalty Rules Management

**Backend**

- [x] Created `backend/routes/offenceTypes.js` — `GET /api/offence-types` (officer + admin), `POST` (admin, with duplicate name check), `PUT /:id` (admin), `DELETE /:id` (admin — soft toggle via `is_active`); full field validation on all write endpoints
- [x] Created `backend/routes/penaltyRules.js` — `GET /api/penalty-rules` (officer + admin), `POST` (admin, overlap detection), `PUT /:id` (admin, overlap detection excluding self), `DELETE /:id` (admin — hard delete); strike range and multiplier validation
- [x] Updated `backend/server.js` — uncommented and activated `/api/offence-types` and `/api/penalty-rules` routes

**Frontend Utilities**

- [x] Created `frontend/src/utils/formatters.js` — `formatCurrency(amount)` (₦X,XXX), `formatMultiplier(value)` (X.X×), `formatStrikeRange(min, max)` ("6+" for 9999), `getSeverityClasses(severity)`, `getTierClasses(tierIndex)`
- [x] Created `frontend/src/utils/penaltyValidation.js` — `checkRangeOverlap(newRule, existingRules, excludeId)`, `checkRangeGaps(allRules)`, `validateStrikeRange(min, max)`

**Frontend Components**

- [x] Created `frontend/src/components/SeverityBadge.jsx` — pill badge: Minor=blue, Moderate=yellow, Severe=red; `size` prop (sm/md/lg)
- [x] Created `frontend/src/components/OffenceTypeModal.jsx` — create/edit modal; fields: name, description, base fine (₦), strike weight (1–5), severity; formatted fine preview; duplicate name error handling
- [x] Created `frontend/src/components/PenaltyRuleModal.jsx` — create/edit modal; fields: min/max strikes, multiplier (1.0–5.0×), status flag; live overlap warning banner; live example calculation preview

**Frontend Pages — Admin**

- [x] Created `frontend/src/pages/admin/OffenceTypes.jsx` — sortable table (severity/name/fine/strikes); search + status/severity filters; enable/disable confirmation dialog; loading skeletons; active count badge
- [x] Created `frontend/src/pages/admin/PenaltyRules.jsx` — colour-coded tier cards (Tier 1=green, Tier 2=yellow, Tier 3+=red); gap detection warning banner; delete confirmation with hard-delete warning

**Frontend Pages — Officer (Read-Only)**

- [x] Created `frontend/src/pages/officer/OffenceTypesView.jsx` — active-only list; search + severity filter; sortable columns; no edit/create/disable actions
- [x] Created `frontend/src/pages/officer/PenaltyRulesView.jsx` — tier cards with example fine calculation; reference-only, no edit/delete actions

**Navigation & Routing**

- [x] Updated `frontend/src/components/Navigation.jsx` — added "Offence Types" and "Penalty Rules" to both `ADMIN_NAV` and `OFFICER_NAV` (enabled, not "Soon")
- [x] Updated `frontend/src/App.jsx` — added routes `/dashboard/admin/offence-types`, `/dashboard/admin/penalty-rules` (admin-protected), `/dashboard/officer/offence-types`, `/dashboard/officer/penalty-rules`
- [x] Frontend production build: ✓ 121 modules, 0 errors, 0 warnings

**Files Created / Affected — Phase 7**

| File                                              | Action                    |
| ------------------------------------------------- | ------------------------- |
| `backend/routes/offenceTypes.js`                  | Created                   |
| `backend/routes/penaltyRules.js`                  | Created                   |
| `backend/server.js`                               | Modified (routes enabled) |
| `frontend/src/utils/formatters.js`                | Created                   |
| `frontend/src/utils/penaltyValidation.js`         | Created                   |
| `frontend/src/components/SeverityBadge.jsx`       | Created                   |
| `frontend/src/components/OffenceTypeModal.jsx`    | Created                   |
| `frontend/src/components/PenaltyRuleModal.jsx`    | Created                   |
| `frontend/src/pages/admin/OffenceTypes.jsx`       | Created                   |
| `frontend/src/pages/admin/PenaltyRules.jsx`       | Created                   |
| `frontend/src/pages/officer/OffenceTypesView.jsx` | Created                   |
| `frontend/src/pages/officer/PenaltyRulesView.jsx` | Created                   |
| `frontend/src/components/Navigation.jsx`          | Modified                  |
| `frontend/src/App.jsx`                            | Modified                  |

### Phase 0 — Project Scaffolding

- [x] Created `frontend/` — React 18 + Vite (port 5173)
- [x] Created `backend/` — Express.js (port 5000)
- [x] Created `face-service/` — FastAPI Python (port 8000)
- [x] Health check endpoint at `GET /health` (backend)
- [x] Health check endpoint at `GET /health` (face-service)
- [x] `.env.example` files for all three services
- [x] `.env` files populated with real credentials (not committed)
- [x] `.gitignore` updated
- [x] `README.md` created with setup instructions

**Files Created / Affected — Phase 0**

| File                                 | Action             |
| ------------------------------------ | ------------------ |
| `frontend/vite.config.js`            | Created + modified |
| `frontend/src/App.jsx`               | Created            |
| `frontend/src/main.jsx`              | Created            |
| `frontend/.env.example`              | Created            |
| `frontend/package.json`              | Created            |
| `backend/server.js`                  | Created + modified |
| `backend/services/supabase.js`       | Created + modified |
| `backend/middleware/auth.js`         | Created + modified |
| `backend/middleware/roleCheck.js`    | Created + modified |
| `backend/middleware/errorHandler.js` | Created + modified |
| `backend/services/faceService.js`    | Created + modified |
| `backend/services/strikeEngine.js`   | Created + modified |
| `backend/.env.example`               | Created            |
| `backend/package.json`               | Created            |
| `face-service/main.py`               | Created            |
| `face-service/requirements.txt`      | Created            |
| `face-service/.env.example`          | Created            |
| `.gitignore`                         | Modified           |
| `README.md`                          | Created            |

---

### Mini Task — Driver Profile Picture Feature

- [x] Applied Supabase migration `003_add_profile_picture_url_to_drivers.sql` — added `profile_picture_url TEXT NULL DEFAULT NULL` to `drivers` table (executed via MCP server)
- [x] Added `SUPABASE_STORAGE_BUCKET=driver-profiles` to `backend/.env`; added placeholder to `backend/.env.example`
- [x] Created `backend/services/storageService.js` — `uploadProfilePicture(driverId, buffer, mimetype)` generates unique filename (`profile_{id}_{ts}.ext`), uploads to bucket, returns `getPublicUrl()` result; `deleteProfilePicture(publicUrl)` extracts path from URL and removes silently (non-fatal)
- [x] Updated `POST /api/drivers` — added `uploadProfilePic.single("profile_picture")` multer middleware (max 2 MB, JPG/PNG only, inline error handling for `LIMIT_FILE_SIZE` / `INVALID_FILE_TYPE`); uploads picture post-insert, saves URL; non-fatal if upload fails (driver still created)
- [x] Updated `PUT /api/drivers/:id` — same multer middleware; supports text-only, picture-only, or combined updates; deletes old picture from storage before uploading new one
- [x] Updated `POST /api/drivers/identify` — matched driver query now includes `profile_picture_url` so the identification result carries the URL
- [x] Updated `frontend/src/pages/admin/DriverRegistration.jsx` — added profile picture state, client-side 2 MB + type validation, thumbnail preview with remove button, dashed-border file picker; form submission switched from JSON to `FormData`
- [x] Updated `frontend/src/components/DriverEditModal.jsx` — shows current picture, dashed upload button, new preview before save; submits as `FormData` when file selected, plain JSON otherwise
- [x] Updated `frontend/src/components/IdentificationResult.jsx` — match card shows 96×96 px profile image left of driver name; `onError` fallback to user-icon placeholder with "No photo" text
- [x] Updated `frontend/src/pages/DriverProfile.jsx` — Section 1 shows 128×128 px profile picture prominently left of driver details; `onError` fallback placeholder; admin "Update Photo" link below picture opens edit modal
- [x] Updated `frontend/src/pages/DriverList.jsx` — new `DriverAvatar` component (36×36 px circular picture or coloured initials, hue from driver UUID); first avatar column added to table
- [x] Frontend production build: ✓ 112 modules, 0 errors, 0 warnings

**Supabase Storage API methods used:**

- `supabase.storage.from(bucket).upload(filename, buffer, { contentType, upsert: false })`
- `supabase.storage.from(bucket).getPublicUrl(filename)` → `data.publicUrl` (permanent, no expiry)
- `supabase.storage.from(bucket).remove([filename])`

**Files Created / Affected — Mini Task**

| File                                                             | Action                                     |
| ---------------------------------------------------------------- | ------------------------------------------ |
| `supabase/migrations/003_add_profile_picture_url_to_drivers.sql` | Created                                    |
| `backend/.env`                                                   | Modified (added `SUPABASE_STORAGE_BUCKET`) |
| `backend/.env.example`                                           | Modified (added placeholder)               |
| `backend/services/storageService.js`                             | Created                                    |
| `backend/routes/drivers.js`                                      | Modified (POST, PUT, identify)             |
| `frontend/src/pages/admin/DriverRegistration.jsx`                | Modified                                   |
| `frontend/src/components/DriverEditModal.jsx`                    | Modified                                   |
| `frontend/src/components/IdentificationResult.jsx`               | Modified                                   |
| `frontend/src/pages/DriverProfile.jsx`                           | Modified                                   |
| `frontend/src/pages/DriverList.jsx`                              | Modified                                   |
| `PROGRESS.md`                                                    | Updated                                    |

---

### Phase 6 — Facial Identification UI

- [x] Created `frontend/src/pages/officer/OfficerDashboard.jsx` — officer landing page with quick-action cards (Identify Driver, View Drivers, Issue Offence)
- [x] Created `frontend/src/components/FaceCapture.jsx` — live webcam capture via `getUserMedia` + still-image fallback upload
- [x] Created `frontend/src/components/FacePhotoGuidelines.jsx` — photo capture tips checklist shown before scanning
- [x] Created `frontend/src/pages/officer/IdentifyDriver.jsx` — full identification flow: guidelines → capture → loading → result
- [x] Created `frontend/src/components/IdentificationResult.jsx` — match / no-match / error result card with driver details + confidence score
- [x] Created `frontend/src/services/faceRecognitionService.js` — `identifyDriver(imageBlob)` via `POST /api/drivers/identify` (multipart)
- [x] Updated `frontend/src/components/Navigation.jsx` — added "Identify Driver" nav item for officer role
- [x] Updated `frontend/src/App.jsx` — added `/dashboard/officer/identify` route
- [x] **Bug Fix**: `face-service/models/face_identification.py` — fixed `TypeError: float() argument must be a string or a real number, not 'dict'`; stored embeddings are nested `{"data": [...512 floats...]}` dict — added extraction of flat array before cosine distance computation
- [x] End-to-end identification flow confirmed working with enrolled driver Chinedu Okafor

**Files Created / Affected — Phase 6**

| File                                               | Action                            |
| -------------------------------------------------- | --------------------------------- |
| `frontend/src/pages/officer/OfficerDashboard.jsx`  | Created                           |
| `frontend/src/pages/officer/IdentifyDriver.jsx`    | Created                           |
| `frontend/src/components/FaceCapture.jsx`          | Created                           |
| `frontend/src/components/FacePhotoGuidelines.jsx`  | Created                           |
| `frontend/src/components/IdentificationResult.jsx` | Created                           |
| `frontend/src/services/faceRecognitionService.js`  | Created                           |
| `frontend/src/components/Navigation.jsx`           | Modified (officer nav item)       |
| `frontend/src/App.jsx`                             | Modified (officer/identify route) |
| `face-service/models/face_identification.py`       | Modified (embedding bug fix)      |
| `PROGRESS.md`                                      | Updated                           |

---

### Phase 5 — Driver Management Frontend

- [x] Created `frontend/src/components/Toast.jsx` — `ToastProvider` context + `useToast` hook; success/error/info toasts auto-dismiss after 3.5 s
- [x] Created `frontend/src/components/LoadingSpinner.jsx` — reusable spinner with overlay mode
- [x] Created `frontend/src/components/EmptyState.jsx` — empty-state card with icon, title, message, optional action button
- [x] Created `frontend/src/components/ImageUploadPreview.jsx` — drag-and-drop file picker with thumbnail grid, per-image size validation, remove button
- [x] Created `frontend/src/components/DriverSearchBar.jsx` — type dropdown (name/license/plate), `POST /api/drivers/search`, clear button
- [x] Created `frontend/src/components/DriverEditModal.jsx` — overlay modal with pre-filled form, calls `PUT /api/drivers/:id`, license field read-only
- [x] Created `frontend/src/components/Navigation.jsx` — responsive sidebar (desktop) + slide-in drawer (mobile) with role-based nav items and disabled "Soon" badges for future phases
- [x] Created `frontend/src/components/DashboardLayout.jsx` — sticky top header (mobile hamburger + page title + user avatar) + `<Outlet />` for nested routes
- [x] Created `frontend/src/pages/DriverList.jsx` — paginated driver table (20/page), skeleton loading rows, status + face enrolled badges, search integration, admin-only "Register New Driver" button
- [x] Created `frontend/src/pages/DriverProfile.jsx` — driver info card with all details + strike counter + status, admin action buttons (Edit / Enroll Face / Delete), offence history table with date/type filters, confirm-delete modal
- [x] Created `frontend/src/pages/admin/DriverRegistration.jsx` — two-step registration: Step 1 (driver details form with real-time validation + auto-format for license/plate) → Step 2 (face enrollment with `ImageUploadPreview`, 10–30 s processing spinner, skip option)
- [x] Updated `frontend/src/App.jsx` — replaced all placeholder dashboard components; added `DashboardLayout` with nested routes for `/dashboard/admin/*` and `/dashboard/officer/*`; `ToastProvider` wraps full app; `DashboardHome` redirects by role
- [x] Vite production build: ✓ 106 modules, 0 errors, 0 warnings
- [x] Dev server starts cleanly on port 5173

**Routing map:**

| Path                             | Component                           | Access     |
| -------------------------------- | ----------------------------------- | ---------- |
| `/dashboard`                     | `DashboardHome` (redirects by role) | Any auth   |
| `/dashboard/admin/drivers`       | `DriverList`                        | Any auth   |
| `/dashboard/admin/drivers/new`   | `DriverRegistration`                | Admin only |
| `/dashboard/admin/drivers/:id`   | `DriverProfile`                     | Any auth   |
| `/dashboard/officer/drivers`     | `DriverList`                        | Any auth   |
| `/dashboard/officer/drivers/:id` | `DriverProfile`                     | Any auth   |

**Files Created / Affected — Phase 5**

| File                                              | Action    |
| ------------------------------------------------- | --------- |
| `frontend/src/components/Toast.jsx`               | Created   |
| `frontend/src/components/LoadingSpinner.jsx`      | Created   |
| `frontend/src/components/EmptyState.jsx`          | Created   |
| `frontend/src/components/ImageUploadPreview.jsx`  | Created   |
| `frontend/src/components/DriverSearchBar.jsx`     | Created   |
| `frontend/src/components/DriverEditModal.jsx`     | Created   |
| `frontend/src/components/Navigation.jsx`          | Created   |
| `frontend/src/components/DashboardLayout.jsx`     | Created   |
| `frontend/src/pages/DriverList.jsx`               | Created   |
| `frontend/src/pages/DriverProfile.jsx`            | Created   |
| `frontend/src/pages/admin/DriverRegistration.jsx` | Created   |
| `frontend/src/App.jsx`                            | Rewritten |
| `PROGRESS.md`                                     | Updated   |

---

### Phase 4 — Driver Management Backend

- [x] Implemented `backend/routes/drivers.js` — all 7 REST endpoints (list, get, create, update, delete, search, enroll-face)
- [x] Implemented `backend/middleware/validation.js` — `validateDriverCreate` and `validateDriverUpdate` with field whitelisting
- [x] Rewrote `backend/services/faceService.js` — multipart FormData forwarding via `form-data` + axios (replaced broken JSON stub)
- [x] Applied Supabase migration `add_deleted_status_to_drivers` — added `'Deleted'` to `drivers_status_check` constraint (enables soft delete)
- [x] Mounted `/api/drivers` router in `backend/server.js`
- [x] Installed `multer` and `form-data` Node packages
- [x] `GET /api/drivers` — paginated list, excludes Deleted records, officer + admin access ✅
- [x] `GET /api/drivers/:id` — returns driver with `face_enrolled` boolean (raw embedding stripped) ✅
- [x] `POST /api/drivers` — creates driver, returns 409 on duplicate license/plate (admin only) ✅
- [x] `PUT /api/drivers/:id` — partial update; blocks `strike_count` / `face_embedding` writes (admin only) ✅
- [x] `DELETE /api/drivers/:id` — soft delete (sets `status='Deleted'`), prevents double-delete ✅
- [x] `POST /api/drivers/search` — ilike name search, exact license/plate search ✅
- [x] `POST /api/drivers/:id/enroll-face` — 3–5 image upload, calls Python service, stores 512-dim ArcFace embedding in Supabase JSONB ✅
- [x] RBAC enforced: create/update/delete/enroll = admin only; list/get/search = officer + admin
- [x] End-to-end enrollment verified: Chinedu Okafor (`68144771-8505-4b50-b80d-43ba3b577322`) has ArcFace embedding in Supabase
- [x] 18/18 endpoint tests passing; results documented in `test-results/phase4-testing-results.md`
- [x] Postman collection exported to `test-results/phase4-driver-api.postman_collection.json`

**Files Created / Affected — Phase 4**

| File                                                     | Action                          |
| -------------------------------------------------------- | ------------------------------- |
| `backend/routes/drivers.js`                              | Created                         |
| `backend/middleware/validation.js`                       | Created                         |
| `backend/services/faceService.js`                        | Rewritten (multipart FormData)  |
| `backend/server.js`                                      | Modified (mount drivers router) |
| `supabase/migrations/002_add_deleted_status.sql`         | Created (via Supabase API)      |
| `test-results/phase4-testing-results.md`                 | Created                         |
| `test-results/phase4-driver-api.postman_collection.json` | Created                         |
| `PROGRESS.md`                                            | Updated                         |

---

### Phase 3 — Python Facial Recognition Service

- [x] Implemented `face-service/main.py` — FastAPI app with `/health`, `/enroll`, `/identify` endpoints
- [x] Implemented `face-service/models/face_enrollment.py` — validates 3-5 images, extracts ArcFace embeddings, returns averaged 512-float vector
- [x] Implemented `face-service/models/face_identification.py` — cosine distance comparison, threshold-based match decision
- [x] Implemented `face-service/utils/image_processing.py` — `validate_image()` (format + min 100×100), `preprocess_for_deepface()` (RGB normalisation)
- [x] Implemented `face-service/utils/embedding_utils.py` — `compute_cosine_distance()` (scipy), `average_embeddings()` (numpy)
- [x] Installed `scipy` into venv; updated `requirements.txt`
- [x] Created `face-service/models/__init__.py` and `face-service/utils/__init__.py`
- [x] Logging added throughout — model load, enrollment, identification events
- [x] Enrollment test: Ian_Thorpe 5 images → 512-dim embedding, 200 OK ✅
- [x] Positive ID test: Ian_Thorpe_0006.jpg → matched=true, confidence=82.05%, distance=0.1795 ✅
- [x] Negative ID test: Alan_Greenspan_0001.jpg → matched=false, distance=0.9798 ✅
- [x] Error handling tests: too few images (400), non-image file (400), bad JSON (400) all pass ✅
- [x] Threshold confirmed at `FACE_CONFIDENCE_THRESHOLD=0.40` (large gap: same-person ~0.18, different-person ~0.98)
- [x] Test results documented in `test-results/phase3-face-recognition-tests.md`

**Files Created / Affected — Phase 3**

| File                                            | Action                  |
| ----------------------------------------------- | ----------------------- |
| `face-service/main.py`                          | Rewritten (full impl)   |
| `face-service/models/face_enrollment.py`        | Implemented             |
| `face-service/models/face_identification.py`    | Implemented             |
| `face-service/utils/image_processing.py`        | Implemented             |
| `face-service/utils/embedding_utils.py`         | Implemented             |
| `face-service/models/__init__.py`               | Created                 |
| `face-service/utils/__init__.py`                | Created                 |
| `face-service/requirements.txt`                 | Updated (scipy added)   |
| `test-data/enrollment_result_ian.json`          | Created (test artefact) |
| `test-results/phase3-face-recognition-tests.md` | Created                 |
| `PROGRESS.md`                                   | Updated                 |

---

### Phase 2 — Authentication System

- [x] Created `backend/utils/jwt.js` — `generateAccessToken`, `generateRefreshToken`, `verifyToken` helpers
- [x] Created `backend/routes/auth.js` — `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- [x] Login accepts officer_id (6-digit numeric) OR email as identifier
- [x] Password verified with `bcrypt.compare()` — constant-time to prevent user enumeration
- [x] Refresh token blacklist (in-memory `Set`) — invalidated on logout
- [x] Updated `backend/middleware/auth.js` — exports `authenticateToken`, uses `verifyToken` helper
- [x] Updated `backend/middleware/roleCheck.js` — exports `requireRole([ ])`, accepts array of roles
- [x] Updated `backend/server.js` — mounts `/api/auth`, adds `GET /api/test/officer` and `GET /api/test/admin` test routes
- [x] Created `frontend/src/services/api.js` — Axios instance with request interceptor (attach token) and response interceptor (auto-refresh on 401)
- [x] Created `frontend/src/context/AuthContext.jsx` — `useReducer`-based auth state, `login()`, `logout()`, `getUser()`, localStorage persistence
- [x] Created `frontend/src/pages/Login.jsx` — dark-themed form, accepts officer_id or email, Tailwind styling
- [x] Created `frontend/src/components/ProtectedRoute.jsx` — redirects to `/login` if unauthenticated, shows 403 if wrong role
- [x] Updated `frontend/src/App.jsx` — React Router v7 with `/login`, `/dashboard`, `/dashboard/officer/*`, `/dashboard/admin/*` routes; root redirect based on auth state
- [x] All files pass linter/compiler checks (0 errors)

**Files Created / Affected — Phase 2**

| File                                         | Action               |
| -------------------------------------------- | -------------------- |
| `backend/utils/jwt.js`                       | Created              |
| `backend/routes/auth.js`                     | Created              |
| `backend/middleware/auth.js`                 | Modified (rewritten) |
| `backend/middleware/roleCheck.js`            | Modified (rewritten) |
| `backend/server.js`                          | Modified             |
| `frontend/src/services/api.js`               | Created              |
| `frontend/src/context/AuthContext.jsx`       | Created              |
| `frontend/src/pages/Login.jsx`               | Created              |
| `frontend/src/components/ProtectedRoute.jsx` | Created              |
| `frontend/src/App.jsx`                       | Modified (rewritten) |
| `PROGRESS.md`                                | Updated              |

---

### Phase 1 — Database Schema & Supabase Setup

- [x] Created `users` table with UUID PK, officer_id, email, password_hash, role, full_name
- [x] Created `drivers` table with face_embedding (JSONB), strike_count, status
- [x] Created `offences` table with FK references to drivers, users, offence_types
- [x] Created `offence_types` table with base_fine, strike_weight, severity, is_active
- [x] Created `penalty_rules` table with strike range tiers and fine multipliers
- [x] Created `audit_logs` table (immutable — no UPDATE/DELETE policy)
- [x] Added indexes: `drivers.license_no`, `drivers.plate_no`, `offences.driver_id`, `offences.issued_at`, `offences.officer_id`, `audit_logs.user_id`, `audit_logs.timestamp`
- [x] Created `update_updated_at()` trigger function for `users` and `drivers`
- [x] Created `auth_role()` and `auth_sub()` RLS helper functions
- [x] Enabled RLS on all 6 tables
- [x] Applied RLS policies: `users` (select own + admin all)
- [x] Applied RLS policies: `drivers` (select authenticated, insert/update/delete admin)
- [x] Applied RLS policies: `offences` (select own + admin all, insert authenticated, no delete)
- [x] Applied RLS policies: `offence_types` (select authenticated, insert/update/delete admin)
- [x] Applied RLS policies: `penalty_rules` (select authenticated, insert/update/delete admin)
- [x] Applied RLS policies: `audit_logs` (select + insert authenticated, no update/delete)
- [x] Seeded 3 users (1 admin, 2 officers) with bcrypt-hashed passwords
- [x] Seeded 3 penalty rule tiers (0–2 Active, 3–5 Warning, 6+ Flagged)
- [x] Seeded 15 offence types across Minor / Moderate / Severe severities
- [x] Seeded 20 driver records with JSONB contact fields
- [x] Generated TypeScript types at `backend/types/database.types.ts`
- [x] Saved full migration to `supabase/migrations/001_initial_schema.sql`

**Files Created / Affected — Phase 1**

| File                                         | Action  |
| -------------------------------------------- | ------- |
| `supabase/migrations/001_initial_schema.sql` | Created |
| `backend/types/database.types.ts`            | Created |

---

## Upcoming Phases

| Phase | Name                                | Status         |
| ----- | ----------------------------------- | -------------- |
| 0     | Project Scaffolding                 | ✅ Completed   |
| 1     | Database Schema & Supabase Setup    | ✅ Completed   |
| 2     | Authentication System               | ✅ Completed   |
| 3     | Python Facial Recognition Service   | ✅ Completed   |
| 4     | Driver Management Backend           | ✅ Completed   |
| 5     | Driver Management Frontend          | ✅ Completed   |
| 6     | Facial Identification UI            | ✅ Completed   |
| MT    | Mini Task — Driver Profile Pictures | ✅ Completed   |
| 7     | Offence Types & Penalty Rules       | ✅ Completed   |
| 8     | Strike Engine & Offence Issuance    | ✅ Completed   |
| 9     | Offence History & Audit Logs        | ⬜ Not Started |
| 10    | Analytics Dashboard                 | ⬜ Not Started |
| 11    | UI Polish & Responsive Design       | ⬜ Not Started |
| 12    | Testing & Bug Fixes                 | ⬜ Not Started |
| 13    | Documentation & Deployment          | ⬜ Not Started |

---

## Notes

- The `contact` column on `drivers` is stored as **JSONB** (not VARCHAR) to support structured `{phone, email}` payloads.
- `face_embedding` on `drivers` is JSONB: `{"embedding": [...512 floats...], "model": "ArcFace", "enrolled_at": "..."}` — populated in Phase 3.
- The Strike Engine (Phase 8) **must** be implemented as a Supabase RPC (stored procedure) to ensure atomicity across `offences`, `drivers`, and `audit_logs`.
- Backend uses `service_role` key which bypasses RLS — RLS only applies to direct Supabase client calls from the frontend (if any).
- Seed admin credentials: `eniolaamusu6@gmail.com` / `Allowme2006!`
- Seed officer credentials: `officer@ddits.com` / `Officer123!`
