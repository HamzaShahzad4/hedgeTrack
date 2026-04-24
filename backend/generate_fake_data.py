#!/usr/bin/env python3
"""
HedgeTrack volume test: insert exactly 100 fake rows into `contacts` for one user.

Uses the same PostgreSQL connection string as the Flask app (`DATABASE_URL` in `.env`).

## Prerequisites

- Local PostgreSQL running with the HedgeTrack schema applied (`database/schema.sql`).
- Python 3.10+ recommended.
- Install dependencies (includes Faker after you run `pip install -r requirements.txt`):

      cd backend
      pip install -r requirements.txt

## Choose the owning user (required — pick one)

The script must know which `users.id` receives the 100 contacts.

**Option A — by email (typical for a test login):**

      export FAKE_DATA_USER_EMAIL='your-test-account@example.com'

**Option B — by numeric user id:**

      export FAKE_DATA_USER_ID=1

## Run

From the `backend/` directory (so `.env` is found next to this file):

      cd backend
      python generate_fake_data.py

Or from the repository root:

      python backend/generate_fake_data.py

On success you will see a short summary including `user_id` and `rows_inserted`.

## Notes

- Emails are generated with a unique suffix so they do not collide with real data
  (`…@fake.hedgetrack.volume`).
- `next_follow_up` is left NULL (matches optional field on `contacts`).
- Safe to run multiple times: each run adds another 100 contacts (not idempotent).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from faker import Faker


BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv()

NUM_CONTACTS = 100


def _resolve_user_id(cur) -> int:
    raw_id = os.getenv("FAKE_DATA_USER_ID")
    if raw_id is not None and str(raw_id).strip():
        return int(raw_id)

    email = (os.getenv("FAKE_DATA_USER_EMAIL") or "").strip()
    if not email:
        print(
            "Error: set FAKE_DATA_USER_EMAIL or FAKE_DATA_USER_ID.\n"
            "See the docstring at the top of generate_fake_data.py for examples.",
            file=sys.stderr,
        )
        sys.exit(1)

    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    if not row:
        print(f"Error: no user found with email {email!r}", file=sys.stderr)
        sys.exit(1)
    return int(row[0])


def main() -> None:
    database_url = os.getenv("DATABASE_URL", "postgresql://localhost:5432/hedgetrack")
    fake = Faker()
    Faker.seed(42)

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            user_id = _resolve_user_id(cur)

            insert_sql = """
                INSERT INTO contacts (user_id, name, firm, job_title, email)
                VALUES (%s, %s, %s, %s, %s)
            """

            for i in range(NUM_CONTACTS):
                name = fake.name()
                firm = fake.company()
                job_title = fake.job()
                local = fake.user_name().lower().replace(" ", "")[:40] or "user"
                email = f"{local}.vol{i:03d}.{fake.uuid4()[:8]}@fake.hedgetrack.volume"
                cur.execute(insert_sql, (user_id, name, firm, job_title, email))

            conn.commit()

        print(f"Inserted {NUM_CONTACTS} contacts for user_id={user_id}.")
    except Exception as exc:
        conn.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
