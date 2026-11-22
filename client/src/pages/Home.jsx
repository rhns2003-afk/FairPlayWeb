import { Link } from "react-router-dom";
import { games } from "../data/games";

export default function Home() {
  return (
    <main className="container">
      <header className="hero">
        <h1>FairPlay</h1>
        <p>Pick a game, grab a seat, or watch live.</p>
      </header>

      <section className="grid">
        {games.map((game) => (
          <Link key={game.id} to={`/game/${game.id}`} className="card">
            <div className="card-emoji">{game.emoji}</div>
            <h2>{game.name}</h2>
            <p>{game.description}</p>
            <span className="badge">{game.players}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}