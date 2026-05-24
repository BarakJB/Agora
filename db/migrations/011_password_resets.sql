CREATE TABLE password_resets (
  id           CHAR(36) PRIMARY KEY,
  agent_id     CHAR(36) NOT NULL,
  token_hash   VARCHAR(255) NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  used_at      TIMESTAMP NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_agent (agent_id),
  KEY idx_token (token_hash),
  CONSTRAINT fk_pr_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
