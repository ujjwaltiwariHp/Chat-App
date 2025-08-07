const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server }= require('socket.io');
require('dotenv').config();

const { saveMessage } = require('./models/messageModel'); 

const app = express();
const server = createServer(app);
const io = new Server(server,{
     connectionStateRecovery: {}
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname,'./public/index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('chat message', async (msg) => {
    console.log('message: ' + msg);

    try {
      await saveMessage(msg);
    } catch (err) {
      console.error('Error saving message to DB:', err);
    }
    io.emit('chat message', msg);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});