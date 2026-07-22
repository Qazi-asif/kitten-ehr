function OnlineUsers({ onlineUsers, staff }) {
  if (!onlineUsers?.length) {
    return <p className="text-xs text-slate-400">No one else online</p>;
  }

  const nameById = new Map(staff.map((s) => [s.id, s.displayName]));

  return (
    <ul className="flex flex-wrap gap-2">
      {onlineUsers.map((u) => (
        <li
          key={u.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          {u.name || nameById.get(u.id) || `User ${u.id}`}
        </li>
      ))}
    </ul>
  );
}

export default OnlineUsers;
