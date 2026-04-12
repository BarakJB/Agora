-- PayAgent Schema Migration v2
-- Support for real insurance commission Excel file structures
-- Adds: commission_branches, commission_rates, agent_advances
-- Alters: commissions table with detailed fields

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- COMMISSION_BRANCHES — ענפים ותתי-ענפים
-- ============================================================
CREATE TABLE commission_branches (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  branch_name     VARCHAR(50)  NOT NULL COMMENT 'ענף: בריאות/פנסיה/חיים',
  sub_branch      VARCHAR(50)  DEFAULT NULL COMMENT 'תת ענף',
  product_name    VARCHAR(100) DEFAULT NULL COMMENT 'מוצר על',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_branch_sub_product (branch_name, sub_branch, product_name),
  KEY idx_branch (branch_name),
  KEY idx_sub_branch (sub_branch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMMISSION_RATES — שיעורי עמלה לפי הסכם
-- ============================================================
CREATE TABLE commission_rates (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)      NOT NULL,
  insurance_company_id  CHAR(36)      NOT NULL,
  branch_id             CHAR(36)      DEFAULT NULL,
  rate_type             ENUM('nifraim','accumulation','management_fee','collection_fee') NOT NULL,
  rate_pct              DECIMAL(7,4)  NOT NULL COMMENT 'שיעור עמלה %',
  effective_from        DATE          NOT NULL,
  effective_to          DATE          DEFAULT NULL,
  contract_number       VARCHAR(50)   DEFAULT NULL COMMENT 'מספר הסכם סוכן',
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_agent (agent_id),
  KEY idx_company (insurance_company_id),
  KEY idx_branch (branch_id),
  KEY idx_agent_company_type (agent_id, insurance_company_id, rate_type),
  KEY idx_effective (effective_from, effective_to),
  CONSTRAINT fk_rate_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_rate_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id),
  CONSTRAINT fk_rate_branch FOREIGN KEY (branch_id) REFERENCES commission_branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AGENT_ADVANCES — מקדמות סוכן
-- ============================================================
CREATE TABLE agent_advances (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)      NOT NULL,
  insurance_company_id  CHAR(36)      NOT NULL,
  amount                DECIMAL(12,2) NOT NULL COMMENT 'סכום מקדמה',
  balance               DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'יתרת מקדמה',
  period                VARCHAR(7)    NOT NULL COMMENT 'YYYY-MM',
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_agent (agent_id),
  KEY idx_company (insurance_company_id),
  KEY idx_period (period),
  KEY idx_agent_company_period (agent_id, insurance_company_id, period),
  CONSTRAINT fk_advance_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_advance_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ALTER COMMISSIONS — הוספת עמודות מקובצי אקסל אמיתיים
-- ============================================================
ALTER TABLE commissions
  -- ענף ומוצר
  ADD COLUMN branch              VARCHAR(50)   DEFAULT NULL COMMENT 'ענף' AFTER upload_id,
  ADD COLUMN sub_branch          VARCHAR(50)   DEFAULT NULL COMMENT 'תת ענף' AFTER branch,
  ADD COLUMN product_name        VARCHAR(100)  DEFAULT NULL COMMENT 'מוצר על' AFTER sub_branch,

  -- צבירה ודמי ניהול
  ADD COLUMN accumulation_balance DECIMAL(14,2) DEFAULT NULL COMMENT 'יתרת סגירה/צבירה' AFTER product_name,
  ADD COLUMN management_fee_pct  DECIMAL(5,2)  DEFAULT NULL COMMENT 'אחוז דמי ניהול' AFTER accumulation_balance,
  ADD COLUMN management_fee_amount DECIMAL(12,2) DEFAULT NULL COMMENT 'סכום דמי ניהול' AFTER management_fee_pct,
  ADD COLUMN collection_fee      DECIMAL(12,2) DEFAULT NULL COMMENT 'דמי גביה' AFTER management_fee_amount,

  -- מקדמות
  ADD COLUMN advance_amount      DECIMAL(12,2) DEFAULT NULL COMMENT 'מקדמה' AFTER collection_fee,
  ADD COLUMN advance_balance     DECIMAL(12,2) DEFAULT NULL COMMENT 'יתרת מקדמה' AFTER advance_amount,

  -- סכומי עמלה מפורטים
  ADD COLUMN amount_before_vat   DECIMAL(12,2) DEFAULT NULL COMMENT 'עמלה לפני מעמ' AFTER advance_balance,
  ADD COLUMN amount_with_vat     DECIMAL(12,2) DEFAULT NULL COMMENT 'עמלה כולל מעמ' AFTER amount_before_vat,

  -- מטא-דאטא
  ADD COLUMN transaction_type    VARCHAR(10)   DEFAULT NULL COMMENT 'אופי חו/ז' AFTER amount_with_vat,
  ADD COLUMN commission_source   VARCHAR(50)   DEFAULT NULL COMMENT 'מקור זיכוי עמלה' AFTER transaction_type,

  -- מעסיק
  ADD COLUMN employer_name       VARCHAR(200)  DEFAULT NULL COMMENT 'שם מעסיק' AFTER commission_source,
  ADD COLUMN employer_id         VARCHAR(20)   DEFAULT NULL COMMENT 'מספר מעסיק' AFTER employer_name,

  -- מבוטח
  ADD COLUMN insured_name        VARCHAR(200)  DEFAULT NULL COMMENT 'שם מבוטח' AFTER employer_id,
  ADD COLUMN insured_id          VARCHAR(20)   DEFAULT NULL COMMENT 'ת.ז מבוטח' AFTER insured_name,

  -- תקופות
  ADD COLUMN production_month    VARCHAR(7)    DEFAULT NULL COMMENT 'חודש תפוקה' AFTER insured_id,
  ADD COLUMN processing_month    VARCHAR(7)    DEFAULT NULL COMMENT 'חודש עיבוד' AFTER production_month,

  -- סוג קופה ותוכנית
  ADD COLUMN fund_type           VARCHAR(50)   DEFAULT NULL COMMENT 'סוג קופה (גמל/קרן השתלמות)' AFTER processing_month,
  ADD COLUMN plan_type           VARCHAR(50)   DEFAULT NULL COMMENT 'סוג תוכנית' AFTER fund_type;

-- Indexes on new columns
ALTER TABLE commissions
  ADD KEY idx_branch (branch),
  ADD KEY idx_sub_branch (sub_branch),
  ADD KEY idx_insured_id (insured_id),
  ADD KEY idx_employer_id (employer_id),
  ADD KEY idx_processing_month (processing_month),
  ADD KEY idx_production_month (production_month),
  ADD KEY idx_fund_type (fund_type),
  ADD KEY idx_agent_branch_period (agent_id, branch, period);

-- Make policy_id nullable — Excel imports don't always have a matching policy
ALTER TABLE commissions
  MODIFY COLUMN policy_id CHAR(36) DEFAULT NULL,
  DROP FOREIGN KEY fk_commission_policy;

ALTER TABLE commissions
  ADD CONSTRAINT fk_commission_policy FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;
