-- Migration: Add password_hash column to agents table for JWT authentication
-- Run: mysql -u agora -p agora < db/migrations/002_add_password_hash.sql

ALTER TABLE agents
  ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL COMMENT 'bcrypt hash for login'
  AFTER nii_rate;
