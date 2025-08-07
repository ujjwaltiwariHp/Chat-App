const pool = require('../config/db');

async function saveMessage(content, clientOffset) {
  try {
    const result = await pool.query(
      `INSERT INTO messages (content, client_offset)
       VALUES ($1, $2)
       ON CONFLICT (client_offset) DO NOTHING
       RETURNING id`,
      [content, clientOffset]
    );
    return result.rows[0]?.id; 
  } catch (err) {
    throw err;
  }
}
async function getRecentMessages() {
  const result = await pool.query(
    'SELECT id, content FROM messages ORDER BY id DESC LIMIT 10'
  );
  return result.rows.reverse(); 
}

async function getMessagesAfter(offset) {
  const result = await pool.query(
    'SELECT id, content FROM messages WHERE id > $1 ORDER BY id ASC',
    [offset]
  );
  return result.rows;
}

module.exports = {
  saveMessage,
  getRecentMessages,
  getMessagesAfter,
};
