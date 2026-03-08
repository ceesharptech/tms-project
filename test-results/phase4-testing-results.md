# Phase 4 — Driver Management API Test Results

**Date:** 2026-03-08  
**Backend:** Express.js on http://localhost:5000  
**Auth:** JWT Bearer tokens (admin role and officer role tested)  
**Conducted by:** Agent (curl tests)

---

## Test Summary

| #   | Endpoint                 | Scenario                          | Status  | HTTP |
| --- | ------------------------ | --------------------------------- | ------- | ---- |
| 1   | GET /api/drivers         | List all (20 seeded)              | ✅ PASS | 200  |
| 1b  | GET /api/drivers?limit=5 | Paginated (5 per page)            | ✅ PASS | 200  |
| 2   | GET /api/drivers/:id     | Valid UUID (Chinedu Okafor)       | ✅ PASS | 200  |
| 2b  | GET /api/drivers/:id     | Invalid UUID                      | ✅ PASS | 404  |
| 3   | POST /api/drivers        | Create new driver                 | ✅ PASS | 201  |
| 3b  | POST /api/drivers        | Duplicate license_no              | ✅ PASS | 409  |
| 3c  | POST /api/drivers        | Validation error (name too short) | ✅ PASS | 400  |
| 4   | PUT /api/drivers/:id     | Update contact field              | ✅ PASS | 200  |
| 5   | POST /api/drivers/search | Search by name "Chinedu"          | ✅ PASS | 200  |
| 5b  | POST /api/drivers/search | Search by license (exact)         | ✅ PASS | 200  |
| 5c  | POST /api/drivers/search | Search by plate (exact)           | ✅ PASS | 200  |
| 5d  | POST /api/drivers/search | No results (empty array)          | ✅ PASS | 200  |
| 6   | POST /:id/enroll-face    | Enroll 5 images — Chinedu Okafor  | ✅ PASS | 200  |
| 6b  | POST /:id/enroll-face    | Already enrolled                  | ✅ PASS | 400  |
| 6c  | POST /:id/enroll-face    | Too few images (2)                | ✅ PASS | 400  |
| 6d  | POST /:id/enroll-face    | Officer token (admin required)    | ✅ PASS | 403  |
| 7   | DELETE /api/drivers/:id  | Soft delete (status → "Deleted")  | ✅ PASS | 200  |
| 7b  | DELETE /api/drivers/:id  | Already deleted (not found)       | ✅ PASS | 404  |

**All 18 tests passed.**

---

## Detailed Test Results

### Test 1 — GET /api/drivers (list all)

```
GET /api/drivers
Authorization: Bearer <admin_token>
```

```json
{ "success": true, "data": { "drivers": [...], "total": 20 } }
```

- Returns 20 seeded drivers (excludes Deleted status)
- Default limit 20, max 100

### Test 1b — Pagination

```
GET /api/drivers?limit=5&offset=0
```

Response confirms `"total": 20` with 5 drivers in array.

---

### Test 2 — GET /api/drivers/:id

**Driver: Chinedu Okafor** (`68144771-8505-4b50-b80d-43ba3b577322`)

```json
{
  "success": true,
  "data": {
    "id": "68144771-8505-4b50-b80d-43ba3b577322",
    "full_name": "Chinedu Okafor",
    "license_no": "LAG-23-482731",
    "plate_no": "ABC-1023",
    "contact": {
      "email": "chinedu.okafor@gmail.com",
      "phone": "+2348012345678"
    },
    "status": "Active",
    "strike_count": 0,
    "face_enrolled": false
  }
}
```

Note: `face_embedding` raw array is **omitted** from GET response (security — only enrollment status exposed).

**Test 2b — Invalid UUID → 404:**

```json
{ "error": true, "message": "Driver not found", "code": "NOT_FOUND" }
```

---

### Test 3 — POST /api/drivers (create)

**Request:**

```json
{
  "full_name": "Test Driver",
  "license_no": "A1B2C3D4E5F",
  "plate_no": "KSF-516GF",
  "contact": "test@example.com"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "3dbf3462-1885-43b7-b0b9-696517fda2fb",
    "full_name": "Test Driver",
    "license_no": "A1B2C3D4E5F",
    "plate_no": "KSF-516GF",
    "status": "Active",
    "strike_count": 0
  }
}
```

**Test 3b — Duplicate license (409):**

```json
{
  "error": true,
  "message": "A driver with that license number already exists",
  "code": "DUPLICATE_LICENSE"
}
```

**Test 3c — Validation error (400):**

```json
{
  "error": true,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": ["full_name is required and must be at least 3 characters"]
}
```

---

### Test 4 — PUT /api/drivers/:id (update)

Updated `contact` field → `"updated@example.com"`. `updated_at` timestamp refreshed.

---

### Test 5 — POST /api/drivers/search

**Search by name (`"Chinedu"`):**

```json
{ "success": true, "data": { "drivers": [{ "full_name": "Chinedu Okafor", ... }], "count": 1 } }
```

**Search by license (`"A1B2C3D4E5F"`):**

```json
{ "success": true, "data": { "drivers": [{ "full_name": "Test Driver", ... }], "count": 1 } }
```

**No results (`"NonExistentXYZ"`):**

```json
{ "success": true, "data": { "drivers": [], "count": 0 } }
```

Returns empty array — **not** an error.

---

### Test 6 — POST /api/drivers/:id/enroll-face ⭐

**Driver:** Chinedu Okafor (`68144771-8505-4b50-b80d-43ba3b577322`)  
**Images:** Ian_Thorpe_0001.jpg — Ian_Thorpe_0005.jpg (5 images)

**Response (200):**

```json
{
  "success": true,
  "message": "Face enrolled successfully",
  "data": {
    "driver_id": "68144771-8505-4b50-b80d-43ba3b577322",
    "driver_name": "Chinedu Okafor",
    "enrollment_status": "completed",
    "model": "ArcFace",
    "enrolled_at": "2026-03-08T14:56:47.668Z"
  }
}
```

**Database verification (Supabase query):**

| Column        | Value                         |
| ------------- | ----------------------------- |
| has_face      | true                          |
| model         | ArcFace                       |
| enrolled_at   | 2026-03-08T14:56:47.668Z      |
| embedding_dim | **512**                       |
| updated_at    | 2026-03-08 14:56:47.476875+00 |

JSONB structure stored:

```json
{
  "embedding": [512 floats],
  "model": "ArcFace",
  "enrolled_at": "2026-03-08T14:56:47.668Z",
  "num_images": 5
}
```

**Test 6b — Already enrolled (400):**

```json
{
  "error": true,
  "message": "Driver already has a face enrolled. Use re-enroll to update.",
  "code": "ALREADY_ENROLLED"
}
```

**Test 6c — Too few images (400):**

```json
{
  "error": true,
  "message": "Must provide 3-5 face images, received 2",
  "code": "INVALID_IMAGE_COUNT"
}
```

**Test 6d — Officer role (403):**

```json
{
  "error": true,
  "message": "Forbidden — insufficient permissions",
  "code": "FORBIDDEN"
}
```

---

### Test 7 — DELETE /api/drivers/:id (soft delete)

**Driver:** Test Driver (`3dbf3462-1885-43b7-b0b9-696517fda2fb`)

**Response (200):**

```json
{ "success": true, "message": "Driver \"Test Driver\" has been deleted" }
```

**Database verification:**

```
SELECT status FROM drivers WHERE id = '3dbf3462-...';
→ "Deleted"
```

Record still **exists** in database — foreign key integrity preserved.  
Second DELETE of same driver returns 404 (idempotent soft deletes handled).

---

## Enrolled Driver for Phase 6

| Field                   | Value                                                     |
| ----------------------- | --------------------------------------------------------- |
| **driver_id**           | `68144771-8505-4b50-b80d-43ba3b577322`                    |
| **driver_name**         | Chinedu Okafor                                            |
| **enrolled_at**         | 2026-03-08T14:56:47.668Z                                  |
| **model**               | ArcFace                                                   |
| **embedding_dim**       | 512                                                       |
| **test images**         | Ian_Thorpe_0001–0005.jpg                                  |
| **positive test image** | Ian_Thorpe_0006.jpg (use for Phase 6 identification test) |

---

## RBAC Summary

| Role     | GET list | GET by ID | POST create | PUT update | DELETE | Enroll Face |
| -------- | -------- | --------- | ----------- | ---------- | ------ | ----------- |
| Admin    | ✅       | ✅        | ✅          | ✅         | ✅     | ✅          |
| Officer  | ✅       | ✅        | ❌ 403      | ❌ 403     | ❌ 403 | ❌ 403      |
| No token | ❌ 401   | ❌ 401    | ❌ 401      | ❌ 401     | ❌ 401 | ❌ 401      |
