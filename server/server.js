require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Luna-Block backend is running');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// In-memory room management
// roomId -> {
//   id,
//   name,
//   isPrivate,
//   password,
//   maxPlayers,
//   status: 'waiting' | 'playing' | 'finished',
//   hostId,
//   players: Map<userId, { userId, name, socketId }>,
//   createdAt,
// }
const rooms = new Map();

// userId <-> socketId mappings
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

function generateRoomId() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

function getPublicRoomList() {
  const list = [];
  for (const [roomId, room] of rooms.entries()) {
    list.push({
      id: roomId,
      name: room.name,
      isPrivate: room.isPrivate,
      maxPlayers: room.maxPlayers,
      status: room.status,
      participantCount: room.players.size,
      hostId: room.hostId,
    });
  }
  return list;
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('getRoomList', () => {
    const roomList = getPublicRoomList();
    socket.emit('roomListResponse', roomList);
  });

  socket.on(
    'createRoom',
    ({ roomName, maxPlayers = 6, isPrivate = false, password = '', userId, nickname }) => {
      if (!userId || !nickname) {
        socket.emit('roomCreateError', { message: 'userId와 닉네임이 필요합니다.' });
        return;
      }

      const roomId = generateRoomId();
      const players = new Map();

      players.set(userId, {
        userId,
        name: nickname,
        socketId: socket.id,
      });

      rooms.set(roomId, {
        id: roomId,
        name: roomName || `방-${roomId}`,
        isPrivate: Boolean(isPrivate),
        password: isPrivate ? String(password || '') : '',
        maxPlayers: Number(maxPlayers) || 6,
        status: 'waiting',
        hostId: userId,
        players,
        createdAt: Date.now(),
      });

      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);
      socket.join(roomId);

      console.log(`Room ${roomId} created by ${nickname} (${userId})`);

      socket.emit('roomCreated', {
        roomId,
        room: {
          id: roomId,
          name: roomName || `방-${roomId}`,
          isPrivate: Boolean(isPrivate),
          maxPlayers: Number(maxPlayers) || 6,
          status: 'waiting',
          hostId: userId,
          players: Array.from(players.values()),
        },
      });

      io.emit('roomListUpdated');
    }
  );

  socket.on('joinRoom', ({ roomId, userId, nickname, password = '' }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('joinRoomError', { message: '존재하지 않는 방입니다.' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('joinRoomError', { message: '이미 게임이 진행 중인 방입니다.' });
      return;
    }

    if (room.players.size >= room.maxPlayers) {
      socket.emit('joinRoomError', { message: '방 인원수가 가득 찼습니다.' });
      return;
    }

    if (room.isPrivate && room.password !== String(password || '')) {
      socket.emit('joinRoomError', { message: '비밀번호가 올바르지 않습니다.' });
      return;
    }

    if (!userId || !nickname) {
      socket.emit('joinRoomError', { message: 'userId와 닉네임이 필요합니다.' });
      return;
    }

    userSocketMap.set(userId, socket.id);
    socketUserMap.set(socket.id, userId);

    socket.join(roomId);

    room.players.set(userId, {
      userId,
      name: nickname,
      socketId: socket.id,
    });

    // 만약 hostId가 비어있다면 첫 참가자를 방장으로 설정
    if (!room.hostId || !room.players.has(room.hostId)) {
      room.hostId = userId;
    }

    const playersArray = Array.from(room.players.values());

    socket.emit('joinRoomSuccess', {
      roomId,
      room: {
        id: room.id,
        name: room.name,
        isPrivate: room.isPrivate,
        maxPlayers: room.maxPlayers,
        status: room.status,
        hostId: room.hostId,
        players: playersArray,
      },
    });

    socket.to(roomId).emit('playerJoined', {
      roomId,
      player: {
        userId,
        name: nickname,
      },
      hostId: room.hostId,
      players: playersArray,
    });

    io.emit('roomListUpdated');
  });

  socket.on('leaveRoom', ({ roomId, userId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    if (!room.players.has(userId)) {
      return;
    }

    room.players.delete(userId);
    socket.leave(roomId);

    const wasHost = room.hostId === userId;

    if (wasHost) {
      const remainingIds = Array.from(room.players.keys());
      room.hostId = remainingIds[0] || null;
    }

    const playersArray = Array.from(room.players.values());

    io.to(roomId).emit('playerLeft', {
      roomId,
      userId,
      hostId: room.hostId,
      players: playersArray,
    });

    if (room.players.size === 0) {
      rooms.delete(roomId);
      io.emit('roomListUpdated');
      return;
    }

    io.emit('roomListUpdated');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    const userId = socketUserMap.get(socket.id);

    if (!userId) {
      return;
    }

    socketUserMap.delete(socket.id);
    if (userSocketMap.get(userId) === socket.id) {
      userSocketMap.delete(userId);
    }

    for (const [roomId, room] of rooms.entries()) {
      if (!room.players.has(userId)) continue;

      room.players.delete(userId);
      const wasHost = room.hostId === userId;

      if (wasHost) {
        const remainingIds = Array.from(room.players.keys());
        room.hostId = remainingIds[0] || null;
      }

      const playersArray = Array.from(room.players.values());

      io.to(roomId).emit('playerLeft', {
        roomId,
        userId,
        hostId: room.hostId,
        players: playersArray,
      });

      if (room.players.size === 0) {
        rooms.delete(roomId);
        io.emit('roomListUpdated');
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Luna-Block backend listening on http://${HOST}:${PORT}`);
});
