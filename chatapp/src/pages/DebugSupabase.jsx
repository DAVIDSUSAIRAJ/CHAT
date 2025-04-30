import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { checkSupabaseRealtimeStatus } from '../lib/realtimeUtils';

const DebugSupabase = () => {
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeConfig, setRealtimeConfig] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [supabaseEnv, setSupabaseEnv] = useState({
    url: import.meta.env.VITE_SUPABASE_URL || 'Not found',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Present' : '✗ Missing'
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setLoading(true);
        const info = await checkSupabaseRealtimeStatus();
        setConnectionInfo(info);
        
        // Try to get client info
        try {
          setClientInfo({
            supabaseUrl: supabase.supabaseUrl,
            realtimeUrl: supabase.realtime?.url,
            authConfig: JSON.stringify(supabase.auth.collectJWTInfo(), null, 2)
          });
        } catch (e) {
          console.error("Error getting client info", e);
        }
        
        // Extract realtime config
        try {
          const options = supabase.realtime?.params || {};
          setRealtimeConfig(options);
        } catch (e) {
          console.error("Error getting realtime config", e);
        }
      } catch (error) {
        console.error("Debug check failed", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkConnection();
  }, []);
  
  const runTest = async () => {
    setLoading(true);
    try {
      const info = await checkSupabaseRealtimeStatus();
      setConnectionInfo(info);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Supabase Connection Debugger</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Environment Variables</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px',
          overflow: 'auto' 
        }}>
          {JSON.stringify(supabaseEnv, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Client Configuration</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px',
          overflow: 'auto' 
        }}>
          {clientInfo ? JSON.stringify(clientInfo, null, 2) : 'Loading...'}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Realtime Configuration</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px',
          overflow: 'auto' 
        }}>
          {realtimeConfig ? JSON.stringify(realtimeConfig, null, 2) : 'Loading...'}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Connection Test</h2>
        <button 
          onClick={runTest} 
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#3a7bfd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        
        {connectionInfo && (
          <div style={{ marginTop: '20px' }}>
            <h3>Results</h3>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '15px', 
              borderRadius: '4px',
              overflow: 'auto' 
            }}>
              {JSON.stringify(connectionInfo, null, 2)}
            </pre>
            
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              borderRadius: '4px',
              backgroundColor: connectionInfo.status === 'Connected' ? '#d4edda' : '#f8d7da',
              color: connectionInfo.status === 'Connected' ? '#155724' : '#721c24'
            }}>
              <h3>Status: {connectionInfo.status}</h3>
              <p>
                {connectionInfo.status === 'Connected' 
                  ? 'WebSocket connection is working properly!' 
                  : 'There is an issue with the WebSocket connection.'}
              </p>
              
              {connectionInfo.error && (
                <div>
                  <h4>Error:</h4>
                  <pre>{JSON.stringify(connectionInfo.error, null, 2)}</pre>
                </div>
              )}
              
              <p>Last checked: {new Date(connectionInfo.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <h2>Common Issues & Solutions</h2>
        <ul style={{ lineHeight: '1.6' }}>
          <li><strong>Missing environment variables</strong> - Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file and Vercel environment variables</li>
          <li><strong>CORS issues</strong> - Check if your headers in vercel.json are properly configured</li>
          <li><strong>Authentication problems</strong> - Verify that your Supabase anonymous key is correct</li>
          <li><strong>Network blocks</strong> - Some networks (corporate/school) may block WebSocket connections</li>
          <li><strong>Project status</strong> - Check if your Supabase project is paused or has reached its connection limits</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugSupabase; 