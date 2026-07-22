import { useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import OnlineUsers from './OnlineUsers';

function connectionLabel(mode) {
  if (mode === 'live') return 'Live';
  if (mode === 'polling') return 'Polling';
  if (mode === 'connecting') return 'Connecting…';
  return 'Offline';
}

function ChatDrawer() {
  const { user } = useAuth();
  const {
    open,
    setOpen,
    messages,
    staff,
    onlineUsers,
    typingUser,
    connectionMode,
    sendError,
    setSendError,
    loadingHistory,
    sendMessage,
    sendTyping,
  } = useChat();

  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, typingUser]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-slate-900/30 print:hidden"
        aria-label="Close staff chat"
        onClick={() => setOpen(false)}
      />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200 bg-[#F8FAFC] shadow-2xl print:hidden sm:rounded-l-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-brand" />
              <h2 className="text-base font-bold text-slate-900">Staff Chat</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Internal team channel · {connectionLabel(connectionMode)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-2">
          <OnlineUsers onlineUsers={onlineUsers} staff={staff} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} currentUserId={user?.id} loading={loadingHistory} />
          {typingUser && (
            <p className="px-4 pb-2 text-xs italic text-slate-500">{typingUser.name} is typing…</p>
          )}
          <div ref={bottomRef} />
        </div>

        <MessageInput
          staff={staff}
          onSend={sendMessage}
          onTyping={sendTyping}
          disabled={connectionMode === 'offline' && !navigator.onLine}
          sendError={sendError}
          onClearError={() => setSendError(null)}
        />
      </aside>
    </>
  );
}

export default ChatDrawer;
