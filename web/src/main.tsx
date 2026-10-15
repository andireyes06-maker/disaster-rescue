import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './theme/tokens.css';
import './styles.css';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
