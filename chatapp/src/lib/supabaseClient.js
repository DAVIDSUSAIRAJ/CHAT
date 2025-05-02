import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey)

// Function to check if authentication is ready
export const waitForAuthReady = () => {
  return new Promise((resolve) => {
    // First try to get the session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        // Session already exists, resolve immediately
        resolve(data.session)
      } else {
        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            // If we get a session, resolve and clean up
            authListener.subscription.unsubscribe()
            resolve(session)
          } else if (event === 'SIGNED_OUT') {
            // If definitely signed out, resolve with null
            authListener.subscription.unsubscribe()
            resolve(null)
          }
          // For other events we keep waiting
        })

        // Set a timeout to resolve anyway after 3 seconds
        // This prevents waiting indefinitely if auth is truly not ready
        setTimeout(() => {
          authListener.subscription.unsubscribe()
          // Just resolve with whatever state we have
          supabase.auth.getSession().then(({ data }) => {
            resolve(data?.session || null)
          })
        }, 3000)
      }
    })
  })
}

// Helper function to create realtime channels only after auth is ready
export const createRealtimeChannel = async (channelName, options = {}) => {
  // Make sure auth is ready before creating the channel
  await waitForAuthReady()
  
  // Additional check for production to ensure session is available
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    console.warn('No session found when creating channel:', channelName)
    return null
  }
  
  // Now create and return the channel
  return supabase.channel(channelName, options)
} 