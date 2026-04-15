import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'payagent',
  password: process.env.DB_PASSWORD || 'payagent123',
  database: process.env.DB_NAME || 'payagent',
  waitForConnections: true,
  // Serverless default: 2. Set DB_CONNECTION_LIMIT=10 in local .env (Docker)
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '2', 10),
  queueLimit: 0,
  charset: 'utf8mb4',
});

export default pool;
