function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function MessageList({ messages, currentUserId, loading }) {
  if (loading && messages.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">Loading messages…</p>;
  }

  if (!messages.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        No messages yet. Say hello to the team.
      </p>
    );
  }

  return (
    <ul className="space-y-3 px-4 py-3">
      {messages.map((msg) => {
        const mine = msg.senderId === currentUserId;
        const name = msg.sender?.displayName || 'Staff';
        return (
          <li key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                mine
                  ? 'rounded-br-md bg-brand text-white'
                  : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
              }`}
            >
              {!mine && (
                <p className={`mb-0.5 text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-brand'}`}>
                  {name}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
              <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default MessageList;
