import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

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

const ChatWindow = ({ 
  selectedUser, 
  hideHeader,
  showMediaGallery = false,
  setShowMediaGallery,
  searchText: externalSearchText,
  setSearchText: externalSetSearchText,
  isMobileView 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mediaSearchText, setMediaSearchText] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [filteredMediaFiles, setFilteredMediaFiles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentMenuRef = useRef(null);

  // Use external search text if provided (mobile view)
  const actualSearchText = isMobileView ? externalSearchText : searchText;
  const actualSetSearchText = isMobileView ? externalSetSearchText : setSearchText;

  const handleMediaGalleryToggle = () => {
    setShowMediaGallery(!showMediaGallery);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 767);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    fetchMessages();

    const channel = supabase.channel('public:chat')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat'
        },
        async (payload) => {
          if (!payload.new || !payload.new.id) return;

          const newMessage = payload.new;
          const isRelevantMessage = 
            (newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedUser.id) ||
            (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === currentUser.id);

          if (isRelevantMessage) {
            setMessages(prevMessages => {
              const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
              if (messageExists) return prevMessages;
              return [...prevMessages, newMessage];
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

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
    } catch (error) {
      alert('Failed to send message. Please try again.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB');
      return;
    }

    setUploading(true);
    setShowAttachmentMenu(false);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `${selectedUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      let fileTypeIcon = '📎';
      if (file.type.startsWith('image/')) fileTypeIcon = '🖼️';
      else if (file.type.startsWith('video/')) fileTypeIcon = '🎥';
      else if (file.type.startsWith('audio/')) fileTypeIcon = '🎵';
      else if (file.type.includes('pdf')) fileTypeIcon = '📄';
      else if (file.type.includes('document')) fileTypeIcon = '📝';

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: `${fileTypeIcon} ${file.name}`,
        file_url: publicUrl,
        file_type: file.type,
        file_name: file.name
      };

      const { error } = await supabase
        .from('chat')
        .insert([messageToSend])
        .select()
        .single();

      if (error) throw error;

    } catch (error) {
      alert('Failed to upload file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!actualSearchText?.trim()) {
      setFilteredMessages(messages);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchLower = actualSearchText.toLowerCase();
    const filtered = messages.filter(message => 
      message.message?.toLowerCase().includes(searchLower) ||
      message.file_name?.toLowerCase().includes(searchLower)
    );
    setFilteredMessages(filtered);
  }, [actualSearchText, messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const media = messages.filter(msg => msg.file_url).map(msg => ({
        ...msg,
        type: msg.file_type?.startsWith('image/') ? 'image' : 
              msg.file_type?.startsWith('video/') ? 'video' : 
              msg.file_type?.startsWith('audio/') ? 'audio' : 'file'
      }));
      setMediaFiles(media);
      setFilteredMediaFiles(media);
    }
  }, [messages]);

  const renderMessageContent = (message) => {
    if (!message.file_url) {
      return <p>{message.message}</p>;
    }

    const isImage = message.file_type?.startsWith('image/');
    const isVideo = message.file_type?.startsWith('video/');
    const isAudio = message.file_type?.startsWith('audio/');

    return (
      <div className="file-message">
          <>
            {isImage && (
              <div className="media-preview">
                <img src={message.file_url} alt={message.file_name} loading="lazy" />
              </div>
            )}
            {isVideo && (
              <div className="media-preview">
                <video controls>
                  <source src={message.file_url} type={message.file_type} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {isAudio && (
              <div className="media-preview audio-preview">
                <audio controls>
                  <source src={message.file_url} type={message.file_type} />
                  Your browser does not support the audio tag.
                </audio>
              </div>
            )}
            <a href={message.file_url} 
               target="_blank" 
               rel="noopener noreferrer" 
               className="file-link"
               download={message.file_name}>
              {message.message}
            </a>
          </>
   
      </div>
    );
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
      {!hideHeader && (
        <div className="chat-header">
          <div className="header-left">
            <div className="user-avatar">
              {selectedUser.username?.[0]?.toUpperCase()}
            </div>
            <div className="user-info">
              <h3>{selectedUser.username}</h3>
              <p className="user-status">Online</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-actions">
              <button 
                className="media-btn"
                onClick={handleMediaGalleryToggle}
                title="View Media"
              >
                <MediaIcon />
              </button>
              <div className="search-container">
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
                  placeholder="Search messages..."
                  className="search-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showMediaGallery && (
        <div className="media-gallery">
          <div className="gallery-header">
            <h3>Media Gallery</h3>
            <button 
              className="close-gallery"
              onClick={() => setShowMediaGallery(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="gallery-search">
            <div className="search-icon">
              {mediaSearchText ? (
                <button 
                  className="clear-search" 
                  onClick={() => setMediaSearchText('')}
                >
                  <CloseIcon />
                </button>
              ) : (
                <SearchIcon />
              )}
            </div>
            <input
              type="text"
              value={mediaSearchText}
              onChange={(e) => setMediaSearchText(e.target.value)}
              placeholder="Search media..."
              className="search-input"
            />
          </div>
          <div className="gallery-content">
            {filteredMediaFiles.length > 0 ? (
              <div className="media-grid">
                {filteredMediaFiles.map((file, index) => (
                  <div key={index} className="media-item">
                    {file.type === 'image' && (
                      <img 
                        src={file.file_url} 
                        alt={file.file_name}
                        onClick={() => window.open(file.file_url, '_blank')}
                      />
                    )}
                    {file.type === 'video' && (
                      <video 
                        src={file.file_url}
                        onClick={() => window.open(file.file_url, '_blank')}
                      />
                    )}
                    {file.type === 'audio' && (
                      <div className="audio-item">
                        <audio controls src={file.file_url} />
                        <span>{file.file_name}</span>
                      </div>
                    )}
                    {file.type === 'file' && (
                      <div className="file-item">
                        <a 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          download={file.file_name}
                        >
                          {file.message}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-media">
                <p>No media files found</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="messages-container">
        {(isSearching ? filteredMessages : messages).map((message) => (
          <div
            key={message.id || message.created_at}
            className={`message ${message.sender_id === currentUser?.id ? 'sent' : 'received'} ${
              actualSearchText && 
              (message.message?.toLowerCase().includes(actualSearchText.toLowerCase()) ||
               message.file_name?.toLowerCase().includes(actualSearchText.toLowerCase()))
                ? 'highlighted'
                : ''
            }`}
          >
            <div className="message-content">
              {renderMessageContent(message)}
              <span className="message-time">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input">
        <div className="attachment-container" ref={attachmentMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="attachment-btn"
            disabled={uploading}
          >
            {uploading ? '⏳' : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>}
          </button>
          
          {showAttachmentMenu && (
            <div className="attachment-menu">
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = '*/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">📄</span>
                <span className="attachment-label">Document</span>
              </div>
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">🖼️</span>
                <span className="attachment-label">Photos</span>
              </div>
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'video/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">🎥</span>
                <span className="attachment-label">Videos</span>
              </div>
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'audio/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">🎵</span>
                <span className="attachment-label">Audio</span>
              </div>
            </div>
          )}
        </div>
        
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
          className="message-input-field"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button type="submit" className="send-button" disabled={!newMessage.trim() && !uploading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;