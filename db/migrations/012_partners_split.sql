ALTER TABLE agents
  ADD COLUMN partners_split_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00
  COMMENT 'Percentage of partners portfolio that belongs to this agent (0-100)';
