import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const ChatList = ({ onSelectUser, selectedUserId }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const menuRef = useRef(null);
  const subscriptionRef = useRef(null);
  const navigate = useNavigate();

  // Function to sort users - online first, then alphabetically
  const sortUsers = (users) => {
    return users.sort((a, b) => {
      // First compare online status
      if (a.status === 'online' && b.status !== 'online') return -1;
      if (a.status !== 'online' && b.status === 'online') return 1;
      
      // If same status, sort by username
      return a.username.localeCompare(b.username);
    });
  };

  // Fetch users and setup real-time subscription
  useEffect(() => {
    let isSubscribed = true;

    const fetchUsers = async () => {
      console.log('Fetching users...');
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      setCurrentUser(user);
      
      if (user) {
        // First set own status to online
        console.log('Setting status to online...');
        const { error: statusError } = await supabase
          .from('users')
          .update({ status: 'online' })
          .eq('id', user.id);

        if (statusError) {
          console.error('Error updating own status:', statusError);
        }

        // Fetch all users except current user
        console.log('Fetching other users...');
        const { data, error } = await supabase
          .from('users')
          .select('id, username, email, avatar_url, status')
          .neq('id', user.id);

        if (data && !error) {
          console.log('Initial users data:', data);
          // Ensure no duplicates in initial data and filter out current user
          const uniqueUsers = Array.from(
            new Map(
              data
                .filter(u => u.id !== user.id) // Filter out current user
                .map(user => [user.id, user])
            ).values()
          );
          setUsers(sortUsers(uniqueUsers)); // Sort users before setting
        }

        // Setup broadcast channel for status updates
        console.log('Setting up broadcast channel...');
        const broadcastChannel = supabase
          .channel('status_updates')
          .on(
            'broadcast',
            { event: 'status_change' },
            (payload) => {
              console.log('Received broadcast:', payload);
              
              if (!isSubscribed) return;
              
              const { userId, status } = payload.payload;
              console.log('Status update for user:', userId, status);

              // Skip if it's the current user
              if (userId === user.id) {
                console.log('Skipping current user update');
                return;
              }

              // Update users list with new status
              setUsers(prevUsers => {
                // Create a Map of current users for easy lookup and duplicate prevention
                const usersMap = new Map(prevUsers.map(u => [u.id, u]));
                
                // If user doesn't exist and it's not the current user, fetch their details
                if (!usersMap.has(userId) && userId !== user.id) {
                  console.log('New user detected, fetching details...');
                  supabase
                    .from('users')
                    .select('id, username, email, avatar_url, status')
                    .eq('id', userId)
                    .single()
                    .then(({ data: newUser, error }) => {
                      if (!error && newUser && newUser.id !== user.id) {
                        console.log('Adding new user:', newUser);
                        setUsers(current => {
                          // Double check to prevent race conditions and current user
                          const currentMap = new Map(current.map(u => [u.id, u]));
                          if (!currentMap.has(newUser.id) && newUser.id !== user.id) {
                            // Sort after adding new user
                            return sortUsers([...current, newUser]);
                          }
                          return current;
                        });
                      }
                    });
                  return prevUsers;
                }
                
                // Update existing user's status
                if (usersMap.has(userId)) {
                  usersMap.set(userId, { ...usersMap.get(userId), status });
                }
                // Sort users after status update
                return sortUsers(Array.from(usersMap.values()));
              });
            }
          )
          .subscribe((status) => {
            console.log('Broadcast subscription status:', status);
          });

        // Also listen for database changes
        console.log('Setting up database listener...');
        const dbChannel = supabase
          .channel('db_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'users'
            },
            async (payload) => {
              console.log('Database change:', payload);
              
              if (!isSubscribed) return;

              // Skip if it's the current user
              if (payload.new && payload.new.id === user.id) {
                console.log('Skipping current user database update');
                return;
              }

              setUsers(prevUsers => {
                // Create a Map of current users
                const usersMap = new Map(prevUsers.map(u => [u.id, u]));

                // For INSERT events, add the new user if not exists and not current user
                if (payload.eventType === 'INSERT' && payload.new.id !== user.id) {
                  console.log('New user inserted:', payload.new);
                  if (!usersMap.has(payload.new.id)) {
                    usersMap.set(payload.new.id, payload.new);
                  }
                }
                // For UPDATE events, update the user if not current user
                else if (payload.eventType === 'UPDATE' && payload.new.id !== user.id) {
                  console.log('User updated:', payload.new);
                  if (usersMap.has(payload.new.id)) {
                    usersMap.set(payload.new.id, { ...usersMap.get(payload.new.id), ...payload.new });
                  }
                }

                // Convert Map back to array, filter current user, and sort
                return sortUsers(
                  Array.from(usersMap.values())
                    .filter(u => u.id !== user.id)
                );
              });
            }
          )
          .subscribe();

        // When setting status to online, broadcast to all clients
        const channel = supabase.channel('status_updates');
        channel.send({
          type: 'broadcast',
          event: 'status_change',
          payload: {
            userId: user.id,
            status: 'online'
          }
        });

        // Save subscription references for cleanup
        subscriptionRef.current = {
          broadcast: broadcastChannel,
          db: dbChannel
        };
      }
    };

    fetchUsers();

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up subscriptions...');
      isSubscribed = false;
      if (subscriptionRef.current) {
        if (subscriptionRef.current.broadcast) {
          supabase.removeChannel(subscriptionRef.current.broadcast);
        }
        if (subscriptionRef.current.db) {
          supabase.removeChannel(subscriptionRef.current.db);
        }
      }
    };
  }, []);

  // Filter users based on search
  const getFilteredUsers = () => {
    if (!searchQuery) return users;
    const searchLower = searchQuery.toLowerCase();
    return users.filter(u => 
      u.username.toLowerCase().includes(searchLower)
    );
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    setShowMenu(false);
    navigate('/profile');
  };

  // Handle logout with broadcast
  const handleLogout = async () => {
    setShowMenu(false);
    
    if (currentUser) {
      try {
        // Broadcast offline status
        const channel = supabase.channel('status_updates');
        channel.send({
          type: 'broadcast',
          event: 'status_change',
          payload: {
            userId: currentUser.id,
            status: 'offline'
          }
        });

        // Update database
        const { error: statusError } = await supabase
          .from('users')
          .update({ status: 'offline' })
          .eq('id', currentUser.id);

        if (statusError) {
          console.error('Error updating status:', statusError);
          return;
        }

        // Wait a moment for the status update to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Then sign out
        const { error: signOutError } = await supabase.auth.signOut();
        if (!signOutError) {
          navigate('/');
        } else {
          console.error('Error signing out:', signOutError);
        }
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
  };

  return (
    <div className="chat-list">
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
        {getFilteredUsers().length === 0 && (
          <div className="no-friends">No users found</div>
        )}
        {getFilteredUsers().map((user) => (
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
              <span className={`status-indicator ${user.status || 'offline'}`}></span>
            </div>
            <div className="user-info">
              <h3 className="username">{user.username}</h3>
              <p className={`user-status-text ${user.status || 'offline'}`}>
                {user.status === 'online' ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList; 