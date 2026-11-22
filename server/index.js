const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");
const app = express();
app.use(cors({ origin: ORIGINS }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGINS } });

const COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#38d9a9", "#4dabf7", "#9775fa", "#f783ac"];
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const rooms = {}; // one room per game id

function getRoom(gameId) {
  if (!rooms[gameId]) {
    rooms[gameId] = { users: {}, seats: { X: null, O: null }, board: Array(9).fill(null), turn: "X", winner: null, colorIndex: 0 };
  }
  return rooms[gameId];
}

function resetGame(room) {
  room.board = Array(9).fill(null);
  room.turn = "X";
  room.winner = null;
}

function findWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

function broadcast(gameId) {
  const room = getRoom(gameId);
  io.to(gameId).emit("state", {
    users: Object.values(room.users),
    seats: room.seats,
    board: room.board,
    turn: room.turn,
    winner: room.winner,
  });
}

function freeSeat(room, id) {
  let freed = false;
  for (const symbol of ["X", "O"]) {
    if (room.seats[symbol] === id) {
      room.seats[symbol] = null;
      freed = true;
    }
  }
  if (freed) resetGame(room); // a player left, so the match restarts
  return freed;
}

io.on("connection", (socket) => {
  socket.on("join", (gameId) => {
    const room = getRoom(gameId);
    socket.data.gameId = gameId;
    socket.join(gameId);

    const user = {
      id: socket.id,
      name: `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
      color: COLORS[room.colorIndex++ % COLORS.length],
    };
    room.users[socket.id] = user;

    socket.emit("you", user);
    broadcast(gameId);
  });

  socket.on("take-seat", () => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    const room = getRoom(gameId);
    if (room.seats.X === socket.id || room.seats.O === socket.id) return;

    const free = ["X", "O"].find((s) => room.seats[s] === null);
    if (!free) {
      socket.emit("seat-denied", "Both seats are taken.");
      return;
    }
    room.seats[free] = socket.id;
    broadcast(gameId);
  });

  socket.on("leave-seat", () => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    if (freeSeat(getRoom(gameId), socket.id)) broadcast(gameId);
  });

  socket.on("move", (index) => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    const room = getRoom(gameId);
    const symbol = room.seats.X === socket.id ? "X" : room.seats.O === socket.id ? "O" : null;

    if (!symbol || room.turn !== symbol) return;
    if (!room.seats.X || !room.seats.O) return; // need both players
    if (room.winner || !Number.isInteger(index) || index < 0 || index > 8 || room.board[index]) return;

    room.board[index] = symbol;
    room.winner = findWinner(room.board);
    if (!room.winner) room.turn = symbol === "X" ? "O" : "X";
    broadcast(gameId);
  });

  socket.on("reset", () => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    const room = getRoom(gameId);
    if (room.seats.X !== socket.id && room.seats.O !== socket.id) return;
    resetGame(room);
    broadcast(gameId);
  });

  socket.on("cursor-move", ({ x, y }) => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    socket.volatile.to(gameId).emit("cursor", { id: socket.id, x, y });
  });

  socket.on("disconnect", () => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    const room = getRoom(gameId);
    freeSeat(room, socket.id);
    delete room.users[socket.id];
    io.to(gameId).emit("cursor-gone", socket.id);
    broadcast(gameId);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));