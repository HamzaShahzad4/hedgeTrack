# Changelog

## Checkpoint 1 – User auth

- **Backend:** Flask app with CORS, SQLAlchemy, PostgreSQL. `users` table (id, email, password_hash, created_at). Routes: `/api/register`, `/api/login`. Passwords hashed with werkzeug; signed token returned on success.
- **Frontend:** React + Vite, react-router-dom. Register and Login pages with client-side validation; token stored in localStorage. Protected route redirects to login when unauthenticated.
- **DB:** `database/schema.sql` defines `users` and index on email.

## Week of Mar 2 – Dashboard layout + sidebar navigation

- **Created:** `frontend/src/components/Sidebar.jsx` (persistent nav links: Dashboard, Directory, Tracker).
- **Created:** `frontend/src/components/Layout.jsx` (split layout with sidebar + `<Outlet />` content region).
- **Created:** `frontend/src/pages/Directory.jsx` and `frontend/src/pages/Tracker.jsx` placeholder pages.
- **Updated:** `frontend/src/App.jsx` to use nested routes so authenticated pages render inside `Layout`, and sidebar navigation swaps views without full page reload.

## Step 2 – Backend Contacts API

- **Updated:** `backend/models.py` to add `Contact` model (id, user_id, name, firm, job_title, email, created_at) with FK to `users.id`.
- **Updated:** `backend/app.py` to add authenticated routes:
  - `POST /api/contacts` (creates a contact for the current user)
  - `GET /api/contacts` (lists contacts for the current user)

## Step 3 – Directory frontend + contacts integration

- **Updated:** `frontend/src/pages/Directory.jsx` to fetch contacts on mount (GET `/api/contacts`) using the stored token, create contacts via POST `/api/contacts`, and refresh the list without page reload.
- **Added:** client-side search with filter-by (firm or job title) and a responsive contacts table (Name, Firm, Title, Email, Date Added).

## Checkpoint 3 – Interactions and follow-up reminders (backend)

- **Updated:** `backend/models.py` — `Contact.next_follow_up` (nullable timestamp); new `Interaction` model (`id`, `contact_id` FK, `type`, `date`, `notes`, `created_at`) with one-to-many from `Contact` to `Interaction`.
- **Updated:** `backend/app.py` — authenticated routes:
  - `GET /api/contacts/<contact_id>/interactions` — chronological interaction history for that contact (must belong to current user).
  - `POST /api/contacts/<contact_id>/interactions` — body `type`, `date` (optional ISO), `notes`; saves interaction and sets parent `next_follow_up` to 30 days after the interaction `date`.
  - `GET /api/reminders` — contacts for the current user with `next_follow_up` set and `next_follow_up` on or before seven days from now (includes overdue).
- **Updated:** `database/schema.sql` — `contacts` (with `next_follow_up`), `interactions`, and `ALTER` for existing `contacts` tables.

## Contact profile + interaction timeline (frontend)

- **Created:** `frontend/src/pages/Profile.jsx` — split layout: contact details (left) and interaction history (right); loads contact via GET `/api/contacts` + history via GET `/api/contacts/<id>/interactions` on mount.
- **Added:** interaction form (type dropdown, date, notes) posting to POST `/api/contacts/<id>/interactions`; on success updates local state so the timeline refreshes without a full page reload; shows `next_follow_up` when present.
- **Updated:** `frontend/src/App.jsx` — protected route `/contact/:id`.
- **Updated:** `frontend/src/pages/Directory.jsx` — contact names link to `/contact/:id`.
- **Updated:** `frontend/src/App.css` — profile split-screen, timeline, form, and table link styles.
- **Follow-up choice:** `POST /api/contacts/<id>/interactions` accepts optional `next_follow_up` (ISO). If omitted, `next_follow_up` is set to interaction date + 30 days. Profile form: radio “Automatic (30 days)” vs “Choose my own date” + date input.

## Dashboard follow-up notifications (Checkpoint 3 frontend)

- **Updated:** `frontend/src/pages/Dashboard.jsx` — on mount, fetches GET `/api/reminders` with `Authorization: Bearer` token; shows a prominent reminder card grid for contacts with follow-up in the next 7 days or overdue, with clear due messaging and a `<Link>` to `/contact/:id` per item.
- **Updated:** `frontend/src/App.css` — styles for reminder section, badges (overdue / today / soon), and responsive card grid.

## Checkpoint 4 – Application tracker (backend + Kanban API)

- **Model (`backend/models.py`):** `Application` — `id`, `user_id` (FK → `users`), `firm_name`, `role`, `status` (`Applied` | `First Round` | `Superday` | `Offer`), `created_at`.
- **Routes (`backend/app.py`):**
  - `GET /api/applications` — list all applications for the authenticated user.
  - `POST /api/applications` — create card; JSON `firm_name`, `role`; optional `status` (defaults to `Applied`). Accepts legacy `firm` for older clients.
  - `PUT /api/applications/<id>` — update `status` when a card moves column (JSON `status` with one of the four labels). `PATCH` is accepted for the same handler and still accepts legacy JSON `stage` slugs (`applied`, `first_round`, etc.).
  - `DELETE /api/applications/<id>` — delete a card (scoped to owner).
- **DB (`database/schema.sql`):** `applications` with `firm_name` / `status`; DO block migrates legacy `firm` / `stage` columns if present.
- **Frontend:** `Tracker.jsx` updated to `firm_name`, `status`, and `PUT` for moves.

## Checkpoint 4 – Application tracker Kanban (frontend)

- **Updated:** `frontend/src/pages/Tracker.jsx` — Kanban board with four vertical columns (**Applied**, **First Round**, **Superday**, **Offer**). On mount, loads cards via `GET /api/applications` and buckets them by `status`. Top form collects **Firm name** and **Role** only; `POST /api/applications` relies on the API default (`Applied`). HTML5 drag-and-drop: draggable cards, columns accept `drop` after `dragover` prevention. **Optimistic UI:** `setState` moves the card to the target column immediately; a **background** `PUT /api/applications/<id>` with `{ status }` persists the move—on HTTP or network failure, that card’s `status` is reverted and an error alert is shown. Loading state uses a four-column skeleton grid. Drop-target column gets a subtle highlight while dragging over it.
- **Updated:** `frontend/src/App.css` — Kanban uses **CSS Grid** (`repeat(4, minmax(0, 1fr))`) for the live board and matching skeleton; form uses a compact **grid** row (two fields + submit). Column headers (title + count), drop-target styling, shimmer placeholders, and responsive single-column stack under 900px.

## Checkpoint 4 – Volume test script + responsive UI polish

- **Added:** `backend/generate_fake_data.py` — standalone script using **Faker** + **psycopg2** + `DATABASE_URL` from `.env`. Inserts **exactly 100** fake `contacts` rows (`name`, `firm`, `job_title`, `email` with unique `@fake.hedgetrack.volume` addresses) for a target user chosen via **`FAKE_DATA_USER_EMAIL`** or **`FAKE_DATA_USER_ID`**. Run instructions are in the file docstring (`cd backend` then `python generate_fake_data.py`).
- **Updated:** `backend/requirements.txt` — added **`Faker>=24.0.0`** for the generator script.
- **Updated:** `frontend/src/App.css` — responsive pass at **1200px**, **1024px**, **768px**, and **480px**: narrower sidebar and main padding on medium screens; **≤768px** turns the shell into a **column layout** with a **compact horizontal sidebar** (brand + row nav + logout); **`.page` / `.card`** get **`min-width: 0`** so flex children shrink; **`.table-wrap`** gets touch-friendly horizontal scroll (`-webkit-overflow-scrolling`, `overscroll-behavior-x`); **Directory** table keeps a **`min-width`** so columns stay readable while the wrapper scrolls; **Kanban** uses **4 → 2 → 1** columns (**>1024** / **≤1024** / **≤480**); dashboard **reminder grid** tightens min card width then goes single-column on small phones.

## Application tracker (Kanban) — earlier iteration

- Superseded by Checkpoint 4 above (was `firm` / `stage` + PATCH-only update).
