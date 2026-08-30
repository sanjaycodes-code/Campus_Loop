import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  Tag,
  Clock,
  ArrowLeft,
  ExternalLink,
  Laptop,
  BookOpen,
  Headphones,
  CheckCheck,
  Smile,
  Sparkles,
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Hi! Is this item still available?',
  'Where on campus can we meet for pickup?',
  'Can I rent it for 3 days starting tomorrow?',
];

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeParamId = searchParams.get('conversationId');

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Typing indicator state
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  // 1. Fetch Conversations on Mount
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/chat/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);

        // If URL has conversationId, select it; otherwise select first
        if (activeParamId) {
          const matched = res.data.conversations.find((c) => c._id === activeParamId);
          if (matched) setActiveConversation(matched);
        } else if (res.data.conversations.length > 0) {
          setActiveConversation(res.data.conversations[0]);
          setSearchParams({ conversationId: res.data.conversations[0]._id }, { replace: true });
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [activeParamId, setSearchParams]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. Fetch Messages when active conversation changes
  useEffect(() => {
    if (!activeConversation?._id) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/chat/conversations/${activeConversation._id}/messages`);
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Join Socket.io room for active conversation
    if (socket && isConnected) {
      socket.emit('join_conversation', activeConversation._id);
    }

    return () => {
      if (socket && isConnected) {
        socket.emit('leave_conversation', activeConversation._id);
      }
    };
  }, [activeConversation?._id, socket, isConnected]);

  // 3. Listen for Incoming Real-time Messages & Typing events via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      if (newMessage.conversation === activeConversation?._id) {
        setMessages((prev) => [...prev, newMessage]);
      }

      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c._id === newMessage.conversation
            ? { ...c, lastMessage: newMessage, lastMessageAt: new Date() }
            : c
        )
      );
    };

    const handleUserTyping = ({ conversationId, userName }) => {
      if (conversationId === activeConversation?._id) {
        setTypingUser(userName);
      }
    };

    const handleUserStopTyping = ({ conversationId }) => {
      if (conversationId === activeConversation?._id) {
        setTypingUser(null);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [socket, activeConversation?._id]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket && isConnected && activeConversation?._id) {
      socket.emit('typing', {
        conversationId: activeConversation._id,
        userName: user?.name?.split(' ')[0] || 'Student',
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: activeConversation._id });
      }, 1500);
    }
  };

  // 4. Send Message Handler
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConversation?._id || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');

    if (socket && isConnected) {
      socket.emit('stop_typing', { conversationId: activeConversation._id });
    }

    setIsSending(true);
    try {
      const res = await api.post(`/chat/conversations/${activeConversation._id}/messages`, {
        text: textToSend,
      });

      if (res.data.success && res.data.message) {
        // Appended via Socket.io receive_message or locally if needed
        const alreadyInList = messages.some((m) => m._id === res.data.message._id);
        if (!alreadyInList) {
          setMessages((prev) => [...prev, res.data.message]);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getOtherParticipant = (conv) => {
    if (!conv?.participants || !user) return null;
    return conv.participants.find((p) => p._id !== user._id) || conv.participants[0];
  };

  const otherUser = getOtherParticipant(activeConversation);

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 w-full overflow-hidden flex flex-col">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 flex overflow-hidden">
          {/* ================= LEFT PANE: Conversations List ================= */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col flex-shrink-0 bg-slate-50/50">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-slate-900 text-base">Messages</h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live</span>
                </div>
              </div>
            </div>

            {/* Conversations Scrollable Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingConversations ? (
                <div className="p-4 space-y-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-200 rounded-xl"></div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No conversations yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Chat with Host" on any marketplace item to start chatting!
                  </p>
                  <Link
                    to="/marketplace"
                    className="mt-4 inline-block px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Browse Items
                  </Link>
                </div>
              ) : (
                conversations.map((conv) => {
                  const partner = getOtherParticipant(conv);
                  const isSelected = activeConversation?._id === conv._id;

                  return (
                    <button
                      key={conv._id}
                      onClick={() => {
                        setActiveConversation(conv);
                        setSearchParams({ conversationId: conv._id });
                      }}
                      className={`w-full p-4 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/80 border-l-4 border-sky-600'
                          : 'hover:bg-slate-100/70'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                        {partner?.name ? partner.name.charAt(0).toUpperCase() : 'U'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            {partner?.name || 'Student'}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {conv.lastMessageAt
                              ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>

                        {/* Item snippet */}
                        <p className="text-[11px] text-sky-700 font-medium truncate mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 flex-shrink-0" />
                          <span>{conv.listing?.title || 'Listing item'}</span>
                        </p>

                        {/* Last message */}
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {conv.lastMessage?.text || 'Started a conversation'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= RIGHT PANE: Active Chat Room ================= */}
          <div className="hidden md:flex flex-1 flex-col bg-white overflow-hidden">
            {activeConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="p-3.5 px-6 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {otherUser?.name ? otherUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm">{otherUser?.name}</h3>
                        <ShieldCheck className="w-4 h-4 text-sky-600" />
                        <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                          NIT DGP
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {otherUser?.campus || 'NIT Durgapur'} • {otherUser?.email}
                      </p>
                    </div>
                  </div>

                  {/* Context Item Pill Banner */}
                  {activeConversation.listing && (
                    <Link
                      to={`/listings/${activeConversation.listing._id}`}
                      target="_blank"
                      className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="View listing details"
                    >
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[160px]">
                          {activeConversation.listing.title}
                        </p>
                        <p className="text-[10px] text-sky-600 font-semibold">
                          ₹{activeConversation.listing.pricePerDay}/day
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  )}
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-xs font-semibold">No messages yet in this conversation.</p>
                      <p className="text-[11px] mt-1">
                        Say hello and discuss rental dates, pickup locations, or item conditions!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;

                      return (
                        <div
                          key={msg._id}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {msg.sender?.name ? msg.sender.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}

                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-xs sm:text-sm ${
                              isMe
                                ? 'bg-sky-600 text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            <span
                              className={`text-[10px] block mt-1 text-right ${
                                isMe ? 'text-sky-200' : 'text-slate-400'
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Real-time Typing Bubble */}
                  {typingUser && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                      <div className="flex gap-1 py-2 px-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span>{typingUser} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts */}
                {messages.length < 3 && (
                  <div className="px-6 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                    <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">
                      Quick:
                    </span>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputText(prompt)}
                        className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 px-6 border-t border-slate-200 bg-white flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type your message... (Press Enter to send)"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-700 text-sm">Select a Conversation</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Choose a chat from the left panel to message student hosts and arrange rentals.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
