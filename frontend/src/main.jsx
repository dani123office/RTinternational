import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/toast'
import App from './App.jsx'
import CallbackNotifier from '@/components/CallbackNotifier'
import ManagerNotifier from '@/components/ManagerNotifier'
import AdminNotifier from '@/components/AdminNotifier'
import Poller from '@/components/Poller'
import './index.css'

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <Toaster>
        <App />
        <CallbackNotifier />
        <ManagerNotifier />
        <AdminNotifier />
        <Poller />
      </Toaster>
    </BrowserRouter>
    ,
)
