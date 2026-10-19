import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './theme/tokens.css';
import './components/calm/calm.css';
import './styles.css';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import ApiConfigGate from './components/ApiConfigGate';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const router = createBrowserRouter([{ path: '*', element: <AuthProvider><App /></AuthProvider> }]);

createRoot(container).render(
  <React.StrictMode>
    <ApiConfigGate value={import.meta.env.VITE_API_BASE_URL}>
      <RouterProvider router={router} />
    </ApiConfigGate>
  </React.StrictMode>,
);
