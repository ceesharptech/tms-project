# DDITS — Development Progress Tracker

> **Project:** Digital Driver Identification and Traffic Offence Penalty System
> **Last Updated:** 2026-03-09
> **Developer:** Solo (Final Year University Project)

---

## Current Phase

**Phase 5 — Driver Management Frontend**

**Status:** NOT STARTED

---

## Current Tasks

- [ ] Create `frontend/src/pages/admin/DriversPage.jsx` — paginated driver list with search bar
- [ ] Create `frontend/src/pages/admin/DriverDetailPage.jsx` — driver profile, strike history, face enrolment status
- [ ] Create `frontend/src/components/drivers/DriverCard.jsx` — card component used in list
- [ ] Create `frontend/src/components/drivers/CreateDriverModal.jsx` — form modal (name, license, plate, contact)
- [ ] Create `frontend/src/components/drivers/FaceEnrollModal.jsx` — 3–5 image upload with preview, progress state
- [ ] Wire all views to `frontend/src/services/api.js` Axios instance (auth interceptors already in place)
- [ ] Add `/dashboard/admin/drivers` and `/dashboard/admin/drivers/:id` routes to `App.jsx`

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

| Phase | Name                              | Status         |
| ----- | --------------------------------- | -------------- |
| 0     | Project Scaffolding               | ✅ Completed   |
| 1     | Database Schema & Supabase Setup  | ✅ Completed   |
| 2     | Authentication System             | ✅ Completed   |
| 3     | Python Facial Recognition Service | ✅ Completed   |
| 4     | Driver Management Backend         | ✅ Completed   |
| **5** | **Driver Management Frontend**    | **🔄 Current** |
| 6     | Facial Identification UI          | ⬜ Not Started |
| 7     | Offence Types & Penalty Rules     | ⬜ Not Started |
| 8     | Strike Engine & Offence Issuance  | ⬜ Not Started |
| 9     | Offence History & Audit Logs      | ⬜ Not Started |
| 10    | Analytics Dashboard               | ⬜ Not Started |
| 11    | UI Polish & Responsive Design     | ⬜ Not Started |
| 12    | Testing & Bug Fixes               | ⬜ Not Started |
| 13    | Documentation & Deployment        | ⬜ Not Started |

---

## Notes

- The `contact` column on `drivers` is stored as **JSONB** (not VARCHAR) to support structured `{phone, email}` payloads.
- `face_embedding` on `drivers` is JSONB: `{"embedding": [...512 floats...], "model": "ArcFace", "enrolled_at": "..."}` — populated in Phase 3.
- The Strike Engine (Phase 8) **must** be implemented as a Supabase RPC (stored procedure) to ensure atomicity across `offences`, `drivers`, and `audit_logs`.
- Backend uses `service_role` key which bypasses RLS — RLS only applies to direct Supabase client calls from the frontend (if any).
- Seed admin credentials: `eniolaamusu6@gmail.com` / `Allowme2006!`
- Seed officer credentials: `officer@ddits.com` / `Officer123!`
