import { Link, useParams } from "react-router-dom";
import { games } from "../data/games";

export default function Game() {
  const { id } = useParams();
  const game = games.find((g) => g.id === id);

  if (!game) {
    return (
      <main className="container">
        <h1>Game not found</h1>
        <Link to="/" className="back">← Back to catalog</Link>
      </main>
    );
  }

  return (
    <main className="container">
      <Link to="/" className="back">← Back to catalog</Link>
      <h1>{game.name}</h1>
      <p>The board, seats, and live cursors will go here.</p>
    </main>
  );
}