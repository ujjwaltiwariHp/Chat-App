const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server }= require('socket.io');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server,{
     connectionStateRecovery: {}
});

const pool = new Pool ({
  connectionString: process.env.DATABASE_URL,
})

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, './public/index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('chat message', async (msg) => {
    console.log('message: ' + msg);

    try {
      await pool.query('INSERT INTO messages (content) VALUES ($1)', [msg]);
    } catch (err) {
      console.error('Error saving message to DB:', err);
    }

    io.emit('chat message', msg);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});