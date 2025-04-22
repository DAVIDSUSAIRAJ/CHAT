import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const MediaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showChatList, setShowChatList] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 767);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [searchText, setSearchText] = useState('');
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

  const handleMediaGalleryToggle = () => {
    setShowMediaGallery(prev => !prev);
  };

  // Desktop view
  if (!isMobileView) {
    return (
      <div className="chat-container">
        <div className="chat-list">
          <ChatList onSelectUser={handleSelectUser} selectedUserId={selectedUser?.id} />
        </div>
        <div className="chat-window-wrapper">
          <ChatWindow 
            selectedUser={selectedUser} 
            hideHeader={false}
            showMediaGallery={showMediaGallery}
            setShowMediaGallery={setShowMediaGallery}
            searchText={searchText}
            setSearchText={setSearchText}
            isMobileView={isMobileView}
          />
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
            <div className="mobile-header-left">
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
            <div className="mobile-header-right">
              <button 
                className="mobile-media-btn"
                onClick={handleMediaGalleryToggle}
                title="View Media"
              >
                <MediaIcon />
              </button>
              <div className="mobile-search">
                <div className="search-icon">
                  {searchText ? (
                    <button 
                      className="clear-search" 
                      onClick={() => setSearchText('')}
                    >
                      <CloseIcon />
                    </button>
                  ) : (
                    <SearchIcon />
                  )}
                </div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search..."
                  className="search-input"
                />
              </div>
            </div>
          </div>
          <ChatWindow 
            selectedUser={selectedUser} 
            hideHeader={true}
            showMediaGallery={showMediaGallery}
            setShowMediaGallery={setShowMediaGallery}
            searchText={searchText}
            setSearchText={setSearchText}
            isMobileView={isMobileView}
          />
        </div>
      )}
    </div>
  );
};

export default ChatPage; 