// Chat.jsx
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";

import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { getChatrooms, getMessages } from "../services/ChatService";
import { resolveImageUrl } from "../utils/resolveImageUrl";

const ChatBackup = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const currentProjectId = currentProject.project_id;

  const [chats, setChats] = useState([]);
  const [allMessages, setAllMessages] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [_openMenuId, setOpenMenuId] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [_reactionTarget, _setReactionTarget] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const messagesEndRef = useRef(null);
  const currentMessages = allMessages[selectedChat] || [];
  const currentChat = chats.find((c) => c.chatroom_id === selectedChat);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // チャットルーム一覧を読み込む
  useEffect(() => {
    const loadChatrooms = async () => {
      if (!currentProjectId) return;

      try {
        setIsLoading(true);
        const chatrooms = await getChatrooms(currentProjectId);

        console.log(chatrooms);

        const formattedChats = chatrooms.map((room) => ({
          ...room,
          id: room.chatroom_id,
          name: currentProject.title,
          lastMessage: "",
          timestamp: new Date(room.created_at).toLocaleDateString(),
        }));

        setChats(formattedChats);

        // 最初のチャットルームを自動選択
        if (formattedChats.length > 0) {
          setSelectedChat(formattedChats[0].chatroom_id);
        }
      } catch (error) {
        console.error("チャットルームの読み込みに失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadChatrooms();
  }, [currentProjectId]);

  // 選択されたチャットルームのメッセージを読み込む + ポーリング
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentProjectId || !selectedChat) return;

      try {
        setIsLoading(true);
        const response = await getMessages(currentProjectId, selectedChat);

        console.log("messages: ", response);

        const formattedMessages = response.messages.map((msg) => ({
          id: msg.message_id,
          userId: msg.user_id,
          userName: msg.name || `User ${msg.user_id}`,
          profilePicture: msg.profile_picture,
          text: msg.content,
          time: new Date(msg.timestamp).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          self: msg.user_id === user.id ? true : false,
          replyTo: null,
          reaction: null,
          reactions: {},
        }));

        setAllMessages((prev) => ({
          ...prev,
          [selectedChat]: formattedMessages,
        }));

        setCurrentPage(1);
        setHasMore(response.messages.length === 50);
      } catch (error) {
        console.error("メッセージの読み込みに失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadMessages();

    const pollInterval = setInterval(() => void loadMessages(), 5000);

    return () => clearInterval(pollInterval);
  }, [currentProjectId, selectedChat]);

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentProjectId || !selectedChat) return;

    try {
      const user_id = user.id;

      const messageData = {
        user_id: user_id,
        content: messageInput,
      };

      const response = await api.post(
        `/api/projects/${currentProjectId}/chatrooms/${selectedChat}/messages/`,
        messageData,
      );

      const newMessage = response.data;

      const formattedMessage = {
        id: newMessage.message_id,
        user: "自分",
        text: newMessage.content,
        time: new Date(newMessage.timestamp).toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        self: true,
        replyTo: replyTo || null,
        reaction: null,
        reactions: {},
      };

      setAllMessages((prev) => ({
        ...prev,
        [selectedChat]: [...(prev[selectedChat] || []), formattedMessage],
      }));

      setMessageInput("");
      setReplyTo(null);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      setChats((prev) =>
        prev.map((chat) =>
          chat.chatroom_id === selectedChat
            ? { ...chat, lastMessage: messageData.content, timestamp: "今" }
            : chat,
        ),
      );
    } catch (error) {
      console.error("メッセージの送信に失敗しました:", error);
      alert("メッセージの送信に失敗しました。もう一度お試しください。");
    }
  };

  // 編集開始 / 保存
  const startEditing = (msg) => {
    setEditingId(msg.id);
    setEditingText(msg.text);
    setOpenMenuId(null);
  };

  const saveEdit = () => {
    setAllMessages((prev) => ({
      ...prev,
      [selectedChat]: prev[selectedChat].map((m) =>
        m.id === editingId ? { ...m, text: editingText, edited: true } : m,
      ),
    }));
    setEditingId(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  // メッセージ削除(Undo対応)
  const deleteMessage = (id) => {
    const msg = currentMessages.find((m) => m.id === id);
    if (!msg) return;

    setLastDeleted({ chatId: selectedChat, msg });

    setAllMessages((prev) => ({
      ...prev,
      [selectedChat]: prev[selectedChat].filter((m) => m.id !== id),
    }));

    setOpenMenuId(null);
    setTimeout(() => setLastDeleted(null), 5000);
  };

  const undoDelete = () => {
    if (!lastDeleted) return;
    const { chatId, msg } = lastDeleted;

    setAllMessages((prev) => ({
      ...prev,
      [chatId]: [...prev[chatId], msg].sort((a, b) => a.id - b.id),
    }));

    setLastDeleted(null);
  };

  // リプライ
  const handleReply = (msg) => {
    setReplyTo(msg);
    setOpenMenuId(null);
  };

  // メッセージリンクコピー
  const _copyMessageLink = (msg) => {
    const link = `${window.location.origin}${window.location.pathname}#chat-${selectedChat}-msg-${msg.id}`;
    void navigator.clipboard?.writeText(link);
    setOpenMenuId(null);
  };

  const closeMenu = () => {
    setOpenMenuId(null);
    setShowReactionPicker(false);
    setReactionPickerMessageId(null);
    setShowEmojiPicker(false);
  };

  // 追加のメッセージを読み込む(ページネーション)
  const loadMoreMessages = async () => {
    if (!currentProjectId || !selectedChat || !hasMore || isLoading) return;

    try {
      setIsLoading(true);
      const nextPage = currentPage + 1;

      const response = await api.get(
        `/api/projects/${currentProjectId}/chatrooms/${selectedChat}/messages/`,
        {
          params: {
            page: nextPage,
            per_page: 50,
          },
        },
      );

      const formattedMessages = response.data.messages.map((msg) => ({
        id: msg.message_id,
        userId: msg.user_id,
        userName: msg.name || `User ${msg.user_id}`,
        profilePicture: msg.profile_picture,
        text: msg.content,
        time: new Date(msg.timestamp).toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        self: msg.user_id === user.id,
        replyTo: null,
        reaction: null,
        reactions: {},
      }));

      setAllMessages((prev) => ({
        ...prev,
        [selectedChat]: [...formattedMessages, ...(prev[selectedChat] || [])],
      }));

      setCurrentPage(nextPage);
      setHasMore(response.data.messages.length === 50);
    } catch (error) {
      console.error("メッセージの読み込みに失敗しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentProjectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl text-gray-500">プロジェクトを選択してください</p>
      </div>
    );
  }

  return (
    <div
      className="flex w-full bg-white mb-4"
      onClick={closeMenu}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeMenu();
      }}
      role="button"
      tabIndex={0}
    >
      {/* チャット画面 (Full Width) */}
      <div className="w-full h-full grid relative">
        <div className="p-4 border-b bg-gray-100">
          <h2 className="text-3xl font-bold">{currentChat?.name || "チャット"}</h2>
        </div>

        {/* Undo */}
        {lastDeleted && (
          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 flex justify-between items-center">
            <p className="text-sm">メッセージを削除しました。</p>
            <button onClick={undoDelete} className="px-3 py-1 bg-white border rounded">
              元に戻す
            </button>
          </div>
        )}

        {/* メッセージ一覧 */}
        <div className="overflow-y-auto p-4 space-y-10 bg-white h-[350px] relative">
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMoreMessages}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {isLoading ? "読み込み中..." : "過去のメッセージを読み込む"}
              </button>
            </div>
          )}

          {currentMessages.length === 0 && !isLoading ? (
            <div className="text-center text-gray-500 mt-8">
              メッセージがありません。最初のメッセージを送信しましょう!
            </div>
          ) : (
            currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.self ? "justify-end" : "justify-start"}`}
              >
                {/* User icon - show on left for others */}
                {!msg.self && (
                  <div className="flex-shrink-0">
                    <img
                      src={
                        msg.profilePicture
                          ? resolveImageUrl(msg.profilePicture)
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              msg.userName || "User",
                            )}&background=random`
                      }
                      alt={msg.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>
                )}

                <div className={`relative max-w-lg group ${msg.self ? "ml-auto" : ""}`}>
                  {/* User name - show above message for others */}
                  {!msg.self && (
                    <div className="text-sm font-medium text-gray-700 mb-1 px-1">
                      {msg.userName || `User ${msg.user}`}
                    </div>
                  )}

                  {/* 上に重ねるアイコン */}
                  <div
                    className={`
            absolute -top-8 flex gap-1
            ${msg.self ? "right-0" : "left-0"}
            opacity-0 group-hover:opacity-100 transition
          `}
                  >
                    {msg.self && <IconButton onClick={() => startEditing(msg)}>✏️</IconButton>}
                    <IconButton onClick={() => handleReply(msg)}>💬</IconButton>
                    <IconButton
                      onClick={() => {
                        setShowReactionPicker(true);
                        setReactionPickerMessageId(msg.id);
                      }}
                    >
                      😊
                    </IconButton>
                    {msg.self && <IconButton onClick={() => deleteMessage(msg.id)}>🗑</IconButton>}
                  </div>

                  {/* 吹き出し */}
                  <div className="flex flex-col">
                    {msg.replyTo && (
                      <div className="mb-2 p-2 bg-gray-200 border-l-4 border-gray-400 rounded text-xs text-gray-600">
                        引用: {msg.replyTo.text.slice(0, 50)}
                      </div>
                    )}
                    {editingId === msg.id ? (
                      <div className="bg-white border rounded-xl p-3 shadow space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full border p-2 rounded resize-none"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 rounded border hover:bg-gray-100"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`px-4 py-2 rounded-2xl shadow ${
                          msg.self
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-100 rounded-bl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                    {msg.reaction && (
                      <div className="absolute -bottom-3 right-2 bg-white border rounded-full px-2 py-0.5 text-sm shadow">
                        {msg.reaction}
                      </div>
                    )}

                    {/* 時間と編集済み表示 */}
                    <div className="text-xs text-gray-500 mt-1">
                      {msg.time} {msg.edited && "(編集済み)"}
                    </div>

                    {/* リアクション表示 */}
                    <div className="flex gap-2 text-sm mt-1">
                      {Object.entries(msg.reactions || {}).map(([e, users]: [string, string[]]) => (
                        <span key={e}>
                          {e} {users.length}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* User icon on right for self messages */}
                {msg.self && (
                  <div className="flex-shrink-0">
                    <img
                      src={
                        msg.profilePicture
                          ? resolveImageUrl(msg.profilePicture)
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              msg.userName || "User",
                            )}&background=random`
                      }
                      alt="You"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* リアクションピッカー */}
        {showReactionPicker && reactionPickerMessageId && (
          <div
            className="absolute bottom-20 left-4 z-50"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="button"
            tabIndex={0}
          >
            <EmojiPicker
              onEmojiClick={(emoji) => {
                setAllMessages((prev) => ({
                  ...prev,
                  [selectedChat]: prev[selectedChat].map((m) =>
                    m.id === reactionPickerMessageId
                      ? {
                          ...m,
                          reactions: {
                            ...m.reactions,
                            [emoji.emoji]: [...(m.reactions[emoji.emoji] || []), user.id],
                          },
                        }
                      : m,
                  ),
                }));

                setShowReactionPicker(false);
                setReactionPickerMessageId(null);
              }}
            />
          </div>
        )}

        {replyTo && (
          <div className="mx-4 mb-2 px-3 py-2 bg-gray-100 border-l-4 border-blue-400 rounded-lg shadow-sm flex items-center gap-2">
            <div className="flex-1 text-sm text-gray-700 truncate">
              <strong>引用:</strong> {replyTo.text}
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="flex-shrink-0 text-red-500 hover:text-red-700 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* 入力欄(絵文字対応) */}
        <div className="p-4 border-t bg-white flex items-center gap-3 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker(!showEmojiPicker);
            }}
            className="text-2xl"
          >
            😊
          </button>

          {showEmojiPicker && (
            <div
              className="absolute bottom-16 left-4 z-50"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="button"
              tabIndex={0}
            >
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  setMessageInput((prev) => prev + emoji.emoji);
                }}
              />
            </div>
          )}

          <textarea
            rows={2}
            className="flex-grow p-3 border rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="メッセージを入力..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (isComposing) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
          />

          <button
            onClick={handleSendMessage}
            disabled={isLoading || !messageInput.trim()}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

function IconButton({ children, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
    >
      {children}
    </button>
  );
}

export default ChatBackup;
