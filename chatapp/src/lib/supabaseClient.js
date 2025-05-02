import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  // Add Realtime-specific config as per Supabase docs
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  // Increase timeout for connection issues
  global: {
    fetch: fetch,
    headers: { 'X-Client-Info': 'vercel-deployment' }
  }
})

// Enhanced function to check if authentication is ready with exponential backoff
export const waitForAuthReady = async () => {
  let retries = 0;
  const maxRetries = 5;
  const baseDelay = 300; // Start with 300ms delay
  
  const checkAuth = async () => {
    try {
      // First try to get the session directly
      const { data } = await supabase.auth.getSession();
      
      if (data?.session) {
        console.log("✅ Session found immediately");
        return data.session;
      } else {
        console.log("⏳ No immediate session, waiting for auth state change...");
        
        // If no session, set up a proper promise-based wait
        return new Promise((resolve) => {
          // Set up auth state change listener
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔔 Auth state change: ${event}`);
            
            if (session) {
              console.log("✅ Session received from auth state change");
              authListener.subscription.unsubscribe();
              resolve(session);
            } else if (event === 'SIGNED_OUT') {
              console.log("❌ User is definitely signed out");
              authListener.subscription.unsubscribe();
              resolve(null);
            }
          });
          
          // Set a timeout to resolve anyway after a delay
          setTimeout(async () => {
            console.log("⏱️ Auth listener timeout reached");
            authListener.subscription.unsubscribe();
            
            // Try one more time to get the session
            const { data: lastCheck } = await supabase.auth.getSession();
            resolve(lastCheck?.session || null);
          }, 2000);
        });
      }
    } catch (error) {
      console.error("❌ Error checking auth:", error);
      return null;
    }
  };
  
  // Try with exponential backoff
  while (retries < maxRetries) {
    const session = await checkAuth();
    
    if (session) {
      return session;
    }
    
    // If no session, try again with exponential backoff
    retries++;
    if (retries < maxRetries) {
      const delay = baseDelay * Math.pow(2, retries);
      console.log(`⏳ Retry ${retries}/${maxRetries} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log("⚠️ Auth ready check complete - proceeding with best effort");
  return null;
}

// Check if we're in a production Vercel environment
const isVercelProduction = () => {
  return process.env.NODE_ENV === 'production' && 
         (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
}

// Helper function to establish and verify WebSocket connectivity
const verifyWebSocketConnection = async () => {
  // Skip for non-production environments
  if (!isVercelProduction()) return true;
  
  return new Promise((resolve) => {
    try {
      // Test a simple WebSocket connection to Supabase
      const ws = new WebSocket(
        `${supabaseUrl.replace('https://', 'wss://')}/realtime/v1/websocket?apikey=${supabaseKey}&vsn=1.0.0`
      );
      
      // Set timeout for WebSocket connection
      const timeout = setTimeout(() => {
        console.log("⏱️ WebSocket connection timeout");
        ws.close();
        resolve(false);
      }, 5000);
      
      ws.onopen = () => {
        console.log("✅ Test WebSocket connection successful");
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };
      
      ws.onerror = (error) => {
        console.error("❌ Test WebSocket connection error:", error);
        clearTimeout(timeout);
        resolve(false);
      };
    } catch (error) {
      console.error("❌ Error testing WebSocket:", error);
      resolve(false);
    }
  });
}

// Helper function to create realtime channels with aggressive authentication check
export const createRealtimeChannel = async (channelName, options = {}) => {
  try {
    console.log(`🔄 Setting up channel: ${channelName}`);
    
    // Make sure auth is ready before creating the channel
    const session = await waitForAuthReady();
    
    // Verify WebSocket connectivity on production
    const wsConnected = await verifyWebSocketConnection();
    
    if (!session) {
      console.warn('⚠️ No session found when creating channel:', channelName);
      
      // In production, we'll throw if there's no session to prevent silent failures
      if (isVercelProduction()) {
        throw new Error('No authenticated session available');
      }
    }
    
    if (isVercelProduction() && !wsConnected) {
      console.warn('⚠️ WebSocket connection test failed for:', channelName);
    }
    
    // Add auth token to channel options if available
    if (session) {
      options = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${session.access_token}`
        }
      };
    }
    
    // Create the channel with a deliberate delay for Vercel production
    if (isVercelProduction()) {
      // Add a slight delay before creating the channel in production
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Now create and return the channel
    const channel = supabase.channel(channelName, options);
    
    console.log(`✅ Channel created: ${channelName}`);
    return channel;
  } catch (error) {
    console.error(`❌ Error creating channel ${channelName}:`, error);
    return null;
  }
} 