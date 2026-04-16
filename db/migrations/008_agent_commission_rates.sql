-- Agora Migration 008 — agent_commission_rates
-- Stores per-agent commission rates per product × commission type × insurance company
-- Mirrors the "הסכם עמלות" Excel structure

CREATE TABLE IF NOT EXISTS agent_commission_rates (
  id                    CHAR(36)        NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)        NOT NULL,
  insurance_company_id  CHAR(36)        NOT NULL,
  product_type          ENUM(
    'סיכונים',
    'פנסיה',
    'גמל והשתלמות',
    'חסכון פרט',
    'ניודי פנסיה'
  )                     NOT NULL,
  commission_type       ENUM('נפרעים','היקף') NOT NULL,
  rate                  DECIMAL(12,4)   DEFAULT NULL COMMENT 'אחוז כעשרוני (0.005) או סכום קבוע (6500)',
  is_fixed_amount       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = סכום קבוע בש"ח, 0 = אחוז',
  is_active             TINYINT(1)      NOT NULL DEFAULT 1,
  created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_agent_company_product_commission (agent_id, insurance_company_id, product_type, commission_type),
  KEY idx_agent (agent_id),
  KEY idx_company (insurance_company_id),
  CONSTRAINT fk_acr_agent   FOREIGN KEY (agent_id)             REFERENCES agents(id),
  CONSTRAINT fk_acr_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
