# Traffic Offence Management System (T.O.M.S)

A web-based enforcement and driver identification platform using facial recognition and a centralized strike-based penalty engine.

---

## Architecture

| Service      | Tech                           | Port |
| ------------ | ------------------------------ | ---- |
| Frontend     | React 18 + Vite + Tailwind CSS | 5173 |
| Backend      | Node.js + Express.js           | 5000 |
| Face Service | Python + FastAPI + DeepFace    | 8000 |
| Database     | Supabase (PostgreSQL)          | —    |

---

## Quick Start

### Prerequisites

- Node.js v18+
- Python 3.13+
- npm v9+

---

### 1. Clone & navigate

```bash
git clone <repo-url>
cd tms-project
```

---

### 2. Backend (Express API)

```bash
cd backend
cp .env.example .env          # fill in your Supabase keys & JWT secrets
npm install
node server.js                   # starts on http://localhost:5000
```

Health check: `GET http://localhost:5000/health`

---

### 3. Frontend (React + Vite)

```bash
cd frontend
cp .env.example .env          # set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                   # starts on http://localhost:5173
```

---

### 4. Face Recognition Service (FastAPI)

```bash
cd face-service
cp .env.example .env          # adjust model settings if needed
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> **Note:** Full ML dependencies (`deepface`, `opencv-python`, `tf-keras`) are installed via `requirements.txt` but are only _used_ starting from Phase 3.

Health check: `GET http://localhost:8000/health`

---

### 5. Run all services simultaneously

Open three terminals and run each service as shown above, or use the convenience commands:

```bash
# Terminal 1 – Backend
cd backend && npm run dev

# Terminal 2 – Frontend
cd frontend && npm run dev

# Terminal 3 – Face Service
cd face-service && venv/Scripts/activate && uvicorn main:app --reload --port 8000
```

---

## Environment Variables

Copy `.env.example` → `.env` in each service directory and fill in the values.

| Service      | File                | Key variables                                        |
| ------------ | ------------------- | ---------------------------------------------------- |
| Backend      | `backend/.env`      | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET` |
| Frontend     | `frontend/.env`     | `VITE_API_URL`                                       |
| Face Service | `face-service/.env` | `MODEL_NAME`, `FACE_CONFIDENCE_THRESHOLD`            |

---

## Project Structure

```
tms-project/
├── frontend/          # React + Vite + Tailwind
├── backend/           # Express.js API
├── face-service/      # Python FastAPI + DeepFace
├── test-data/         # Sample drivers, offence types, face images
├── docs/              # Project documentation & schema
└── .gitignore
```
