const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// returns "X", "O" or null (only real lines count)
function lineWinner(cells) {
  for (const [a, b, c] of LINES) {
    if (cells[a] === "X" || cells[a] === "O") {
      if (cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
    }
  }
  return null;
}

module.exports = {
  create: () => ({
    boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    boardWinners: Array(9).fill(null), // null | "X" | "O" | "draw"
    active: null, // index of the small board you must play in, null = anywhere
    lastMove: null,
    turn: "X",
    winner: null,
  }),

  // payload: { board, cell }
  move(state, symbol, payload) {
    const b = payload?.board;
    const c = payload?.cell;
    if (!Number.isInteger(b) || !Number.isInteger(c)) return false;
    if (b < 0 || b > 8 || c < 0 || c > 8) return false;
    if (state.boardWinners[b] !== null) return false; // board already finished
    if (state.boards[b][c] !== null) return false; // cell taken
    if (state.active !== null && state.active !== b) return false; // wrong board

    state.boards[b][c] = symbol;
    state.lastMove = { board: b, cell: c };

    // did this move finish the small board?
    const w = lineWinner(state.boards[b]);
    if (w) state.boardWinners[b] = w;
    else if (state.boards[b].every(Boolean)) state.boardWinners[b] = "draw";

    // did it win the whole game?
    const gameWinner = lineWinner(state.boardWinners);
    if (gameWinner) state.winner = gameWinner;
    else if (state.boardWinners.every((v) => v !== null)) state.winner = "draw";

    if (!state.winner) {
      // send the opponent to the board matching the cell, or anywhere if it's finished
      state.active = state.boardWinners[c] === null ? c : null;
      state.turn = symbol === "X" ? "O" : "X";
    } else {
      state.active = null;
    }
    return true;
  },
};