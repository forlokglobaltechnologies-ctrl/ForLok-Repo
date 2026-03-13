import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import type { ReactElement } from 'react';
import AdminShell from './components/AdminShell';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import {
  AdminUsersPage,
  AnalyticsPage,
  BookingsPage,
  ContentPage,
  FeedbackDetailsPage,
  FeedbackPage,
  FuelRatesPage,
  MasterDataPage,
  PermissionMatrixPage,
  PoolingPage,
  PricingSyncPage,
  PromosPage,
  RentalPage,
  RolesPage,
  SettingsPage,
  UsersPage,
  WithdrawalsPage,
} from './pages/ModulesPages';
import NotFoundPage from './pages/NotFoundPage';

const FeedbackDetailRoute = () => {
  const { feedbackId = '' } = useParams();
  return <FeedbackDetailsPage feedbackId={feedbackId} />;
};

const ShellRoute = ({ children, permission }: { children: ReactElement; permission?: string | string[] }) => (
  <ProtectedRoute permission={permission}>
    <AdminShell>{children}</AdminShell>
  </ProtectedRoute>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ShellRoute permission="dashboard:view"><DashboardPage /></ShellRoute>} />
      <Route path="/users" element={<ShellRoute permission="users:view"><UsersPage /></ShellRoute>} />
      <Route path="/pooling" element={<ShellRoute permission="offers:view"><PoolingPage /></ShellRoute>} />
      <Route path="/rental" element={<ShellRoute permission="offers:view"><RentalPage /></ShellRoute>} />
      <Route path="/bookings" element={<ShellRoute permission="bookings:view"><BookingsPage /></ShellRoute>} />
      <Route path="/promos" element={<ShellRoute permission="promos:review"><PromosPage /></ShellRoute>} />
      <Route path="/feedback" element={<ShellRoute permission="feedback:view"><FeedbackPage /></ShellRoute>} />
      <Route path="/feedback/:feedbackId" element={<ShellRoute permission="feedback:view"><FeedbackDetailRoute /></ShellRoute>} />
      <Route path="/analytics" element={<ShellRoute permission="analytics:view"><AnalyticsPage /></ShellRoute>} />
      <Route path="/settings" element={<ShellRoute permission="settings:view"><SettingsPage /></ShellRoute>} />
      <Route path="/content" element={<ShellRoute permission="content:view"><ContentPage /></ShellRoute>} />
      <Route path="/master-data" element={<ShellRoute permission="master_data:view"><MasterDataPage /></ShellRoute>} />
      <Route path="/fuel-rates" element={<ShellRoute permission="settings:view"><FuelRatesPage /></ShellRoute>} />
      <Route path="/pricing-control" element={<ShellRoute permission="settings:view"><PricingSyncPage /></ShellRoute>} />
      <Route path="/pricing-sync" element={<Navigate to="/pricing-control" replace />} />
      <Route path="/fuel-pricing" element={<Navigate to="/pricing-control" replace />} />
      <Route path="/withdrawals" element={<ShellRoute permission="withdrawals:view"><WithdrawalsPage /></ShellRoute>} />
      <Route path="/roles" element={<ShellRoute permission="roles:view"><RolesPage /></ShellRoute>} />
      <Route path="/admin-users" element={<ShellRoute permission="admins:view"><AdminUsersPage /></ShellRoute>} />
      <Route path="/permission-matrix" element={<ShellRoute permission="roles:view"><PermissionMatrixPage /></ShellRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
