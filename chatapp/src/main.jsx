import { StrictMode } from 'react'
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// Check if user is accessing directly via URL (like after a refresh)
// and ensure we have a service worker or proper client-side routing
if (typeof window !== 'undefined') {
  // Register the route handler to prevent 404s on client-side routes
  window.addEventListener('error', (e) => {
    // If page fails to load due to missing resources, reload to root
    if (e.target && (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT')) {
      console.log('Resource failed to load, attempting to recover...');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  }, true);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
