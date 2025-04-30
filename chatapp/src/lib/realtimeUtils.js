import { supabase } from './supabase';

/**
 * Creates a Supabase realtime channel with retry logic
 * @param {string} channelName - The name of the channel
 * @param {Object} options - Channel options
 * @returns {Object} The Supabase channel object
 */
export const createRealtimeChannel = (channelName, options = {}) => {
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds
  
  const createChannel = () => {
    console.log(`Creating channel: ${channelName} (attempt ${retryCount + 1})`);
    
    const channel = supabase.channel(channelName, options);
    
    // Handle connection status changes
    channel.on('system', { event: 'disconnect' }, (payload) => {
      console.log('Realtime disconnected', payload);
      
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Attempting to reconnect (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
        
        setTimeout(() => {
          channel.unsubscribe();
          createChannel();
        }, retryDelay * retryCount);
      }
    });
    
    return channel;
  };
  
  return createChannel();
};

/**
 * Wrapper for subscribing to a channel with error handling
 * @param {Object} channel - Supabase channel
 * @returns {Object} The same channel with subscription
 */
export const subscribeWithRetry = (channel) => {
  try {
    return channel.subscribe((status) => {
      console.log(`Channel status changed: ${status}`);
    });
  } catch (error) {
    console.error('Error subscribing to channel:', error);
    return channel;
  }
};

/**
 * Debugging tool to check Supabase realtime connection status
 * @returns {Object} Connection status information
 */
export const checkSupabaseRealtimeStatus = async () => {
  console.log("--- Supabase Connection Debugging ---");
  
  // Check if we have config values
  const url = supabase.supabaseUrl;
  console.log("Supabase URL:", url ? "Configured ✓" : "Missing ✗");
  
  // Create a test channel to check connection
  const testChannel = supabase.channel('debug-connection-test');
  console.log("Creating test channel...");
  
  let connectionStatus = "Unknown";
  let error = null;
  
  try {
    const subscribe = await new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(new Error("Connection timed out after 5 seconds"));
      }, 5000);
      
      testChannel
        .on('system', { event: 'connected' }, () => {
          clearTimeout(timeout);
          connectionStatus = "Connected";
          resolve("connected");
        })
        .on('system', { event: 'disconnected' }, () => {
          clearTimeout(timeout);
          connectionStatus = "Disconnected";
          resolve("disconnected");
        })
        .on('system', { event: 'error' }, (e) => {
          clearTimeout(timeout);
          connectionStatus = "Error";
          error = e;
          reject(e);
        })
        .subscribe();
    });
    
    console.log("Realtime connection status:", connectionStatus);
  } catch (e) {
    console.error("Connection test failed:", e);
    error = e;
  } finally {
    // Cleanup
    testChannel.unsubscribe();
  }
  
  return {
    status: connectionStatus,
    error,
    supabaseConfigured: !!url,
    timestamp: new Date().toISOString()
  };
}; 