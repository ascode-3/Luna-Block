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
        // 멀티 테트리스용 상태 필드
        gameStates: new Map(),
        isGameStarted: false,
        isGameFinished: false,
        movedToTetris: new Set(),
        playersRestarted: new Set(),
        targetMap: null,
        targetInterval: null,
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

    // 멀티 테트리스 페이지에서 사용할 수 있도록 플레이어 연결 종료 이벤트도 전송
    io.to(roomId).emit('playerDisconnect', userId);

    if (room.players.size === 0) {
      // 방이 비워질 때 타겟 재지정 타이머 정리
      if (room.targetInterval) {
        clearInterval(room.targetInterval);
        room.targetInterval = null;
      }

      rooms.delete(roomId);
      io.emit('roomListUpdated');
      return;
    }

    io.emit('roomListUpdated');
  });

  // === 멀티 테트리스 게임 로직 ===

  // 게임 시작: 방장만, 최소 2명 이상일 때 가능
  socket.on('startGame', ({ roomId, userId }) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('gameStartConfirmation', {
        status: 'error',
        error: '존재하지 않는 방입니다.',
        roomId,
      });
      return;
    }

    if (room.hostId !== userId) {
      socket.emit('gameStartConfirmation', {
        status: 'error',
        error: '방장만 게임을 시작할 수 있습니다.',
        roomId,
      });
      return;
    }

    if (room.isGameStarted) {
      socket.emit('gameStartConfirmation', {
        status: 'error',
        error: '이미 게임이 시작되었습니다.',
        roomId,
      });
      return;
    }

    if (room.players.size < 2) {
      socket.emit('gameStartConfirmation', {
        status: 'error',
        error: '게임을 시작하기 위한 최소 인원이 부족합니다.',
        roomId,
      });
      return;
    }

    // 게임 상태 초기화
    room.isGameStarted = true;
    room.isGameFinished = false;
    room.status = 'playing';

    if (!room.gameStates || !(room.gameStates instanceof Map)) {
      room.gameStates = new Map();
    } else {
      room.gameStates.clear();
    }

    room.playersRestarted = new Set();
    room.movedToTetris = new Set();
    room.targetMap = null;

    // 타겟 지정 함수
    const assignTargets = () => {
      const playerIds = Array.from(room.players.keys());
      if (playerIds.length <= 1) return; // 한 명 이하일 땐 타겟 지정 안 함

      room.targetMap = new Map();

      playerIds.forEach((attackerId) => {
        let targetId;
        if (playerIds.length === 2) {
          // 두 명일 때는 상대방 고정
          targetId = playerIds.find((id) => id !== attackerId);
        } else {
          // 세 명 이상일 때는 자신 제외 랜덤
          do {
            targetId = playerIds[Math.floor(Math.random() * playerIds.length)];
          } while (targetId === attackerId);
        }

        room.targetMap.set(attackerId, targetId);

        const attackerSocketId = userSocketMap.get(attackerId);
        if (attackerSocketId) {
          io.to(attackerSocketId).emit('targetAssigned', {
            targetId,
            targetName: room.players.get(targetId)?.name,
          });
        }
      });
    };

    // 최초 타겟 지정 및 주기적 재지정
    assignTargets();

    if (room.targetInterval) {
      clearInterval(room.targetInterval);
    }
    room.targetInterval = setInterval(assignTargets, 15000);

    // 모든 플레이어에게 테트리스 페이지 이동 및 게임 시작 알림
    io.to(roomId).emit('moveToTetrisPage', { roomId });
    io.to(roomId).emit('gameStart');

    socket.emit('gameStartConfirmation', {
      status: 'success',
      roomId,
      participantCount: room.players.size,
    });
  });

  // 클라이언트가 테트리스 페이지 로딩 완료를 서버에 알림
  socket.on('tetrisPageLoaded', ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socketUserMap.get(socket.id);

    if (!room || !userId) {
      return;
    }

    if (!room.movedToTetris || !(room.movedToTetris instanceof Set)) {
      room.movedToTetris = new Set();
    }

    room.movedToTetris.add(userId);

    // 페이지 로딩 후 현재 타겟 정보 재전송
    if (room.targetMap && room.targetMap.has(userId)) {
      const targetId = room.targetMap.get(userId);
      socket.emit('targetAssigned', {
        targetId,
        targetName: room.players.get(targetId)?.name,
      });
    }
  });

  // 라인 삭제(공격) 처리
  socket.on('lineCleared', ({ roomId, linesCleared }) => {
    const room = rooms.get(roomId);
    const attackerId = socketUserMap.get(socket.id);

    if (!room || !attackerId) return;
    if (!room.targetMap || !room.targetMap.has(attackerId)) return;

    let garbage = 0;
    if (linesCleared === 1) {
      garbage = Math.random() < 0.3 ? 1 : 0;
    } else if (linesCleared === 2) {
      garbage = 1;
    } else if (linesCleared === 3) {
      garbage = 2;
    } else if (linesCleared >= 4) {
      garbage = 4;
    }

    if (garbage === 0) return;

    const targetId = room.targetMap.get(attackerId);

    if (room.gameStates && room.gameStates.has(targetId)) {
      const targetState = room.gameStates.get(targetId);
      if (targetState && targetState.isGameOver) {
        return;
      }
    }

    const targetSocketId = userSocketMap.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receiveGarbage', { lines: garbage });
    }
  });

  // 각 플레이어의 현재 게임 상태를 서버에 전송
  socket.on('updateGameState', ({ roomId, gameState }) => {
    const room = rooms.get(roomId);
    const userId = socketUserMap.get(socket.id);

    if (!room || !userId) {
      return;
    }

    if (!room.gameStates || !(room.gameStates instanceof Map)) {
      room.gameStates = new Map();
    }

    room.gameStates.set(userId, gameState);

    // 다른 플레이어들에게 중계
    socket.to(roomId).emit('gameStateUpdate', {
      playerId: userId,
      playerName: room.players.get(userId)?.name,
      gameState,
    });
  });

  // 게임 오버 처리
  socket.on('gameOver', ({ roomId, score }) => {
    const room = rooms.get(roomId);
    const userId = socketUserMap.get(socket.id);

    if (!room || !userId) {
      return;
    }

    // 이미 종료된 게임이면 무시
    if (room.isGameFinished) {
      return;
    }

    if (!room.gameStates || !(room.gameStates instanceof Map)) {
      room.gameStates = new Map();
    }

    // 플레이어 상태에 게임 오버 표시
    const currentState = room.gameStates.get(userId) || {};
    currentState.isGameOver = true;
    room.gameStates.set(userId, currentState);

    // 다른 플레이어들에게 게임 오버 알림
    socket.to(roomId).emit('playerGameOver', {
      playerId: userId,
      score,
      isGameOver: true,
    });

    // UI 갱신을 위한 상태 브로드캐스트
    socket.to(roomId).emit('gameStateUpdate', {
      playerId: userId,
      playerName: room.players.get(userId)?.name,
      gameState: { ...currentState },
    });

    // 살아있는 플레이어 수 체크 (room.players에 남아있는 사람만 기준)
    let activePlayers = 0;
    let lastActivePlayer = null;

    for (const [playerId, gameState] of room.gameStates.entries()) {
      if (!room.players.has(playerId)) {
        continue;
      }
      if (!gameState.isGameOver) {
        activePlayers++;
        lastActivePlayer = {
          id: playerId,
          name: room.players.get(playerId)?.name,
        };
      }
    }

    // 2명 이상 플레이 중이었고, 1명만 남으면 승자 처리
    if (activePlayers === 1 && room.players.size > 1) {
      room.isGameFinished = true;
      room.isGameStarted = false;
      room.status = 'waiting';

      // 타겟 재지정 타이머 정리
      if (room.targetInterval) {
        clearInterval(room.targetInterval);
        room.targetInterval = null;
      }

      io.to(roomId).emit('gameWin', {
        winner: lastActivePlayer,
        players: Array.from(room.players.values()),
      });

      room.playersRestarted = new Set();
      if (room.movedToTetris && room.movedToTetris instanceof Set) {
        room.movedToTetris.clear();
      }
    }
  });

  // 게임 재시작: 모든 플레이어가 계속하기를 눌렀을 때
  socket.on('restartGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    const userId = socketUserMap.get(socket.id);

    if (!room || !userId) {
      return;
    }

    if (!room.playersRestarted || !(room.playersRestarted instanceof Set)) {
      room.playersRestarted = new Set();
    }

    room.playersRestarted.add(userId);

    io.to(roomId).emit('playerRestarted', {
      playerId: userId,
      playerName: room.players.get(userId)?.name,
      restartedCount: room.playersRestarted.size,
      totalPlayers: room.players.size,
    });

    // 모든 플레이어가 계속하기를 눌렀을 때만 완전 초기화
    if (room.playersRestarted.size === room.players.size) {
      room.isGameFinished = false;
      room.isGameStarted = false;
      room.status = 'waiting';

      if (room.targetInterval) {
        clearInterval(room.targetInterval);
        room.targetInterval = null;
      }

      if (!room.gameStates || !(room.gameStates instanceof Map)) {
        room.gameStates = new Map();
      }

      for (const [playerId, state] of room.gameStates.entries()) {
        if (state) {
          state.isGameOver = false;
          room.gameStates.set(playerId, state);
        }
      }

      room.playersRestarted.clear();
      if (room.movedToTetris && room.movedToTetris instanceof Set) {
        room.movedToTetris.clear();
      }

      io.to(roomId).emit('gameRestart');
    }
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

      // 멀티 테트리스 페이지용 disconnect 이벤트
      io.to(roomId).emit('playerDisconnect', userId);

      if (room.players.size === 0) {
        // 방이 제거될 때 타겟 재지정 타이머 정리
        if (room.targetInterval) {
          clearInterval(room.targetInterval);
          room.targetInterval = null;
        }

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
