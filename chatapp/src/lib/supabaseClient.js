import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Detect if we're in production
const isProduction = process.env.NODE_ENV === 'production'

// Configure WebSocket behavior based on environment
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  // In production, disable realtime by default since Vercel seems to have WebSocket issues
  realtime: {
    // Disable WebSockets in production by default
    eventsPerSecond: 10
  },
  global: {
    headers: { 'X-Client-Info': isProduction ? 'vercel-deployment' : 'localhost' }
  }
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, options)

// Function to check if authentication is ready
export const waitForAuthReady = async () => {
  try {
    // First try to get the session directly
    const { data } = await supabase.auth.getSession()
    if (data?.session) {
      console.log("✅ Session found immediately")
      return data.session
    }
    
    // If no session, set up a promise-based wait
    return new Promise((resolve) => {
      // Set up auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          console.log("✅ Session received from auth state change")
          authListener.subscription.unsubscribe()
          resolve(session)
        } else if (event === 'SIGNED_OUT') {
          console.log("❌ User is signed out")
          authListener.subscription.unsubscribe()
          resolve(null)
        }
      })
      
      // Set a timeout to resolve anyway after a delay
      setTimeout(async () => {
        authListener.subscription.unsubscribe()
        const { data: lastCheck } = await supabase.auth.getSession()
        resolve(lastCheck?.session || null)
      }, 2000)
    })
  } catch (error) {
    console.error("Error checking auth:", error)
    return null
  }
}

/**
 * Create a polling mechanism instead of using WebSockets for Realtime
 * This will poll the database at regular intervals
 */
export const createPollingChannel = (options = {}) => {
  const { 
    table,
    event = '*',
    schema = 'public',
    filter,
    interval = 3000, // Poll every 3 seconds by default
    onRecords,
    userId,
    targetUserId 
  } = options;
  
  // Track if polling is active
  let isActive = true;
  let lastTimestamp = new Date().toISOString();
  let timeoutId = null;
  let callback = onRecords; // Store callback
  
  // Function to fetch new records
  const fetchRecords = async () => {
    if (!isActive) return;
    
    try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("❌ No session found for polling");
        // Try again later
        timeoutId = setTimeout(fetchRecords, interval);
        return;
      }
      
      // Build query
      let query = supabase
        .from(table)
        .select('*');
      
      // Add created_at filter to only get new records
      query = query.gt('created_at', lastTimestamp);
      
      // Add filter if provided
      if (filter) {
        const { column, value } = filter;
        if (column && value !== undefined) {
          query = query.eq(column, value);
        }
      }
      
      // Add user filters for chat messages if user IDs provided
      if (table === 'chat' && userId && targetUserId) {
        query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`);
      }
      
      // Execute query
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) {
        console.error("Error polling data:", error);
      } else if (data && data.length > 0) {
        // Update last timestamp
        lastTimestamp = data[data.length - 1].created_at;
        
        // Call callback with new records
        if (callback) {
          data.forEach(record => {
            callback({
              new: record,
              eventType: 'INSERT',
              schema,
              table
            });
          });
        }
      }
    } catch (error) {
      console.error("Error in polling:", error);
    }
    
    // Schedule next poll if still active
    if (isActive) {
      timeoutId = setTimeout(fetchRecords, interval);
    }
  };
  
  // Create the object to return
  const pollingChannel = {
    on: (_, __, cb) => {
      // Store callback
      callback = cb;
      // Return self for chaining
      return pollingChannel;
    },
    subscribe: (statusCallback) => {
      if (statusCallback) statusCallback('SUBSCRIBED');
      // Start polling after a short delay
      setTimeout(fetchRecords, 100);
      return pollingChannel;
    },
    unsubscribe: () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      return pollingChannel;
    }
  };
  
  return pollingChannel;
};

/**
 * Create a channel for real-time updates (either WebSocket or polling)
 */
export const createRealtimeChannel = async (channelName, options = {}) => {
  // Wait for authentication to be ready
  await waitForAuthReady()
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  
  // If in production or testing environment, use polling by default
  if (isProduction || options.forcePolling) {
    console.log(`📊 Using polling for channel: ${channelName}`)
    
    // Extract table name from channel if it's in the format "public:tablename"
    let table = channelName
    if (channelName.includes(':')) {
      table = channelName.split(':')[1]
    }
    
    // Create a polling channel instead
    return createPollingChannel({
      table,
      ...options,
      session
    })
  }
  
  // In development, use WebSockets
  console.log(`🔌 Using WebSockets for channel: ${channelName}`)
  
  try {
    // Add auth token to channel options if available
    if (session) {
      options = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${session.access_token}`
        }
      }
    }
    
    // Create the channel
    const channel = supabase.channel(channelName, options)
    return channel
  } catch (error) {
    console.error(`Error creating channel ${channelName}:`, error)
    return null
  }
} 