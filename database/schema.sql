-- HedgeTrack database schema
-- Run with: psql hedgetrack -f database/schema.sql

-- Users table (auth)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
