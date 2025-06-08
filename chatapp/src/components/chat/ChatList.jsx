import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, createRealtimeChannel } from '../../lib/supabaseClient';

// Maximum time in milliseconds before considering a user offline (3 minutes)
const PRESENCE_TIMEOUT = 3 * 60 * 1000;

// Polling function for user statuses
const setupUserStatusPolling = async (currentUser, setOnlineStatus, setUsers) => {
  // Polling interval for user statuses (every 5 seconds)
  const POLL_INTERVAL = 5000;
  
  // Only run this in production (in dev we use WebSockets)
  if (process.env.NODE_ENV !== 'production') return null;
  
  console.log("📊 Setting up user status polling");
  
  // Function to poll for user status updates
  const pollUserStatuses = async () => {
    try {
      // Get all users
      const { data, error } = await supabase
        .from('users')
        .select('id, username, status, last_seen')
        .neq('id', currentUser.id);
        
      if (error) {
        console.error("Error polling user statuses:", error);
        return;
      }
      
      if (data) {
        // Update local state with latest statuses
        const statusMap = {};
        data.forEach(user => {
          statusMap[user.id] = {
            status: user.status || 'offline',
            lastSeen: user.last_seen
          };
        });
        
        setOnlineStatus(statusMap);
        
        // Also update the users list
        setUsers(data);
      }
    } catch (error) {
      console.error("Error in user status polling:", error);
    }
  };
  
  // Start polling immediately
  pollUserStatuses();
  
  // Set up interval for continuous polling
  const interval = setInterval(pollUserStatuses, POLL_INTERVAL);
  
  // Return function to clean up interval
  return () => clearInterval(interval);
};

const ChatList = ({ onSelectUser, selectedUserId }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [debugMessage, setDebugMessage] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const menuRef = useRef(null);
  const subscriptionRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const checkInactiveIntervalRef = useRef(null);
  const statusPollingIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      console.log('Device detection:', { 
        isMobile,
        userAgent: navigator.userAgent,
        width: window.innerWidth
      });
      setIsMobileDevice(isMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle search input change with debugging
  const handleSearchChange = (e) => {
    try {
      const value = e.target.value;
      console.log('Search input event:', {
        value,
        type: e.type,
        isMobile: isMobileDevice,
        target: e.target.tagName,
        inputType: e.nativeEvent?.inputType
      });
      setSearchQuery(value);
    } catch (err) {
      console.error('Search input error:', err);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setCurrentUser(currentUser);
      
      if (currentUser) {
        // Fetch all users except current user
        const { data, error } = await supabase
          .from('users')
          .select('id, username, email, avatar_url, status, last_seen')
          .neq('id', currentUser.id);

        if (data && !error) {
          setUsers(data);
          
          // Initialize online status from database
          const statusMap = {};
          data.forEach(user => {
            statusMap[user.id] = {
              status: user.status || 'offline',
              lastSeen: user.last_seen
            };
          });
          setOnlineStatus(statusMap);
        }
        
        // Set user's own status to online
        await supabase
          .from('users')
          .update({ 
            status: 'online',
            last_seen: new Date().toISOString()
          })
          .eq('id', currentUser.id);
        
        // In production, use polling for statuses instead of WebSockets
        if (process.env.NODE_ENV === 'production') {
          const cleanup = await setupUserStatusPolling(currentUser, setOnlineStatus, setUsers);
          statusPollingIntervalRef.current = cleanup;
        } else {
          // In development, use WebSockets as before
          try {
            const presenceChannel = await createRealtimeChannel('online-users', {
              config: {
                presence: {
                  key: currentUser.id,
                },
              },
            });
            
            if (presenceChannel) {
              presenceChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                  // Track current user's online status
                  await presenceChannel.track({
                    online_at: new Date().toISOString(),
                    user_id: currentUser.id
                  });
                  
                  // Set user as online in database
                  await supabase
                    .from('users')
                    .update({ 
                      status: 'online',
                      last_seen: new Date().toISOString()
                    })
                    .eq('id', currentUser.id);
                }
              });
              
              presenceChannelRef.current = presenceChannel;
            }
          } catch (error) {
            console.error('Error setting up presence channel:', error);
            // If WebSockets fail in development, fall back to polling
            const cleanup = await setupUserStatusPolling(currentUser, setOnlineStatus, setUsers);
            statusPollingIntervalRef.current = cleanup;
          }
        }
        
        // Set up heartbeat to keep status active
        heartbeatIntervalRef.current = setInterval(async () => {
          if (document.visibilityState === 'visible') {
            // Only send heartbeat if document is visible (tab is active)
            try {
              // Refresh last_seen in database
              await supabase
                .from('users')
                .update({ 
                  status: 'online',
                  last_seen: new Date().toISOString()
                })
                .eq('id', currentUser.id);
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
        
        // Add visibility change listener to update status when tab visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    };

    fetchUsers();

    // Setup real-time subscription for users table
    const setupSubscription = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        // Cleanup previous subscription if exists
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }

        try {
          const channel = await createRealtimeChannel('public:users');
          
          if (!channel) {
            console.warn('Failed to create users channel');
            return;
          }
          
          channel.on(
            'postgres_changes',
            {
              event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'users'
            },
            async (payload) => {
              if (payload.new && payload.new.id && payload.new.status) {
                // Update local status state
                setOnlineStatus(prev => ({
                  ...prev,
                  [payload.new.id]: {
                    status: payload.new.status,
                    lastSeen: payload.new.last_seen
                  }
                }));
                
                // Refetch the entire users list when any change occurs
                const { data, error } = await supabase
                  .from('users')
                  .select('id, username, email, avatar_url, status, last_seen')
                  .neq('id', currentUser.id);

                if (data && !error) {
                  setUsers(data);
                }
              }
            }
          )
          .subscribe((status) => {
            console.log(`Users subscription status: ${status}`);
          });

          subscriptionRef.current = channel;
        } catch (error) {
          console.error('Error setting up users channel:', error);
        }
      }
    };

    setupSubscription();

    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup subscription on component unmount
    return () => {
      // Clean up subscriptions safely with error handling
      if (subscriptionRef.current) {
        try {
          // Check if unsubscribe is a function before calling it
          if (typeof subscriptionRef.current.unsubscribe === 'function') {
            subscriptionRef.current.unsubscribe();
          }
        } catch (err) {
          console.error('Error during user subscription cleanup:', err);
        }
      }
      
      if (presenceChannelRef.current) {
        try {
          // Remove user presence if the untrack method exists
          if (typeof presenceChannelRef.current.untrack === 'function') {
            presenceChannelRef.current.untrack();
          }
          
          // Unsubscribe if the method exists
          if (typeof presenceChannelRef.current.unsubscribe === 'function') {
            presenceChannelRef.current.unsubscribe();
          }
          
          // Set user status to offline when component unmounts
          if (currentUser) {
            supabase
              .from('users')
              .update({ 
                status: 'offline',
                last_seen: new Date().toISOString()
              })
              .eq('id', currentUser.id);
          }
        } catch (err) {
          console.error('Error during presence channel cleanup:', err);
        }
      }
      
      // Clear intervals safely
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (checkInactiveIntervalRef.current) {
        clearInterval(checkInactiveIntervalRef.current);
      }
      
      if (statusPollingIntervalRef.current) {
        try {
          if (typeof statusPollingIntervalRef.current === 'function') {
            statusPollingIntervalRef.current();
          } else if (typeof statusPollingIntervalRef.current === 'number') {
            clearInterval(statusPollingIntervalRef.current);
          }
        } catch (err) {
          console.error('Error clearing status polling:', err);
        }
      }
      
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Check for users who haven't updated their last_seen in a while
  const checkInactiveUsers = async () => {
    const now = new Date();
    
    // Get all users with status 'online'
    const { data } = await supabase
      .from('users')
      .select('id, last_seen')
      .eq('status', 'online');
      
    if (!data) return;
    
    // Check each online user's last seen timestamp
    data.forEach(async (user) => {
      if (user.last_seen) {
        const lastSeen = new Date(user.last_seen);
        const timeDiff = now - lastSeen;
        
        // If last seen is more than PRESENCE_TIMEOUT ago, mark as offline
        if (timeDiff > PRESENCE_TIMEOUT) {
          await supabase
            .from('users')
            .update({ status: 'offline' })
            .eq('id', user.id);
            
          // Update local state
          setOnlineStatus(prev => ({
            ...prev,
            [user.id]: {
              status: 'offline',
              lastSeen: user.last_seen
            }
          }));
        }
      }
    });
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
        
      // Update local state
      setOnlineStatus(prev => ({
        ...prev,
        [userId]: {
          status: status,
          lastSeen: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Error updating user status:', error);
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

  // Handle profile navigation
  const handleProfileClick = () => {
    setShowMenu(false);
    navigate('/profile');
  };

  // Handle logout
  const handleLogout = async () => {
    setShowMenu(false);
    
    // Update status to offline before signing out
    if (currentUser) {
      await supabase
        .from('users')
        .update({ 
          status: 'offline',
          last_seen: new Date().toISOString()
        })
        .eq('id', currentUser.id);
        
      // Remove presence
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.untrack();
      }
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      // Redirect or handle successful logout
      window.location.href = '/';
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    try {
      // Debug message
      const debugInfo = {
        hasUser: !!user,
        hasUsername: !!user?.username,
        hasEmail: !!user?.email,
        searchQuery
      };
      setDebugMessage(JSON.stringify(debugInfo, null, 2));

      if (!user || !user.username || !user.email) {
        return false;
      }

      return user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
             user.email.toLowerCase().includes(searchQuery.toLowerCase());
    } catch (err) {
      setDebugMessage(`Error: ${err.message}`);
      return false;
    }
  });

  return (
    <div className="chat-list">
      {/* Add debug display */}
      {debugMessage && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          left: 10,
          right: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: 10,
          borderRadius: 5,
          fontSize: '12px',
          zIndex: 9999,
          whiteSpace: 'pre-wrap'
        }}>
          Debug Info: {debugMessage}
        </div>
      )}
      
      <div className="chat-list-header">
        <div className="header-content">
          <h2>All Users</h2>
          <div className="menu-container" ref={menuRef}>
            <button 
              className="menu-button" 
              onClick={() => setShowMenu(!showMenu)}
            >
              •••
            </button>
            {showMenu && (
              <div className="profile-menu">
                <div className="menu-item" onClick={handleProfileClick}>
                  <div className="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <span>Profile</span>
                </div>
                <div className="menu-item" onClick={handleLogout}>
                  <div className="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </div>
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="chat-search">
          <input
            type="text"
            placeholder="Search users.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
        </div>
      </div>

      <div className="user-list">
        {filteredUsers.length === 0 && (
          <div className="no-friends">No users found</div>
        )}
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelectUser(user)}
            className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
          >
            <div className="user-avatar-wrapper">
              {user.avatar_url ? (
                <div className="user-avatar" style={{ 
                  background: 'none',
                  backgroundImage: `url(${user.avatar_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}></div>
              ) : (
                <div className="user-avatar">
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}
              <span className={`status-indicator ${onlineStatus[user.id]?.status || user.status || 'offline'}`}></span>
            </div>
            <div className="user-info">
              <h3 className="username">{user.username}</h3>
              <p className={`user-status-text ${onlineStatus[user.id]?.status || user.status || 'offline'}`}>
                {onlineStatus[user.id]?.status === 'online' ? 'Online' : 
                 onlineStatus[user.id]?.status === 'away' ? 'Away' : 
                 `Last seen ${formatLastSeen(onlineStatus[user.id]?.lastSeen || user.last_seen)}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;