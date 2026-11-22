const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");
const app = express();
app.use(cors({ origin: ORIGINS }));
app.get("/", (req, res) => res.send("FairPlay server is running"));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGINS } });

// To add a game: create a module in ./games and register it here
const games = {
  "tic-tac-toe": require("./games/ticTacToe"),
  "ultimate-tic-tac-toe": require("./games/ultimateTicTacToe"),
};

const COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#38d9a9", "#4dabf7", "#9775fa", "#f783ac"];
const rooms = {}; // one room per game id

function getRoom(gameId) {
  if (!rooms[gameId]) {
    rooms[gameId] = {
      users: {},
      seats: { X: null, O: null },
      game: games[gameId].create(),
      colorIndex: 0,
    };
  }
  return rooms[gameId];
}

function broadcast(gameId) {
  const room = getRoom(gameId);
  io.to(gameId).emit("state", {
    users: Object.values(room.users),
    seats: room.seats,
    ...room.game, // game-specific state (board, turn, winner, ...)
  });
}

function freeSeat(room, gameId, id) {
  let freed = false;
  for (const symbol of ["X", "O"]) {
    if (room.seats[symbol] === id) {
      room.seats[symbol] = null;
      freed = true;
    }
  }
  if (freed) room.game = games[gameId].create(); // a player left, so the match restarts
  return freed;
}

io.on("connection", (socket) => {
  socket.on("join", (gameId) => {
    if (!games[gameId] || socket.data.gameId) return;
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
    if (freeSeat(getRoom(gameId), gameId, socket.id)) broadcast(gameId);
  });

  socket.on("move", (payload) => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    const room = getRoom(gameId);
    const symbol = room.seats.X === socket.id ? "X" : room.seats.O === socket.id ? "O" : null;

    if (!symbol || !room.seats.X || !room.seats.O) return; // need two seated players
    if (room.game.winner || room.game.turn !== symbol) return;

    if (games[gameId].move(room.game, symbol, payload)) broadcast(gameId);
  });

  socket.on("reset", () => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    const room = getRoom(gameId);
    if (room.seats.X !== socket.id && room.seats.O !== socket.id) return;
    room.game = games[gameId].create();
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
    freeSeat(room, gameId, socket.id);
    delete room.users[socket.id];
    io.to(gameId).emit("cursor-gone", socket.id);
    broadcast(gameId);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));