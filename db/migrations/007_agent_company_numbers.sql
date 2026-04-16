-- Migration 007: Agent numbers per insurance company
-- Each agent has a different agent number at each insurance company

CREATE TABLE IF NOT EXISTS agent_company_numbers (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)     NOT NULL COMMENT 'FK → agents.id',
  insurance_company_id  CHAR(36)     NOT NULL COMMENT 'FK → insurance_companies.id',
  company_agent_number  VARCHAR(50)  NOT NULL COMMENT 'מספר סוכן בחברה',
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_agent_company (agent_id, insurance_company_id),
  UNIQUE KEY uk_company_agent_number (insurance_company_id, company_agent_number),
  KEY idx_company_number (company_agent_number),
  CONSTRAINT fk_acn_agent   FOREIGN KEY (agent_id)             REFERENCES agents(id),
  CONSTRAINT fk_acn_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='מיפוי ת.ז. סוכן ↔ מספר סוכן לכל חברת ביטוח';
