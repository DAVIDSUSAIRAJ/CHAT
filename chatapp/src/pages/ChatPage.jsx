import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showChatList, setShowChatList] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 767);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 767);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    if (isMobileView) {
      setShowChatList(false);
    }
  };

  const handleBackToList = () => {
    setShowChatList(true);
    if (isMobileView) {
      setSelectedUser(null);
    }
  };

  // Desktop view
  if (!isMobileView) {
    return (
      <div className="chat-container">
        <div className="chat-list">
          <ChatList onSelectUser={handleSelectUser} selectedUserId={selectedUser?.id} />
        </div>
        <div className="chat-window-wrapper">
          <ChatWindow selectedUser={selectedUser} />
        </div>
      </div>
    );
  }

  // Mobile view
  return (
    <div className="chat-container">
      {showChatList ? (
        <div className="chat-list">
          <ChatList onSelectUser={handleSelectUser} selectedUserId={selectedUser?.id} />
        </div>
      ) : (
        <div className="chat-window-container">
          <div className="mobile-header">
            <button className="back-button" onClick={handleBackToList}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            {selectedUser && (
              <div className="selected-user-info">
                <div className="user-avatar">
                  {selectedUser.username?.[0]?.toUpperCase()}
                </div>
                <div className="user-details">
                  <h3>{selectedUser.username}</h3>
                  <span className="online-status">Online</span>
                </div>
              </div>
            )}
          </div>
          <ChatWindow selectedUser={selectedUser} hideHeader={true} />
        </div>
      )}
    </div>
  );
};

export default ChatPage; 