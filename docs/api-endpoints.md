# API Endpoints

## Authentication
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

## Drivers (Officer & Admin)
- POST /api/drivers (Admin only) - Create driver
- GET /api/drivers/:id - Get single driver
- GET /api/drivers - List all drivers (paginated)
- PUT /api/drivers/:id (Admin only) - Update driver
- DELETE /api/drivers/:id (Admin only) - Soft delete
- POST /api/drivers/search - Search by name/license/plate
- POST /api/drivers/:id/enroll-face (Admin only) - Upload face images

## Facial Recognition
- POST /api/drivers/identify - Upload image, get matched driver

## Offence Types (Admin only)
- GET /api/offence-types - List all
- POST /api/offence-types - Create new
- PUT /api/offence-types/:id - Update
- DELETE /api/offence-types/:id - Soft delete

## Penalty Rules (Admin only)
- GET /api/penalty-rules - List all
- POST /api/penalty-rules - Create new
- PUT /api/penalty-rules/:id - Update

## Offences
- POST /api/offences/issue - Issue new offence (calls RPC function)
- GET /api/offences - List offences (filter by driver_id or officer_id)

## Analytics (Admin only)
- GET /api/analytics/summary - Dashboard metrics
- GET /api/analytics/offences-by-month - Time series data

## Audit Logs (Admin only)
- GET /api/audit-logs - Searchable audit trail