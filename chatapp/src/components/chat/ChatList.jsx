import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ChatList = ({ onSelectUser, selectedUserId }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const subscriptionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user:', currentUser); // Debug log
      
      if (currentUser) {
        // Fetch all users except current user
        const { data, error } = await supabase
          .from('users')
          .select('id, username, email')
          .neq('id', currentUser.id);

        console.log('All users:', data); // Debug log
        console.log('Error:', error); // Debug log

        if (data && !error) {
          setUsers(data);
        }
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

        const channel = supabase.channel('public:users')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'users'
            },
            async (payload) => {
              // Refetch the entire users list when any change occurs
              const { data, error } = await supabase
                .from('users')
                .select('id, username, email')
                .neq('id', currentUser.id);

              if (data && !error) {
                setUsers(data);
              }
            }
          )
          .subscribe();

        subscriptionRef.current = channel;
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
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle profile navigation
  const handleProfileClick = () => {
    setShowMenu(false);
    navigate('/profile');
  };

  // Handle logout
  const handleLogout = async () => {
    setShowMenu(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      // Redirect or handle successful logout
      window.location.href = '/';
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {filteredUsers.length === 0 && (
          <div className="no-friends">No users found</div>
        )}
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelectUser(user)}
            className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
          >
            <div className="user-avatar">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="user-info">
              <h3>{user.username}</h3>
              <p>{user.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList; 