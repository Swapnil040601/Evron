import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AppDialog from './components/AppDialog.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './components/index.css';

// Tell the updater the app loaded successfully (prevents rollback)
CapacitorUpdater.notifyAppReady();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
    <AppDialog />
  </ErrorBoundary>
);
