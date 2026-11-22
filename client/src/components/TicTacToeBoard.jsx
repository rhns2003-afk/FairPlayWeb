export default function TicTacToeBoard({ state, seated, onMove }) {
  return (
    <div className="board">
      {state.board.map((cell, i) => (
        <button
          key={i}
          className={`cell ${cell ?? ""}`}
          disabled={!seated || Boolean(cell) || Boolean(state.winner)}
          onClick={() => onMove(i)}
        >
          {cell}
        </button>
      ))}
    </div>
  );
}