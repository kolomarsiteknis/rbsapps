// Ensure window.fetch has both getter and setter across iframe environments
(function() {
  if (typeof window !== 'undefined') {
    try {
      window.addEventListener('error', function(event) {
        var msg = (event && (event.message || (event.error && event.error.message))) || '';
        if (typeof msg === 'string' && msg.indexOf('fetch') !== -1 && (msg.indexOf('getter') !== -1 || msg.indexOf('Cannot set property') !== -1)) {
          if (event.preventDefault) event.preventDefault();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        }
      }, true);
    } catch (_) {}

    try {
      let _fetch = window.fetch;
      const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (!desc || desc.get || !desc.writable) {
        Object.defineProperty(window, 'fetch', {
          get() {
            return _fetch;
          },
          set(fn) {
            _fetch = fn;
          },
          configurable: true,
          enumerable: true
        });
      }
    } catch (_) {}
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
