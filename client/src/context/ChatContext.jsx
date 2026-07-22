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
  clearChatConversation,
  createDirectConversation,
  createGroupConversation,
  fetchChatMessages,
  fetchChatStaff,
  fetchConversations,
  getStaffChatWsUrl,
  markChatRead,
  postChatMessage,
} from '../services/chatApi';

const ChatContext = createContext(null);
const POLL_MS = 4000;
const WS_FAIL_THRESHOLD = 3;

function mergeById(existing, incoming) {
  const map = new Map(existing.map((m) => [m.id, m]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

function sortMessages(list) {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const canChat = Boolean(isAuthenticated && user && !user.fosterId);

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messagesById, setMessagesById] = useState({});
  const [staff, setStaff] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typing, setTyping] = useState(null);
  const [connectionMode, setConnectionMode] = useState('connecting');
  const [sendError, setSendError] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const wsFailCount = useRef(0);
  const preferPolling = useRef(false);
  const typingClearRef = useRef(null);
  const activeIdRef = useRef(null);
  const messagesTipRef = useRef({});

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const activeMessages = messagesById[activeId] || [];

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const [list, members] = await Promise.all([fetchConversations(), fetchChatStaff()]);
      setConversations(list);
      setStaff(members);
      setActiveId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (err) {
      console.error('[staff-chat] conversations failed', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId, { after = null } = {}) => {
    if (!conversationId) return;
    if (!after) setLoadingMessages(true);
    try {
      const batch = await fetchChatMessages(conversationId, { after });
      setMessagesById((prev) => {
        const existing = after ? prev[conversationId] || [] : [];
        const next = sortMessages(mergeById(existing, batch));
        messagesTipRef.current[conversationId] = next[next.length - 1]?.createdAt || null;
        return { ...prev, [conversationId]: next };
      });
    } catch (err) {
      console.error('[staff-chat] messages failed', err);
    } finally {
      if (!after) setLoadingMessages(false);
    }
  }, []);

  const ingestMessage = useCallback((message) => {
    if (!message?.conversationId) return;
    setMessagesById((prev) => {
      const existing = prev[message.conversationId] || [];
      const next = sortMessages(mergeById(existing, [message]));
      messagesTipRef.current[message.conversationId] = next[next.length - 1]?.createdAt || null;
      return { ...prev, [message.conversationId]: next };
    });
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== message.conversationId) return c;
        const isActive = activeIdRef.current === c.id;
        const fromOther = message.senderId !== user?.id;
        return {
          ...c,
          updatedAt: message.createdAt,
          lastMessage: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt,
            senderName: message.sender?.displayName,
          },
          unreadCount: isActive || !fromOther ? 0 : (c.unreadCount || 0) + 1,
        };
      });
      return [...updated].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  }, [user?.id]);

  const selectConversation = useCallback(async (id) => {
    setActiveId(id);
    setSendError(null);
    setTyping(null);
    await loadMessages(id);
    try {
      await markChatRead(id);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    } catch {
      /* ignore */
    }
  }, [loadMessages]);

  const connectWs = useCallback(() => {
    if (!canChat || preferPolling.current) return;
    const token = getAuthToken();
    if (!token) return;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
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
        ingestMessage(payload.message);
      } else if (payload.type === 'online' && Array.isArray(payload.users)) {
        setOnlineUsers(payload.users);
      } else if (payload.type === 'typing') {
        if (payload.userId === user?.id) return;
        if (payload.conversationId !== activeIdRef.current) return;
        setTyping({ id: payload.userId, name: payload.name });
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setTyping(null), 2500);
      } else if (payload.type === 'cleared') {
        if (payload.conversationId) {
          setMessagesById((prev) => ({ ...prev, [payload.conversationId]: [] }));
          setConversations((prev) => prev.map((c) => (
            c.id === payload.conversationId
              ? { ...c, lastMessage: null, unreadCount: 0 }
              : c
          )));
        }
      } else if (payload.type === 'error') {
        setSendError(payload.message || 'Chat error');
      }
    };

    socket.onerror = () => console.error('[staff-chat] WebSocket error');

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
  }, [canChat, ingestMessage, user?.id]);

  useEffect(() => {
    if (!canChat) {
      setConversations([]);
      setMessagesById({});
      setStaff([]);
      setOnlineUsers([]);
      setActiveId(null);
      setConnectionMode('offline');
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
      return undefined;
    }

    refreshConversations();
    connectWs();
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
    };
  }, [canChat, connectWs, refreshConversations]);

  useEffect(() => {
    if (!canChat || !activeId) return undefined;
    loadMessages(activeId);
  }, [activeId, canChat, loadMessages]);

  useEffect(() => {
    if (!canChat) return undefined;
    if (connectionMode === 'live') return undefined;
    const id = setInterval(async () => {
      try {
        await refreshConversations();
        const cid = activeIdRef.current;
        if (cid) {
          await loadMessages(cid, { after: messagesTipRef.current[cid] || null });
        }
        setConnectionMode((mode) => (mode === 'live' ? mode : 'polling'));
      } catch {
        setConnectionMode('offline');
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [canChat, connectionMode, loadMessages, refreshConversations]);

  const sendTyping = useCallback(() => {
    const socket = wsRef.current;
    const cid = activeIdRef.current;
    if (!cid || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'typing', conversationId: cid }));
  }, []);

  const sendMessage = useCallback(async (content) => {
    setSendError(null);
    const trimmed = content.trim();
    const cid = activeIdRef.current;
    if (!trimmed || !cid) return;

    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN && connectionMode === 'live') {
      try {
        socket.send(JSON.stringify({ type: 'message', conversationId: cid, content: trimmed }));
        return;
      } catch (err) {
        console.error('[staff-chat] WS send failed', err);
      }
    }

    try {
      const message = await postChatMessage(cid, trimmed);
      ingestMessage(message);
    } catch (err) {
      setSendError(err.message || 'Failed to send message');
      throw err;
    }
  }, [connectionMode, ingestMessage]);

  const startDirect = useCallback(async (userId) => {
    const conversation = await createDirectConversation(userId);
    await refreshConversations();
    await selectConversation(conversation.id);
    return conversation;
  }, [refreshConversations, selectConversation]);

  const startGroup = useCallback(async ({ name, memberIds }) => {
    const conversation = await createGroupConversation({ name, memberIds });
    await refreshConversations();
    await selectConversation(conversation.id);
    return conversation;
  }, [refreshConversations, selectConversation]);

  const clearActive = useCallback(async () => {
    const cid = activeIdRef.current;
    if (!cid) return;
    await clearChatConversation(cid);
    setMessagesById((prev) => ({ ...prev, [cid]: [] }));
    setConversations((prev) => prev.map((c) => (
      c.id === cid ? { ...c, lastMessage: null, unreadCount: 0 } : c
    )));
  }, []);

  const isSuperAdmin = user?.roleName === 'Super Admin';

  const value = useMemo(
    () => ({
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
      totalUnread,
      isSuperAdmin,
      selectConversation,
      sendMessage,
      sendTyping,
      startDirect,
      startGroup,
      clearActive,
      refreshConversations,
    }),
    [
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
      loadingConversations,
      loadingMessages,
      totalUnread,
      isSuperAdmin,
      selectConversation,
      sendMessage,
      sendTyping,
      startDirect,
      startGroup,
      clearActive,
      refreshConversations,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
