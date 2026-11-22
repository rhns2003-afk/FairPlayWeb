export default function Cursors({ cursors, users, myId }) {
  return (
    <div className="cursor-layer">
      {Object.entries(cursors).map(([id, pos]) => {
        if (id === myId) return null;
        const user = users.find((u) => u.id === id);
        if (!user) return null;
        return (
          <div
            key={id}
            className="remote-cursor"
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={user.color} stroke="#000" strokeWidth="1">
              <path d="M3 2l7 19 3-8 8-3z" />
            </svg>
            <span style={{ background: user.color }}>{user.name}</span>
          </div>
        );
      })}
    </div>
  );
}