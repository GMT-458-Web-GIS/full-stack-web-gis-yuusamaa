// backend/src/db.js
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "anka_temiz",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

// küçük yardımcı: db.query(...)
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
