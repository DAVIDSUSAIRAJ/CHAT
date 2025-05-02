import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import StatusDebugTool from './StatusDebugTool';
import { supabase } from './lib/supabaseClient';
import './App.css'

function App() {
  // Check WebSocket connectivity on app startup
  useEffect(() => {
    // Only run this check in production
    if (process.env.NODE_ENV === 'production') {
      const checkWebSocketConnection = async () => {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          console.log('🧪 Testing WebSocket connectivity...');
          
          // Create a test WebSocket connection
          const ws = new WebSocket(
            `${supabaseUrl.replace('https://', 'wss://')}/realtime/v1/websocket?apikey=${supabaseKey}&vsn=1.0.0`
          );
          
          let connectionOpened = false;
          
          ws.onopen = () => {
            console.log('✅ WebSocket connection test successful!');
            connectionOpened = true;
            
            // Store connection success in localStorage
            localStorage.setItem('wsConnectionTest', JSON.stringify({
              success: true,
              timestamp: new Date().toISOString()
            }));
            
            // Close connection after success
            ws.close();
          };
          
          ws.onerror = (error) => {
            console.error('❌ WebSocket connection error:', error);
            
            // Store connection failure in localStorage
            localStorage.setItem('wsConnectionTest', JSON.stringify({
              success: false,
              error: 'Connection failed',
              timestamp: new Date().toISOString()
            }));
          };
          
          // Set a timeout to close the connection if it doesn't open
          setTimeout(() => {
            if (!connectionOpened) {
              console.log('⏱️ WebSocket connection test timed out');
              ws.close();
              
              // Store timeout in localStorage
              localStorage.setItem('wsConnectionTest', JSON.stringify({
                success: false,
                error: 'Connection timeout',
                timestamp: new Date().toISOString()
              }));
            }
          }, 5000);
        } catch (error) {
          console.error('❌ Error in WebSocket connectivity test:', error);
          
          // Store error in localStorage
          localStorage.setItem('wsConnectionTest', JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }));
        }
      };
      
      // Run the check after a short delay to let the app load
      setTimeout(checkWebSocketConnection, 1000);
    }
  }, []);
  
  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/debug-status" element={<StatusDebugTool />} />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
