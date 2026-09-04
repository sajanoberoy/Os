-- Campus AI Database Schema (SQLite / MySQL Compatible)
-- Location: database/campus_ai.sql

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NULL,
    question TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Seeded Demo User
-- Default password: campus2026 (hashed with standard password_hash)
INSERT INTO users (email, password, name) 
VALUES ('demo@student.com', '$2y$10$eO0kW4yXw1aF7n7iCgqBbe0mZ8uG.U0j.P2OaKzV6e9mY4iH.C2qG', 'Alex Rivera (Demo Student)')
ON CONFLICT(email) DO NOTHING;
