const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const { availableParallelism } = require('node:os');
const cluster = require('node:cluster');
const { createAdapter, setupPrimary } = require('@socket.io/cluster-adapter');
require('dotenv').config();

const { saveMessage, getRecentMessages, getMessagesAfter } = require('./models/messageModel');

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i
    });
  }
  return setupPrimary();
}

async function main() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter()
  });

  app.use(express.static(join(__dirname, 'public')));
  app.use(express.json()); 

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

  const connectedUsers = new Map();

  io.on('connection', async (socket) => {
    console.log('a user connected');

    socket.on('user login', (username) => {
      if (username && username.trim()) {
        const cleanUsername = username.trim();
        connectedUsers.set(socket.id, cleanUsername);
        socket.username = cleanUsername; 
        console.log(`User logged in: ${cleanUsername}`);
        
        socket.broadcast.emit('user joined', cleanUsername);
        const onlineUsers = Array.from(connectedUsers.values());
        io.emit('online users', onlineUsers);
      }
    });

    if (!socket.recovered) {
      const serverOffset = socket.handshake.auth.serverOffset || 0;
      try {
        const missedMessages = await getMessagesAfter(serverOffset);
        missedMessages.forEach((msg) => {
          socket.emit('chat message', {
            content: msg.content,
            id: msg.id,
            timestamp: msg.timestamp,
            username: msg.username || 'Unknown' 
          });
        });
      } catch (err) {
        console.error('Error recovering messages:', err);
      }
    }

    socket.on('chat message', async (msg, clientOffset, callback) => {
      try {
        if (!socket.username) {
          if (typeof callback === 'function') callback('Please login first');
          return;
        }

        const insertedId = await saveMessage(msg, clientOffset, socket.username);
        
        if (insertedId !== undefined) {
          const fullMessage = {
            content: msg,
            id: insertedId,
            client_offset: clientOffset,
            timestamp: new Date().toISOString(),
            username: socket.username
          };
          io.emit('chat message', fullMessage);
        }
        if (typeof callback === 'function') callback();
      } catch (err) {
        console.error('Error saving message to DB:', err);
        if (typeof callback === 'function') callback();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected. Reason: ${reason}`);
      if (socket.username) {
        connectedUsers.delete(socket.id);
        socket.broadcast.emit('user left', socket.username);
        const onlineUsers = Array.from(connectedUsers.values());
        io.emit('online users', onlineUsers);
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
main();