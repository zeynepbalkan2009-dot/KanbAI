-- init_db.sql - runs once on first postgres container start.
-- Keep this file limited to database-level setup. Application tables are
-- created by FastAPI in development, so demo seed rows are inserted during
-- backend startup after metadata.create_all() has completed.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
