export default function UltimateBoard({ state, myTurn, onMove }) {
  return (
    <div className="ultimate">
      {state.boards.map((cells, b) => {
        const result = state.boardWinners[b];
        const playable =
          !state.winner && result === null && (state.active === null || state.active === b);

        return (
          <div key={b} className={`mini ${playable ? "playable" : ""}`}>
            {cells.map((cell, c) => {
              const last = state.lastMove?.board === b && state.lastMove?.cell === c;
              return (
                <button
                  key={c}
                  className={`ucell ${cell ?? ""} ${last ? "last" : ""}`}
                  disabled={!myTurn || !playable || Boolean(cell)}
                  onClick={() => onMove({ board: b, cell: c })}
                >
                  {cell}
                </button>
              );
            })}
            {result && (
              <div className={`mini-result ${result}`}>{result === "draw" ? "–" : result}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}