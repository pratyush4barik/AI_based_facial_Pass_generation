CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE,
    password_hash VARCHAR
);

CREATE TABLE IF NOT EXISTS security_officers (
    officer_id SERIAL PRIMARY KEY,
    name VARCHAR,
    username VARCHAR UNIQUE,
    password_hash VARCHAR,
    created_at TIMESTAMP,
    admin_keys VARCHAR
);

CREATE TABLE IF NOT EXISTS visitors (
    visitor_id SERIAL PRIMARY KEY,
    full_name VARCHAR,
    emp_id VARCHAR,
    address TEXT,
    company_firm VARCHAR,
    aadhaar_number VARCHAR,
    phone VARCHAR,
    purpose VARCHAR,
    department VARCHAR,
    category VARCHAR,
    police_verification_no VARCHAR,
    duration VARCHAR,
    validity_from DATE,
    validity_to DATE,
    gender VARCHAR,
    nationality VARCHAR,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    embedding vector(512),
    photo_path TEXT,
    registered_by INTEGER,
    created_at TIMESTAMP,
    edited_by VARCHAR,
    edited_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_keys (
    key_id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(admin_id),
    admin_key VARCHAR(11) UNIQUE NOT NULL,
    generated_at TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    used_by INTEGER REFERENCES security_officers(officer_id),
    used_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blacklist (
    blacklist_id SERIAL PRIMARY KEY,
    emp_id VARCHAR,
    reason_code VARCHAR NOT NULL,
    remarks TEXT,
    blacklisted_by INTEGER,
    blacklisted_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS pass_sessions (
    session_id SERIAL PRIMARY KEY,
    visitor_id INTEGER NOT NULL REFERENCES visitors(visitor_id),
    emp_id VARCHAR NOT NULL,
    passed BOOLEAN NOT NULL DEFAULT TRUE,
    detected_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    printed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_visitors_emp_id ON visitors(emp_id);
CREATE INDEX IF NOT EXISTS ix_visitors_embedding_hnsw ON visitors USING hnsw (embedding vector_l2_ops);
CREATE INDEX IF NOT EXISTS ix_pass_sessions_emp_id ON pass_sessions(emp_id);

INSERT INTO admins (username, password_hash)
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;
