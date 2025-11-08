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

// Connectivity monitoring
function getConnectivityLabel(lang, isOnline) {
  if (lang === 'kn') return isOnline ? 'ಆನ್‌ಲೈನ್' : 'ಆಫ್‌ಲೈನ್';
  return isOnline ? 'Online' : 'Offline';
}

function updateConnectivityBadge(isOnline) {
  if (!connectivityBadge || !connectivityText) return;
  const lang = currentPageLanguage || 'en';
  connectivityBadge.classList.toggle('online', isOnline);
  connectivityBadge.classList.toggle('offline', !isOnline);
  connectivityText.textContent = getConnectivityLabel(lang, isOnline);
}

async function checkConnectivity(timeoutMs = 2000) {
  // If browser reports offline, treat as offline immediately
  if (!navigator.onLine) return false;
  // Heartbeat to server root (served by express.static)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Fetch a small static asset to verify server reachability
    const resp = await fetch('styles.css', { method: 'GET', cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    return !!resp && resp.ok;
  } catch (e) {
    clearTimeout(timer);
    return false; // timeout or network error => weak/no internet
  }
}

function initConnectivityBadge() {
  // Initial state
  updateConnectivityBadge(false);
  // React to browser online/offline events
  window.addEventListener('online', async () => {
    const ok = await checkConnectivity();
    updateConnectivityBadge(ok);
  });
  window.addEventListener('offline', () => updateConnectivityBadge(false));
  // Periodic heartbeat to detect weak connectivity
  const runHeartbeat = async () => {
    const ok = await checkConnectivity();
    updateConnectivityBadge(ok);
  };
  runHeartbeat();
  setInterval(runHeartbeat, 8000);
}

// User state
let currentUser = null;
let pendingChatOpen = false; // set when CTA clicked before login

// Hamburger menu state
let sidebarActive = false;

// Global variables
let isListening = false;
let isSpeaking = false;
let recognition;
let currentLanguage = 'en-US';
let currentPageLanguage = 'en';
let availableVoices = [];
// Using window.speechSynthesis directly instead of creating a variable
// Voice utterance is handled in voice.js
let currentChatId = null; // Firestore chat document ID for current session
let previousUserEmail = null; // track last logged-in email
let speechSynthesis = window.speechSynthesis;
let utterance = null;

// Global voice control and inactivity tracking
let voiceEnabled = true; // master toggle for TTS/STT
let silenceTimeoutId = null;
let lastUserInteractionAt = Date.now();
let lastAssistantSpokenAt = 0;
let initialGreetingSpoken = false;
const silencePrompts = {
  en: 'You can click the mic to talk, or type your question.',
  kn: 'ನೀವು ಮೈಕ್ರೋಫೋನ್ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ ಮಾತನಾಡಬಹುದು, ಅಥವಾ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಬಹುದು.'
};

// Image capture follow-up flow
let lastCapturedImageFile = null; // holds a File from camera/upload until user asks a question
let imageQuestionPending = false; // when true, next user message will be used to analyze the image

function recordInteraction() {
  lastUserInteractionAt = Date.now();
  // Cancel any pending one-shot silence prompt
  if (silenceTimeoutId) {
    try { clearTimeout(silenceTimeoutId); } catch (e) {}
    silenceTimeoutId = null;
  }
}


// Voice integration functions
// Initialize speech synthesis voices
function initVoices() {
  // Get available voices
  speechSynthesis.onvoiceschanged = () => {
    availableVoices = speechSynthesis.getVoices();
  };
  
  // Trigger initial load of voices
  availableVoices = speechSynthesis.getVoices();
}

// Get appropriate voice based on language
function getVoice(lang) {
  // Default to first available voice if none match
  let voice = availableVoices[0];
  
  // Try to find a matching voice for the language
  if (lang === 'kn') {
    // Look for Kannada voice (kn-IN)
    const kannadaVoice = availableVoices.find(v => v.lang === 'kn-IN' && v.gender === 'female') || 
                         availableVoices.find(v => v.lang === 'kn-IN') ||
                         availableVoices.find(v => v.lang.startsWith('kn'));
    if (kannadaVoice) voice = kannadaVoice;
  } else {
    // Look for Indian English voice (en-IN)
    const indianEnglishVoice = availableVoices.find(v => v.lang === 'en-IN' && v.gender === 'female') || 
                               availableVoices.find(v => v.lang === 'en-IN') ||
                               availableVoices.find(v => v.lang.startsWith('en'));
    if (indianEnglishVoice) voice = indianEnglishVoice;
  }
  
  return voice;
}

// Speak text using the appropriate voice
function speakText(text, lang) {
  // Stop any ongoing speech
  if (isSpeaking) {
    speechSynthesis.cancel();
  }
  
  // Create new utterance
  utterance = new SpeechSynthesisUtterance(text);
  
  // Set language and voice
  utterance.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
  utterance.voice = getVoice(lang);
  
  // Set event handlers
  utterance.onstart = () => {
    isSpeaking = true;
  };
  
  utterance.onend = () => {
    isSpeaking = false;
  };
  
  utterance.onerror = (event) => {
    console.error('SpeechSynthesis error:', event);
    isSpeaking = false;
  };
  
  // Speak the text
  speechSynthesis.speak(utterance);
}









