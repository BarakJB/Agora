CREATE TABLE agent_targets (
  id              CHAR(36) PRIMARY KEY,
  agent_id        CHAR(36) NOT NULL,
  metric          ENUM('total','nifraim','hekef','accumulation') NOT NULL,
  period          ENUM('monthly','yearly') NOT NULL,
  target_amount   DECIMAL(12,2) NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_agent_metric_period (agent_id, metric, period),
  CONSTRAINT fk_target_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
