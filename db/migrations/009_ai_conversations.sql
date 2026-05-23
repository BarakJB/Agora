CREATE TABLE ai_conversations (
  id           CHAR(36) PRIMARY KEY,
  agent_id     CHAR(36) NOT NULL,
  title        VARCHAR(200) DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_agent (agent_id, updated_at DESC),
  CONSTRAINT fk_conv_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_messages (
  id              CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  role            ENUM('user','assistant','tool') NOT NULL,
  content         MEDIUMTEXT NOT NULL,
  tool_calls      JSON DEFAULT NULL,
  tokens_input    INT DEFAULT NULL,
  tokens_output   INT DEFAULT NULL,
  latency_ms      INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conv (conversation_id, created_at),
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
