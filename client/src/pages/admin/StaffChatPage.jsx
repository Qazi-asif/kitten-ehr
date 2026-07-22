import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function NewChatModal({ staff, currentUserId, onClose, onDirect, onGroup }) {
  const [mode, setMode] = useState('direct');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff
      .filter((s) => s.id !== currentUserId)
      .filter((s) => {
        if (!q) return true;
        return (
          s.displayName?.toLowerCase().includes(q)
          || s.email?.toLowerCase().includes(q)
        );
      });
  }, [staff, currentUserId, query]);

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'direct') {
        if (selected.length !== 1) {
          setError('Select one person for a personal chat');
          return;
        }
        await onDirect(selected[0]);
      } else {
        if (!groupName.trim()) {
          setError('Enter a group name');
          return;
        }
        if (selected.length < 1) {
          setError('Select at least one other member');
          return;
        }
        await onGroup({ name: groupName.trim(), memberIds: selected });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Could not create chat');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-bold text-slate-900">New chat</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={() => { setMode('direct'); setSelected([]); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === 'direct' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => { setMode('group'); setSelected([]); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === 'group' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Group
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {mode === 'group' && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <ul className="space-y-1">
            {filtered.map((member) => {
              const checked = selected.includes(member.id);
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'direct') setSelected([member.id]);
                      else toggle(member.id);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                      checked ? 'bg-brand/10 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{member.displayName}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{member.roleName}</span>
                    </span>
                    {checked && <span className="shrink-0 text-xs font-bold text-brand">Selected</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {busy ? 'Creating…' : mode === 'direct' ? 'Start personal chat' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffChatPage() {
  const { user } = useAuth();
  const {
    canChat,
    conversations,
    activeId,
    activeConversation,
    activeMessages,
    staff,
    onlineUsers,
    typing,
    connectionMode,
    sendError,
    setSendError,
    loadingConversations,
    loadingMessages,
    isSuperAdmin,
    selectConversation,
    sendMessage,
    sendTyping,
    startDirect,
    startGroup,
    clearActive,
  } = useChat();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const messagesScrollRef = useRef(null);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeMessages, typing, activeId]);

  const onlineIds = useMemo(() => new Set(onlineUsers.map((u) => u.id)), [onlineUsers]);

  const filteredConversations = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => (c.title || c.name || '').toLowerCase().includes(q));
  }, [conversations, listQuery]);

  async function handleSend(e) {
    e?.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(draft);
      setDraft('');
    } catch {
      /* surfaced */
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    if (!isSuperAdmin) return;
    if (!window.confirm('Clear this chat for everyone? This cannot be undone.')) return;
    try {
      await clearActive();
    } catch (err) {
      setSendError(err.message || 'Failed to clear chat');
    }
  }

  if (!canChat) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-8 text-center text-sm text-slate-500">
        Staff chat is only available to logged-in staff accounts.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white">
      {/* Conversation list */}
      <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-slate-200 bg-[#F8FAFC]">
        <div className="flex h-[72px] shrink-0 flex-col justify-center border-b border-slate-200 bg-white px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-tight text-slate-900">Staff Chat</h2>
              <p className="truncate text-xs leading-tight text-slate-500">
                {connectionMode === 'live' ? 'Live' : connectionMode === 'polling' ? 'Polling' : 'Connecting…'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white"
            />
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {loadingConversations && !conversations.length && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">Loading…</li>
          )}
          {filteredConversations.map((c) => {
            const active = c.id === activeId;
            const preview = c.lastMessage?.content || 'No messages yet';
            const isDirect = c.type === 'DIRECT';
            const other = c.members?.find((m) => m.userId !== user?.id);
            const online = isDirect ? onlineIds.has(other?.userId) : (c.onlineMemberIds || []).length > 0;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    active ? 'bg-brand/10' : 'hover:bg-white'
                  }`}
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar text-sm font-bold text-white">
                    {c.type === 'GROUP' ? <Users className="h-4 w-4" /> : (c.title?.[0] || '?')}
                    {online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#F8FAFC] bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.title}</p>
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                        {formatTime(c.lastMessage?.createdAt || c.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-500">{preview}</p>
                      {c.unreadCount > 0 && (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Thread */}
      <section className="flex h-full min-w-0 flex-1 flex-col bg-[#Eef2f1]">
        {activeConversation ? (
          <>
            <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold leading-tight text-slate-900">{activeConversation.title}</h3>
                <p className="truncate text-xs leading-tight text-slate-500">
                  {activeConversation.type === 'DIRECT'
                    ? (onlineIds.has(activeConversation.members?.find((m) => m.userId !== user?.id)?.userId)
                      ? 'Online'
                      : 'Offline')
                    : `${activeConversation.memberCount || activeConversation.members?.length || 0} members · ${(activeConversation.onlineMemberIds || []).length} online`}
                </p>
              </div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear for everyone
                </button>
              )}
            </header>

            <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3">
                {loadingMessages && !activeMessages.length && (
                  <p className="py-8 text-center text-sm text-slate-500">Loading messages…</p>
                )}
                {!loadingMessages && !activeMessages.length && (
                  <p className="py-8 text-center text-sm text-slate-500">No messages yet. Say hello.</p>
                )}
                {activeMessages.map((msg) => {
                  const mine = msg.senderId === user?.id;
                  const showName = activeConversation.type === 'GROUP' && !mine;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[min(75%,28rem)] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                          mine
                            ? 'rounded-br-md bg-brand text-white'
                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        {showName && (
                          <p className="mb-0.5 text-[11px] font-semibold text-brand">
                            {msg.sender?.displayName || 'Staff'}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        <p className={`mt-1 text-right text-[10px] tabular-nums ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <p className="text-xs italic text-slate-500">{typing.name} is typing…</p>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
              <div className="mx-auto max-w-3xl">
                {sendError && (
                  <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {sendError}
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={draft}
                    disabled={sending}
                    placeholder="Type a message…"
                    className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-5 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                    onChange={(e) => {
                      setDraft(e.target.value);
                      sendTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-slate-500">
            <MessageCircle className="h-10 w-10 text-slate-300" />
            <p className="text-sm">Select a conversation or start a new chat</p>
          </div>
        )}
      </section>

      {showNew && (
        <NewChatModal
          staff={staff}
          currentUserId={user?.id}
          onClose={() => setShowNew(false)}
          onDirect={startDirect}
          onGroup={startGroup}
        />
      )}
    </div>
  );
}

export default StaffChatPage;
