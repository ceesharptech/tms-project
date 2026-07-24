# T.0.M.S — Digital Driver Identification and Traffic Offence Penalty System

> A web-based enforcement platform that digitally identifies drivers using facial recognition and manages traffic offence penalties through a centralised, strike-based escalation system.
>
> Built as a final year Computer Science university project.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Docker — Recommended)](#getting-started-docker--recommended)
- [Getting Started (Manual Setup)](#getting-started-manual-setup)
- [Default Credentials](#default-credentials)
- [API Overview](#api-overview)
- [Environment Variables Reference](#environment-variables-reference)
- [Database Schema](#database-schema)
- [Development Notes](#development-notes)

---

## Project Overview

T.O.M.S is a digital traffic enforcement system designed to replace manual, paper-based processes. Traffic officers in the field can identify drivers by capturing a photo, which is matched against a central database using facial recognition. Once a driver is identified, officers can issue offences which automatically calculate fines and update the driver's strike count. An escalating penalty system flags or suspends repeat offenders automatically.

Administrators manage the system through a separate dashboard — registering drivers, enrolling face biometrics, configuring offence types, setting penalty tiers, and viewing analytics.

The system is built across three independent services that communicate over HTTP, making each component independently testable and deployable.

---

## Key Features

### For Officers
- Identify drivers in the field by uploading a face photo
- Manual fallback search by name, licence number, or plate number
- Issue traffic offences with automatic penalty calculation
- View offence history and driver profiles
- Step-by-step offence issuance wizard with penalty preview before confirming

### For Administrators
- Register and manage driver profiles
- Enrol driver biometrics (3–5 face images per driver, processed via ArcFace)
- Duplicate face detection to prevent the same person being registered twice
- Create and manage offence types (name, severity, base fine, strike weight)
- Configure escalating penalty tiers (strike ranges, fine multipliers, status triggers)
- View full offence history with filters
- Analytics dashboard with key enforcement metrics
- Manage officer accounts

### System-wide
- JWT-based authentication with access + refresh token rotation
- Role-based access control (officer vs admin) enforced at the API level
- Atomic offence issuance — strike update, fine calculation, status change, and audit log all commit or all roll back together (PostgreSQL stored procedure)
- Immutable audit trail — offence records and audit logs cannot be deleted
- PDF export for offence receipts

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│              React 18 + Vite + Tailwind CSS                 │
│                      Port: 80 (Docker) / 5173 (dev)        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST (Axios)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                      │
│                   Node.js + Express.js                      │
│                      Port: 5000                             │
│  • JWT Authentication & Role-based Authorisation            │
│  • Strike & penalty calculation orchestration               │
│  • API gateway for all database and ML operations           │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               │ pg / Supabase client     │ HTTP/REST
               ▼                          ▼
┌──────────────────────────────┐  ┌─────────────────────────┐
│   DATABASE LAYER             │  │   ML SERVICE            │
│   PostgreSQL 16              │  │   Python FastAPI        │
│   Port: 5432                 │  │   Port: 8000            │
│   • All persistent data      │  │   • Face enrollment     │
│   • Stored procedures (RPC)  │  │   • Face identification │
│   • Immutable audit logs     │  │   • DeepFace + ArcFace  │
└──────────────────────────────┘  └─────────────────────────┘
```

**Communication flow:**
1. User action in React triggers an HTTP request to Express
2. Express validates the JWT, checks the role, and executes business logic
3. Database operations go through the backend — never directly from the frontend
4. Face recognition requests are forwarded by Express to the Python microservice
5. Express aggregates the results and returns a single response to the frontend

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Axios, Recharts, jsPDF |
| Backend | Node.js 18+, Express.js, JWT (jsonwebtoken), bcrypt |
| Database | PostgreSQL 16 (Docker) / Supabase (production) |
| Face Recognition | Python 3.13, FastAPI, DeepFace, ArcFace, OpenCV, Pillow |
| Containerisation | Docker, Docker Compose |
| State Management | React Context API |
| PDF Export | jsPDF + jsPDF-AutoTable |

---

## Project Structure

```
tms-project/
├── backend/                        # Express.js API server
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification middleware
│   │   └── roleCheck.js            # Role-based access control
│   ├── routes/
│   │   ├── auth.js                 # Login, refresh, logout
│   │   ├── drivers.js              # Driver CRUD + face enrolment
│   │   ├── offences.js             # Offence issuance + history
│   │   ├── offenceTypes.js         # Offence type management
│   │   └── penaltyRules.js         # Penalty tier configuration
│   ├── utils/
│   │   ├── db.js                   # Database abstraction (Supabase / local pg)
│   │   └── jwt.js                  # Token generation and verification helpers
│   ├── types/
│   │   └── database.types.ts       # Auto-generated TypeScript types from schema
│   └── server.js                   # Express app entry point
│
├── frontend/                       # React + Vite SPA
│   ├── src/
│   │   ├── components/             # Shared UI components
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global authentication state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── DriverProfile.jsx
│   │   │   ├── officer/            # Officer-only pages
│   │   │   └── admin/              # Admin-only pages
│   │   ├── services/
│   │   │   └── api.js              # Axios instance with token interceptors
│   │   └── utils/
│   │       ├── formatters.js       # Currency, multiplier, severity formatting
│   │       └── penaltyValidation.js
│   └── nginx.conf                  # Nginx config for React Router in Docker
│
├── face-service/                   # Python FastAPI microservice
│   ├── main.py                     # FastAPI app + endpoints
│   ├── models/                     # Pydantic request/response models
│   ├── utils/
│   │   ├── image_processing.py     # OpenCV face detection and preprocessing
│   │   └── embedding_utils.py      # ArcFace embedding extraction and comparison
│   └── requirements.txt
│
├── supabase/
│   └── migrations/                 # SQL migration files (applied in order)
│       ├── 001_initial_schema.sql  # Tables, indexes, RLS, seed data
│       ├── 002_...
│       ├── 003_...
│       └── 004_issue_offence_rpc.sql  # Atomic offence transaction function
│
├── docker-compose.yml              # Orchestrates all 4 containers
├── .env.example                    # Environment variable template
└── README.md
```

---

## Getting Started (Docker — Recommended)

This is the easiest way to run the full application. A single command brings up all four services with a pre-seeded database. No Node.js, Python, or PostgreSQL installation required on your machine.

### Prerequisites

- [Docker Desktop](https://docs.docker.com/desktop/) installed and running
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ceesharptech/tms-project.git
cd tms-project
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open the `.env` file and fill in the following three values — everything else can stay as the default for local development:

| Variable | What to set |
|---|---|
| `POSTGRES_PASSWORD` | Any password you choose for the local database |
| `JWT_SECRET` | A long random string (e.g. run `openssl rand -hex 32`) |
| `REFRESH_TOKEN_SECRET` | A different long random string |

### 3. Start the application

```bash
docker compose up --build
```

> **First run note:** The face recognition service image takes several minutes to build because it pre-downloads and bakes in the ArcFace model (~500 MB). This only happens once. Subsequent starts are fast.

Watch the terminal until you see all four services reporting healthy. The application is ready when the backend logs:

```
[DB] Running in LOCAL POSTGRES mode
Server running on port 5000
```

### 4. Access the application

| Service | URL |
|---|---|
| Frontend (main app) | http://localhost |
| Backend API | http://localhost:5000 |
| Face Recognition Service | http://localhost:8000 |

### Stopping the application

```bash
# Stop all containers (your data is preserved)
docker compose down

# Stop and wipe the database (full reset to seed data)
docker compose down -v
```

To run in the background:

```bash
docker compose up --build -d

# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f tms-backend
```

---

## Getting Started (Manual Setup)

If you prefer to run the services directly without Docker, follow these steps. You will need Node.js 18+, Python 3.13, and PostgreSQL 16 installed.

### 1. Clone and set up environment variables

```bash
git clone https://github.com/ceesharptech/tms-project.git
cd tms-project
cp .env.example .env
```

Fill in all values in `.env`.

### 2. Set up the database

Create a local PostgreSQL database and run the migrations in order:

```bash
psql -U postgres -c "CREATE DATABASE tms_local;"
psql -U postgres -d tms_local -f supabase/migrations/001_initial_schema.sql
psql -U postgres -d tms_local -f supabase/migrations/002_...sql
psql -U postgres -d tms_local -f supabase/migrations/003_...sql
psql -U postgres -d tms_local -f supabase/migrations/004_issue_offence_rpc.sql
```

### 3. Start the backend

```bash
cd backend
npm install
node server.js
```

The backend will start on port 5000.

### 4. Start the face recognition service

```bash
cd face-service
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

> The first run will download the ArcFace model (~500 MB). This is a one-time download.

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:5173.

---

## Default Credentials

These accounts are seeded automatically when the database is first created.

| Role | Login identifier | Password |
|---|---|---|
| Admin | `admin@ddits.com` | `admin12345` |
| Officer | `officer@ddits.com` | `Officer123!` |

> You can log in using either the email address or the 6-digit officer ID number.

---

## API Overview

All API routes are prefixed with `/api`. Protected routes require a valid JWT access token in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login with email/officer_id and password |
| POST | `/api/auth/refresh` | Public | Obtain a new access token using a refresh token |
| POST | `/api/auth/logout` | Authenticated | Invalidate the current refresh token |
| GET | `/api/health` | Public | Service health check |

### Drivers

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/drivers` | Officer, Admin | List/search all drivers |
| GET | `/api/drivers/:id` | Officer, Admin | Get a single driver profile |
| POST | `/api/drivers` | Admin | Register a new driver |
| PUT | `/api/drivers/:id` | Admin | Update driver details |
| POST | `/api/drivers/:id/enroll-face` | Admin | Enrol face images for a driver |
| POST | `/api/drivers/identify` | Officer, Admin | Identify a driver from a face image |

### Offences

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/offences` | Officer, Admin | List offences (officers see only their own) |
| POST | `/api/offences/calculate-penalty` | Officer, Admin | Preview penalty calculation without saving |
| POST | `/api/offences/issue` | Officer, Admin | Issue an offence (atomic transaction) |

### Offence Types

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/offence-types` | Officer, Admin | List all offence types |
| POST | `/api/offence-types` | Admin | Create a new offence type |
| PUT | `/api/offence-types/:id` | Admin | Update an offence type |
| DELETE | `/api/offence-types/:id` | Admin | Soft-delete (deactivate) an offence type |

### Penalty Rules

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/penalty-rules` | Officer, Admin | List all penalty tiers |
| POST | `/api/penalty-rules` | Admin | Create a new penalty tier |
| PUT | `/api/penalty-rules/:id` | Admin | Update a penalty tier |
| DELETE | `/api/penalty-rules/:id` | Admin | Delete a penalty tier |

### Face Service (internal — called by the backend only)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/enroll` | Extract and return a face embedding from an image |
| POST | `/identify` | Compare a face image against a stored embedding |
| GET | `/health` | Service health check |

---

## Environment Variables Reference

Copy `.env.example` to `.env` and fill in your values.

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_USER` | Yes | PostgreSQL username for the Docker container |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password — choose a strong one |
| `POSTGRES_DB` | Yes | Database name |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |
| `NODE_ENV` | Yes | `production` for Docker, `development` for local |
| `PORT` | Yes | Backend port (default: 5000) |
| `JWT_ACCESS_SECRET` | Yes | Secret key for signing access tokens — must be long and random |
| `JWT_REFRESH_SECRET` | Yes | Secret key for signing refresh tokens — must differ from access secret |
| `JWT_ACCESS_EXPIRY` | Yes | Access token lifetime (default: `30m`) |
| `JWT_REFRESH_EXPIRY` | Yes | Refresh token lifetime (default: `7d`) |
| `FACE_SERVICE_URL` | Yes | URL of the Python face service (internal Docker: `http://tms-face-service:8000`) |
| `FACE_RECOGNITION_THRESHOLD` | Yes | Cosine distance threshold for ArcFace matching (default: `0.4`) |
| `VITE_API_URL` | Yes | Backend URL as seen from the browser (default: `http://localhost:5000`) |
| `USE_LOCAL_DB` | No | Set to `true` to use local Postgres instead of Supabase |
| `SUPABASE_URL` | No | Only needed if connecting to Supabase instead of local Postgres |
| `SUPABASE_SERVICE_KEY` | No | Only needed if connecting to Supabase instead of local Postgres |

---

## Database Schema

The system uses six tables:

| Table | Purpose |
|---|---|
| `users` | System accounts — officers and administrators |
| `drivers` | Driver profiles including biometric face embeddings (JSONB) |
| `offences` | Immutable record of every issued offence |
| `offence_types` | Configurable catalogue of traffic violations |
| `penalty_rules` | Strike range tiers that define fine multipliers and status escalation |
| `audit_logs` | Immutable log of all significant system events |

**Key design decisions:**

- `drivers.face_embedding` is stored as JSONB in the format `{"embedding": [...512 floats], "model": "ArcFace", "enrolled_at": "..."}`, avoiding binary storage complexity while remaining queryable.
- `drivers.contact` is JSONB (`{"phone": "...", "email": "..."}`) to support structured access without separate columns.
- Offence issuance is handled by a single PostgreSQL stored procedure (`issue_offence_transaction`) that atomically updates `offences`, `drivers` (strike count and status), and `audit_logs` in a single transaction. If any step fails, all changes roll back.
- Row Level Security (RLS) is enabled on all tables for Supabase mode. In Docker mode, the backend connects directly to Postgres using the service role and enforces access control at the Express middleware layer.

---

## Development Notes

### Switching between Supabase and local Postgres

The backend supports two database modes controlled by the `USE_LOCAL_DB` environment variable:

- `USE_LOCAL_DB=true` — connects to local Postgres via the `pg` library using `DATABASE_URL`
- `USE_LOCAL_DB` absent or `false` — connects to Supabase using `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

In Docker mode, `USE_LOCAL_DB=true` is set automatically in `docker-compose.yml`.

### Face recognition threshold

The ArcFace matching threshold (default `0.4`) controls match sensitivity:
- Lower values (0.30–0.35) are stricter — fewer false positives but may miss valid matches
- Higher values (0.45–0.50) are looser — catches more matches but risks false positives

Adjust `FACE_RECOGNITION_THRESHOLD` in your `.env` to tune for your test dataset.

### Token lifetimes

- Access tokens expire after 30 minutes by default
- Refresh tokens expire after 7 days
- The frontend automatically uses the refresh token to obtain a new access token when a 401 response is received — no manual re-login needed during an active session

### Commit message format

```
feat: Add driver registration API endpoint
fix: Correct strike count calculation in RPC function
docs: Update API endpoint documentation
refactor: Simplify face enrollment logic
```

---

## Current Build Status

| Phase | Description | Status |
|---|---|---|
| 0 | Project scaffolding | Done |
| 1 | Database schema and seed data | Done |
| 2 | Authentication system (JWT) | Done |
| 3 | Python facial recognition service | Done |
| 4 | Driver management backend | Done |
| 5 | Driver management frontend | Done |
| 6 | Facial identification UI | Done |
| MT | Driver profile pictures | Done |
| 7 | Offence types and penalty rules | Done |
| 8 | Strike engine and offence issuance | Done |
| 9 | Offence history and audit logs | In progress |
| 10 | Analytics dashboard | Pending |
| 11 | UI polish and responsive design | Pending |
| 12 | Testing and bug fixes | Pending |
| 13 | Documentation and deployment | Pending |

---

## Acknowledgements

- [DeepFace](https://github.com/serengil/deepface) — facial recognition framework
- [ArcFace](https://arxiv.org/abs/1801.07698) — face recognition model
- [Supabase](https://supabase.com) — PostgreSQL platform used in production
- [Tailwind CSS](https://tailwindcss.com) — utility-first CSS framework
- [Recharts](https://recharts.org) — charting library for the analytics dashboard
