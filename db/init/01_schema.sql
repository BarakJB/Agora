-- Agora Database Schema
-- MySQL 8.4 | UTF-8 | Israeli Insurance Agent Commission System

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- AGENTS — סוכני ביטוח
-- ============================================================
CREATE TABLE agents (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  agent_id         VARCHAR(20)  NOT NULL COMMENT 'ת.ז. או מזהה רישיון רשות',
  agency_id        VARCHAR(20)  NOT NULL COMMENT 'מזהה סוכנות',
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(20)  DEFAULT NULL,
  license_number   VARCHAR(30)  NOT NULL,
  tax_id           VARCHAR(20)  NOT NULL COMMENT 'מספר עוסק מורשה / ת.ז.',
  tax_status       ENUM('self_employed','employee','individual','corporation') NOT NULL DEFAULT 'self_employed',
  nii_rate         DECIMAL(5,2) NOT NULL DEFAULT 17.83 COMMENT 'שיעור ביטוח לאומי %',
  password_hash    VARCHAR(255) DEFAULT NULL COMMENT 'bcrypt hash for login',
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP    NULL     DEFAULT NULL,

  UNIQUE KEY uk_agent_id (agent_id),
  UNIQUE KEY uk_license (license_number),
  UNIQUE KEY uk_email (email),
  KEY idx_agency (agency_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INSURANCE_COMPANIES — חברות ביטוח
-- ============================================================
CREATE TABLE insurance_companies (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  code             VARCHAR(20)  NOT NULL COMMENT 'קוד חברה פנימי',
  contact_email    VARCHAR(255) DEFAULT NULL,
  contact_phone    VARCHAR(20)  DEFAULT NULL,
  portal_url       VARCHAR(500) DEFAULT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_code (code),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CONTRACTS — הסכמי עמלות בין סוכן לחברה
-- ============================================================
CREATE TABLE contracts (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)     NOT NULL,
  insurance_company_id  CHAR(36)     NOT NULL,
  contract_number       VARCHAR(50)  DEFAULT NULL,
  product_type          ENUM('life_insurance','managers_insurance','pension','provident_fund','education_fund','health','general') NOT NULL,
  commission_pct        DECIMAL(5,2) NOT NULL COMMENT 'עמלה חד-פעמית %',
  recurring_pct         DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'עמלה שוטפת %',
  volume_pct            DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'עמלת היקף %',
  effective_from        DATE         NOT NULL,
  effective_to          DATE         DEFAULT NULL,
  notes                 TEXT         DEFAULT NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_agent (agent_id),
  KEY idx_company (insurance_company_id),
  KEY idx_agent_company_type (agent_id, insurance_company_id, product_type),
  CONSTRAINT fk_contract_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_contract_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CLIENTS — לקוחות הסוכן
-- ============================================================
CREATE TABLE clients (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  agent_id         CHAR(36)     NOT NULL,
  name             VARCHAR(100) NOT NULL,
  id_number        VARCHAR(20)  NOT NULL COMMENT 'ת.ז. לקוח',
  phone            VARCHAR(20)  DEFAULT NULL,
  email            VARCHAR(255) DEFAULT NULL,
  date_of_birth    DATE         DEFAULT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP    NULL     DEFAULT NULL,

  UNIQUE KEY uk_agent_client (agent_id, id_number),
  KEY idx_agent (agent_id),
  CONSTRAINT fk_client_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- POLICIES — פוליסות
-- ============================================================
CREATE TABLE policies (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)      NOT NULL,
  client_id             CHAR(36)      NOT NULL,
  insurance_company_id  CHAR(36)      NOT NULL,
  contract_id           CHAR(36)      DEFAULT NULL,
  policy_number         VARCHAR(50)   NOT NULL COMMENT 'מספר פוליסה בחברה',
  product_type          ENUM('life_insurance','managers_insurance','pension','provident_fund','education_fund','health','general') NOT NULL,
  start_date            DATE          NOT NULL,
  cancel_date           DATE          DEFAULT NULL,
  premium_amount        DECIMAL(12,2) NOT NULL COMMENT 'סכום פרמיה ב-₪',
  premium_frequency     ENUM('monthly','quarterly','annual','one_time') NOT NULL DEFAULT 'monthly',
  commission_pct        DECIMAL(5,2)  NOT NULL COMMENT 'עמלה חד-פעמית %',
  recurring_pct         DECIMAL(5,2)  NOT NULL DEFAULT 0 COMMENT 'עמלה שוטפת %',
  volume_pct            DECIMAL(5,2)  NOT NULL DEFAULT 0 COMMENT 'עמלת היקף %',
  status                ENUM('active','cancelled','pending','suspended') NOT NULL DEFAULT 'active',
  notes                 TEXT          DEFAULT NULL,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_policy_number (insurance_company_id, policy_number),
  KEY idx_agent (agent_id),
  KEY idx_client (client_id),
  KEY idx_company (insurance_company_id),
  KEY idx_contract (contract_id),
  KEY idx_product_type (product_type),
  KEY idx_status (status),
  KEY idx_start_date (start_date),
  KEY idx_agent_status_type (agent_id, status, product_type),
  CONSTRAINT fk_policy_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_policy_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_policy_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id),
  CONSTRAINT fk_policy_contract FOREIGN KEY (contract_id) REFERENCES contracts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMMISSIONS — עמלות
-- ============================================================
CREATE TABLE commissions (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  policy_id             CHAR(36)      NOT NULL,
  agent_id              CHAR(36)      NOT NULL,
  insurance_company_id  CHAR(36)      NOT NULL,
  type                  ENUM('one_time','recurring','volume','bonus') NOT NULL,
  amount                DECIMAL(12,2) NOT NULL COMMENT 'סכום העמלה ב-₪',
  rate                  DECIMAL(5,2)  NOT NULL COMMENT 'שיעור העמלה %',
  premium_base          DECIMAL(12,2) NOT NULL COMMENT 'בסיס הפרמיה לחישוב',
  period                VARCHAR(7)    NOT NULL COMMENT 'תקופה YYYY-MM',
  payment_date          DATE          NOT NULL,
  status                ENUM('pending','paid','clawback','disputed') NOT NULL DEFAULT 'pending',
  expected_amount       DECIMAL(12,2) DEFAULT NULL COMMENT 'סכום צפוי לאימות',
  variance              DECIMAL(12,2) DEFAULT NULL COMMENT 'פער בין צפוי לבפועל',
  upload_id             CHAR(36)      DEFAULT NULL,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_policy (policy_id),
  KEY idx_agent (agent_id),
  KEY idx_company (insurance_company_id),
  KEY idx_period (period),
  KEY idx_status (status),
  KEY idx_type (type),
  KEY idx_agent_period (agent_id, period),
  KEY idx_agent_period_type (agent_id, period, type),
  KEY idx_upload (upload_id),
  CONSTRAINT fk_commission_policy FOREIGN KEY (policy_id) REFERENCES policies(id),
  CONSTRAINT fk_commission_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_commission_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PAYMENTS — תשלומי פרמיה (היסטוריה)
-- ============================================================
CREATE TABLE premium_payments (
  id               CHAR(36)      NOT NULL PRIMARY KEY,
  policy_id        CHAR(36)      NOT NULL,
  payment_date     DATE          NOT NULL,
  amount           DECIMAL(12,2) NOT NULL,
  status           ENUM('paid','pending','failed','refunded') NOT NULL DEFAULT 'paid',
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_policy (policy_id),
  KEY idx_date (payment_date),
  KEY idx_policy_date (policy_id, payment_date),
  CONSTRAINT fk_payment_policy FOREIGN KEY (policy_id) REFERENCES policies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- UPLOADS — העלאות קבצים
-- ============================================================
CREATE TABLE uploads (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  agent_id              CHAR(36)     NOT NULL,
  insurance_company_id  CHAR(36)     DEFAULT NULL,
  file_name             VARCHAR(255) NOT NULL,
  file_size             INT UNSIGNED DEFAULT NULL,
  record_count          INT UNSIGNED NOT NULL DEFAULT 0,
  status                ENUM('processing','completed','error') NOT NULL DEFAULT 'processing',
  error_message         TEXT         DEFAULT NULL,
  upload_date           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_agent (agent_id),
  KEY idx_company (insurance_company_id),
  KEY idx_date (upload_date),
  CONSTRAINT fk_upload_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_upload_company FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TAX_SETTINGS — הגדרות מס (מתעדכן שנתית)
-- ============================================================
CREATE TABLE tax_settings (
  id               CHAR(36)      NOT NULL PRIMARY KEY,
  tax_year         SMALLINT      NOT NULL,
  bracket_from     DECIMAL(12,2) NOT NULL,
  bracket_to       DECIMAL(12,2) DEFAULT NULL COMMENT 'NULL = ללא תקרה',
  rate             DECIMAL(5,2)  NOT NULL COMMENT 'שיעור מס %',
  tax_type         ENUM('income_tax','national_insurance_reduced','national_insurance_full','health_tax_reduced','health_tax_full') NOT NULL,
  applies_to       ENUM('self_employed','employee','all') NOT NULL DEFAULT 'all',
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_year_type_bracket (tax_year, tax_type, applies_to, bracket_from),
  KEY idx_year (tax_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SALARY_REPORTS — דוחות שכר חודשיים (מחושב)
-- ============================================================
CREATE TABLE salary_reports (
  id                     CHAR(36)      NOT NULL PRIMARY KEY,
  agent_id               CHAR(36)      NOT NULL,
  period                 VARCHAR(7)    NOT NULL COMMENT 'YYYY-MM',
  one_time_commissions   DECIMAL(12,2) NOT NULL DEFAULT 0,
  recurring_commissions  DECIMAL(12,2) NOT NULL DEFAULT 0,
  volume_commissions     DECIMAL(12,2) NOT NULL DEFAULT 0,
  bonuses                DECIMAL(12,2) NOT NULL DEFAULT 0,
  gross_total            DECIMAL(12,2) NOT NULL DEFAULT 0,
  income_tax             DECIMAL(12,2) NOT NULL DEFAULT 0,
  national_insurance     DECIMAL(12,2) NOT NULL DEFAULT 0,
  health_tax             DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat                    DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_total              DECIMAL(12,2) NOT NULL DEFAULT 0,
  policy_count           INT UNSIGNED  NOT NULL DEFAULT 0,
  new_policies           INT UNSIGNED  NOT NULL DEFAULT 0,
  generated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_agent_period (agent_id, period),
  KEY idx_agent (agent_id),
  KEY idx_period (period),
  CONSTRAINT fk_salary_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
