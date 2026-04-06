-- PayAgent Schema Migration v3
-- Adds: commission_reports (typed upload tracking), commission_rules (business logic)
-- Extends: uploads table with report_type column

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- COMMISSION_REPORTS — דוחות עמלות שהועלו (typed, linked to upload)
-- Each Excel file uploaded gets a report record per detected sheet
-- ============================================================
CREATE TABLE commission_reports (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  upload_id             CHAR(36)      NOT NULL,
  agent_id              CHAR(36)      NOT NULL,
  insurance_company_id  CHAR(36)      DEFAULT NULL,
  report_type           ENUM('nifraim','branch_distribution','agent_data','product_distribution') NOT NULL
                        COMMENT 'סוג דוח: נפרעים / ענפים / נתונים לסוכן / מוצרים',
  period                VARCHAR(7)    DEFAULT NULL COMMENT 'תקופת הדוח YYYY-MM',
  record_count          INT UNSIGNED  NOT NULL DEFAULT 0,
  skipped_rows          INT UNSIGNED  NOT NULL DEFAULT 0,
  error_count           INT UNSIGNED  NOT NULL DEFAULT 0,
  total_commission      DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'סה"כ עמלות בדוח',
  total_premium         DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'סה"כ פרמיות בדוח',
  sheet_name            VARCHAR(100)  DEFAULT NULL COMMENT 'שם הגיליון באקסל',
  status                ENUM('parsed','imported','error') NOT NULL DEFAULT 'parsed',
  error_details         JSON          DEFAULT NULL COMMENT 'ParseError[] from parser',
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_upload (upload_id),
  KEY idx_agent (agent_id),
  KEY idx_company (insurance_company_id),
  KEY idx_report_type (report_type),
  KEY idx_period (period),
  KEY idx_agent_type_period (agent_id, report_type, period),
  CONSTRAINT fk_report_upload FOREIGN KEY (upload_id) REFERENCES uploads(id),
  CONSTRAINT fk_report_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_report_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMMISSION_RULES — כללי עסקים לחישוב עמלות
-- Captures the insurance-specific commission timing and rules
-- ============================================================
CREATE TABLE commission_rules (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  insurance_company_id  CHAR(36)      NOT NULL,
  product_type          ENUM('life_insurance','managers_insurance','pension','provident_fund','education_fund','health','general') NOT NULL,
  rule_type             ENUM(
    'management_fee_delay',     -- דמי ניהול: 3 חודשים מתחילת פוליסה
    'niud_transfer_window',     -- חלון ניוד: 10 ימי עסקים מהפקדה
    'niud_commission_delay',    -- עמלת ניוד: שנה (או 3 חודשים להראל)
    'deposit_bonus',            -- בונוס הפקדה: מיידי
    'nifraim_start',            -- תחילת נפרעים: מיידי
    'clawback_period',          -- תקופת קלובק
    'advance_recoup'            -- קיזוז מקדמה מעמלות שוטפות
  ) NOT NULL,
  delay_months          SMALLINT      DEFAULT NULL COMMENT 'עיכוב בחודשים',
  delay_business_days   SMALLINT      DEFAULT NULL COMMENT 'עיכוב בימי עסקים',
  rate_pct              DECIMAL(7,4)  DEFAULT NULL COMMENT 'שיעור רלוונטי %',
  description           VARCHAR(500)  DEFAULT NULL COMMENT 'תיאור הכלל בעברית',
  is_active             TINYINT(1)    NOT NULL DEFAULT 1,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_company_product_rule (insurance_company_id, product_type, rule_type),
  KEY idx_company (insurance_company_id),
  KEY idx_product_type (product_type),
  KEY idx_rule_type (rule_type),
  CONSTRAINT fk_rule_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- EXTEND UPLOADS — add report_type for Excel file type tracking
-- ============================================================
ALTER TABLE uploads
  ADD COLUMN report_type ENUM('nifraim','branch_distribution','agent_data','product_distribution','csv','mixed')
    DEFAULT 'csv' COMMENT 'סוג קובץ שהועלה' AFTER file_size;

SET FOREIGN_KEY_CHECKS = 1;
