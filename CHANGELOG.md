# Changelog – HedgeTrack Checkpoint 1 (User Authentication)

This document summarizes all changes made to complete **Checkpoint 1: User Authentication** for HedgeTrack. No code was added for contacts, interactions, or the application tracker (Kanban board).

---

## 1. Backend (Python/Flask)

### 1.1 `backend/app.py` (created)

- **Purpose:** Entry point for the Flask server.
- **Behavior:**
  - Creates the Flask app and loads `SQLALCHEMY_DATABASE_URI` and `SECRET_KEY` from config.
  - Configures **CORS** via `flask-cors` for `http://localhost:5173` and `http://127.0.0.1:5173` so the React dev server can call the API.
  - Initializes SQLAlchemy with `db.init_app(app)`.
  - Registers the auth blueprint so `/api/register` and `/api/login` are available.
  - Defines a health check at `GET /api/health` returning `{"status": "ok"}`.
  - In `if __name__ == "__main__"`, runs `db.create_all()` inside an app context so the `users` table exists, then starts the server on `0.0.0.0:5000` with debug on.

### 1.2 `backend/config.py` (created)

- **Purpose:** Centralized configuration from the environment.
- **Behavior:**
  - Uses `python-dotenv` to load variables from `.env`.
  - Reads `DATABASE_URL` (default: `postgresql://localhost:5432/hedgetrack`) and `SECRET_KEY` (default: dev placeholder). Production should set these in `.env`.

### 1.3 `backend/models.py` (created)

- **Purpose:** SQLAlchemy model for the `users` table.
- **Behavior:**
  - Defines a shared `db = SQLAlchemy()` instance used by the app.
  - **User** model with columns: `id` (primary key), `email` (unique, indexed), `password_hash`, `created_at` (timezone-aware, server default).
  - `to_dict()` returns `id`, `email`, and `created_at` for JSON responses (no password hash).

### 1.4 `backend/routes/auth.py` (created)

- **Purpose:** Auth API: registration and login with secure password hashing and JSON error responses.
- **Behavior:**
  - **POST /api/register**
    - Expects JSON `{ "email", "password" }`.
    - Validates presence of email and password; enforces minimum password length of 8.
    - Uses `werkzeug.security.generate_password_hash(password, method="pbkdf2:sha256")` before storing.
    - Checks for existing user by email; on duplicate, returns `409` with `{"error": "An account with this email already exists"}`.
    - On success, creates the user, commits, and returns `201` with `message`, `user` (from `to_dict()`), and a signed `token` (see below).
  - **POST /api/login**
    - Expects JSON `{ "email", "password" }`.
    - Normalizes email (strip, lower). If user not found or password wrong, returns `401` with `{"error": "Invalid email or password"}` (same message to avoid email enumeration).
    - Uses `werkzeug.security.check_password_hash` to verify the password.
    - On success, returns `200` with `message`, `user`, and signed `token`.
  - **Token:** Built with `itsdangerous.URLSafeTimedSerializer` (salt `hedgetrack-auth`), payload `{"user_id": user.id}`, max age 7 days. Used for frontend “session” and future protected API checks.

### 1.5 `backend/.env.example` (updated)

- **Change:** Added a second line: `SECRET_KEY=your-secret-key-change-in-production`.
- **Note:** Existing `DATABASE_URL` line was left unchanged. Copy `.env.example` to `.env` and set real values locally; do not commit `.env`.

### 1.6 `backend/requirements.txt` (created)

- **Purpose:** Python dependencies for the backend.
- **Contents:** `flask`, `flask-cors`, `flask-sqlalchemy`, `psycopg2-binary`, `python-dotenv` (with version lower bounds). No existing file was overwritten; if you already have a `requirements.txt`, merge these packages in.

### 1.7 `database/schema.sql` (created)

- **Purpose:** PostgreSQL schema for the `users` table (optional if you rely on SQLAlchemy `create_all()`).
- **Behavior:** Defines `users` with `id`, `email` (unique), `password_hash`, `created_at`, and an index on `email`. Run with: `psql hedgetrack -f database/schema.sql`.

---

## 2. Frontend (React/Vite)

### 2.1 Router and entry

- **`frontend/index.html`** (created): Root HTML with `<div id="root">` and `<script type="module" src="/src/main.jsx">`.
- **`frontend/src/main.jsx`** (created): Renders the app with `ReactDOM.createRoot`, wraps the app in `<BrowserRouter>` from `react-router-dom`, and imports `App` and `App.css`.
- **`frontend/src/App.jsx`** (created): Defines routes with `react-router-dom`:
  - `/login` → `Login`
  - `/register` → `Register`
  - `/dashboard` → wrapped in `ProtectedRoute` → `Dashboard`
  - `/` and any unknown path → `<Navigate to="/dashboard" />` (then `ProtectedRoute` sends unauthenticated users to `/login`).

### 2.2 Auth components and protected route

- **`frontend/src/components/ProtectedRoute.jsx`** (created):
  - Reads token from `localStorage` under key `hedgetrack_token`.
  - If no token, renders `<Navigate to="/login" state={{ from: location }} replace />` so the user is sent to login and can return to the intended page after auth.
  - Exports `getStoredToken()` and `setStoredToken(token)` for login/register and logout.
- **`frontend/src/pages/Login.jsx`** (created):
  - Form: email, password. Client-side checks: non-empty email and password.
  - On submit: `POST /api/login` with JSON `{ email, password }`. On success, stores `data.token` via `setStoredToken`, then navigates to `location.state?.from?.pathname` or `/dashboard`. On error, shows `data.error` (or a generic message) in an error div.
- **`frontend/src/pages/Register.jsx`** (created):
  - Form: email, password, confirm password. Client-side checks: non-empty email, password length ≥ 8, password === confirmPassword.
  - On submit: `POST /api/register` with JSON `{ email, password }`. On success, stores token and navigates to `/dashboard`. On error (e.g. duplicate email), shows backend `data.error` in an error div.
- **`frontend/src/pages/Dashboard.jsx`** (created):
  - Placeholder dashboard: title, short welcome text, and a “Log out” button that clears the token via `setStoredToken(null)` and navigates to `/login`.

### 2.3 Styling and config

- **`frontend/src/App.css`** (created): Styles for auth pages (centered card, form groups, inputs, error box, buttons, link to login/register) and dashboard (layout, logout button). No external UI library.
- **`frontend/package.json`** (created): Dependencies `react`, `react-dom`, `react-router-dom`; dev dependencies `vite`, `@vitejs/plugin-react`. Scripts: `dev`, `build`, `preview`.
- **`frontend/vite.config.js`** (created): Uses `@vitejs/plugin-react`. Proxy: `/api` → `http://127.0.0.1:5000` so the React app can call the Flask API without CORS issues in development.

---

## 3. Step-by-step logic (Checkpoint 1)

1. **Backend**
   - Flask app loads config (DB URL, secret key), enables CORS for the Vite origin, and connects SQLAlchemy to PostgreSQL.
   - `User` model matches the `users` table; passwords are stored only as hashes (werkzeug, pbkdf2:sha256).
   - Register: validate input → hash password → insert user (or 409 if email exists) → return user + signed token.
   - Login: find user by email → verify password with `check_password_hash` → return same generic error on failure → on success return user + signed token.
2. **Frontend**
   - Router exposes `/login`, `/register`, and `/dashboard`; default route is `/dashboard`.
   - Protected route: any visit to `/dashboard` (or later protected routes) without a stored token redirects to `/login`.
   - Login/Register send POST to Flask, show backend error messages on failure, and on success save the token and redirect (login can redirect back to the page the user tried to open).
   - Logout clears the token and redirects to `/login`.

---

## 4. What was not added

- No contacts, interactions, or application tracker (Kanban) code.
- No changes to any existing `.env` or `requirements.txt` beyond adding `SECRET_KEY` to `.env.example` and creating a new `requirements.txt`; merge with your own if you already had one.

---

## 5. How to run

- **DB:** `createdb hedgetrack` then `psql hedgetrack -f database/schema.sql` (or rely on `db.create_all()`).
- **Backend:** `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cp .env.example .env` (edit `.env` if needed) then `python app.py`.
- **Frontend:** `cd frontend && npm install && npm run dev`.
- **Test:** Open `http://localhost:5173`, get redirected to login; register or log in; you should land on the dashboard. Visiting `/dashboard` while logged out should redirect to `/login`.
