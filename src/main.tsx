import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AppDialog from './components/AppDialog.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './components/index.css';

CapacitorUpdater.notifyAppReady();

CapacitorUpdater.addListener('updateAvailable', async (update) => {
  try {
    await CapacitorUpdater.set(update.bundle);
  } catch {}
});

CapacitorUpdater.addListener('downloadComplete', async (download) => {
  try {
    await CapacitorUpdater.set(download.bundle);
  } catch {}
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
    <AppDialog />
  </ErrorBoundary>
);
