// Module script to initialize Firebase AI Logic (Web) using the Gemini Developer API backend
// This file uses CDN module imports and exposes a simple test function on window.

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-ai.js';

// Use external config provided via window.SALAHE_FIREBASE_CONFIG
const cfg = (typeof window !== 'undefined' && window.SALAHE_FIREBASE_CONFIG) ? window.SALAHE_FIREBASE_CONFIG : null;

let ai = null;
let firebaseApp = null;

if (cfg) {
  // Initialize a modular Firebase app for AI Logic usage
  firebaseApp = getApps().length ? getApp() : initializeApp(cfg);
  // Initialize the Gemini Developer API backend service
  ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
} else {
  console.warn('Firebase AI Logic not configured: window.SALAHE_FIREBASE_CONFIG missing');
}

// Helper to create a GenerativeModel instance
function getModel(options) {
  if (!ai) throw new Error('Firebase AI not configured');
  return getGenerativeModel(ai, options || { model: 'gemini-2.5-flash' });
}

// Simple test request to the model; emits a browser event with the result
async function runGeminiTest() {
  if (!ai) {
    const error = 'Firebase AI not configured';
    window.dispatchEvent(new CustomEvent('firebase-ai-test-result', { detail: { ok: false, error } }));
    return error;
  }
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