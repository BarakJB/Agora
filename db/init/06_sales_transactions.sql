-- 06_sales_transactions.sql
-- Sales transactions from commission Excel files + agent agreement rates

-- ============================================================
-- 1. sales_transactions — parsed commission line items
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_transactions (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)      NOT NULL,
  upload_id             CHAR(36)      DEFAULT NULL,
  insurance_company     VARCHAR(100)  NOT NULL,

  -- Report metadata
  report_type           ENUM('nifraim','hekef','accumulation_nifraim','accumulation_hekef','branch_distribution','agent_data','product_distribution') NOT NULL,

  -- Dates — critical for monthly salary grouping
  processing_month      VARCHAR(7)    NOT NULL COMMENT 'חודש עיבוד — YYYY-MM, determines salary month',
  production_month      VARCHAR(7)    DEFAULT NULL COMMENT 'חודש תפוקה — when sale was originally made',

  -- Client/Insured
  insured_name          VARCHAR(200)  DEFAULT NULL,
  insured_id            VARCHAR(20)   DEFAULT NULL,
  employer_name         VARCHAR(200)  DEFAULT NULL,
  employer_id           VARCHAR(20)   DEFAULT NULL,

  -- Policy
  policy_number         VARCHAR(50)   DEFAULT NULL,
  branch                VARCHAR(50)   DEFAULT NULL COMMENT 'ענף: בריאות/פנסיה',
  sub_branch            VARCHAR(50)   DEFAULT NULL COMMENT 'סוג פוליסה',
  product_name          VARCHAR(100)  DEFAULT NULL COMMENT 'מוצר על / חברה מנהלת',
  fund_type             VARCHAR(50)   DEFAULT NULL COMMENT 'סוג קופה',
  plan_type             VARCHAR(50)   DEFAULT NULL COMMENT 'סוג תוכנית',

  -- Financial
  premium               DECIMAL(14,2) DEFAULT NULL COMMENT 'פרמיה',
  commission_amount     DECIMAL(12,2) NOT NULL COMMENT 'עמלה',
  commission_rate       DECIMAL(7,4)  DEFAULT NULL COMMENT 'שיעור עמלה',
  collection_fee        DECIMAL(12,2) DEFAULT NULL COMMENT 'דמי גביה',
  advance_amount        DECIMAL(12,2) DEFAULT NULL COMMENT 'מקדמה',
  advance_balance       DECIMAL(12,2) DEFAULT NULL COMMENT 'יתרת מקדמה',
  payment_amount        DECIMAL(12,2) DEFAULT NULL COMMENT 'סכום תשלום',
  amount_before_vat     DECIMAL(12,2) DEFAULT NULL COMMENT 'עמלה לפני מע"מ',
  amount_with_vat       DECIMAL(12,2) DEFAULT NULL COMMENT 'עמלה כולל מע"מ',
  accumulation_balance  DECIMAL(14,2) DEFAULT NULL COMMENT 'יתרת סגירה/צבירה',
  management_fee_pct    DECIMAL(5,2)  DEFAULT NULL COMMENT 'אחוז דמי ניהול',
  management_fee_amount DECIMAL(12,2) DEFAULT NULL COMMENT 'סכום דמי ניהול',

  -- Meta
  transaction_type      VARCHAR(10)   DEFAULT NULL COMMENT 'אופי חו"ז',

  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for monthly salary queries
  KEY idx_agent (agent_id),
  KEY idx_processing_month (processing_month),
  KEY idx_agent_month (agent_id, processing_month),
  KEY idx_agent_company_month (agent_id, insurance_company, processing_month),
  KEY idx_upload (upload_id),
  KEY idx_branch (branch),
  KEY idx_insured (insured_id),
  CONSTRAINT fk_sales_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. agents — add agreement_uploaded flag
-- ============================================================
ALTER TABLE agents ADD COLUMN agreement_uploaded TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'הסכם עמלות הועלה' AFTER nii_rate;

-- ============================================================
-- 3. agent_agreement_rates — parsed agreement commission rates
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_agreement_rates (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)      NOT NULL,
  product               VARCHAR(50)   NOT NULL COMMENT 'סיכונים/פנסיה/גמל והשתלמות/חסכון פרט',
  commission_type       VARCHAR(20)   NOT NULL COMMENT 'nifraim/hekef',
  company               VARCHAR(100)  NOT NULL,
  rate                  DECIMAL(12,4) DEFAULT NULL,
  is_fixed_amount       TINYINT(1)    NOT NULL DEFAULT 0,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_agent (agent_id),
  KEY idx_agent_product (agent_id, product, commission_type),
  CONSTRAINT fk_agreement_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
