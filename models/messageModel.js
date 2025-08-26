const pool = require('../config/db');

async function saveMessage(content, clientOffset, username) { 
  try {
    const result = await pool.query(
      `INSERT INTO messages (content, client_offset, username)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_offset) DO NOTHING
       RETURNING id, timestamp`,
      [content, clientOffset, username] 
    );
    return result.rows[0]?.id;
  } catch (err) {
    throw err;
  }
}

async function getRecentMessages() {
  const result = await pool.query(
    'SELECT id, content, timestamp, username FROM messages ORDER BY id DESC LIMIT 10' 
  );
  return result.rows.reverse();
}

async function getMessagesAfter(offset) {
  const result = await pool.query(
    'SELECT id, content, timestamp, username FROM messages WHERE id > $1 ORDER BY id ASC', 
    [offset]
  );
  return result.rows;
}

module.exports = {
  saveMessage,
  getRecentMessages,
  getMessagesAfter,
};
