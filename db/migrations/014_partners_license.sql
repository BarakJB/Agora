ALTER TABLE agents
  ADD COLUMN license_number_partners VARCHAR(50) DEFAULT NULL
  COMMENT 'License number for partners portfolio (optional)'
  AFTER license_number;
