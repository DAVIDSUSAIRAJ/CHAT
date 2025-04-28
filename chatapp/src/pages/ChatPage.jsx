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

const VideoCallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 7l-7 5 7 5V7z"></path>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const AudioCallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
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

  // Check for saved user when component mounts
  useEffect(() => {
    const savedUser = localStorage.getItem('selectedChatUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setSelectedUser(user);
        if (isMobileView) {
          setShowChatList(false);
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('selectedChatUser');
      }
    }
  }, [isMobileView]);

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

  const handleSelectUser = async (user) => {
    // If avatar_url is not in the user object, fetch it from the database
    if (!user.avatar_url && user.id) {
      const { data } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data && data.avatar_url) {
        user = { ...user, avatar_url: data.avatar_url };
      }
    }
    
    // Save selected user to localStorage
    localStorage.setItem('selectedChatUser', JSON.stringify(user));
    
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
                  {selectedUser.avatar_url ? (
                    <div className="user-avatar" style={{ 
                      background: 'none',
                      backgroundImage: `url(${selectedUser.avatar_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}></div>
                  ) : (
                    <div className="user-avatar">
                      {selectedUser.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="user-details">
                    <h3>{selectedUser.username}</h3>
                    <span className="online-status">Online</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mobile-header-right">
              <button 
                className="mobile-icon-btn"
                onClick={() => {/* TODO: Implement audio call */}}
                title="Audio Call"
              >
                <AudioCallIcon />
              </button>
              <button 
                className="mobile-icon-btn"
                onClick={() => {/* TODO: Implement video call */}}
                title="Video Call"
              >
                <VideoCallIcon />
              </button>
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