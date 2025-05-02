import { useState, useEffect } from 'react';
import { supabase, createRealtimeChannel } from './lib/supabaseClient';

const StatusDebugTool = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [presenceState, setPresenceState] = useState({});
  
  useEffect(() => {
    const fetchData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      // Get all users
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('username');
        
      if (allUsers) {
        setUsers(allUsers);
      }
      
      try {
        // Subscribe to presence channel to monitor online users
        const channel = await createRealtimeChannel('online-users', {
          config: {
            presence: {
              key: user?.id || 'anonymous',
            },
          },
        });
        
        if (channel) {
          channel
            .on('presence', { event: 'sync' }, () => {
              setPresenceState(channel.presenceState());
            })
            .subscribe();
            
          // Set up interval to refresh data every 5 seconds
          const interval = setInterval(async () => {
            const { data: refreshedUsers } = await supabase
              .from('users')
              .select('*')
              .order('username');
              
            if (refreshedUsers) {
              setUsers(refreshedUsers);
            }
            
            setPresenceState(channel.presenceState());
          }, 5000);
          
          return () => {
            clearInterval(interval);
            channel.unsubscribe();
          };
        }
      } catch (error) {
        console.error('Error setting up presence channel in debug tool:', error);
        return () => {};
      }
    };
    
    fetchData();
  }, []);
  
  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'never';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  };
  
  // Calculate time difference
  const getTimeDiff = (timestamp) => {
    if (!timestamp) return 'never';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return `${Math.floor(diffSec / 86400)} days ago`;
  };
  
  // Force update a user's status (for testing)
  const updateUserStatus = async (userId, status) => {
    await supabase
      .from('users')
      .update({
        status,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);
      
    // Refresh users
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('username');
      
    if (data) {
      setUsers(data);
    }
  };
  
  // Reset all users to offline (for testing)
  const resetAllStatuses = async () => {
    await supabase
      .from('users')
      .update({
        status: 'offline',
        last_seen: new Date().toISOString()
      });
      
    // Refresh users
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('username');
      
    if (data) {
      setUsers(data);
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Status Debug Tool</h1>
      <p>Current User: {currentUser?.email || 'Not logged in'}</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={resetAllStatuses} style={{ 
          padding: '8px 16px', 
          background: '#f44336', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Reset All Users to Offline
        </button>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Username</th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status (DB)</th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Presence (Real-time)</th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Last Seen</th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Time Ago</th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{user.username}</td>
              <td style={{ padding: '10px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  background: user.status === 'online' ? '#4CAF50' : user.status === 'away' ? '#FFC107' : '#9e9e9e',
                  marginRight: '5px'
                }}></span>
                {user.status || 'offline'}
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  background: presenceState[user.id] ? '#4CAF50' : '#9e9e9e',
                  marginRight: '5px'
                }}></span>
                {presenceState[user.id] ? 'Online' : 'Offline'}
              </td>
              <td style={{ padding: '10px' }}>{formatTime(user.last_seen)}</td>
              <td style={{ padding: '10px' }}>{getTimeDiff(user.last_seen)}</td>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => updateUserStatus(user.id, 'online')} style={{ 
                    padding: '5px 10px', 
                    background: '#4CAF50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    Set Online
                  </button>
                  <button onClick={() => updateUserStatus(user.id, 'away')} style={{ 
                    padding: '5px 10px', 
                    background: '#FFC107', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    Set Away
                  </button>
                  <button onClick={() => updateUserStatus(user.id, 'offline')} style={{ 
                    padding: '5px 10px', 
                    background: '#9e9e9e', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    Set Offline
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <h2 style={{ marginTop: '30px' }}>Presence Data (Raw)</h2>
      <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', overflowX: 'auto' }}>
        {JSON.stringify(presenceState, null, 2)}
      </pre>
    </div>
  );
};

export default StatusDebugTool; 