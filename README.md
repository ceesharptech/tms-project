# TMS — Digital Driver Identification and Traffic Offence Penalty System

A web-based enforcement platform for digitally identifying drivers using facial recognition
and managing traffic offence penalties through a centralised strike-based system.

Built as a final year university project.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Face Recognition:** Python FastAPI + DeepFace (ArcFace model)
- **Database:** PostgreSQL 17

## Prerequisites

- [Docker Desktop](https://docs.docker.com/desktop/) installed and running
- Git

## Running the Application

### 1. Clone the repository

    git clone https://github.com/ceesharptech/tms-project.git
    cd ddits

### 2. Set up environment variables

    cp .env.example .env

Open `.env` and fill in the following required values:

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Password for the local database |
| `JWT_ACCESS_SECRET` | Long random string for signing access tokens |
| `JWT_REFRESH_SECRET` | Long random string for signing refresh tokens |

All other values can be left as their defaults for local development.

### 3. Start the application

    docker compose up --build

> **First run note:** The face recognition service will take several minutes to build
> as it pre-downloads the ArcFace model (~500MB). This only happens once.

### 4. Access the application

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:5000 |
| Face Service | http://localhost:8000 |

### Default credentials (seeded automatically)

| Role | Email | Password |
|---|---|---|
| Admin | admin@ddits.com | admin12345 |
| Officer | officer@ddits.com | Officer123! |

## Stopping the Application

    docker compose down          # stop (data is preserved)
    docker compose down -v       # stop and wipe database (full reset)

## Architecture

The system runs as four Docker containers:

- `tms-postgres` — PostgreSQL database (auto-migrated on first run)
- `tms-backend` — Express.js REST API on port 5000
- `tms-face-service` — Python FastAPI microservice on port 8000
- `tms-frontend` — React app served via Nginx on port 80