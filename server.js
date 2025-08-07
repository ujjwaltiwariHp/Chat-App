const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
require('dotenv').config();

const { saveMessage, getRecentMessages, getMessagesAfter } = require('./models/messageModel');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, './public/index.html'));
});

app.get('/recent_messages', async (req, res) => {
  try {
    const messages = await getRecentMessages();
    res.json(messages);
  } catch (err) {
    console.error('Error getting recent messages:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

io.on('connection', async (socket) => {
  console.log('a user connected');
  if (!socket.recovered) {
    const serverOffset = socket.handshake.auth.serverOffset || 0;
    try {
      const missedMessages = await getMessagesAfter(serverOffset);
      missedMessages.forEach((msg) => {
        socket.emit('chat message', msg.content, msg.id);
      });
    } catch (err) {
      console.error('Error recovering messages:', err);
    }
  }

  socket.on('chat message', async (msg, clientOffset, callback) => {
    try {
      const insertedId = await saveMessage(msg, clientOffset);
      if (insertedId !== undefined) {
        io.emit('chat message', msg, insertedId);
      }
      callback(); 
    } catch (err) {
      console.error('Error saving message to DB:', err);
      callback(); 
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User disconnected. Reason: ${reason}`);
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
