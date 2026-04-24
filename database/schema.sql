CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    firm VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_follow_up TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'applications'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'firm'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'firm_name'
    ) THEN
      ALTER TABLE applications RENAME COLUMN firm TO firm_name;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'stage'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'status'
    ) THEN
      ALTER TABLE applications RENAME COLUMN stage TO status;
      UPDATE applications SET status = CASE LOWER(status)
        WHEN 'applied' THEN 'Applied'
        WHEN 'first_round' THEN 'First Round'
        WHEN 'superday' THEN 'Superday'
        WHEN 'offer' THEN 'Offer'
        ELSE status
      END;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'Applied',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
