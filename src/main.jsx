import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../src-app.jsx'
import { supabase } from './supabase.js'

if (supabase) {
  console.log('✅ Supabase connected:', import.meta.env.VITE_SUPABASE_URL)
} else {
  console.warn('⚠️ Running in demo mode (no Supabase)')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
