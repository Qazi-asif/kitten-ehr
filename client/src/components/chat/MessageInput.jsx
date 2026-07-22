import { useMemo, useState } from 'react';

function MessageInput({ staff, onSend, onTyping, disabled, sendError, onClearError }) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);

  const suggestions = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.toLowerCase();
    return staff
      .filter((s) => {
        const name = `${s.firstName} ${s.lastName}`.toLowerCase();
        return name.includes(q) || s.email?.toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [mentionQuery, staff]);

  function updateMentionState(text, cursor) {
    const before = text.slice(0, cursor);
    const match = before.match(/@([A-Za-z0-9_.]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(member) {
    const cursor = value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const replaced = before.replace(/@([A-Za-z0-9_.]*)$/, `@${member.firstName}${member.lastName} `);
    const next = `${replaced}${after}`;
    setValue(next);
    setMentionQuery(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!value.trim() || sending || disabled) return;
    setSending(true);
    onClearError?.();
    try {
      await onSend(value);
      setValue('');
      setMentionQuery(null);
    } catch {
      /* error surfaced via context */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {sendError && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{sendError}</span>
          <button type="button" className="font-semibold underline" onClick={() => onClearError?.()}>
            Dismiss
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <ul className="mb-2 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {suggestions.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => insertMention(member)}
              >
                <span className="font-medium text-slate-800">{member.displayName}</span>
                <span className="text-xs text-slate-400">{member.roleName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          rows={2}
          value={value}
          disabled={disabled || sending}
          placeholder="Message the team… Use @ to mention"
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          onChange={(e) => {
            setValue(e.target.value);
            updateMentionState(e.target.value, e.target.selectionStart);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
