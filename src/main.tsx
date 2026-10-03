import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalRequestInterceptor } from './utils/requestInterceptorStore';

// Initialize global beforeRequest fetch interceptor and window-accessible store
initGlobalRequestInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
