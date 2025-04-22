import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const ChatList = ({ onSelectUser, selectedUserId }) => {
  const [users, setUsers] = useState([]);
  const subscriptionRef = useRef(null);

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

    // Cleanup subscription on component unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="header-content">
          <h2>All Users</h2>
          <button className="menu-button">•••</button>
        </div>
        <div className="chat-search">
          <input
            type="text"
            placeholder="Search here.."
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
        {users.length === 0 && (
          <div className="no-friends">No users found</div>
        )}
        {users.map((user) => (
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