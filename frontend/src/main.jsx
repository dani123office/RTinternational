import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/toast'
import App from './App.jsx'
import CallbackNotifier from '@/components/CallbackNotifier'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster>
        <App />
        <CallbackNotifier />
      </Toaster>
    </BrowserRouter>
  </StrictMode>,
)
