import { createBrowserRouter, redirect } from 'react-router';
import Root from './pages/Root';
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetailEnhanced from './pages/PropertyDetailEnhanced';
import UserAddProperty from './pages/UserAddProperty';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SavedProperties } from './pages/SavedProperties';
import AdminNotifications from './pages/AdminNotifications';
import AdminAddProperty from './pages/AdminAddProperty';
import SubAdminDashboard from './pages/SubAdminDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import UserEditProperty from './pages/UserEditProperty';
import UserProfile from './pages/UserProfile';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'properties', Component: Properties },
      { path: 'properties/:id', Component: PropertyDetailEnhanced },
      { path: 'profile/:id', Component: UserProfile },
      { path: 'sell', Component: UserAddProperty },
      { path: 'add-property', loader: () => redirect('/sell') },
      { path: 'contact', Component: Contact },
      { path: 'login', Component: Login },
      { path: 'register', Component: Register },
      { path: 'forgot-password', Component: ForgotPassword },
      { path: 'dashboard', Component: UserDashboard },
      { path: 'admin', Component: AdminDashboard },
      { path: 'admin/notifications', Component: AdminNotifications },
      { path: 'admin/add-property', Component: AdminAddProperty },
      { path: 'superadmin', Component: SuperAdminDashboard },
      { path: 'super-admin', loader: () => redirect('/superadmin') },
      { path: 'sub-admin', Component: SubAdminDashboard },
      { path: 'saved', Component: SavedProperties },
      { path: 'privacy', Component: PrivacyPolicy },
      { path: 'terms', Component: PrivacyPolicy },
      { path: 'edit-property/:id', Component: UserEditProperty },
    ],
  },
]);
