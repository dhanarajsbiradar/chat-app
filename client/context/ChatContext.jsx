import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios } = useContext(AuthContext);

  // ✅ Fetch users and unseen message counts
  const getUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get("/api/messages/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unSeenMessages || {}); // fixed key: unSeenMessages (match with backend spelling)
      } else {
        toast.error(data.message || "Failed to fetch users");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ✅ Fetch messages with selected user
  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
        // Optional: reset unseen count once chat is opened
        setUnseenMessages((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ✅ Send message to selected user
  const sendMessage = async (msgData) => {
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        msgData
      );
      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ✅ Socket listener for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      if (selectedUser?._id === newMessage.senderId) {
        setMessages((prev) => [...prev, { ...newMessage, seen: true }]);
        axios.put(`/api/messages/mark/${newMessage._id}`);
      } else {
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, selectedUser]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        users,
        selectedUser,
        setSelectedUser,
        getUsers,
        getMessages,
        sendMessage,
        unseenMessages,
        setUnseenMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
