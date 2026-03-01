# HedgeTrack

CRM for students going through IB/PE recruiting. You store contacts (name, firm, job title, email), log notes from calls and coffee chats, set follow-up dates, and track applications in a pipeline (Applied → First Round → Superday → Offer). Everything stays in one place instead of scattered spreadsheets.

## Stack

- **Frontend:** React, HTML/CSS. Node for running the dev server.
- **Backend:** Python + Flask. Virtual env and pip for dependencies.
- **DB:** PostgreSQL (local via Homebrew). pgAdmin or DBeaver to look at tables.
- **Other:** VS Code, Figma for wireframes, Git/GitHub, deploy on Vercel when done.

React talks to Flask via API calls. React Router will handle navigation so the app doesn’t do full page reloads.

## What the app does (4 main parts)

1. **Auth** – Sign up with email/password, log in, log out. Data is per user.
2. **Contact directory** – Add/edit/delete people. Filter by firm or job title. Click someone to open their profile.
3. **Interaction logger** – On a contact’s profile: add notes with a date, set a “next follow-up” date. See a chronological list of all past interactions.
4. **Application tracker** – Kanban board. Create applications and drag them between columns (Applied, First Round, Superday, Offer).

## UI

- Sidebar for Dashboard, Directory, Tracker. React Router switches the main area without reloading.
- Directory: table with sortable columns; click a name to go to that contact’s page.
- Contact profile: split layout – one side form + date picker for new notes, other side timeline of past notes.
- Tracker: columns = stages, cards = applications (firm + role). Drag and drop. Use flexbox/grid and media queries so it works on different screen sizes.

## Database

PostgreSQL with 4 tables: **users**, **contacts** (linked to users), **interactions** (linked to contacts), **applications** (linked to users). Schema is in `database/schema.sql`.

## Seeding and demo

Use a Python script + Faker to generate fake contacts and interactions for testing the table and filters. Before final demo, clear that data and use your real recruiting notes.

## Work plan

**Week of Feb 23**  
Design the users table and schema. Build register/login in React (with basic validation). In Flask, hash passwords and add auth endpoints. Record a short backup video of auth working.

**Week of Mar 2**  
Checkpoint 1 demo. Turn Figma into React (dashboard + sidebar). Add the contacts table and wire it to users. Add GET and POST for contacts in Flask.

## Demo (Linux lab)

Practice first. Prefer screen share from your laptop; have adapters for the projector. If something goes wrong, have a pre-recorded run-through to send.
