import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import Callbacks from '@/pages/Callbacks'
import AddCallback from '@/pages/AddCallback'
import CallbackDetail from '@/pages/CallbackDetail'
import Transfers from '@/pages/Transfers'
import AddTransfer from '@/pages/AddTransfer'
import TransferDetail from '@/pages/TransferDetail'
import EditTransfer from '@/pages/EditTransfer'
import Sales from '@/pages/Sales'
import SaleApplication from '@/pages/SaleApplication'
import SaleDetail from '@/pages/SaleDetail'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/CustomerDetail'
import ProfileSettings from '@/pages/ProfileSettings'
import TeamDashboard from '@/pages/manager/TeamDashboard'
import AgentDetail from '@/pages/manager/AgentDetail'
import ManagerCallbacks from '@/pages/manager/ManagerCallbacks'
import ManagerCallbackDetail from '@/pages/manager/ManagerCallbackDetail'
import ManagerTransfers from '@/pages/manager/ManagerTransfers'
import ManagerTransferDetail from '@/pages/manager/ManagerTransferDetail'
import ManagerSales from '@/pages/manager/ManagerSales'
import ManagerNotifications from '@/pages/manager/ManagerNotifications'
import ManagerAgentsList from '@/pages/manager/ManagerAgentsList'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import ManagersPage from '@/pages/admin/ManagersPage'
import AgentsPage from '@/pages/admin/AgentsPage'
import PendingUsers from '@/pages/admin/PendingUsers'
import AdminAgentDetail from '@/pages/admin/AdminAgentDetail'
import AdminManagerDetail from '@/pages/admin/AdminManagerDetail'
import AdminTransferDetail from '@/pages/admin/AdminTransferDetail'
import AdminCallbackDetail from '@/pages/admin/AdminCallbackDetail'
import AdminTransfers from '@/pages/admin/AdminTransfers'
import AdminSaleDetail from '@/pages/admin/AdminSaleDetail'
import AdminCallbacks from '@/pages/admin/AdminCallbacks'

function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { token } = useAuthStore()
  if (token) return <Navigate to="/" replace />
  return children
}

function RoleRoute({ children, allowedRoles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user?.role)) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />
    if (user?.role === 'manager') return <Navigate to="/manager" replace />
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<RoleRoute allowedRoles={['agent']}><Dashboard /></RoleRoute>} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="callbacks" element={<RoleRoute allowedRoles={['agent', 'admin']}><Callbacks /></RoleRoute>} />
        <Route path="callbacks/add" element={<RoleRoute allowedRoles={['agent']}><AddCallback /></RoleRoute>} />
        <Route path="callbacks/:id" element={<RoleRoute allowedRoles={['agent', 'manager', 'admin']}><CallbackDetail /></RoleRoute>} />
        <Route path="callbacks/:id/edit" element={<RoleRoute allowedRoles={['agent', 'manager']}><AddCallback /></RoleRoute>} />
        <Route path="transfers" element={<RoleRoute allowedRoles={['agent']}><Transfers /></RoleRoute>} />
        <Route path="transfers/add" element={<RoleRoute allowedRoles={['agent']}><AddTransfer /></RoleRoute>} />
        <Route path="transfers/:id" element={<RoleRoute allowedRoles={['agent']}><TransferDetail /></RoleRoute>} />
        <Route path="transfers/:id/edit" element={<RoleRoute allowedRoles={['agent', 'manager']}><EditTransfer /></RoleRoute>} />
        <Route path="sales" element={<RoleRoute allowedRoles={['agent']}><Sales /></RoleRoute>} />
        <Route path="sales/apply" element={<RoleRoute allowedRoles={['agent', 'manager']}><SaleApplication /></RoleRoute>} />
        <Route path="sales/:id" element={<RoleRoute allowedRoles={['agent', 'manager']}><SaleDetail /></RoleRoute>} />
        <Route path="sales/:id/edit" element={<RoleRoute allowedRoles={['agent', 'manager']}><SaleApplication /></RoleRoute>} />
        <Route path="customers" element={<RoleRoute allowedRoles={['agent']}><Customers /></RoleRoute>} />
        <Route path="customers/:id" element={<RoleRoute allowedRoles={['agent']}><CustomerDetail /></RoleRoute>} />
      </Route>

      <Route path="/manager" element={<RoleRoute allowedRoles={['manager']}><AppLayout /></RoleRoute>}>
        <Route index element={<TeamDashboard />} />
        <Route path="agents" element={<ManagerAgentsList />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="callbacks" element={<ManagerCallbacks />} />
        <Route path="callbacks/:id" element={<ManagerCallbackDetail />} />
        <Route path="transfers" element={<ManagerTransfers />} />
        <Route path="transfers/:id" element={<ManagerTransferDetail />} />
        <Route path="sales" element={<ManagerSales />} />
        <Route path="notifications" element={<ManagerNotifications />} />
      </Route>

      <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><AppLayout /></RoleRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="managers" element={<ManagersPage />} />
        <Route path="managers/:id" element={<AdminManagerDetail />} />
        <Route path="pending" element={<PendingUsers />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:id" element={<AdminAgentDetail />} />
        <Route path="callbacks" element={<AdminCallbacks />} />
        <Route path="callbacks/:id" element={<AdminCallbackDetail />} />
        <Route path="transfers" element={<AdminTransfers />} />
        <Route path="transfers/:id" element={<AdminTransferDetail />} />
        <Route path="sales/:id" element={<AdminSaleDetail />} />
        <Route path="analytics" element={<AdminDashboard />} />
        <Route path="activity" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
