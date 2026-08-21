/// <reference types="vite-plugin-pwa/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/theme.css';
import { ErrorBoundary } from './components/ErrorBoundary';

let preloadErrorReloading = false;
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (preloadErrorReloading) return;
  preloadErrorReloading = true;
  console.warn('Chunk desatualizado (nova versão publicada). A recarregar...');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
