import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const ChatWindow = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
      .or(`sender_id.eq.${currentUser.id},sender_id.eq.${selectedUser.id}`)
      .or(`receiver_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const filteredMessages = data.filter(
      message => 
        (message.sender_id === currentUser.id && message.receiver_id === selectedUser.id) ||
        (message.sender_id === selectedUser.id && message.receiver_id === currentUser.id)
    );

    setMessages(filteredMessages);
    scrollToBottom();
  };

  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    // Initial fetch
    fetchMessages();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('chat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log('Received realtime update:', payload);
          if (payload.new.sender_id === selectedUser.id) {
            setMessages(prev => [...prev, payload.new]);
            scrollToBottom();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [selectedUser, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedUser) return;

    try {
      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: newMessage.trim(),
        created_at: new Date().toISOString()
      };

      // Clear input immediately for better UX
      setNewMessage('');

      // Add message to local state immediately
      setMessages(prev => [...prev, messageToSend]);
      scrollToBottom();

      // Send to database
      const { error } = await supabase
        .from('chat')
        .insert([messageToSend]);

      if (error) {
        console.error('Error sending message:', error);
        // Optionally remove the message from local state if send failed
        setMessages(prev => prev.filter(msg => msg !== messageToSend));
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
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