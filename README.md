# HedgeTrack

CRM for students navigating investment banking and private equity recruitment. Built with **React** (frontend), **Flask** (backend), and **PostgreSQL** (database). See [PROJECT.md](./PROJECT.md) for full specifications and work plan.

## Requirements

- **macOS** (MacBook)
- **VS Code** (or another IDE)
- **Node.js** (for React and npm)
- **Python 3** (for Flask)
- **PostgreSQL** (via Homebrew)
- **Git** and **GitHub**
- **pgAdmin** or **DBeaver** (optional, for database management)

All of the above are free for students.

---

## Quick Start (Mac)

### 1. Clone and open the project

```bash
cd ~/hedgeTrack   # or your project path
```

### 2. PostgreSQL

Install and start PostgreSQL (if not already installed):

```bash
brew install postgresql@16
brew services start postgresql@16
```

Create the database and run the schema:

```bash
createdb hedgetrack
psql hedgetrack -f database/schema.sql
```

Or use pgAdmin/DBeaver: create a database named `hedgetrack`, then run the SQL in `database/schema.sql`.

### 3. Backend (Flask)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set SECRET_KEY and DATABASE_URL if needed (defaults work for local)
python app.py
```

Backend runs at **http://127.0.0.1:5000**. Health check: http://127.0.0.1:5000/api/health

### 4. Frontend (React)

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**. It proxies `/api` to the Flask server.

### 5. Test auth

- Open http://localhost:5173/register and create an account.
- Log in at http://localhost:5173/login.

---

## Project structure

```
hedgeTrack/
├── PROJECT.md          # Full spec, UI, DB, work plan
├── README.md           # This file
├── database/
│   └── schema.sql      # PostgreSQL schema (users, contacts, interactions, applications)
├── backend/            # Python Flask API
│   ├── app.py
│   ├── config.py
│   ├── db.py
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── auth.py     # Register, login, logout
│       └── contacts.py # GET/POST contacts (filter by firm, job_title)
└── frontend/           # React (Vite) SPA
    ├── index.html
    ├── package.json
    ├── vite.config.js  # Proxies /api to Flask
    └── src/
        ├── App.jsx     # React Router + layout
        ├── App.css     # Sidebar + auth styles
        ├── main.jsx
        ├── components/
        │   └── Sidebar.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── Directory.jsx
            ├── Tracker.jsx
            ├── Login.jsx
            └── Register.jsx
```

---

## Version control and CI/CD

- Use **Git** for version control and **GitHub** for the remote repo.
- Push regularly so your work is backed up.
- For CI/CD, you can add GitHub Actions later (e.g. run tests, lint) and host the frontend on **Vercel** (connects to your GitHub repo).

---

## Work plan (from PROJECT.md)

- **Week of Feb 23:** DB schema for users, React register/login + validation, Flask auth (hash passwords, API routes), backup video + notes.
- **Week of Mar 2:** Checkpoint 1 demo; Figma → React dashboard + sidebar; Contacts table + FKs; GET/POST contacts APIs.

The codebase is set up so you can implement and demo these steps. Add session/JWT when you’re ready to protect routes and pass `user_id` from the logged-in user instead of query params.
