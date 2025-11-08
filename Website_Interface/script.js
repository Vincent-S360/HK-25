// DOM Elements
const landingPage = document.getElementById('landing-page');
const chatInterface = document.getElementById('chat-interface');
const startButton = document.getElementById('start-button');
const backButton = document.getElementById('back-button');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const plusButton = document.getElementById('plus-button');
const plusMenu = document.getElementById('plus-menu');
const cameraOption = document.getElementById('camera-option');
const uploadOption = document.getElementById('upload-option');
const cameraInput = document.getElementById('camera-input');
const fileInput = document.getElementById('file-input');
const languageSelect = document.getElementById('language-select');
const pageLanguageSelect = document.getElementById('page-language-select');
const toastContainer = document.getElementById('toast-container');
const initialTimestamp = document.getElementById('initial-timestamp');
// CTA and Footer elements
const ctaStartButton = document.getElementById('cta-start-button');
const ctaSection = document.querySelector('.cta-section');
const siteFooter = document.querySelector('.site-footer');
// Hamburger menu elements
const hamburgerMenu = document.getElementById('hamburger-menu');
const sidebarMenu = document.getElementById('sidebar-menu');
const closeSidebar = document.getElementById('close-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
// Quick actions elements
const quickActions = document.getElementById('quick-actions');
const qaCrop = document.getElementById('qa-crop');
const qaSchemes = document.getElementById('qa-schemes');
const qaAgri = document.getElementById('qa-agri');
const qaWeather = document.getElementById('qa-weather');
const qaEmotional = document.getElementById('qa-emotional');
const qaProfit = document.getElementById('qa-profit');
const qaExport = document.getElementById('qa-export');
const qaExhort = document.getElementById('qa-exhort');
const qaMarket = document.getElementById('qa-market');
// Connectivity badge elements
const connectivityBadge = document.getElementById('connectivity-badge');
const connectivityText = document.getElementById('connectivity-text');

// Firebase configuration (updated)
const firebaseConfig = {
  apiKey: "AIzaSyB6UekFOImueoeXSutffn5tazNDxxNo0IA",
  authDomain: "salahe-d07fb.firebaseapp.com",
  databaseURL: "https://salahe-d07fb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "salahe-d07fb",
  storageBucket: "salahe-d07fb.firebasestorage.app",
  messagingSenderId: "613955008577",
  appId: "1:613955008577:web:5026ff8bfa9c062fd6eec0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Resolve API base for different preview contexts (backend server vs Live Server vs file://)
const API_BASE = (function() {
  const origin = window.location.origin || '';
  // If served by backend on localhost:3000, use relative path
  if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) return '';
  // If opened via file:// or any other port (e.g., VS Code Live Server), point to backend on 3000
  if (window.location.protocol === 'file:' || !origin) return 'http://localhost:3000';
  // Fallback for other dev hosts: assume backend on localhost:3000
  return 'http://localhost:3000';
})();

// Auto-redirect to backend server when opened directly (file:// or VS Code preview)
(function() {
  // Check if we're not already on localhost:3000 and not on a local dev server
  if (!window.location.origin.includes('localhost:3000') && 
      !window.location.origin.includes('127.0.0.1:3000') &&
      (window.location.protocol === 'file:' || 
       window.location.origin.includes('vscode-webview') ||
       window.location.origin.includes('localhost:5500') ||
       window.location.origin.includes('127.0.0.1:5500'))) {
    
    // Show a brief message before redirecting
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,sans-serif;background:#f0f0f0;"><div style="text-align:center;"><h2>Redirecting to SALAHE...</h2><p>Opening on port 3000 where your backend is running</p></div></div>';
    
    // Redirect to backend server after a brief delay
    setTimeout(() => {
      window.location.href = 'http://localhost:3000/';
    }, 1000);
    return;
  }
})();





