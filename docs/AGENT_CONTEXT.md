# Project Context for AI Coding Agent

## Project Overview

**Project Name:** Digital Driver Identification and Traffic Offence Penalty System (DDITS)

**Type:** Web-based enforcement and driver identification platform

**Purpose:** To digitally identify drivers using facial recognition and manage traffic offence penalties through a centralized strike-based system.

**Academic Context:** Final year university project - solo developer - must be demonstrable and fully functional.

**Development Approach:** Modular phase-by-phase build with each component fully tested before moving to the next.

---

## Tech Stack

### Frontend

- **Framework:** React 18+ with Vite
- **Language:** JavaScript (can upgrade to TypeScript if needed)
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **State Management:** React Context API (+ Zustand if global state needed)
- **UI Components:** Custom components with Tailwind (or shadcn/ui if preferred)
- **Charts:** Recharts (for analytics dashboard)
- **PDF Generation:** jsPDF + jsPDF-AutoTable

### Backend

- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Authentication:** JWT (access + refresh token pattern)
- **Password Hashing:** bcrypt
- **Database Client:** @supabase/supabase-js
- **CORS:** Enabled for frontend communication
- **Environment:** dotenv for config management

### Database

- **Platform:** Supabase (PostgreSQL)
- **Access Method:** Supabase JavaScript client + MCP Server integration
- **Key Features Used:**
  - PostgreSQL relational database
  - Row Level Security (RLS) for role-based access
  - Supabase Storage for face images (optional - can store as base64 in JSONB)
  - Database functions (RPC) for complex transactions
  - Auto-generated TypeScript types

**IMPORTANT - MCP Server Integration:**
The AI agent has direct access to the Supabase database via an MCP (Model Context Protocol) server. This means:

- The agent can create tables, run queries, and modify schema directly
- The agent can insert seed data without writing separate SQL files
- The agent can test database operations in real-time
- All database operations should still be done through proper migrations for version control
- The agent should document any direct database changes made via MCP

### Facial Recognition Service

- **Language:** Python 3.13
- **Framework:** FastAPI
- **Face Recognition Library:** DeepFace
- **Model:** ArcFace (best balance of speed and accuracy)
- **Image Processing:** OpenCV, Pillow
- **Deployment:** Runs as standalone microservice on port 8000

---

## System Architecture

### Three-Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│                   React Frontend (Vite)                     │
│                      Port: 5173                             │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST (Axios)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                      │
│                   Express.js Backend                        │
│                      Port: 5000                             │
│  • Authentication & Authorization (JWT)                     │
│  • Role-based access control                               │
│  • Strike & penalty calculation orchestration              │
│  • API gateway for all operations                          │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               │ Supabase Client         │ HTTP/REST
               ↓                          ↓
┌──────────────────────────────┐  ┌─────────────────────────┐
│   DATABASE LAYER             │  │   ML SERVICE            │
│   Supabase (PostgreSQL)      │  │   Python FastAPI        │
│   • All persistent data      │  │   Port: 8000            │
│   • RLS policies             │  │   • Face enrollment     │
│   • Stored procedures (RPC)  │  │   • Face identification │
│   • MCP Server Access ✓      │  │   • DeepFace + ArcFace  │
└──────────────────────────────┘  └─────────────────────────┘
```

### Communication Flow

1. **User Action** → React sends HTTP request to Express
2. **Express** validates JWT, checks role, executes business logic
3. **Database Ops** → Express calls Supabase client (agent can also use MCP)
4. **Face Recognition** → Express forwards image to Python service via HTTP
5. **Response** → Express aggregates data and returns to React

---

## Complete Feature List by Module

### MODULE 1: Authentication & Access Control

**Users:** Officers (field enforcement), Admins (system management)

**Features:**

- Secure login with email + password
- JWT-based session management (access token: 30 min, refresh token: 7 days)
- Role-based authorization (officer vs admin routes)
- Automatic token refresh on expiration
- Session activity logging
- Logout (token invalidation)

**Access Rules:**

- Officers can: Identify drivers, issue offences, view their own issued offences
- Admins can: Everything officers can + manage drivers, configure offence types, view analytics, manage users

---

### MODULE 2: Driver Registration & Profile Management

**Purpose:** Create and maintain digital driver identities

**Features:**

- **Driver Profile Creation** (Admin only)
  - Full name
  - License number (unique)
  - Vehicle plate number
  - Contact information (phone, email)
  - Status (Active / Flagged / Suspended)
  - Registration date (auto)
- **Biometric Enrollment** (Admin only)
  - Upload 3-5 face images per driver
  - Images processed by Python service
  - Face embeddings stored as JSONB array in database
  - Duplicate detection (prevent same person being registered twice)
- **Driver Profile View** (Officer & Admin)
  - Personal details display
  - Current strike count
  - Status badge (color-coded)
  - Complete offence history
- **Edit/Update** (Admin only)
  - Update contact details
  - Update vehicle plate
  - Update status manually
  - Re-enroll face if needed

---

### MODULE 3: Facial Recognition Identification

**Purpose:** Identify drivers in the field using face matching

**Features:**

- **Image Capture/Upload**
  - Upload image file (JPEG/PNG)
  - Optional: Live camera capture in browser
- **Face Processing** (Python service)
  - Detect face in uploaded image
  - Extract 128 or 512-dimensional face embedding
  - Compare against all stored driver embeddings
  - Return best match with confidence score
- **Match Results**
  - Matched driver profile (if confidence > threshold)
  - Confidence percentage (e.g., 87% match)
  - "No match" if no driver exceeds threshold
- **Manual Override**
  - If face recognition fails, officer can search manually
  - Fallback to text-based search

---

### MODULE 4: Driver Search System

**Purpose:** Find drivers without facial recognition

**Search Methods:**

- By license plate number (exact match)
- By driver license number (exact match)
- By name (fuzzy search / LIKE query)
- By facial recognition (covered in Module 3)

**Search Results Display:**

- Driver profile card/summary
- Current strike count
- Current penalty tier
- Status flag (Active/Flagged/Suspended)
- "View Full Profile" button

---

### MODULE 5: Traffic Offence Management

**Purpose:** Define and manage types of traffic violations (Admin only)

**Features:**

- **Create Offence Types**
  - Offence name (e.g., "Speeding", "Running Red Light")
  - Description (1-2 sentences)
  - Base fine amount (in local currency)
  - Strike weight (1-3, determines penalty severity)
  - Severity level (Minor / Moderate / Severe)
- **Edit Offence Types**
  - Update fine amounts
  - Adjust strike weights
  - Modify descriptions
- **Disable Offence Types**
  - Soft delete (set is_active = false)
  - Existing offences retain reference to deleted types
- **Categorization**
  - Filter by severity level
  - Sort by fine amount or strike weight

---

### MODULE 6: Strike & Penalty Engine

**Purpose:** Automatically escalate penalties based on repeat offences

**Core Mechanism:**

- Each offence adds a strike value (defined by offence type)
- Driver's total strike count accumulates over time
- Penalty rules define escalation tiers based on strike count

**Features:**

- **Strike Allocation**
  - Each issued offence adds its strike_weight to driver's total
  - Real-time update to driver.strike_count
- **Escalation Rules** (Configurable by Admin)
  - Define strike ranges: e.g., 0-2 (Normal), 3-5 (Warning), 6+ (Flagged)
  - Each tier has a fine multiplier (e.g., 1.0x, 1.5x, 2.0x)
  - Each tier can trigger status change
- **Automatic Fine Calculation**
  - Base fine from offence type
  - Multiplied by current penalty tier multiplier
  - Example: Speeding (₦10,000) × 1.5 (Warning tier) = ₦15,000
- **Driver Flagging**
  - Automatic status change when strike threshold crossed
  - Status changes: Active → Warning → Flagged → Suspended
- **Transaction Integrity**
  - All operations (create offence, update strikes, update status, log action) happen atomically
  - Implemented as Supabase RPC function to prevent partial updates

---

### MODULE 7: Offence Issuance Workflow

**Purpose:** Allow officers to record violations in the field

**Step-by-Step Process:**

1. **Identify Driver**
   - Use facial recognition (Module 3)
   - OR use manual search (Module 4)
2. **Select Offence Type**
   - Dropdown list of active offence types
   - Shows base fine and strike weight
3. **System Calculates Penalty**
   - Retrieves driver's current strike count
   - Determines current penalty tier
   - Calculates final fine (base × multiplier)
   - Shows "new total strikes" after issuance
4. **Officer Confirms**
   - Review summary screen
   - Optional: Add notes
   - Confirm issuance
5. **System Commits Transaction**
   - Create offence record
   - Add strikes to driver total
   - Update driver status if threshold crossed
   - Log action to audit_logs
   - Return confirmation to officer

**Error Handling:**

- Cannot issue offence to non-existent driver
- Cannot issue inactive offence type
- Transaction rollback on any failure

---

### MODULE 8: Offence History & Record Tracking

**Purpose:** Maintain complete audit trail of violations

**Features:**

- **Driver Offence History** (Officer & Admin)
  - List all offences for a specific driver
  - Columns: Date, Time, Offence Type, Fine Amount, Issuing Officer, Strike Delta
  - Sorted by date (most recent first)
- **Officer Offence History** (Officer views own, Admin views all)
  - List all offences issued by a specific officer
  - Same columns as above
- **Filtering & Search**
  - Filter by date range
  - Filter by offence type
  - Search by driver name/license
- **Immutability**
  - Offence records cannot be deleted
  - Offence records cannot be edited (except by admin for corrections)
  - Permanent audit trail

---

### MODULE 9: Analytics & Reporting (Admin Only)

**Purpose:** Provide system-wide insights and metrics

**Dashboard Metrics:**

- Total registered drivers
- Total offences issued (all-time, this month, today)
- Most common offence types (top 5 with counts)
- Number of flagged drivers
- Number of suspended drivers
- Revenue projection (sum of all fines - simulated, not actual payment)

**Charts & Visualizations:**

- Offences by type (bar chart)
- Offences over time (line chart - last 6-12 months)
- Driver status distribution (pie chart: Active vs Flagged vs Suspended)
- Offences by officer (bar chart - top 10 officers)

**Report Generation:**

- Export data to PDF
- Export data to CSV
- Filter reports by date range
- Include charts as images in PDF

---

### MODULE 10: Notification System (Simulated)

**Purpose:** Track notification events (actual SMS/email not required)

**Features:**

- **Notification Log**
  - Record created when offence is issued
  - Marks driver as "notified" (simulated)
  - Stores notification timestamp
- **Reminder for Unpaid Penalties** (Simulated)
  - Display notification records in driver profile
  - Shows "Last notified: [date]"
- **Notification History** (Admin)
  - View all notification events
  - Filter by driver

**Note:** Actual email/SMS integration is optional - logging the event is sufficient for demonstration

---

### MODULE 11: System Security Features

**Purpose:** Ensure data integrity and access control

**Security Measures:**

- **Authentication**
  - Bcrypt password hashing (cost factor: 10)
  - JWT with short expiration (30 min access, 7 day refresh)
  - HttpOnly cookies for refresh tokens
- **Authorization**
  - Role-based middleware in Express
  - Row Level Security (RLS) in Supabase
  - Officers cannot access admin routes
  - Officers cannot see other officers' data (except admins)
- **Data Protection**
  - Environment variables for secrets
  - No credentials in code or Git
  - Supabase service_role key only in backend
- **Audit Trail**
  - All actions logged to audit_logs table
  - Immutable log (no UPDATE or DELETE permissions)
  - Includes: user_id, action type, timestamp, affected entity
- **Input Validation**
  - Validate all API inputs
  - Sanitize user-provided data
  - Prevent SQL injection (using parameterized queries via Supabase client)

---

## Database Schema

**Reference:** Full schema definition in `docs/database-schema.md`

**Tables:**

1. `users` - Officer and admin accounts
2. `drivers` - Driver profiles with face embeddings
3. `offences` - Violation records
4. `offence_types` - Definition of violation types
5. `penalty_rules` - Strike-based escalation configuration
6. `audit_logs` - Immutable system activity log

**Key Relationships:**

- `offences.driver_id` → `drivers.id`
- `offences.officer_id` → `users.id`
- `offences.offence_type_id` → `offence_types.id`

**Special Columns:**

- `drivers.face_embedding` - JSONB array storing face descriptor (128 or 512 floats)
- `drivers.strike_count` - Denormalized for fast access (updated atomically)
- `audit_logs.metadata` - JSONB for flexible event context storage

---

## API Endpoints

**Reference:** Complete endpoint specification in `docs/api-endpoints.md`

**Endpoint Categories:**

- Authentication (`/api/auth/*`)
- Drivers (`/api/drivers/*`)
- Facial Recognition (`/api/drivers/identify`)
- Offence Types (`/api/offence-types/*`)
- Penalty Rules (`/api/penalty-rules/*`)
- Offences (`/api/offences/*`)
- Analytics (`/api/analytics/*`)
- Audit Logs (`/api/audit-logs`)

---

## MCP Server Integration

**What the Agent Can Do:**
The AI coding agent has access to a Supabase MCP (Model Context Protocol) server, which provides:

1. **Direct Database Access**
   - Create/modify tables
   - Run SELECT, INSERT, UPDATE, DELETE queries
   - Create indexes and constraints
   - Set up Row Level Security policies

2. **Real-Time Testing**
   - Insert seed data directly
   - Query data to verify operations
   - Test RLS policies by switching user context

3. **Schema Management**
   - Create migrations
   - Apply schema changes
   - Generate TypeScript types

**Best Practices for MCP Usage:**

- Document all direct database changes in migration files for version control
- Use MCP for rapid testing and prototyping
- Commit migration SQL to `supabase/migrations/` folder for reproducibility
- Verify RLS policies via MCP before considering them complete
- Use MCP to seed test data during development

**Example MCP Workflow:**

```
Agent uses MCP to:
1. Create tables for Phase 1
2. Insert seed data from test-data/*.json
3. Test queries to verify data structure
4. Create RLS policies
5. Test policies by querying as different user roles
6. Generate migration file from changes
7. Commit migration to Git
```

---

## Project File Structure

```
tms-project/
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page-level components
│   │   │   ├── auth/           # Login page
│   │   │   ├── officer/        # Officer dashboard & tools
│   │   │   └── admin/          # Admin dashboard & management
│   │   ├── services/           # API service layer (Axios)
│   │   ├── context/            # React Context (AuthContext, etc.)
│   │   ├── utils/              # Utility functions
│   │   └── App.jsx             # Root component with routing
│   ├── public/
│   ├── .env.example
│   ├── .env                    # Not committed
│   └── package.json
│
├── backend/                    # Express API server
│   ├── routes/                 # Route handlers
│   │   ├── auth.js
│   │   ├── drivers.js
│   │   ├── offences.js
│   │   ├── offenceTypes.js
│   │   ├── penaltyRules.js
│   │   ├── analytics.js
│   │   └── auditLogs.js
│   ├── middleware/             # Express middleware
│   │   ├── auth.js             # JWT verification
│   │   ├── roleCheck.js        # Role-based access control
│   │   └── errorHandler.js     # Global error handling
│   ├── services/               # Business logic layer
│   │   ├── supabase.js         # Supabase client initialization
│   │   ├── faceService.js      # Python service communication
│   │   └── strikeEngine.js     # Penalty calculation logic
│   ├── utils/                  # Utility functions
│   ├── server.js               # Express app entry point
│   ├── .env.example
│   ├── .env                    # Not committed
│   └── package.json
│
├── face-service/               # Python FastAPI microservice
│   ├── main.py                 # FastAPI app entry point
│   ├── models/                 # Face processing logic
│   │   ├── face_enrollment.py
│   │   └── face_identification.py
│   ├── utils/                  # Helper functions
│   │   ├── image_processing.py
│   │   └── embedding_utils.py
│   ├── .env.example
│   ├── .env                    # Not committed
│   ├── requirements.txt
│   └── venv/                   # Python virtual environment (not committed)
│
├── test-data/                  # Development test data
│   ├── faces/                  # Face images for testing
│   │   ├── person_001/
│   │   ├── person_002/
│   │   └── ...
│   ├── seed-drivers.json       # Sample driver records
│   └── offence-types.json      # Sample offence definitions
│
├── docs/                       # Project documentation
│   ├── database-schema.md      # Complete DB schema
│   ├── api-endpoints.md        # API specification
│   ├── AGENT_CONTEXT.md        # This file
│   └── development-plan.md     # Phase-by-phase build plan
│
├── supabase/                   # Supabase configuration
│   └── migrations/             # SQL migration files
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
│
├── .gitignore
└── README.md
```

---

## Environment Variables

### Backend (.env)

```
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# JWT
JWT_SECRET=your_random_secret_here
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=different_random_secret_here
REFRESH_TOKEN_EXPIRES_IN=7d

# Python Service
PYTHON_SERVICE_URL=http://localhost:8000

# Server
PORT=5000
NODE_ENV=development
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:5000/api
```

### Python Service (.env)

```
PORT=8000
MODEL_NAME=ArcFace
DETECTION_BACKEND=opencv
FACE_CONFIDENCE_THRESHOLD=0.4
```

---

## Development Phases

**Reference:** Detailed phase descriptions in `docs/development-plan.md`

**Phase Sequence:** 0. Project Scaffolding (all services running)

1. Database Schema & Supabase Setup
2. Authentication System
3. Python Facial Recognition Service (build & test in isolation)
4. Driver Management Backend
5. Driver Management Frontend
6. Facial Identification UI
7. Offence Types & Penalty Rules
8. Strike Engine & Offence Issuance (CRITICAL - must be atomic)
9. Offence History & Audit Logs
10. Analytics Dashboard
11. UI Polish & Responsive Design
12. Testing & Bug Fixes
13. Documentation & Deployment

---

## Critical Implementation Notes

### 1. Strike Engine Must Be Atomic

The offence issuance process touches multiple tables and must execute as a single transaction:

- Insert into `offences` table
- Update `drivers.strike_count` (increment)
- Check `penalty_rules` for tier change
- Update `drivers.status` if threshold crossed
- Insert into `audit_logs`

**Implementation:** Use a Supabase RPC function (PostgreSQL stored procedure) that wraps all operations in a transaction. Do NOT implement this as separate API calls in Express.

**Example RPC function signature:**

```sql
CREATE OR REPLACE FUNCTION issue_offence_transaction(
  p_driver_id UUID,
  p_officer_id UUID,
  p_offence_type_id UUID,
  p_notes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
-- Function body with BEGIN, operations, COMMIT/ROLLBACK
$$;
```

### 2. Face Embeddings Storage

- Store face embeddings as JSONB in `drivers.face_embedding` column
- Structure: `{"embedding": [0.123, -0.456, 0.789, ...], "model": "ArcFace", "enrolled_at": "2024-02-19T10:30:00Z"}`
- ArcFace generates 512-float arrays, FaceNet generates 128-float arrays
- Use JSONB for flexibility and to avoid binary storage complexity

### 3. Row Level Security (RLS) Policies

Must implement for all tables:

**users table:**

- Officers can SELECT their own record only
- Admins can SELECT all records
- Nobody can INSERT/UPDATE/DELETE (managed separately)

**drivers table:**

- Officers and Admins can SELECT all
- Only Admins can INSERT/UPDATE/DELETE

**offences table:**

- Officers can SELECT their own issued offences
- Admins can SELECT all
- Officers and Admins can INSERT
- Nobody can DELETE (immutable audit trail)

**audit_logs table:**

- All authenticated users can INSERT
- All authenticated users can SELECT
- Nobody can UPDATE or DELETE (immutable)

### 4. Password Security

- Always use bcrypt with cost factor 10
- Never store plaintext passwords
- Never log passwords
- Validate password strength on registration (min 8 chars, complexity rules)

### 5. Error Handling Standards

All API endpoints must return consistent error format:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE_CONSTANT",
  "details": {} // Optional additional context
}
```

Success responses:

```json
{
  "success": true,
  "data": {
    /* response payload */
  },
  "message": "Optional success message"
}
```

### 6. Facial Recognition Threshold

- Default cosine distance threshold: 0.4 (for ArcFace)
- Lower threshold (0.3-0.35) = stricter matching, fewer false positives
- Higher threshold (0.45-0.5) = looser matching, fewer false negatives
- Make this configurable via environment variable
- Tune empirically with test dataset

---

## Testing Strategy

### Backend API Testing

- Use Postman or Thunder Client (VS Code extension)
- Test each endpoint in isolation before building frontend
- Create Postman collection for all endpoints
- Test with invalid inputs, missing auth, wrong roles

### Facial Recognition Testing

- Test Python service standalone BEFORE integrating with Express
- Use test-data/faces/ images
- Verify enrollment returns valid embedding array
- Verify identification correctly matches known faces
- Test edge cases: no face detected, multiple faces, poor lighting

### Integration Testing

- Test complete workflows end-to-end
- Example: Driver registration → face enrollment → identification → offence issuance → strike update
- Verify all database changes occur correctly
- Test transaction rollback on failure

### Frontend Testing

- Manual testing in browser
- Test all user flows for both officer and admin roles
- Test responsive design on mobile screen sizes
- Test error states (network failure, invalid input, etc.)

---

## Git Workflow

### Commit Message Format

```
type: brief description

Longer explanation if needed

Examples:
feat: Add driver registration API endpoint
fix: Correct strike count calculation in RPC function
docs: Update API endpoint documentation
test: Add Postman collection for auth routes
refactor: Simplify face enrollment logic
```

### Branch Strategy (Optional for solo dev, but good practice)

- `main` - always deployable
- `dev` - active development
- Feature branches: `feature/driver-management`, `feature/face-recognition`, etc.
- Merge to `dev` when feature complete, merge to `main` when phase complete

### What NOT to Commit

- `.env` files
- `node_modules/`
- `venv/` or `__pycache__/`
- `.DS_Store` or other OS files
- Uploaded face images (keep test-data/faces/ local only)
- Database dumps with real data

---

## Current Development Phase

**Phase:** [AGENT WILL UPDATE THIS]

**Status:** [NOT STARTED / IN PROGRESS / COMPLETED]

**Current Tasks:**

- [List specific tasks for this phase]

**Blockers:**

- [Any issues preventing progress]

**Completed:**

- [Checkboxes for completed items]

---

## Agent Instructions

### When Starting a New Phase:

1. Read the phase description from `docs/development-plan.md`
2. Review relevant reference docs (`database-schema.md`, `api-endpoints.md`)
3. Check test-data/ folder for any required seed data
4. Use MCP server for database operations where appropriate
5. Document any direct DB changes in migration files
6. Test thoroughly before marking phase complete

### When Writing Code:

- Follow existing code style and structure
- Add comments for complex logic
- Use meaningful variable and function names
- Handle errors gracefully with try-catch
- Validate all inputs
- Log important operations (not sensitive data)

### When Using MCP Server:

- Document the purpose of the operation
- Save migration SQL to supabase/migrations/
- Test queries before applying schema changes
- Verify RLS policies work as expected
- Commit migrations to Git

### When Stuck:

- Review this context document
- Check reference docs
- Test components in isolation
- Ask for clarification on requirements
- Suggest alternative approaches if blocked

---

## Success Criteria

A phase is considered complete when:

- [ ] All features described in the phase work end-to-end
- [ ] Backend endpoints tested with Postman (if applicable)
- [ ] Frontend UI functional and styled (if applicable)
- [ ] Database operations verified (if applicable)
- [ ] Error handling implemented
- [ ] Code committed to Git with descriptive message
- [ ] Documentation updated if needed
- [ ] No console errors or warnings (except known/acceptable ones)

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Express Docs:** https://expressjs.com/
- **React Docs:** https://react.dev/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **DeepFace Repo:** https://github.com/serengil/deepface
- **Tailwind CSS:** https://tailwindcss.com/docs

---

**Last Updated:** [Date]
**Project Status:** [Development Phase Number]
**Next Milestone:** [Brief description]
