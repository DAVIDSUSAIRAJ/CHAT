import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import '../../styles/chat.css'; /* Voice button custom styles */
import WaveSurferPlayer from './WaveSurferPlayer';
import MusicPlayer from './MusicPlayer';

// Maximum time in milliseconds before considering a user offline (3 minutes)
const PRESENCE_TIMEOUT = 3 * 60 * 1000;

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

const AudioCallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.999.999 0 0 0-1.03.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02c-.37-1.11-.56-2.3-.56-3.53c0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
  </svg>
);

const VideoCallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [userStatus, setUserStatus] = useState('offline');
  const [lastSeen, setLastSeen] = useState(null);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const statusSubscriptionRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const checkInactiveIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const recordingTimerRef = useRef(null);

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

  // Fetch current user and setup presence channel
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        // Initialize presence channel for real-time online status
        const presenceChannel = supabase.channel('online-users', {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        // When user comes online, update their status
        presenceChannel
          .on('presence', { event: 'join' }, ({ key }) => {
            // Update status to 'online' when a user joins
            updateUserStatus(key, 'online');
          })
          .on('presence', { event: 'leave' }, async ({ key }) => {
            // Update status to 'offline' when a user leaves
            updateUserStatus(key, 'offline');
          })
          .on('presence', { event: 'sync' }, () => {
            // Get current state of all presences
            const state = presenceChannel.presenceState();
            
            // Check if selected user is in the presence state
            if (selectedUser && state[selectedUser.id]) {
              setUserStatus('online');
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track current user's online status
              await presenceChannel.track({
                online_at: new Date().toISOString(),
                user_id: user.id
              });
              
              // Set user as online in database
              await updateUserStatus(user.id, 'online');
            }
          });
          
        presenceChannelRef.current = presenceChannel;
        
        // Set up heartbeat to keep status active
        heartbeatIntervalRef.current = setInterval(async () => {
          if (document.visibilityState === 'visible') {
            // Only send heartbeat if document is visible (tab is active)
            try {
              // Update presence track with fresh timestamp
              await presenceChannel.track({
                online_at: new Date().toISOString(),
                user_id: user.id
              });
              
              // Refresh last_seen in database
              await updateUserStatus(user.id, 'online');
            } catch (error) {
              console.error('Heartbeat error:', error);
            }
          }
        }, 30000); // Every 30 seconds
        
        // Set up interval to check for inactive users
        checkInactiveIntervalRef.current = setInterval(() => {
          checkInactiveUsers();
        }, 60000); // Check every minute
        
        // Initial check for inactive users
        checkInactiveUsers();
        
        // Add visibility change listener to handle tab switching
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    
    fetchCurrentUser();
    
    return () => {
      if (presenceChannelRef.current && currentUser) {
        // Remove user presence when component unmounts
        presenceChannelRef.current.untrack();
        presenceChannelRef.current.unsubscribe();
        
        // Update status to offline in database
        updateUserStatus(currentUser.id, 'offline');
      }
      
      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (checkInactiveIntervalRef.current) {
        clearInterval(checkInactiveIntervalRef.current);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Check for users who haven't updated their last_seen in a while
  const checkInactiveUsers = async () => {
    if (!selectedUser) return;
    
    const now = new Date();
    
    // Get selected user's status
    const { data } = await supabase
      .from('users')
      .select('id, status, last_seen')
      .eq('id', selectedUser.id)
      .single();
      
    if (!data) return;
    
    // Check if user is online but hasn't updated last_seen recently
    if (data.status === 'online' && data.last_seen) {
      const lastSeen = new Date(data.last_seen);
      const timeDiff = now - lastSeen;
      
      // If last seen is more than PRESENCE_TIMEOUT ago, mark as offline
      if (timeDiff > PRESENCE_TIMEOUT) {
        await supabase
          .from('users')
          .update({ status: 'offline' })
          .eq('id', data.id);
          
        // Update local state
        setUserStatus('offline');
        setLastSeen(data.last_seen);
      }
    }
  };
  
  // Handle visibility change (tab switching)
  const handleVisibilityChange = async () => {
    if (!currentUser) return;
    
    if (document.visibilityState === 'visible') {
      // User returned to the tab - set status to online
      await updateUserStatus(currentUser.id, 'online');
      
      // Update presence tracking
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.track({
          online_at: new Date().toISOString(),
          user_id: currentUser.id
        });
      }
    } else {
      // User left the tab - set status to away
      await updateUserStatus(currentUser.id, 'away');
    }
  };
  
  // Helper function to update user status
  const updateUserStatus = async (userId, status) => {
    try {
      await supabase
        .from('users')
        .update({ 
          status: status,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };
  
  // Subscribe to selected user's status changes
  useEffect(() => {
    if (!selectedUser) return;
    
    // Fetch initial status
    const fetchUserStatus = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('status, last_seen')
        .eq('id', selectedUser.id)
        .single();
      
      if (data && !error) {
        // Check if the last_seen is too old (user might be offline despite DB status)
        const now = new Date();
        const lastSeen = new Date(data.last_seen);
        const timeDiff = now - lastSeen;
        
        if (data.status === 'online' && timeDiff > PRESENCE_TIMEOUT) {
          // If user hasn't been seen for more than timeout, mark as offline
          setUserStatus('offline');
          
          // Also update in database
          await supabase
            .from('users')
            .update({ status: 'offline' })
            .eq('id', selectedUser.id);
        } else {
          setUserStatus(data.status);
        }
        
        setLastSeen(data.last_seen);
      }
    };
    
    fetchUserStatus();
    
    // Set up real-time subscription to status changes
    if (statusSubscriptionRef.current) {
      statusSubscriptionRef.current.unsubscribe();
    }
    
    const channel = supabase.channel('public:users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${selectedUser.id}`
        },
        (payload) => {
          if (payload.new && payload.new.status) {
            setUserStatus(payload.new.status);
            setLastSeen(payload.new.last_seen);
          }
        }
      )
      .subscribe();
    
    statusSubscriptionRef.current = channel;
    
    return () => {
      if (statusSubscriptionRef.current) {
        statusSubscriptionRef.current.unsubscribe();
      }
    };
  }, [selectedUser?.id]);
  
  // Additional check when selectedUser changes
  useEffect(() => {
    if (selectedUser && presenceChannelRef.current) {
      // Check if the selected user is in the presence state
      const state = presenceChannelRef.current.presenceState();
      const isPresent = state[selectedUser.id] !== undefined;
      
      if (isPresent) {
        setUserStatus('online');
      } else {
        // If not present, we still respect the database status,
        // which will be checked for timeout elsewhere
        checkInactiveUsers();
      }
    }
  }, [selectedUser]);

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
        toast.error('Failed to send message. Please try again.');
        return;
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error('File size should be less than 30MB');
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
      let messageText = `${fileTypeIcon} ${file.name}`;

      if (file.type.startsWith('image/')) {
        fileTypeIcon = '🖼️';
        messageText = `${fileTypeIcon} ${file.name}`;
      } else if (file.type.startsWith('video/')) {
        fileTypeIcon = '🎥';
        messageText = `${fileTypeIcon} ${file.name}`;
      } else if (file.type.startsWith('audio/')) {
        // Check if it's a music file based on extension
        const musicExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
        if (musicExtensions.includes(fileExt.toLowerCase())) {
          fileTypeIcon = '🎵';
          // Try to extract artist/title from filename
          const nameParts = file.name.split('-');
          if (nameParts.length > 1) {
            const artist = nameParts[0].trim();
            const title = nameParts.slice(1).join('-').replace(`.${fileExt}`, '').trim();
            messageText = `${fileTypeIcon} ${artist} - ${title}`;
          } else {
            messageText = `${fileTypeIcon} ${file.name}`;
          }
        } else {
          fileTypeIcon = '🔊';
          messageText = `${fileTypeIcon} ${file.name}`;
        }
      } else if (file.type.includes('pdf')) {
        fileTypeIcon = '📄';
        messageText = `${fileTypeIcon} ${file.name}`;
      } else if (file.type.includes('document')) {
        fileTypeIcon = '📝';
        messageText = `${fileTypeIcon} ${file.name}`;
      }

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: messageText,
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
      toast.error('Failed to upload file. Please try again.');
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

  // Add effect to filter media files based on search text
  useEffect(() => {
    if (!mediaSearchText?.trim()) {
      setFilteredMediaFiles(mediaFiles);
      return;
    }

    const searchLower = mediaSearchText.toLowerCase();
    const filtered = mediaFiles.filter(file => 
      file.message?.toLowerCase().includes(searchLower) ||
      file.file_name?.toLowerCase().includes(searchLower)
    );
    setFilteredMediaFiles(filtered);
  }, [mediaSearchText, mediaFiles]);

  const renderMessageContent = (message) => {
    if (!message.file_url) {
      return <p>{message.message}</p>;
    }

    const isImage = message.file_type?.startsWith('image/');
    const isVideo = message.file_type?.startsWith('video/');
    const isAudio = message.file_type?.startsWith('audio/');
    const isVoiceMessage = isAudio && message.message === '🎤 Voice Message';
    const isMusicFile = isAudio && !isVoiceMessage;

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
            {isVoiceMessage && (
              <div className="media-preview voice-message-preview">
                <WaveSurferPlayer audioUrl={message.file_url} />
              </div>
            )}
            {isMusicFile && (
              <div className="media-preview music-preview">
                <MusicPlayer 
                  audioUrl={message.file_url} 
                  songName={message.file_name} 
                  artist={message.message.includes('🎵') ? message.message.replace('🎵', '').trim() : 'Unknown Artist'} 
                />
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleVoiceMessageUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleVoiceMessageUpload = async (audioBlob) => {
    if (!currentUser || !selectedUser) return;

    setUploading(true);

    try {
      const fileName = `${currentUser.id}-${Date.now()}.webm`;
      const filePath = `${selectedUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: '🎤 Voice Message',
        file_url: publicUrl,
        file_type: 'audio/webm',
        file_name: 'Voice Message'
      };

      const { error } = await supabase
        .from('chat')
        .insert([messageToSend])
        .select()
        .single();

      if (error) throw error;

    } catch (error) {
      console.error('Error uploading voice message:', error);
      toast.error('Failed to send voice message. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Format last seen time
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return '';
    
    const lastSeenDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    return lastSeenDate.toLocaleDateString();
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
            <div className="user-info">
              <h3 className="username">{selectedUser.username}</h3>
              <p className={`user-status ${userStatus}`}>
                {userStatus === 'online' ? 'Online' : 
                 userStatus === 'away' ? 'Away' : 
                 `Last seen ${formatLastSeen(lastSeen)}`}
              </p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-actions">
              <button 
                className="header-icon-btn"
                onClick={() => {/* TODO: Implement audio call */}}
                title="Audio Call"
              >
                <AudioCallIcon />
              </button>
              <button 
                className="header-icon-btn"
                onClick={() => {/* TODO: Implement video call */}}
                title="Video Call"
              >
                <VideoCallIcon />
              </button>
              <button 
                className="media-btn"
                onClick={handleMediaGalleryToggle}
                title="View Media"
              >
                <MediaIcon />
              </button>
            </div>
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
                      <>
                        <img 
                          src={file.file_url} 
                          alt={file.file_name}
                          onClick={() => window.open(file.file_url, '_blank')}
                        />
                        <span className="file-name">{file.file_name}</span>
                      </>
                    )}
                    {file.type === 'video' && (
                      <>
                        <video 
                          src={file.file_url}
                          onClick={() => window.open(file.file_url, '_blank')}
                        />
                        <span className="file-name">{file.file_name}</span>
                      </>
                    )}
                    {file.type === 'audio' && (
                      <div className="audio-item">
                        {file.message === '🎤 Voice Message' ? (
                          <WaveSurferPlayer audioUrl={file.file_url} />
                        ) : (
                          <MusicPlayer 
                            audioUrl={file.file_url} 
                            songName={file.file_name} 
                            artist={file.message.includes('🎵') ? file.message.replace('🎵', '').trim() : 'Unknown Artist'} 
                          />
                        )}
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
                        <span className="file-name">{file.file_name}</span>
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
            disabled={uploading || isRecording}
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
          disabled={isRecording}
        />

        <button
          type="button"
          className={`voice-btn voice-record-btn ${isRecording ? 'recording' : ''}`}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={uploading}
        >
          {isRecording ? (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span className="recording-time">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button type="submit" className="send-button" disabled={(!newMessage.trim() && !uploading) || isRecording}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;