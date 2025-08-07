const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server }= require('socket.io');
require('dotenv').config();

const { saveMessage } = require('./models/messageModel'); 
const { getRecentMessages, recentMessages } = require('./models/messageModel');

const app = express();
const server = createServer(app);
const io = new Server(server,{
     connectionStateRecovery: {}
});

app.use(express.static(join(__dirname, 'public')));

app.get('/recent_messages', async (req, res) => {
  try {
    const messages = await getRecentMessages();
    res.json(messages);
  } catch (err) {
    console.error('Error getting recent messages:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname,'./public/index.html'));
});

io.on('connection', async (socket) => {
  console.log('a user connected');

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
  try {
    await getRecentMessages();
    socket.emit('recent messages', recentMessages);
  } catch (err) {
    console.error('Error fetching recent messages:', err);
    socket.emit('error', 'Could not fetch recent messages');
  }
  socket.on('chat message', async (msg) => {
    console.log('message:', msg);
    try {
      await saveMessage(msg);
      io.emit('chat message', msg);
    } catch (err) {
      console.error('Error saving message to DB:', err);
      socket.emit('error', 'Could not save message');
    }
  });
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected. Reason: ${reason}`);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});