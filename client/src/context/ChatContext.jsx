import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { getAuthToken } from '../services/authApi';
import {
  fetchChatMessages,
  fetchChatStaff,
  getStaffChatWsUrl,
  postChatMessage,
} from '../services/chatApi';

const ChatContext = createContext(null);
const LAST_READ_KEY = 'pt_staff_chat_last_read';
const POLL_MS = 4000;
const WS_FAIL_THRESHOLD = 3;

function readLastReadAt() {
  try {
    return localStorage.getItem(LAST_READ_KEY) || null;
  } catch {
    return null;
  }
}

function writeLastReadAt(iso) {
  try {
    localStorage.setItem(LAST_READ_KEY, iso);
  } catch {
    /* ignore */
  }
}

function mergeMessages(existing, incoming) {
  const map = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) {
    map.set(msg.id, msg);
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function ChatProvider({ children }) {
  const { user, isAuthenticated, hasPermission } = useAuth();
  const canChat = Boolean(isAuthenticated && hasPermission('chat.view'));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [staff, setStaff] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [connectionMode, setConnectionMode] = useState('connecting'); // live | polling | connecting | offline
  const [sendError, setSendError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadAt, setLastReadAt] = useState(readLastReadAt);

  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const wsFailCount = useRef(0);
  const preferPolling = useRef(false);
  const typingClearRef = useRef(null);
  const openRef = useRef(false);
  const lastReadRef = useRef(lastReadAt);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    lastReadRef.current = lastReadAt;
  }, [lastReadAt]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const markRead = useCallback(() => {
    const iso = new Date().toISOString();
    setLastReadAt(iso);
    writeLastReadAt(iso);
    setUnreadCount(0);
  }, []);

  const recomputeUnread = useCallback((list, readAt, isOpen) => {
    if (isOpen) {
      setUnreadCount(0);
      return;
    }
    const cutoff = readAt ? new Date(readAt).getTime() : 0;
    const count = list.filter((m) => {
      if (m.senderId === userIdRef.current) return false;
      return new Date(m.createdAt).getTime() > cutoff;
    }).length;
    setUnreadCount(count);
  }, []);

  const ingestMessages = useCallback((incoming) => {
    setMessages((prev) => {
      const next = mergeMessages(prev, Array.isArray(incoming) ? incoming : [incoming]);
      recomputeUnread(next, lastReadRef.current, openRef.current);
      return next;
    });
  }, [recomputeUnread]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [history, members] = await Promise.all([
        fetchChatMessages({ limit: 100 }),
        fetchChatStaff(),
      ]);
      setMessages(mergeMessages([], history));
      setStaff(members);
      recomputeUnread(history, lastReadRef.current, openRef.current);
    } catch (err) {
      console.error('[staff-chat] history load failed', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [recomputeUnread]);

  const messagesTipRef = useRef(null);
  useEffect(() => {
    messagesTipRef.current = messages.length
      ? messages[messages.length - 1]?.createdAt
      : null;
  }, [messages]);

  const pollOnceStable = useCallback(async () => {
    try {
      const batch = await fetchChatMessages({
        limit: 100,
        after: messagesTipRef.current || undefined,
      });
      if (batch.length) ingestMessages(batch);
      setConnectionMode((mode) => (mode === 'live' ? mode : 'polling'));
    } catch (err) {
      console.error('[staff-chat] poll failed', err);
      setConnectionMode('offline');
    }
  }, [ingestMessages]);

  const connectWs = useCallback(() => {
    if (!canChat || preferPolling.current) return;

    const token = getAuthToken();
    if (!token) return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }

    setConnectionMode('connecting');
    let socket;
    try {
      socket = new WebSocket(getStaffChatWsUrl(token));
    } catch (err) {
      console.error('[staff-chat] WS construct failed', err);
      wsFailCount.current += 1;
      if (wsFailCount.current >= WS_FAIL_THRESHOLD) preferPolling.current = true;
      setConnectionMode('polling');
      return;
    }

    wsRef.current = socket;

    socket.onopen = () => {
      reconnectAttempt.current = 0;
      wsFailCount.current = 0;
      setConnectionMode('live');
    };

    socket.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'message' && payload.message) {
        ingestMessages(payload.message);
      } else if (payload.type === 'online' && Array.isArray(payload.users)) {
        setOnlineUsers(payload.users);
      } else if (payload.type === 'typing') {
        if (payload.userId === userIdRef.current) return;
        setTypingUser({ id: payload.userId, name: payload.name });
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setTypingUser(null), 2500);
      } else if (payload.type === 'error') {
        console.error('[staff-chat] server error', payload.message);
        setSendError(payload.message || 'Chat error');
      }
    };

    socket.onerror = () => {
      console.error('[staff-chat] WebSocket error');
    };

    socket.onclose = () => {
      wsRef.current = null;
      wsFailCount.current += 1;
      if (wsFailCount.current >= WS_FAIL_THRESHOLD) {
        preferPolling.current = true;
        setConnectionMode('polling');
        return;
      }

      const attempt = reconnectAttempt.current;
      reconnectAttempt.current += 1;
      const delay = Math.min(30_000, 1000 * 2 ** attempt);
      setConnectionMode('connecting');
      setTimeout(() => {
        if (canChat && !preferPolling.current) connectWs();
      }, delay);
    };
  }, [canChat, ingestMessages]);

  useEffect(() => {
    if (!canChat) {
      setMessages([]);
      setStaff([]);
      setOnlineUsers([]);
      setUnreadCount(0);
      setConnectionMode('offline');
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
      return undefined;
    }

    loadHistory();
    connectWs();

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
    };
  }, [canChat, connectWs, loadHistory]);

  // Polling while drawer open, or always when in polling mode
  useEffect(() => {
    if (!canChat) return undefined;
    if (connectionMode === 'live' && !open) return undefined;

    const shouldPoll = connectionMode === 'polling' || connectionMode === 'offline' || open;
    if (!shouldPoll) return undefined;

    const id = setInterval(() => {
      pollOnceStable();
    }, POLL_MS);

    return () => clearInterval(id);
  }, [canChat, connectionMode, open, pollOnceStable]);

  useEffect(() => {
    if (open) markRead();
  }, [open, markRead]);

  const sendTyping = useCallback(() => {
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  const sendMessage = useCallback(async (content) => {
    setSendError(null);
    const trimmed = content.trim();
    if (!trimmed) return;

    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN && connectionMode === 'live') {
      try {
        socket.send(JSON.stringify({ type: 'message', content: trimmed }));
        return;
      } catch (err) {
        console.error('[staff-chat] WS send failed, falling back to REST', err);
      }
    }

    try {
      const message = await postChatMessage({ content: trimmed });
      ingestMessages(message);
    } catch (err) {
      console.error('[staff-chat] REST send failed', err);
      setSendError(err.message || 'Failed to send message');
      throw err;
    }
  }, [connectionMode, ingestMessages]);

  const value = useMemo(
    () => ({
      canChat,
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
      unreadCount,
      sendMessage,
      sendTyping,
      markRead,
      refresh: loadHistory,
    }),
    [
      canChat,
      open,
      messages,
      staff,
      onlineUsers,
      typingUser,
      connectionMode,
      sendError,
      loadingHistory,
      unreadCount,
      sendMessage,
      sendTyping,
      markRead,
      loadHistory,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
