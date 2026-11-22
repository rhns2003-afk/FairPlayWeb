import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { games } from "../data/games";
import Cursors from "../components/Cursors";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export default function Game() {
  const { id } = useParams();
  const game = games.find((g) => g.id === id);

  const socketRef = useRef(null);
  const [me, setMe] = useState(null);
  const [state, setState] = useState(null);
  const [cursors, setCursors] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!game) return;
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join", id));
    socket.on("you", setMe);
    socket.on("state", setState);
    socket.on("cursor", ({ id: uid, x, y }) =>
      setCursors((c) => ({ ...c, [uid]: { x, y } }))
    );
    socket.on("cursor-gone", (uid) =>
      setCursors((c) => {
        const { [uid]: _removed, ...rest } = c;
        return rest;
      })
    );
    socket.on("seat-denied", (msg) => {
      setNotice(msg);
      setTimeout(() => setNotice(""), 2500);
    });

    let last = 0;
    const onMove = (e) => {
      const now = Date.now();
      if (now - last < 30) return;
      last = now;
      socket.emit("cursor-move", {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("mousemove", onMove);
      socket.disconnect();
    };
  }, [id, game]);

  if (!game) {
    return (
      <main className="container">
        <h1>Game not found</h1>
        <Link to="/" className="back">← Back to catalog</Link>
      </main>
    );
  }

  const emit = (event, payload) => socketRef.current?.emit(event, payload);

  const mySymbol =
    state && me ? (state.seats.X === me.id ? "X" : state.seats.O === me.id ? "O" : null) : null;
  const seated = Boolean(mySymbol);
  const seatsFull = state && state.seats.X && state.seats.O;
  const nameOf = (uid) => state?.users.find((u) => u.id === uid);
  const spectators = state
    ? state.users.filter((u) => u.id !== state.seats.X && u.id !== state.seats.O)
    : [];

  let status = "Connecting...";
  if (state) {
    if (state.winner === "draw") status = "It's a draw!";
    else if (state.winner) status = `${nameOf(state.seats[state.winner])?.name ?? state.winner} (${state.winner}) wins!`;
    else if (!seatsFull) status = "Waiting for two players...";
    else status = `${state.turn}'s turn${mySymbol === state.turn ? " (you)" : ""}`;
  }

  return (
    <main className="container">
      <Link to="/" className="back">← Back to catalog</Link>
      <h1>{game.name}</h1>

      {!state ? (
        <p>Connecting to server...</p>
      ) : (
        <div className="room">
          <div className="seats">
            {["X", "O"].map((s) => {
              const player = nameOf(state.seats[s]);
              return (
                <div key={s} className={`seat ${state.turn === s && seatsFull && !state.winner ? "active" : ""}`}>
                  <strong>{s}</strong>
                  <span style={{ color: player?.color }}>
                    {player ? `${player.name}${player.id === me?.id ? " (you)" : ""}` : "Empty seat"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="status">{status}</p>
          {notice && <p className="notice">{notice}</p>}

          <div className="board">
            {state.board.map((cell, i) => (
              <button
                key={i}
                className={`cell ${cell ?? ""}`}
                disabled={!seated || Boolean(cell) || Boolean(state.winner)}
                onClick={() => emit("move", i)}
              >
                {cell}
              </button>
            ))}
          </div>

          <div className="actions">
            {seated ? (
              <>
                <button onClick={() => emit("leave-seat")}>Become spectator</button>
                <button onClick={() => emit("reset")}>Reset board</button>
              </>
            ) : (
              <button onClick={() => emit("take-seat")} disabled={Boolean(seatsFull)}>
                {seatsFull ? "Seats full, spectating" : "Take a seat"}
              </button>
            )}
          </div>

          <p className="spectators">
            Spectators ({spectators.length}):{" "}
            {spectators.map((u) => (
              <span key={u.id} style={{ color: u.color }}>{u.name}{u.id === me?.id ? " (you)" : ""} </span>
            ))}
          </p>
        </div>
      )}

      {state && <Cursors cursors={cursors} users={state.users} myId={me?.id} />}
    </main>
  );
}