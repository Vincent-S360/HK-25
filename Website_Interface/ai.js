// Module script to initialize Firebase AI Logic (Web) using the Gemini Developer API backend
// This file uses CDN module imports and exposes a simple test function on window.

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-ai.js';

// Keep this in sync with Website-Interface/script.js
const firebaseConfig = {
  apiKey: "AIzaSyB6UekFOImueoeXSutffn5tazNDxxNo0IA",
  authDomain: "salahe-d07fb.firebaseapp.com",
  databaseURL: "https://salahe-d07fb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "salahe-d07fb",
  storageBucket: "salahe-d07fb.firebasestorage.app",
  messagingSenderId: "613955008577",
  appId: "1:613955008577:web:5026ff8bfa9c062fd6eec0"
};

// Initialize a modular Firebase app for AI Logic usage
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize the Gemini Developer API backend service
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

// Helper to create a GenerativeModel instance
function getModel(options) {
  return getGenerativeModel(ai, options || { model: 'gemini-2.5-flash' });
}

// Simple test request to the model; emits a browser event with the result
async function runGeminiTest() {
  try {
    const model = getModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Say hello from Firebase AI Logic in one sentence.');
    const text = result.response.text();
    window.dispatchEvent(new CustomEvent('firebase-ai-test-result', { detail: { ok: true, text } }));
    return text;
  } catch (error) {
    const msg = (error && (error.message || error.statusText)) || String(error);
    window.dispatchEvent(new CustomEvent('firebase-ai-test-result', { detail: { ok: false, error: msg } }));
    throw error;
  }
}

// Expose minimal API on window for integration from non-module scripts
window.firebaseAI = { ai, getModel, runGeminiTest };