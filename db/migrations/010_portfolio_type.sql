-- Migration 010: portfolio_type per agent company number + sales transactions

ALTER TABLE agent_company_numbers
  ADD COLUMN portfolio_type ENUM('personal','partners') NOT NULL DEFAULT 'personal' AFTER company_agent_number;

ALTER TABLE agent_company_numbers
  DROP INDEX uk_agent_company,
  ADD UNIQUE KEY uk_agent_company_portfolio (agent_id, insurance_company_id, portfolio_type);

ALTER TABLE sales_transactions
  ADD COLUMN portfolio_type ENUM('personal','partners','unknown') NOT NULL DEFAULT 'unknown' AFTER insurance_company,
  ADD KEY idx_agent_portfolio (agent_id, portfolio_type, processing_month);
