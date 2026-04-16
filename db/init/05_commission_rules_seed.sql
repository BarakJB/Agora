-- Agora Seed Data — Commission Rules
-- Business rules for insurance commission timing per company/product
SET NAMES utf8mb4;

-- ============================================================
-- Commission Rules — הראל (Harel)
-- ============================================================
INSERT INTO commission_rules (id, insurance_company_id, product_type, rule_type, delay_months, delay_business_days, rate_pct, description) VALUES
  -- פנסיה/גמל — דמי ניהול מתחילים אחרי 3 חודשים
  ('cr000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'pension', 'management_fee_delay', 3, NULL, NULL,
   'דמי ניהול מתחילים 3 חודשים אחרי פתיחת פוליסה'),

  -- הפקדה → ניוד תוך 10 ימי עסקים
  ('cr000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'pension', 'niud_transfer_window', NULL, 10, NULL,
   'הפקדה → העברת ניוד תוך 10 ימי עסקים'),

  -- עמלת ניוד — 3 חודשים בהראל (לא שנה כמו אחרים)
  ('cr000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'pension', 'niud_commission_delay', 3, NULL, NULL,
   'עמלת ניוד אחרי 3 חודשים (הראל — קצר מהרגיל)'),

  -- בונוס הפקדה מיידי
  ('cr000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'pension', 'deposit_bonus', 0, NULL, NULL,
   'בונוס הפקדה — מיידי'),

  -- נפרעים — מיידי
  ('cr000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 'pension', 'nifraim_start', 0, NULL, NULL,
   'נפרעים מתחילים מיידית'),

  -- גמל — same rules
  ('cr000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'provident_fund', 'management_fee_delay', 3, NULL, NULL,
   'דמי ניהול מתחילים 3 חודשים אחרי פתיחת קופת גמל'),

  ('cr000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 'provident_fund', 'niud_commission_delay', 3, NULL, NULL,
   'עמלת ניוד אחרי 3 חודשים (הראל)'),

  -- בריאות — נפרעים מיידי
  ('cr000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000001', 'health', 'nifraim_start', 0, NULL, NULL,
   'נפרעים בריאות — מיידי'),

  -- חיים — קלובק 24 חודשים
  ('cr000001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000001', 'life_insurance', 'clawback_period', 24, NULL, NULL,
   'תקופת קלובק 24 חודשים לביטוח חיים');

-- ============================================================
-- Commission Rules — מגדל (Migdal)
-- ============================================================
INSERT INTO commission_rules (id, insurance_company_id, product_type, rule_type, delay_months, delay_business_days, rate_pct, description) VALUES
  ('cr000002-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'pension', 'management_fee_delay', 3, NULL, NULL,
   'דמי ניהול מתחילים 3 חודשים אחרי פתיחת פוליסה'),

  ('cr000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'pension', 'niud_transfer_window', NULL, 10, NULL,
   'הפקדה → העברת ניוד תוך 10 ימי עסקים'),

  -- ניוד — שנה (12 חודשים) — ברירת המחדל
  ('cr000002-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'pension', 'niud_commission_delay', 12, NULL, NULL,
   'עמלת ניוד אחרי 12 חודשים (סטנדרטי)'),

  ('cr000002-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'pension', 'deposit_bonus', 0, NULL, NULL,
   'בונוס הפקדה — מיידי'),

  ('cr000002-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000002', 'pension', 'nifraim_start', 0, NULL, NULL,
   'נפרעים מתחילים מיידית'),

  ('cr000002-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000002', 'health', 'nifraim_start', 0, NULL, NULL,
   'נפרעים בריאות — מיידי');

-- ============================================================
-- Commission Rules — הפניקס (Phoenix)
-- ============================================================
INSERT INTO commission_rules (id, insurance_company_id, product_type, rule_type, delay_months, delay_business_days, rate_pct, description) VALUES
  ('cr000003-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000003', 'pension', 'management_fee_delay', 3, NULL, NULL,
   'דמי ניהול מתחילים 3 חודשים אחרי פתיחת פוליסה'),

  ('cr000003-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'pension', 'niud_commission_delay', 12, NULL, NULL,
   'עמלת ניוד אחרי 12 חודשים (סטנדרטי)'),

  ('cr000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003', 'health', 'nifraim_start', 0, NULL, NULL,
   'נפרעים בריאות — מיידי');

-- ============================================================
-- Commission Rules — כלל (Clal)
-- ============================================================
INSERT INTO commission_rules (id, insurance_company_id, product_type, rule_type, delay_months, delay_business_days, rate_pct, description) VALUES
  ('cr000004-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004', 'education_fund', 'management_fee_delay', 3, NULL, NULL,
   'דמי ניהול מתחילים 3 חודשים אחרי פתיחת קרן השתלמות'),

  ('cr000004-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'education_fund', 'niud_commission_delay', 12, NULL, NULL,
   'עמלת ניוד אחרי 12 חודשים'),

  ('cr000004-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000004', 'managers_insurance', 'clawback_period', 24, NULL, NULL,
   'תקופת קלובק 24 חודשים לביטוח מנהלים');

-- ============================================================
-- Commission Rules — מנורה (Menora)
-- ============================================================
INSERT INTO commission_rules (id, insurance_company_id, product_type, rule_type, delay_months, delay_business_days, rate_pct, description) VALUES
  ('cr000005-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000005', 'life_insurance', 'clawback_period', 24, NULL, NULL,
   'תקופת קלובק 24 חודשים לביטוח חיים'),

  ('cr000005-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000005', 'life_insurance', 'nifraim_start', 0, NULL, NULL,
   'נפרעים ביטוח חיים — מיידי');
