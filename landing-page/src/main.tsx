import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import FinancePage from './FinancePage.tsx';

// Simple Routing Logic
const path = window.location.pathname;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {path === '/finance' ? <FinancePage /> : <App />}
  </StrictMode>
);
