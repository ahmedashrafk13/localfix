import { LazyMotion } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import { AppDataProvider } from './context/AppDataContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { registerServiceWorker } from './lib/push.js';
import './index.css';

const loadMotionFeatures = () => import('./lib/motionFeatures.js').then((mod) => mod.default);

// Offline app shell and Web Push. Only in production builds: in development a service worker
// would cache Vite's hot-reload modules.
if (import.meta.env.PROD) window.addEventListener('load', registerServiceWorker);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LazyMotion features={loadMotionFeatures} strict>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppDataProvider>
                <RealtimeProvider>
                  <App />
                </RealtimeProvider>
              </AppDataProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </LazyMotion>
    </BrowserRouter>
  </StrictMode>
);
