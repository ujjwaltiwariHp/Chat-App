const pool = require('../config/db');

async function saveMessage(content) {
  const result = await pool.query(
    'INSERT INTO messages (content) VALUES ($1) RETURNING *',
    [content]
  );
  return result.rows[0];
}

async function getRecentMessages() {
  const result = await pool.query(
    'SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10'
  );
  return result.rows.reverse(); 
}

module.exports = {
  saveMessage,
  getRecentMessages
};
