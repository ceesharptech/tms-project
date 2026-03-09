# DDITS — Development Progress Tracker

> **Project:** Digital Driver Identification and Traffic Offence Penalty System
> **Last Updated:** 2026-03-09
> **Developer:** Solo (Final Year University Project)

---

## Current Phase

**Mini Task — Driver Profile Picture Feature**

**Status:** COMPLETE ✅

---

## Current Tasks

All tasks complete. See completed section below.

---

## Blockers

- None currently identified

---

## Completed

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
| 7     | Offence Types & Penalty Rules       | ⬜ Not Started |
| 8     | Strike Engine & Offence Issuance    | ⬜ Not Started |
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
