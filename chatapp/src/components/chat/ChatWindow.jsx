import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const ChatWindow = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchCurrentUser();
  }, []);

  // Fetch messages function
  const fetchMessages = async () => {
    if (!selectedUser || !currentUser) return;

    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) return;

    setMessages(data || []);
    scrollToBottom();
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    // Cleanup previous subscription if exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Initial fetch
    fetchMessages();

    try {
      // Setup new subscription
      const channel = supabase.channel('public:chat')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat'
          },
          async (payload) => {
            if (!payload.new || !payload.new.id) return;

            const newMessage = payload.new;

            // Check if message belongs to current chat
            const isRelevantMessage = 
              (newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedUser.id) ||
              (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === currentUser.id);

            if (isRelevantMessage) {
              // Check if message already exists in the state
              setMessages(prevMessages => {
                const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                if (messageExists) return prevMessages;
                return [...prevMessages, newMessage];
              });
              scrollToBottom();
            }
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
    } catch (error) {
      // Handle error silently
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [selectedUser, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedUser) return;

    const messageToSend = {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      message: newMessage.trim()
    };

    setNewMessage('');

    try {
      const { error } = await supabase
        .from('chat')
        .insert([messageToSend])
        .select()
        .single();

      if (error) {
        alert('Failed to send message. Please try again.');
        return;
      }

      scrollToBottom();
    } catch (error) {
      alert('Failed to send message. Please try again.');
    }
  };

  if (!selectedUser) {
    return (
      <div className="chat-window empty">
        <p>Select a user to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="user-avatar">
          {selectedUser.username?.[0]?.toUpperCase()}
        </div>
        <div className="user-info">
          <h3>{selectedUser.username}</h3>
          <p className="user-status">Online</p>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id || message.created_at}
            className={`message ${message.sender_id === currentUser?.id ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              <p>{message.message}</p>
              <span className="message-time">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Send a message"
        />
        <button type="submit">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow; 