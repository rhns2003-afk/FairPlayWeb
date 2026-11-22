const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

module.exports = {
  create: () => ({ board: Array(9).fill(null), turn: "X", winner: null }),

  // returns true if the move was applied
  move(state, symbol, index) {
    if (!Number.isInteger(index) || index < 0 || index > 8 || state.board[index]) return false;
    state.board[index] = symbol;
    state.winner = winnerOf(state.board);
    if (!state.winner) state.turn = symbol === "X" ? "O" : "X";
    return true;
  },
};