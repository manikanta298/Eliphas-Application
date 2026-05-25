import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const extensionAsyncMessageError =
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received';

window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason || '');
  if (message.includes(extensionAsyncMessageError)) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
