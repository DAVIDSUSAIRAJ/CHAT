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