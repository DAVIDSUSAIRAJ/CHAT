import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const ChatList = ({ onSelectUser, selectedUserId }) => {
  const [users, setUsers] = useState([]);

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
          <span className="search-icon">🔍</span>
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