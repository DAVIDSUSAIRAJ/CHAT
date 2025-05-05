import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create options with basic configuration
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  realtime: {
    eventsPerSecond: 10
  }
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, options)

// Add bearer token to all requests when available
supabase.auth.onAuthStateChange((event, session) => {
  if (session && session.access_token) {
    // Update the client's global headers with the bearer token
    supabase.realtime.setAuth(session.access_token)
    
    // Also set for regular HTTP requests
    supabase.functions.setAuth(session.access_token)
  }
})

// Function to check if authentication is ready
export const waitForAuthReady = async () => {
  try {
    // First try to get the session directly
    const { data } = await supabase.auth.getSession()
    if (data?.session) {
      
      // Ensure bearer token is set in headers
      if (data.session.access_token) {
        // Set auth token for realtime connections
        supabase.realtime.setAuth(data.session.access_token)
        
        // Set for function calls
        supabase.functions.setAuth(data.session.access_token)
      }
      
      return data.session
    }
    
    // If no session, set up a promise-based wait
    return new Promise((resolve) => {
      // Set up auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          
          // Ensure bearer token is set in headers
          if (session.access_token) {
            // Set auth token for realtime connections
            supabase.realtime.setAuth(session.access_token)
            
            // Set for function calls
            supabase.functions.setAuth(session.access_token)
          }
          
          authListener.subscription.unsubscribe()
          resolve(session)
        } else if (event === 'SIGNED_OUT') {
          authListener.subscription.unsubscribe()
          resolve(null)
        }
      })
      
      // Set a timeout to resolve anyway after a delay
      setTimeout(async () => {
        authListener.subscription.unsubscribe()
        const { data: lastCheck } = await supabase.auth.getSession()
        
        // One last attempt to set headers
        if (lastCheck?.session?.access_token) {
          supabase.realtime.setAuth(lastCheck.session.access_token)
          supabase.functions.setAuth(lastCheck.session.access_token)
        }
        
        resolve(lastCheck?.session || null)
      }, 2000)
    })
  } catch (error) {
    console.error("Error checking auth:", error)
    return null
  }
}

// Function to create a realtime channel with proper authentication
export const createRealtimeChannel = async (channelName, options = {}) => {
  // Wait for authentication to be ready
  const session = await waitForAuthReady();
  
  // Create channel with proper configuration
  return supabase.channel(channelName, { 
    config: {
      presence: { key: session?.user?.id || 'anonymous' },
    }
  });
} 