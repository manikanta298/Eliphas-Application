import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const extensionAsyncMessageError =
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received';
const extensionConsoleNoise = [
  'Initialized chextloader at:',
  '[DEFAULT]: WARN : Using DEFAULT root logger',
];

const isExtensionNoise = (value) => {
  const message = value?.message || String(value || '');
  return message.includes(extensionAsyncMessageError)
    || extensionConsoleNoise.some((noise) => message.includes(noise));
};

const filterExtensionConsoleNoise = () => {
  ['log', 'warn'].forEach((level) => {
    const original = console[level];
    console[level] = (...args) => {
      if (args.some(isExtensionNoise)) return;
      original(...args);
    };
  });
};

filterExtensionConsoleNoise();

window.addEventListener('unhandledrejection', (event) => {
  if (isExtensionNoise(event.reason)) {
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
