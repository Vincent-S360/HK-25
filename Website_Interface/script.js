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

// Initialize speech recognition
function initSpeechRecognition() {
  // Check if browser supports SpeechRecognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('Speech recognition not supported in this browser');
    return false;
  }
  
  // Create recognition instance
  recognition = new SpeechRecognition();
  
  // Configure recognition
  recognition.continuous = false;
  recognition.interimResults = false;
  
  // Set language based on current selection
  recognition.lang = currentPageLanguage === 'kn' ? 'kn-IN' : 'en-IN';
  
  // Set event handlers
  recognition.onstart = () => {
    isListening = true;
    micButton.classList.add('listening');
    showToast('Listening...', 'info');
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    
    // Auto-send after a short delay
    setTimeout(() => {
      if (messageInput.value.trim() === transcript.trim()) {
        sendMessage();
      }
    }, 1000);
  };
  
  recognition.onend = () => {
    isListening = false;
    micButton.classList.remove('listening');
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    micButton.classList.remove('listening');
    showToast('Could not recognize speech. Please try again.', 'error');
  };
  
  return true;
}

// Simple i18n translations for homepage content
const translations = {
  kn: {
    // Learn More / About
    learnMoreScroll: "ಸಲಹೆ ಬಗ್ಗೆ ಇನ್ನಷ್ಟು ತಿಳಿದುಕೊಳ್ಳಿ",
    aboutTitle: "ಸಲಹೆ ಕುರಿತು",
    aboutDescription:
      "ಸಲಹೆ ನಿಮ್ಮ ಬುದ್ಧಿವಂತ ಕೃಷಿ ಸಂಗಾತಿ. ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳಿಗೆ ಕ್ಷಿಪ್ರ ಉತ್ತರಗಳು, ವೈಯಕ್ತಿಕ ಸಲಹೆಗಳು ಮತ್ತು ಭಾವನಾತ್ಮಕ ಬೆಂಬಲವನ್ನು ಕನ್ನಡ ಮತ್ತು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ನೀಡುತ್ತದೆ.",
    purposeTitle: "ನಮ್ಮ ಉದ್ದೇಶ",
    purposeDescription:
      "ಬೆಳೆ ಉತ್ಪಾದನೆ ಹೆಚ್ಚಿಸಲು, ನಷ್ಟಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಲು, ಮತ್ತು ತಿಳಿದ ಕೃಷಿ ನಿರ್ಧಾರಗಳನ್ನು ಕೈಗೊಳ್ಳಲು ರೈತರಿಗೆ ಸುಲಭ, ನಂಬಿಕಸ್ಥ ಮತ್ತು ಸಮಯೋಚಿತ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸುವುದು.",
    visionTitle: "ನಮ್ಮ ದೃಷ್ಟಿ",
    visionDescription:
      "ಭಾರತದಾದ್ಯಂತ ರೈತರಿಗೆ ಅತ್ಯಂತ ನಂಬಿಕಸ್ಥ AI ಸಂಗಾತಿಯಾಗಿ, ಜ್ಞಾನ, ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ಬೆಂಬಲದಿಂದ ಶಾಶ್ವತ ಹಾಗೂ ಸಮೃದ್ಧ ಕೃಷಿ ಸಮುದಾಯಗಳನ್ನು ನಿರ್ಮಿಸುವುದು.",
    motiveTitle: "ನಮ್ಮ ಪ್ರೇರಣೆ",
    motiveDescription:
      "ಕೃಷಿ ಸಲಹೆಯ ಜೊತೆಗೆ ಭಾವನಾತ್ಮಕ ಸುಸ್ಥಿತಿ ಮತ್ತು ಮಾನಸಿಕ ಆರೋಗ್ಯ ಬೆಂಬಲವನ್ನು ನೀಡುವುದು, ರೈತರ ಜೀವನದ ಸವಾಲುಗಳನ್ನು ಗುರುತಿಸಿ ಸಹಾಯ ಮಾಡುವುದು.",
    // FAQ
    faqTitle: "ಪದೇಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು",
    faq1: "ಸಲಹೆ ಎಂದರೇನು? ಅದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?",
    faq1Answer:
      "ಸಲಹೆ AI ಆಧಾರಿತ ಕೃಷಿ ಸಂಗಾತಿಯಾಗಿದ್ದು, ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರ ನೀಡಿ, ಸಲಹೆ ನೀಡಿ, ಮತ್ತು ಕನ್ನಡ ಹಾಗೂ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಬೆಂಬಲ ನೀಡುತ್ತದೆ.",
    faq2: "ಸಲಹೆ ಯಾವ ಭಾಷೆಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ?",
    faq2Answer: "ಸಲಹೆ ಈಗ ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಕನ್ನಡ ಭಾಷೆಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ.",
    faq3: "ಟೈಪ್ ಮಾಡುವುದರ ಬದಲು ಧ್ವನಿ ಬಳಸಬಹುದೇ?",
    faq3Answer:
      "ಹೌದು! ನೀವು ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಬಹುದು. ಮೈಕ್ರೋಫೋನ್ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ, ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಹೇಳಿ, ಸಲಹೆ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತದೆ.",
    faq4: "ನಾನು ಯಾವ ವಿಷಯಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು?",
    faq4Answer:
      "ಬೆಳೆ ಆಯ್ಕೆ, ಕೀಟ ನಿಯಂತ್ರಣ, ಹವಾಮಾನ ಹೊಂದಿಕೆ, ಶಾಶ್ವತ ಕೃಷಿ ಪದ್ಧತಿಗಳು, ಮತ್ತು ಭಾವನಾತ್ಮಕ ಬೆಂಬಲ ಕುರಿತು ಕೇಳಬಹುದು.",
    faq5: "ಸಲಹೆ ಉಚಿತವೇ?",
    faq5Answer: "ಹೌದು, ಸಲಹೆ ಎಲ್ಲ ರೈತರಿಗೆ ಉಚಿತವಾಗಿದೆ.",
    faq6: "ಮಾಹಿತಿಯ ನಿಖರತೆ ಹೇಗಿದೆ?",
    faq6Answer:
      "ಸಲಹೆ ಕೃಷಿ ಉತ್ತಮ ಕ್ರಮಗಳು ಮತ್ತು ಸಂಶೋಧನೆ ಆಧಾರಿತ ಮಾಹಿತಿಯನ್ನು ನೀಡುತ್ತದೆ. ನಾವು ನಮ್ಮ ಜ್ಞಾನವನ್ನು ನಿರಂತರವಾಗಿ ನವೀಕರಿಸುತ್ತೇವೆ.",
    // CTA
    ctaTitle: "ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧವೇ?",
    ctaSubtitle:
      "ಸಲಹೆಯ ವೈಯಕ್ತಿಕ ಕೃಷಿ ಸಲಹೆಯಿಂದ ಪ್ರಯೋಜನ ಪಡೆಯುತ್ತಿರುವ ಸಾವಿರಾರು ರೈತರ ಜೊತೆ ಸೇರಿ",
    ctaButton: "ಈಗಲೇ ಸಲಹೆ ಬಳಸಿರಿ",
    // Chat UI
    back: "ಹಿಂತಿರುಗಿ",
    menu: "ಮೆನು",
    newChat: "ಹೊಸ ಚಾಟ್",
    chatHistory: "ಚಾಟ್ ಇತಿಹಾಸ",
    options: "ಆಯ್ಕೆಗಳು",
    clearHistory: "ಇತಿಹಾಸ ಅಳಿಸಿ",
    settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    deleteAccount: "ಖಾತೆ ಅಳಿಸಿ",
    chatGreeting:
      "ನಮಸ್ಕಾರ! ನಾನು ಸದಾ, ನಿಮ್ಮ ಕೃಷಿ ಸಂಗಾತಿ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    // Quick action labels
    qaCrop: "ಬೆಳೆ ಶಿಫಾರಸು",
    qaSchemes: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
    qaAgri: "ಕೃಷಿ ಸಲಹೆಗಳು",
    qaWeather: "ಹವಾಮಾನ ಆಧಾರಿತ ಬೆಳೆ ಸಲಹೆಗಳು",
    qaEmotional: "ಭಾವನಾತ್ಮಕ ಬೆಂಬಲ",
    qaProfit: "ಸ್ಮಾರ್ಟ್ ಲಾಭ ಲೆಕ್ಕಾಚಾರಕ",
    qaExport: "ರಫ್ತು ಮಾರುಕಟ್ಟೆಗಳು ಮತ್ತು ಖರೀದಿದಾರರು",
    qaExhort: "ರಫ್ತು ಆಗುವ ತರಕಾರಿ/ಬೆಳೆಗಳನ್ನು ಇಲ್ಲಿ ಬೆಳೆಸೋಣ",
    qaMarket: "ಮಾರುಕಟ್ಟೆ ಸಲಹೆ"
  },
  en: {
    qaMarket: 'Market Advice',
    // English falls back to initial DOM text; no overrides needed
  }
};

// Cache initial text for elements with data-translate so we can restore English
const i18nInitialText = {};
function cacheInitialTranslations() {
  document.querySelectorAll('[data-translate]').forEach((el) => {
    const key = el.getAttribute('data-translate');
    if (key && !(key in i18nInitialText)) {
      i18nInitialText[key] = el.textContent;
    }
  });
}

function applyPageLanguage(lang) {
  const elements = document.querySelectorAll('[data-translate]');
  if (lang === 'en') {
    elements.forEach((el) => {
      const key = el.getAttribute('data-translate');
      if (key && i18nInitialText[key] != null) {
        el.textContent = i18nInitialText[key];
      }
    });
    return;
  }
  const dict = translations[lang] || {};
  elements.forEach((el) => {
    const key = el.getAttribute('data-translate');
    if (key && dict[key]) {
      el.textContent = dict[key];
    }
  });
}

// Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const closeModal = document.querySelector('.close-modal');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
// Header auth controls
const headerLogin = document.getElementById('header-login');
const headerSignup = document.getElementById('header-signup');
const headerLogout = document.getElementById('header-logout');
const headerUser = document.getElementById('header-user');
// Chat header logout
const chatLogoutButton = document.getElementById('chat-logout-button');

// Auth state observer
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    ensureUserDoc();
    handleLoginDefaults();
    loadChatHistory();
    hideAuthModal();
    showToast(`Welcome ${user.displayName || user.email}!`, 'success');
    if (pendingChatOpen) {
      openChatInterface();
      pendingChatOpen = false;
    }
    updateAuthHeaderUI();
    loadChatHistoryList(); // Load chat history for sidebar
    previousUserEmail = user.email;
  } else {
    currentUser = null;
    currentChatId = null;
    updateAuthHeaderUI();
    loadChatHistoryList(); // Update sidebar with login message
  }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Cache initial translation texts and set language from selector
  cacheInitialTranslations();
  // Load persisted page language from localStorage if present
  const storedLang = localStorage.getItem('pageLanguage');
  if (pageLanguageSelect) {
    currentPageLanguage = storedLang || pageLanguageSelect.value || 'en';
    applyPageLanguage(currentPageLanguage);
    // Persist language preference when changed (for returning users)
    pageLanguageSelect.addEventListener('change', (e) => {
      currentPageLanguage = e.target.value || 'en';
      applyPageLanguage(currentPageLanguage);
      // Persist locally and to Firestore when logged in
      try { localStorage.setItem('pageLanguage', currentPageLanguage); } catch (e) {}
      if (currentUser) {
        db.collection('users').doc(currentUser.email).set({
          prefLanguage: currentPageLanguage
        }, { merge: true }).catch(err => console.error('Persist prefLanguage error:', err));
      }
      // Keep speech recognition language in sync
      if (recognition) {
        recognition.lang = currentPageLanguage === 'kn' ? 'kn-IN' : 'en-IN';
      }
    });
  }
  // Set initial timestamp
  initialTimestamp.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Setup hamburger menu
  setupHamburgerMenu();

  // Initialize connectivity badge
  try { initConnectivityBadge(); } catch (e) { console.warn('Connectivity badge init failed:', e); }

  // Initialize speech recognition
  initSpeechRecognition();
  
  // Get available voices for speech synthesis
  if ('speechSynthesis' in window) {
    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      availableVoices = window.speechSynthesis.getVoices();
    };
    // Try to get voices right away (for Firefox)
    availableVoices = window.speechSynthesis.getVoices();
  }
  
  // Voice On/Off toggle button
  const voiceToggleBtn = document.getElementById('voice-toggle');
  if (voiceToggleBtn) {
    voiceToggleBtn.addEventListener('click', () => {
      voiceEnabled = !voiceEnabled;
      // Update UI
      voiceToggleBtn.title = voiceEnabled ? 'Voice On' : 'Voice Off';
      voiceToggleBtn.innerHTML = voiceEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
      // If turning off, stop any ongoing speech and listening
      if (!voiceEnabled) {
        try { window.speechSynthesis.cancel(); isSpeaking = false; } catch (e) {}
        if (isListening && recognition) {
          try { recognition.stop(); } catch (e) {}
          isListening = false;
          updateMicButtonUI();
        }
        showToast('Voice disabled', 'info');
      } else {
        showToast('Voice enabled', 'info');
      }
    });
  }

  // Start button click (gated by auth)
  startButton.addEventListener('click', () => {
    if (currentUser) {
      openChatInterface();
    } else {
      pendingChatOpen = true;
      showAuthModal();
  }

  // Wire AI Test button (Firebase AI Logic SDK)
  const aiTestBtn = document.getElementById('header-ai-test');
  if (aiTestBtn) {
    aiTestBtn.addEventListener('click', async () => {
      try {
        if (!window.firebaseAI || !window.firebaseAI.runGeminiTest) {
          showToast('Firebase AI Logic not loaded', 'error');
          return;
        }
        showToast('Running AI test…', 'info');
        await window.firebaseAI.runGeminiTest();
      } catch (err) {
        console.error('AI test failed:', err);
        showToast('AI test failed', 'error');
      }
    });
  }

  // Quick actions click handlers
  qaCrop && qaCrop.addEventListener('click', () => handleQuickAction('crop'));
  qaSchemes && qaSchemes.addEventListener('click', () => handleQuickAction('schemes'));
  qaAgri && qaAgri.addEventListener('click', () => handleQuickAction('agri'));
  qaWeather && qaWeather.addEventListener('click', () => handleQuickAction('weather'));
  qaEmotional && qaEmotional.addEventListener('click', () => handleQuickAction('emotional'));
  qaProfit && qaProfit.addEventListener('click', () => handleQuickAction('profit'));
  qaExport && qaExport.addEventListener('click', () => handleQuickAction('export'));
  qaExhort && qaExhort.addEventListener('click', () => handleQuickAction('exhort'));
  qaMarket && qaMarket.addEventListener('click', () => handleQuickAction('market'));
});

  // CTA button click (gated by auth)
  ctaStartButton.addEventListener('click', () => {
    if (currentUser) {
      openChatInterface();
    } else {
      pendingChatOpen = true;
      showAuthModal();
    }
  });
  
  // Back button click
  backButton.addEventListener('click', () => {
    // Stop any ongoing speech and listening
    try { window.speechSynthesis.cancel(); isSpeaking = false; } catch (e) {}
    if (isListening && recognition) {
      try { recognition.stop(); } catch (e) {}
      isListening = false;
      updateMicButtonUI();
    }
    // Clear any pending silence prompt
    if (silenceTimeoutId) { try { clearTimeout(silenceTimeoutId); } catch (e) {} silenceTimeoutId = null; }
    // Reset greeting state so next entry greets afresh
    initialGreetingSpoken = false;
    chatInterface.classList.add('hidden');
    landingPage.classList.remove('hidden');
    showToast('Voice stopped. You can resume chat anytime.', 'info');
  });
  
  // Send button click
  sendButton.addEventListener('click', () => { recordInteraction(); sendMessage(); });
  
  // Enter key to send message
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      hideQuickActions();
      recordInteraction();
      sendMessage();
    }
  });
  // Hide quick actions as soon as user starts typing a custom message
  messageInput.addEventListener('input', (e) => {
    if (e.target.value && e.target.value.trim().length > 0) {
      hideQuickActions();
      recordInteraction();
    }
  });
  
  // Mic button click
  micButton.addEventListener('click', () => { recordInteraction(); toggleSpeechRecognition(); });
  
  // Plus button click -> toggle dropdown menu
  if (plusButton && plusMenu) {
    plusButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = plusMenu.classList.toggle('hidden');
      plusButton.setAttribute('aria-expanded', !isHidden);
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!plusButton.contains(e.target) && !plusMenu.contains(e.target)) {
        plusMenu.classList.add('hidden');
        plusButton.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Camera option click
    if (cameraOption) {
      cameraOption.addEventListener('click', async (e) => {
        e.stopPropagation();
        plusMenu.classList.add('hidden');
        plusButton.setAttribute('aria-expanded', 'false');
        // Try instant capture via MediaDevices; fallback to file input
        try {
          const blob = await captureStillViaCamera();
          if (blob) {
            // Build a File-like object for downstream flow
            const file = new File([blob], 'capture.jpg', { type: blob.type || 'image/jpeg' });
            await handleImageUpload(file, true);
            return;
          }
        } catch (e) {
          console.warn('Instant camera capture failed, falling back:', e);
        }
        try { 
          showToast('Select or take a photo', 'info', 2000); 
          cameraInput.click(); 
        } catch (e) {}
      });
    }
    
    // Upload option click
    if (uploadOption) {
      uploadOption.addEventListener('click', (e) => {
        e.stopPropagation();
        plusMenu.classList.add('hidden');
        plusButton.setAttribute('aria-expanded', 'false');
        fileInput.click();
      });
    }
    
    // Camera input change handler
    if (cameraInput) {
      cameraInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        await handleImageUpload(file, true);
        // Reset input so the same file can be reselected
        try { e.target.value = ''; } catch (e2) {}
      });
    }
    
    // File input change handler
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        await handleImageUpload(file, false);
        // Reset input so the same file can be reselected
        try { e.target.value = ''; } catch (e2) {}
      });
    }
  }
  
  // Language select change (removed from UI; keep guard)
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      currentLanguage = e.target.value;
      if (recognition) {
        recognition.lang = currentLanguage;
      }
    });
  }
  
  // Page language select change (sync chat speech language too)
  pageLanguageSelect.addEventListener('change', (e) => {
    currentPageLanguage = e.target.value;
    applyPageLanguage(currentPageLanguage);
    currentLanguage = currentPageLanguage === 'kn' ? 'kn-IN' : 'en-IN';
    if (recognition) {
      recognition.lang = currentLanguage;
    }
  });

  // FAQ accordion toggling
  document.querySelectorAll('.accordion-item').forEach((item) => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');
    if (trigger && content) {
      // Ensure fully expanded content remains readable by removing max-height after transition
      content.addEventListener('transitionend', (e) => {
        if (e.propertyName === 'max-height' && item.classList.contains('active')) {
          content.style.maxHeight = 'none';
        }
      });
      trigger.addEventListener('click', () => {
        const isActive = item.classList.toggle('active');
        if (isActive) {
          // Start with computed height to animate open, then transitionend sets to 'none'
          content.style.maxHeight = content.scrollHeight + 'px';
        } else {
          // If max-height is 'none', set current height first to enable closing animation
          const currentHeight = content.scrollHeight + 'px';
          content.style.maxHeight = currentHeight;
          requestAnimationFrame(() => {
            content.style.maxHeight = '0';
          });
        }
      });
    }
  });
    
  // Auth modal close
  closeModal.addEventListener('click', hideAuthModal);

  // Close modal when clicking on overlay (outside the card)
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
      hideAuthModal();
    }
  });
  
  // Close modal on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !authModal.classList.contains('hidden')) {
      hideAuthModal();
    }
  });

  // Header auth controls events
  headerLogin && headerLogin.addEventListener('click', () => {
    showAuthModal();
    setAuthTab('login');
  });

  headerSignup && headerSignup.addEventListener('click', () => {
    showAuthModal();
    setAuthTab('signup');
  });

  const doLogout = () => {
    auth.signOut().then(() => {
      showToast('Logged out successfully', 'info');
      // Stop any ongoing speech or listening
      try { window.speechSynthesis.cancel(); isSpeaking = false; } catch (e) {}
      if (isListening && recognition) {
        try { recognition.stop(); } catch (e) {}
        isListening = false;
        updateMicButtonUI();
      }
      // Clear any pending silence prompt
      if (silenceTimeoutId) { try { clearTimeout(silenceTimeoutId); } catch (e) {} silenceTimeoutId = null; }
      // Return to landing page if chat is open
      landingPage.classList.remove('hidden');
      chatInterface.classList.add('hidden');
    }).catch(err => showToast(err.message, 'error'));
  };
  
  headerLogout && headerLogout.addEventListener('click', doLogout);
  chatLogoutButton && chatLogoutButton.addEventListener('click', doLogout);
  

  
  // Auth tabs
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      authTabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding form
      const tabName = tab.dataset.tab;
      if (tabName === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
      }
    });
  });
  
  // Login button click
  loginButton.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    const success = await loginUser(email, password);
    if (success) {
      hideAuthModal();
    }
  });
  
  // Signup button click
  signupButton.addEventListener('click', async () => {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (!name || !email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    const success = await signupUser(name, email, password);
    if (success) {
      hideAuthModal();
    }
  });
});

// Authentication functions
function showAuthModal() {
  authModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function hideAuthModal() {
  authModal.classList.add('hidden');
  document.body.style.overflow = 'auto'; // Re-enable scrolling
}

function setAuthTab(tab) {
  authTabs.forEach(t => t.classList.remove('active'));
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
    loginTab && loginTab.classList.add('active');
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    const signupTab = document.querySelector('.auth-tab[data-tab="signup"]');
    signupTab && signupTab.classList.add('active');
  }
}

function updateAuthHeaderUI() {
  if (currentUser) {
    if (headerUser) {
      headerUser.textContent = currentUser.displayName || currentUser.email;
      headerUser.classList.remove('hidden');
    }
    headerLogin && headerLogin.classList.add('hidden');
    headerSignup && headerSignup.classList.add('hidden');
    headerLogout && headerLogout.classList.remove('hidden');
    chatLogoutButton && chatLogoutButton.classList.remove('hidden');
  } else {
    headerUser && headerUser.classList.add('hidden');
    headerLogin && headerLogin.classList.remove('hidden');
    headerSignup && headerSignup.classList.remove('hidden');
    headerLogout && headerLogout.classList.add('hidden');
    chatLogoutButton && chatLogoutButton.classList.add('hidden');
  }
}

// Login function
async function loginUser(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}

// Signup function
async function signupUser(name, email, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({
      displayName: name
    });
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  // Remove toast after duration
  if (duration !== Infinity) {
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
  
  return toast;
}

// Helper to open chat interface after login
function openChatInterface() {
  landingPage.classList.add('hidden');
  chatInterface.classList.remove('hidden');
  if (ctaSection) ctaSection.classList.add('hidden');
  if (siteFooter) siteFooter.classList.add('hidden');
  
  // Ensure the initial greeting is visible
  ensureInitialGreeting();
  
  // Always start a fresh chat with greeting when entering chat from landing
  try { startNewChat(); } catch (e) { console.warn('startNewChat failed on open:', e); }
  // Show quick actions when chat opens fresh
  showQuickActions();
  // Start/refresh inactivity watcher and timestamp
  recordInteraction();
  // Attempt to speak the static initial greeting once when chat opens
  try {
    if (voiceEnabled && !initialGreetingSpoken) {
      const initialMessage = document.querySelector('#messages-container .assistant-message .message-bubble p[data-translate="chatGreeting"]');
      if (initialMessage && initialMessage.textContent) {
        speakText(initialMessage.textContent, currentPageLanguage);
        initialGreetingSpoken = true;
      }
    }
  } catch (e) {}
}

// Ensure initial greeting is always present
function ensureInitialGreeting() {
  const messagesContainer = document.getElementById('messages-container');
  const existingGreeting = messagesContainer.querySelector('.assistant-message');
  
  if (!existingGreeting) {
    // Create the initial greeting if it doesn't exist
    const greetingHTML = `
      <div class="message assistant-message">
        <div class="avatar assistant-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          <div class="message-bubble">
            <p data-translate="chatGreeting">Hello! I am Sada, your farming companion. How can I help you today?</p>
          </div>
          <span class="timestamp" id="initial-timestamp"></span>
        </div>
      </div>
    `;
    messagesContainer.insertAdjacentHTML('afterbegin', greetingHTML);
    
    // Apply current language translation
    applyPageLanguage(currentPageLanguage);
  }
}

// Hamburger Menu Functions
function setupHamburgerMenu() {
  const hamburgerMenu = document.getElementById('hamburger-menu');
  const sidebarMenu = document.getElementById('sidebar-menu');
  const closeSidebar = document.getElementById('close-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const newChatButton = document.getElementById('new-chat');
  const clearHistoryButton = document.getElementById('clear-history');
  const settingsButton = document.getElementById('settings-button');
  const deleteAccountButton = document.getElementById('delete-account');
  
  // Toggle sidebar when hamburger icon is clicked
  hamburgerMenu.addEventListener('click', function() {
    toggleSidebar();
  });
  
  // Close sidebar when close button is clicked
  closeSidebar.addEventListener('click', function() {
    toggleSidebar(false);
  });
  
  // Close sidebar when overlay is clicked
  sidebarOverlay.addEventListener('click', function() {
    toggleSidebar(false);
  });
  
  // New chat button functionality
  newChatButton.addEventListener('click', function() {
    startNewChat();
    toggleSidebar(false);
  });
  
  // Clear history button functionality
  clearHistoryButton.addEventListener('click', function() {
    clearChatHistory();
    toggleSidebar(false);
  });
  
  // Settings button functionality
  settingsButton.addEventListener('click', function() {
    showToast('Settings feature coming soon');
    toggleSidebar(false);
  });
  // Delete Account button functionality
  if (deleteAccountButton) {
    deleteAccountButton.addEventListener('click', async function() {
      toggleSidebar(false);
      try { await deleteAccountFlow(); } catch (e) { console.error('Delete account flow error:', e);} 
    });
  }
  
  // Load chat history initially
  loadChatHistoryList();
}

function toggleSidebar(show) {
  const sidebarMenu = document.getElementById('sidebar-menu');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  if (show === undefined) {
    sidebarActive = !sidebarActive;
  } else {
    sidebarActive = show;
  }
  
  if (sidebarActive) {
    sidebarMenu.classList.remove('hidden');
    sidebarOverlay.classList.remove('hidden');
    setTimeout(() => {
      sidebarMenu.classList.add('active');
      sidebarOverlay.classList.add('active');
    }, 10);
  } else {
    sidebarMenu.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    setTimeout(() => {
      sidebarMenu.classList.add('hidden');
      sidebarOverlay.classList.add('hidden');
    }, 300);
  }
}

async function startNewChat() {
  // Clear the messages container except for the initial greeting
  const messagesContainer = document.getElementById('messages-container');
  // Preserve initial greeting and quick action bubbles
  const firstMessage = messagesContainer.firstElementChild;
  const quickActionsEl = document.getElementById('quick-actions');
  // Clear container, then re-append preserved nodes
  messagesContainer.innerHTML = '';
  if (firstMessage) {
    messagesContainer.appendChild(firstMessage);
  }
  if (quickActionsEl) {
    messagesContainer.appendChild(quickActionsEl);
  }
  currentChatId = null; // reset chat session so a new chat doc is created on next send
  // Reset greeting spoken flag so voice can greet again
  initialGreetingSpoken = false;
  
  // Persist and render a fresh greeting as an assistant message
  try {
    const greeting = getGreetingForLanguage(currentPageLanguage || 'en');
    // Persist only; avoid duplicating the static greeting bubble in UI
    await persistChatAndMessage('assistant', greeting);
  } catch (e) {
    console.warn('Failed to persist/render greeting for new chat:', e);
  }
  
  showToast('Started a new chat');
  try { showQuickActions(); } catch (e) {}
}

function clearChatHistory() {
  if (currentUser) {
    db.collection('users').doc(currentUser.email).collection('chats').get()
      .then((snapshot) => {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      })
      .then(() => {
        showToast('Chat history cleared');
        loadChatHistoryList();
      })
      .catch((error) => {
        console.error('Error clearing chat history:', error);
        showToast('Failed to clear chat history');
      });
  } else {
    showToast('Please login to manage chat history');
  }
}

// Delete Account flow with confirmation and cleanup
async function deleteAccountFlow() {
  if (!currentUser) {
    showToast('Please login to delete your account', 'error');
    return;
  }
  const isKannada = (currentPageLanguage === 'kn');
  const warnTitle = isKannada ? 'ಎಚ್ಚರಿಕೆ' : 'Warning';
  const warnMessage = isKannada
    ? 'ಇದು ನಿಮ್ಮ ಖಾತೆ ಮತ್ತು ಎಲ್ಲಾ ಚಾಟ್ ಇತಿಹಾಸವನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸುತ್ತದೆ. ಇದನ್ನು ಹಿಂದಿರುಗಿಸಲಾಗುವುದಿಲ್ಲ. ನೀವು ಖಚಿತವೇ?'
    : 'This will permanently delete your account and all chat history. This cannot be undone. Are you sure?';
  const proceed = window.confirm(`${warnTitle}: ${warnMessage}`);
  if (!proceed) {
    showToast(isKannada ? 'ಅಳಿಸುವಿಕೆ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ' : 'Deletion cancelled', 'info');
    return;
  }

  try {
    // Delete Firestore chats and messages
    const userRef = db.collection('users').doc(currentUser.email);
    const chatsSnap = await userRef.collection('chats').get();
    for (const chatDoc of chatsSnap.docs) {
      const msgsSnap = await chatDoc.ref.collection('messages').get();
      const batch = db.batch();
      msgsSnap.docs.forEach(m => batch.delete(m.ref));
      await batch.commit();
      await chatDoc.ref.delete();
    }
    // Delete user doc
    await userRef.delete().catch(() => {});

    // Delete auth user (may require recent login)
    await auth.currentUser.delete();
    showToast(isKannada ? 'ಖಾತೆ ಅಳಿಸಲಾಗಿದೆ' : 'Account deleted', 'success');
    // Cleanup UI and state
    try {
      window.speechSynthesis.cancel(); isSpeaking = false;
      if (isListening && recognition) { try { recognition.stop(); } catch (e) {} isListening = false; updateMicButtonUI(); }
    } catch (e) {}
    // Sign out and return to landing
    try { await auth.signOut(); } catch (e) {}
    landingPage.classList.remove('hidden');
    chatInterface.classList.add('hidden');
  } catch (err) {
    console.error('Delete account error:', err);
    if (String(err && err.code).includes('requires-recent-login')) {
      showToast(isKannada ? 'ದಯವಿಟ್ಟು ಮರುಲಾಗಿನ್ ಮಾಡಿ ನಂತರ ಪುನಃ ಪ್ರಯತ್ನಿಸಿ' : 'Please re-login and try again', 'error');
    } else {
      showToast(isKannada ? 'ಖಾತೆ ಅಳಿಸಲು ವಿಫಲವಾಗಿದೆ' : 'Failed to delete account', 'error');
    }
  }
}

function loadChatHistoryList() {
  const chatHistoryList = document.getElementById('chat-history-list');
  
  // Clear existing history items
  chatHistoryList.innerHTML = '';
  
  if (!currentUser) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-history-message';
    emptyMessage.textContent = 'Login to see your chat history';
    chatHistoryList.appendChild(emptyMessage);
    return;
  }
  
  // Get chat history from Firestore
  db.collection('users').doc(currentUser.email).collection('chats')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-history-message';
        emptyMessage.textContent = 'No chat history yet';
        chatHistoryList.appendChild(emptyMessage);
        return;
      }
      
      snapshot.forEach((doc) => {
        const chatData = doc.data();
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-history-item';
        chatItem.dataset.chatId = doc.id;
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-comment';
        
        const text = document.createElement('span');
        // Use the first message or a default text
        const chatDate = chatData.timestamp ? new Date(chatData.timestamp.toDate()).toLocaleDateString() : 'Unknown date';
        text.textContent = chatData.title || 'Chat ' + chatDate;
        
        chatItem.appendChild(icon);
        chatItem.appendChild(text);
        
        // Add click event to load this chat
        chatItem.addEventListener('click', () => {
          showToast('Loading chat...');
          currentChatId = chatItem.dataset.chatId;
          toggleSidebar(false);
          renderChatById(currentChatId);
        });
        
        chatHistoryList.appendChild(chatItem);
      });
    })
    .catch((error) => {
      console.error('Error loading chat history:', error);
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-history-message';
      emptyMessage.textContent = 'Failed to load chat history';
      chatHistoryList.appendChild(emptyMessage);
    });
}

// Initialize Speech Recognition
function initSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLanguage;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      hideQuickActions();
      messageInput.value = transcript;
      isListening = false;
      updateMicButtonUI();
      showToast('Voice captured!', 'success');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isListening = false;
      updateMicButtonUI();
      showToast('Voice input failed. Please try again.', 'error');
    };

    recognition.onend = () => {
      isListening = false;
      updateMicButtonUI();
    };
  } else {
    micButton.style.display = 'none';
    showToast('Speech recognition not supported. Please use Chrome or Edge.', 'error');
  }
}

// Toggle speech recognition
function toggleSpeechRecognition() {
  if (!recognition) {
    initSpeechRecognition();
  }
  
  if (isListening) {
    recognition.stop();
    isListening = false;
  } else {
    hideQuickActions();
    recognition.lang = currentLanguage;
    recognition.start();
    isListening = true;
    showToast('Listening...', 'info');
  }
  
  updateMicButtonUI();
}

// Update mic button UI based on listening state
function updateMicButtonUI() {
  if (isListening) {
    micButton.classList.add('active');
    micButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  } else {
    micButton.classList.remove('active');
    micButton.innerHTML = '<i class="fas fa-microphone"></i>';
  }
}

// Send message function
async function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  hideQuickActions();
  // Add user message to UI
  addUserMessage(message);
  // Persist the user message to Firestore
  persistChatAndMessage('user', message);
  
  // Clear input
  messageInput.value = '';
  
  // Show typing indicator
  showTypingIndicator();
  
  try {
    let response;
    // If we have a pending image question, analyze image + question together
    if (imageQuestionPending && lastCapturedImageFile) {
      response = await analyzeImageWithGeminiWithQuestion(lastCapturedImageFile, message);
      // Clear the pending state after using once
      imageQuestionPending = false;
      lastCapturedImageFile = null;
    } else {
      // Get AI response from backend
      response = await getAIResponse(message);
    }
    hideTypingIndicator();
    addAssistantMessage(response);
    // Persist assistant response
    persistChatAndMessage('assistant', response);
  } catch (error) {
    console.error('Error getting AI response:', error);
    hideTypingIndicator();
    const fallbackResponse = getFallbackResponse();
    addAssistantMessage(fallbackResponse);
    persistChatAndMessage('assistant', fallbackResponse);
  }
}

// Add user message to UI
function addUserMessage(message) {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message';
  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-bubble">
        <p>${message}</p>
      </div>
      <span class="timestamp">${timestamp}</span>
    </div>
    <div class="avatar user-avatar">
      <i class="fas fa-user"></i>
    </div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Event delegation for profit form submit button
document.addEventListener('click', async (e) => {
  const btn = e.target && e.target.closest('button[data-role="profit-submit"]');
  if (!btn) return;
  const targetId = btn.getAttribute('data-target');
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  try {
    const getVal = (name) => {
      const el = tbody.querySelector(`[name="${name}"]`);
      return el ? el.value : '';
    };
    const payload = {
      cropName: getVal('cropName'),
      areaInAcres: parseFloat(getVal('areaInAcres') || '1'),
      seedCost: parseFloat(getVal('seedCost') || '0'),
      fertilizerCost: parseFloat(getVal('fertilizerCost') || '0'),
      irrigationCost: parseFloat(getVal('irrigationCost') || '0'),
      laborCost: parseFloat(getVal('laborCost') || '0'),
      yieldPerAcre: getVal('yieldPerAcre') ? parseFloat(getVal('yieldPerAcre')) : undefined,
      location: getVal('location') || 'Karnataka'
    };
    showTypingIndicator();
    const resp = await fetch(`${API_BASE}/api/profit-calculator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    hideTypingIndicator();
    if (!resp.ok || !data || !data.success) {
      addAssistantMessage(getFallbackResponse());
      return;
    }
    if (data.type === 'single') {
      const r = data.data || {};
      const totalCost = (r.costs && r.costs.totalCost) || 0;
      const totalRevenue = (r.market && r.market.totalRevenue) || 0;
      const netProfit = (r.profit && r.profit.netProfit) || 0;
      const roi = (r.profit && r.profit.roi) || 0;
      const summary = `Result for ${r.cropName || payload.cropName || 'crop'} (${r.areaInAcres || payload.areaInAcres} acres)\n\n` +
        `Estimated Cost: ₹${totalCost.toLocaleString()}\n` +
        `Estimated Revenue: ₹${totalRevenue.toLocaleString()}\n` +
        `Estimated Profit: ₹${netProfit.toLocaleString()}\n` +
        `ROI: ${Number(roi).toFixed(1)}%`;
      addAssistantMessage(summary);
      persistChatAndMessage('assistant', summary);
    } else if (data.type === 'comparison') {
      const lines = ['Comparison Results:'];
      (data.data || []).forEach((row) => {
        lines.push(`${row.cropName}: Profit ₹${(row.netProfit || 0).toLocaleString()} | ROI ${(row.roiPercent || 0).toFixed(1)}%`);
      });
      const txt = lines.join('\n');
      addAssistantMessage(txt);
      persistChatAndMessage('assistant', txt);
    }
  } catch (err) {
    console.error('Profit submit error:', err);
    hideTypingIndicator();
    addAssistantMessage(getFallbackResponse());
  }
});

// Add assistant message to UI
function addAssistantMessage(message) {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant-message';
  messageDiv.innerHTML = `
    <div class="avatar assistant-avatar">
      <i class="fas fa-robot"></i>
    </div>
    <div class="message-content">
      <div class="message-bubble">
        <p>${message}</p>
      </div>
      <span class="timestamp">${timestamp}</span>
    </div>
  `;
  
  // Add click event to replay speech
  const messageBubble = messageDiv.querySelector('.message-bubble');
  messageBubble.style.cursor = 'pointer';
  messageBubble.addEventListener('click', () => {
    speakText(message, currentPageLanguage);
  });
  
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
  // Auto-speak assistant reply when voice is enabled and chat is visible
  try {
    const chatOpen = !chatInterface.classList.contains('hidden');
    if (voiceEnabled && chatOpen && typeof speakText === 'function') {
      speakText(message, currentPageLanguage);
    }
  } catch (e) {}
}

// Render Smart Profit Calculator input as an inline table-form in a chat bubble
function renderProfitCalculatorForm() {
  const formId = 'profit-form-' + Date.now();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isKannada = currentPageLanguage === 'kn';
  const label = (en, kn) => (isKannada ? kn : en);
  const html = `
    <div class="message assistant-message">
      <div class="avatar assistant-avatar"><i class="fas fa-robot"></i></div>
      <div class="message-content">
        <div class="message-bubble">
          <div style="overflow:auto;max-width:100%;">
            <table style="border-collapse:collapse;width:100%;min-width:520px;">
              <tbody id="${formId}">
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Crop Name','ಬೆಳೆ ಹೆಸರು')}</td>
                  <td style="padding:6px 8px;"><input type="text" name="cropName" placeholder="e.g., rice" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Area (acres)','ಪ್ರದೇಶ (ಎಕರೆ)')}</td>
                  <td style="padding:6px 8px;"><input type="number" step="0.01" name="areaInAcres" placeholder="1" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Seed Cost','ಬೀಜ ವೆಚ್ಚ')}</td>
                  <td style="padding:6px 8px;"><input type="number" step="0.01" name="seedCost" placeholder="4000" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Fertilizer Cost','ಗೊಬ್ಬರ ವೆಚ್ಚ')}</td>
                  <td style="padding:6px 8px;"><input type="number" step="0.01" name="fertilizerCost" placeholder="10000" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Irrigation Cost','ನೀರಾವರಿ ವೆಚ್ಚ')}</td>
                  <td style="padding:6px 8px;"><input type="number" step="0.01" name="irrigationCost" placeholder="8000" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Labor Cost','ಕಾರ್ಮಿಕ ವೆಚ್ಚ')}</td>
                  <td style="padding:6px 8px;"><input type="number" step="0.01" name="laborCost" placeholder="12000" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Yield per acre (optional)','ಪ್ರತಿ ಎಕರೆಗೆ ಉತ್ಪಾದನೆ (ಐಚ್ಛಿಕ)')}</td>
                  <td style="padding:6px 8px;"><input type="number" step="0.01" name="yieldPerAcre" placeholder="50" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:600;">${label('Location','ಸ್ಥಳ')}</td>
                  <td style="padding:6px 8px;"><input type="text" name="location" placeholder="Karnataka" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"/></td>
                </tr>
                <tr>
                  <td></td>
                  <td style="padding:8px 8px;">
                    <button data-role="profit-submit" data-target="${formId}" style="background:#16a34a;color:#fff;border:none;border-radius:9999px;padding:10px 14px;cursor:pointer;">
                      ${label('Calculate Profit','ಲಾಭ ಲೆಕ್ಕ ಹಾಕಿ')}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <span class="timestamp">${timestamp}</span>
      </div>
    </div>`;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  // Append after quick-actions (so it appears right away)
  messagesContainer.appendChild(wrapper.firstElementChild);
  scrollToBottom();
}

// Add a user image bubble to UI
function addUserImageMessage(objectUrl) {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message';
  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-bubble">
        <img src="${objectUrl}" alt="Uploaded photo" style="max-width:220px;border-radius:10px;display:block;" />
      </div>
      <span class="timestamp">${timestamp}</span>
    </div>
    <div class="avatar user-avatar">
      <i class="fas fa-user"></i>
    </div>
  `;
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Scroll to bottom of messages container
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Load chat history from Firestore
function loadChatHistory() {
  if (!currentUser) return;
  
  try {
    // Placeholder for chat history loading
    showToast('Loading chat history...', 'info');
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

// Ensure user document exists (keyed by email as requested)
function ensureUserDoc() {
  if (!currentUser) return;
  const userDocRef = db.collection('users').doc(currentUser.email);
  userDocRef.set({
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(err => console.error('ensureUserDoc error:', err));
}

// Create chat doc if needed and persist message to subcollection
async function persistChatAndMessage(role, text) {
  if (!currentUser) {
    showToast('Please login to save chat history');
    return;
  }
  try {
    // Create chat doc if none exists for current session
    if (!currentChatId) {
      // Do not create a chat doc from assistant-only messages (e.g., initial greeting)
      if (role !== 'user') {
        return;
      }
      const title = (text && text.length > 40) ? text.slice(0, 40) + '…' : (text || 'Chat');
      const chatDoc = await db.collection('users').doc(currentUser.email)
        .collection('chats').add({
          title,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          language: currentPageLanguage || 'en'
        });
      currentChatId = chatDoc.id;
      // Refresh history list UI
      loadChatHistoryList();
    }
    // Add message to messages subcollection
    await db.collection('users').doc(currentUser.email)
      .collection('chats').doc(currentChatId)
      .collection('messages').add({
        role,
        text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('persistChatAndMessage error:', error);
  }
}

// Render a chat by its ID from Firestore
async function renderChatById(chatId) {
  if (!currentUser || !chatId) return;
  try {
    // Clear current messages except the greeting
    const firstMessage = messagesContainer.firstElementChild;
    messagesContainer.innerHTML = '';
    if (firstMessage) messagesContainer.appendChild(firstMessage);
    
    const msgsSnap = await db.collection('users').doc(currentUser.email)
      .collection('chats').doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();
    msgsSnap.forEach(doc => {
      const m = doc.data();
      if (m.role === 'user') {
        addUserMessage(m.text);
      } else {
        addAssistantMessage(m.text);
      }
    });
    scrollToBottom();
  } catch (error) {
    console.error('renderChatById error:', error);
    showToast('Failed to load chat');
  }
}

// Ensure UI defaults and greet first-time users
async function handleLoginDefaults() {
  try {
    if (!currentUser) return;
    const email = currentUser.email;

    // Apply default UI language to English on login unless user has a preference
    let preferred = 'en';
    const userDocRef = db.collection('users').doc(email);
    const userSnap = await userDocRef.get();
    if (userSnap.exists && userSnap.data().prefLanguage) {
      preferred = userSnap.data().prefLanguage;
    }

    // Reflect in UI and state
    const pageLanguageSelect = document.getElementById('page-language-select');
    currentPageLanguage = preferred;
    if (pageLanguageSelect) pageLanguageSelect.value = preferred;
    applyPageLanguage(preferred);

    // Default voice recognition/synthesis language to match UI (English default)
    currentLanguage = preferred === 'kn' ? 'kn-IN' : 'en-IN';
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) languageSelect.value = currentLanguage;

    // If this user has no chats yet, start a new chat and greet
    const chatsSnap = await userDocRef.collection('chats').limit(1).get();
    if (chatsSnap.empty) {
      startNewChat();
      const greeting = getGreetingForLanguage(preferred);
      // Persist only; UI already has the initial greeting bubble
      await persistChatAndMessage('assistant', greeting);
      showQuickActions();
    }
  } catch (err) {
    console.error('handleLoginDefaults error:', err);
  }
}

function getGreetingForLanguage(lang) {
  try {
    if (lang === 'kn') {
      // Use the translated Kannada greeting
      return (translations && translations.kn && translations.kn.chatGreeting) 
        || 'ನಮಸ್ಕಾರ! ನಾನು ಸದಾ, ನಿಮ್ಮ ಕೃಷಿ ಸಂಗಾತಿ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?';
    }
    // Use the initial DOM English greeting if available, else fallback
    const node = document.querySelector('p[data-translate="chatGreeting"]');
    return (node && node.textContent) || 'Hello! I am Sada, your farming companion. How can I help you today?';
  } catch (e) {
    return 'Hello! I am Sada, your farming companion. How can I help you today?';
  }
}

// Quick actions helpers
function showQuickActions() {
  if (quickActions) {
    quickActions.classList.remove('hidden');
  }
}

function hideQuickActions() {
  if (quickActions) {
    quickActions.classList.add('hidden');
  }
}

function handleQuickAction(type) {
  // Hide bubbles once a domain is chosen
  hideQuickActions();

  const isKannada = currentPageLanguage === 'kn';

  const promptsEn = {
    crop:
      "To recommend a crop, please share: location (district/state), soil type, available irrigation, season/month, and any constraints (budget, land size).",
    schemes:
      "To find relevant government schemes, please provide: state, crop or activity (e.g., irrigation, seeds, machinery), farmer category (small/marginal), and any specific need.",
    agri:
      "For agricultural suggestions, please tell me: crop, growth stage, issue or goal (yield, pest, disease), and recent practices used.",
    weather:
      "For weather-based advice, please share: your location, crop, field condition (irrigation/drainage), and the time window you care about (next 3–7 days).",
    emotional:
      "I'm here to listen. You can share what's on your mind or any stress you're facing. Would you like gentle tips, resources, or just someone to hear you?",
    profit:
      "For profit calculation, please share: crop name, area (acres), seed cost, fertilizer cost, irrigation cost, labor cost, yield per acre (optional), and location. I'll calculate profit margin and ROI based on current market rates.",
    export:
      "For export guidance, please share: commodity (e.g., Alphonso mango, grapes), quantity, your state/district, and preferred market (domestic wholesale/export). I will provide buyer platforms, mandi/export links, and documentation steps.",
    exhort:
      "To help you replace expensive imports by growing locally, please share: your state/district, land size and soil type, water availability, current crops, and what crop/vegetable you are interested in. I will suggest high-value import-substitute crops for your area, give cost-benefit vs importing, step-by-step cultivation and where to sell locally.",
    market:
      "For market price information, please tell me the crop you want to sell."
  };

  const promptsKn = {
    crop:
      "ಬೆಳೆ ಶಿಫಾರಸು ಮಾಡಲು: ಸ್ಥಳ (ಜಿಲ್ಲೆ/ರಾಜ್ಯ), ಮಣ್ಣಿನ ಪ್ರಕಾರ, ಲಭ್ಯ ನೀರಾವರಿ, ಋತು/ತಿಂಗಳು, ಮತ್ತು ಯಾವುದೇ ನಿರ್ಬಂಧಗಳು (ಬಜೆಟ್, ಜಮೀನು ಗಾತ್ರ) ತಿಳಿಸಿ.",
    schemes:
      "ಸರ್ಕಾರಿ ಯೋಜನೆ ಹುಡುಕಲು: ರಾಜ್ಯ, ಬೆಳೆ/ಕ್ರಿಯೆ (ಉದಾ: ನೀರಾವರಿ, ಬೀಜ, ಯಂತ್ರೋಪಕರಣ), ರೈತರ ವರ್ಗ (ಸಣ್ಣ/ಕನಿಷ್ಠ), ಮತ್ತು ನಿಮ್ಮ ವಿಶೇಷ ಅಗತ್ಯಗಳನ್ನು ತಿಳಿಸಿ.",
    agri:
      "ಕೃಷಿ ಸಲಹೆಗೆ: ಬೆಳೆ, ಬೆಳವಣಿಗೆ ಹಂತ, ಸಮಸ್ಯೆ ಅಥವಾ ಗುರಿ (ಉತ್ಪಾದನೆ, ಕೀಟ, ರೋಗ), ಮತ್ತು ಇತ್ತೀಚಿನ ಪದ್ಧತಿಗಳು ತಿಳಿಸಿ.",
    weather:
      "ಹವಾಮಾನ ಆಧಾರಿತ ಸಲಹೆಗೆ: ನಿಮ್ಮ ಸ್ಥಳ, ಬೆಳೆ, ಹೊಲದ ಸ್ಥಿತಿ (ನೀರಾವರಿ/ನಿಷ್ಕಾಸ), ಮತ್ತು ಸಮಯಾವಧಿ (ಮುಂದಿನ 3–7 ದಿನಗಳು) ತಿಳಿಸಿ.",
    emotional:
      "ನಾನು ಕೇಳಲು ಇಲ್ಲಿದ್ದೇನೆ. ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿರುವುದು ಅಥವಾ ಒತ್ತಡವನ್ನು ಹಂಚಿಕೊಳ್ಳಬಹುದು. ಮೃದುವಾದ ಸಲಹೆಗಳು, ಸಂಪನ್ಮೂಲಗಳು ಅಥವಾ ಕೇವಲ ಕೇಳುವವರನ್ನು ಬಯಸುವಿರಾ?",
    profit:
      "ಲಾಭ ಲೆಕ್ಕಾಚಾರಕ್ಕಾಗಿ: ಬೆಳೆ ಹೆಸರು, ಪ್ರದೇಶ (ಎಕರೆ), ಬೀಜ ವೆಚ್ಚ, ಗೊಬ್ಬರ ವೆಚ್ಚ, ನೀರಾವರಿ ವೆಚ್ಚ, ಕಾರ್ಮಿಕ ವೆಚ್ಚ, ಪ್ರತಿ ಎಕರೆಗೆ ಉತ್ಪಾದನೆ (ಐಚ್ಛಿಕ), ಮತ್ತು ಸ್ಥಳ ತಿಳಿಸಿ. ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ದರಗಳ ಆಧಾರದ ಮೇಲೆ ನಾನು ಲಾಭ ಮಾರ್ಜಿನ್ ಮತ್ತು ROI ಲೆಕ್ಕಾಚಾರ ಮಾಡುತ್ತೇನೆ.",
    export:
      "ರಫ್ತು ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ: ವಸ್ತು (ಉದಾ., ಆಲ್ಫೋನ್ಸೊ ಮಾವು, ದ್ರಾಕ್ಷಿ), ಪ್ರಮಾಣ, ನಿಮ್ಮ ರಾಜ್ಯ/ಜಿಲ್ಲೆ, ಮತ್ತು ಗುರಿ ಮಾರುಕಟ್ಟೆ (ದೇಶೀಯ ಮಂಝಿ/ರಫ್ತು) ತಿಳಿಸಿ. ಖರೀದಿದಾರರ ವೇದಿಕೆಗಳು, ಮಂಝಿ/ರಫ್ತು ಲಿಂಕುಗಳು ಮತ್ತು ದಾಖಲೆ ಹಂತಗಳನ್ನು ನೀಡುತ್ತೇನೆ.",
    exhort:
      "ಭಾರತಕ್ಕೆ ದುಬಾರಿ ಆಮದು ಆಗುವ ಬೆಳೆ/ತರಕಾರಿಗಳನ್ನು ಇಲ್ಲಿ ಸ್ಥಳೀಯವಾಗಿ ಬೆಳೆಯಲು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು: ನಿಮ್ಮ ರಾಜ್ಯ/ಜಿಲ್ಲೆ, ಜಮೀನು ಗಾತ್ರ ಮತ್ತು ಮಣ್ಣಿನ ಪ್ರಕಾರ, ನೀರಾವರಿ ಲಭ್ಯತೆ, ಈಗ ಬೆಳೆಸುತ್ತಿರುವ ಬೆಳೆಗಳು, ಮತ್ತು ಯಾವ ಬೆಳೆ/ತರಕಾರಿಯಲ್ಲಿ ಆಸಕ್ತಿ ಇದೆ ಎಂಬುದನ್ನು ಹೇಳಿ. ನಿಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ ಸೂಕ್ತವಾದ ಅತ್ಯಂತ ಲಾಭದಾಯಕ ಸ್ಥಳೀಯ ಬೆಳೆಗಳನ್ನು ಶಿಫಾರಸು ಮಾಡಿ, ಆಮದುಗೆ ಹೋಲಿಕೆ ಮಾಡಿದಾಗ ಲಾಭ, ಹಂತ ಹಂತದ ಬೆಳೆ ಮಾರ್ಗದರ್ಶನ ಮತ್ತು ಸ್ಥಳೀಯವಾಗಿ ಮಾರಾಟ ಮಾಡುವ ಸ್ಥಳಗಳನ್ನು ತಿಳಿಸುತ್ತೇನೆ.",
    market:
      "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಮಾಹಿತಿಗಾಗಿ, ದಯವಿಟ್ಟು ನೀವು ಮಾರಾಟ ಮಾಡಲು ಬಯಸುವ ಬೆಳೆಯನ್ನು ತಿಳಿಸಿ."
  };

  const openerEn = {
    crop: "Crop Recommendation",
    schemes: "Government Schemes",
    agri: "Agricultural Suggestions",
    weather: "Weather-based Suggestions on Crops",
    emotional: "Emotional Support",
    profit: "Smart Profit Calculator",
    export: "Export Markets & Buyers",
    exhort: "Exotic Insights",
    market: "Market Advice"
  };

  const openerKn = {
    crop: "ಬೆಳೆ ಶಿಫಾರಸು",
    schemes: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
    agri: "ಕೃಷಿ ಸಲಹೆಗಳು",
    weather: "ಹವಾಮಾನ ಆಧಾರಿತ ಬೆಳೆ ಸಲಹೆಗಳು",
    emotional: "ಭಾವನಾತ್ಮಕ ಬೆಂಬಲ",
    profit: "ಸ್ಮಾರ್ಟ್ ಲಾಭ ಲೆಕ್ಕಾಚಾರಕ",
    export: "ರಫ್ತು ಮಾರುಕಟ್ಟೆಗಳು ಮತ್ತು ಖರೀದಿದಾರರು",
    exhort: "ರಫ್ತು ಆಗುವ ಬೆಳೆ/ತರಕಾರಿಗಳನ್ನು ಸ್ಥಳೀಯವಾಗಿ ಬೆಳೆಯೊಣ",
    market: "ಮಾರುಕಟ್ಟೆ ಸಲಹೆ"
  };

  const prompts = isKannada ? promptsKn : promptsEn;
  const opener = isKannada ? openerKn : openerEn;

  // Add assistant prompt asking for required details
  addAssistantMessage(`${opener[type]} ${isKannada ? 'ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ.' : 'selected.'} ${prompts[type]}`);

  // If Smart Profit Calculator selected, render an inline table-form feature
  if (type === 'profit') {
    try { renderProfitCalculatorForm(); } catch (e) { console.error('Render profit form failed:', e); }
  }

  // Optionally guide user by placeholder
  const placeholdersEn = {
    crop: "e.g., Tumakuru, red soil, borewell, Kharif season…",
    schemes: "e.g., Karnataka, paddy, subsidy for seeds…",
    agri: "e.g., tomato at flowering, leaf curl issue…",
    weather: "e.g., Mysuru, maize, plan irrigation for next 5 days…",
    emotional: "Share anything you're comfortable with…",
    profit: "e.g., rice, 2 acres, seed 4000, fertilizer 10000, irrigation 8000, labor 12000, yield 50 quintals, Karnataka",
    export: "e.g., Alphonso mango, 2 MT, Karnataka, export to Gulf wholesale",
    exhort: "e.g., Bengaluru Rural, 2 acres red loam, borewell, interested in broccoli/avocado",
    market: "e.g., groundnut"
  };
  const placeholdersKn = {
    crop: "ಉದಾ., ತುಮಕೂರು, ಕೆಂಪು ಮಣ್ಣು, ಬೋರ್‌ವೆಲ್, ಖರಿಫ್…",
    schemes: "ಉದಾ., ಕರ್ನಾಟಕ, ಅಕ್ಕಿ, ಬೀಜ ಸಹಾಯಧನ…",
    agri: "ಉದಾ., ಟೊಮೇಟೋ ಹೂವು ಹಂತ, ಎಲೆ ಕುಲು ಮಸುಕು…",
    weather: "ಉದಾ., ಮೈಸೂರು, ಜೋಳ, ಮುಂದಿನ 5 ದಿನ ನೀರಾವರಿ ಯೋಜನೆ…",
    emotional: "ಸೌಕರ್ಯವಾಗಿರುವುದನ್ನು ಹಂಚಿಕೊಳ್ಳಿ…",
    profit: "ಉದಾ., ಅಕ್ಕಿ, 2 ಎಕರೆ, ಬೀಜ 4000, ಗೊಬ್ಬರ 10000, ನೀರಾವರಿ 8000, ಕಾರ್ಮಿಕ 12000, ಉತ್ಪಾದನೆ 50 ಕ್ವಿಂಟಲ್, ಕರ್ನಾಟಕ",
    export: "ಉದಾ., ಆಲ್ಫೋನ್ಸೊ ಮಾವು, 2 ಟನ್, ಕರ್ನಾಟಕ, ಗಲ್ಫ್ ರಫ್ತು",
    exhort: "ಉದಾ., ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ, 2 ಎಕರೆ ಕೆಂಪು ಮಣ್ಣು, ಬೋರ್‌ವೆಲ್, ಬ್ರೋಕೊಲಿ/ಅವಕಾಡೊ ಆಸಕ್ತಿ",
    market: "ಉದಾ., ಶೇಂಗಾ"
  };
  const placeholders = isKannada ? placeholdersKn : placeholdersEn;
  if (messageInput) {
    messageInput.placeholder = placeholders[type] || (isKannada ? 'ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...' : 'Type your message...');
    messageInput.focus();
  }

  // Show real-time timestamp when Market Advice is selected
  // Timestamp for Market Advice is now handled by server-side responses

  // Provide curated resources immediately for export flow
  if (type === 'export') {
    const resourcesEn = (
      '<strong>Key platforms and resources:</strong>\n' +
      '- <a href="https://apeda.gov.in/" target="_blank">APEDA</a> – Export registration (RCMC), market info, packhouse list\n' +
      '- <a href="https://agriexchange.apeda.gov.in/" target="_blank">APEDA AgriExchange</a> – Prices, demand, HS codes\n' +
      '- <a href="https://enam.gov.in/web/" target="_blank">eNAM</a> – National Agricultural Market (domestic wholesale)\n' +
      '- <a href="https://nafed-india.com/" target="_blank">NAFED</a> – Procurement and buyer linkages\n' +
      '- <a href="https://www.dgft.gov.in/CP/" target="_blank">DGFT</a> – IEC (Importer Exporter Code)\n' +
      '- <a href="https://www.icegate.gov.in/" target="_blank">ICEGATE</a> – Customs e-filing\n' +
      '- <a href="https://fssai.gov.in/" target="_blank">FSSAI</a> – Food safety standards\n' +
      '- <a href="https://agricoop.nic.in/en" target="_blank">MoA&amp;FW</a> – Schemes and advisories\n' +
      '- <a href="https://apeda.gov.in/apedawebsite/Announcements/Pack_House_List.htm" target="_blank">APEDA Packhouses</a> – Approved packhouses' 
    );
    const resourcesKn = (
      '<strong>ಮುಖ್ಯ ವೇದಿಕೆಗಳು ಮತ್ತು ಸಂಪನ್ಮೂಲಗಳು:</strong>\n' +
      '- <a href="https://apeda.gov.in/" target="_blank">APEDA</a> – ರಫ್ತು ನೋಂದಣಿ (RCMC), ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿ, ಪ್ಯಾಕ್‌ಹೌಸ್ ಪಟ್ಟಿಗಳು\n' +
      '- <a href="https://agriexchange.apeda.gov.in/" target="_blank">APEDA AgriExchange</a> – ಬೆಲೆ/ಬೇಡಿಕೆ/HS ಕೋಡ್ ಮಾಹಿತಿ\n' +
      '- <a href="https://enam.gov.in/web/" target="_blank">eNAM</a> – ರಾಷ್ಟ್ರೀಯ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ (ದೇಶೀಯ ಮಂಝಿ)\n' +
      '- <a href="https://nafed-india.com/" target="_blank">NAFED</a> – ಖರೀದಿ ಮತ್ತು ಲಿಂಕೆಜ್‌ಗಳು\n' +
      '- <a href="https://www.dgft.gov.in/CP/" target="_blank">DGFT</a> – IEC (ಆಮದು-ರಫ್ತು ಕೋಡ್)\n' +
      '- <a href="https://www.icegate.gov.in/" target="_blank">ICEGATE</a> – ಕಸ್ಟಮ್ಸ್ ಈ-ಫೈಲಿಂಗ್\n' +
      '- <a href="https://fssai.gov.in/" target="_blank">FSSAI</a> – ಆಹಾರ ಸುರಕ್ಷತಾ ಮಾನದಂಡಗಳು\n' +
      '- <a href="https://agricoop.nic.in/en" target="_blank">ಕೃಷಿ ಇಲಾಖೆ</a> – ಯೋಜನೆಗಳು ಮತ್ತು ಸಲಹೆಗಳು\n' +
      '- <a href="https://apeda.gov.in/apedawebsite/Announcements/Pack_House_List.htm" target="_blank">APEDA ಪ್ಯಾಕ್‌ಹೌಸ್‌ಗಳು</a> – ಅನುಮೋದಿತ ಪ್ಯಾಕ್‌ಹೌಸ್‌ಗಳು'
    );
    addAssistantMessage(isKannada ? resourcesKn : resourcesEn);
  }

  if (type === 'exhort') {
    const checklistEn = (
      'To customise your plan, please share:\n' +
      '- Location (district/state) and soil type\n' +
      '- Land size and water (irrigation/rainfed)\n' +
      '- Current crops and market access (mandi/co-op)\n' +
      '- Preferred crops/vegetables (e.g., broccoli, avocado, blueberry)\n\n' +
      'I will reply with:\n' +
      '1) Import-substitute crops that suit your region\n' +
      '2) Cost-benefit (import vs grow locally)\n' +
      '3) Step-by-step cultivation plan\n' +
      '4) Direct selling options (mandi, co-ops, FPOs, retail)\n' +
      '5) Relevant schemes and agritech best practices'
    );
    const checklistKn = (
      'ವೈಯಕ್ತಿಕ ಪ್ಲ್ಯಾನ್‌ಗೆ, ದಯವಿಟ್ಟು ಹಂಚಿ:\n' +
      '- ಸ್ಥಳ (ಜಿಲ್ಲೆ/ರಾಜ್ಯ) ಮತ್ತು ಮಣ್ಣಿನ ಪ್ರಕಾರ\n' +
      '- ಜಮೀನು ಗಾತ್ರ ಮತ್ತು ನೀರಾವರಿ (ನೀರಾವರಿ/ಅವಲಂಬಿತ)\n' +
      '- ಈಗ ಬೆಳೆಯುತ್ತಿರುವ ಬೆಳೆಗಳು ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಪ್ರವೇಶ (ಮಂಝಿ/ಸಹಕಾರಿ)\n' +
      '- ಇಷ್ಟದ ಬೆಳೆ/ತರಕಾರಿಗಳು (ಉದಾ., ಬ್ರೋಕೊಲಿ, ಅವಕಾಡೊ, ಬ್ಲೂಬೆರಿ)\n\n' +
      'ನಾನು ಉತ್ತರಿಸುವುದರಲ್ಲಿ ಇರುತ್ತದೆ:\n' +
      '1) ನಿಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ ಸೂಕ್ತವಾದ ಆಮದು ಬದಲಾವಣೆ ಬೆಳೆಗಳು\n' +
      '2) ವೆಚ್ಚ-ಲಾಭ (ಆಮದು vs ಸ್ಥಳೀಯ ಬೆಳೆ)\n' +
      '3) ಹಂತ ಹಂತದ ಬೆಳೆ ಯೋಜನೆ\n' +
      '4) ನೇರ ಮಾರಾಟ ಆಯ್ಕೆಗಳು (ಮಂಝಿ, ಸಹಕಾರ, FPO, ಚಿಲ್ಲರೆ)\n' +
      '5) ಯೋಜನೆಗಳು ಮತ್ತು ಉತ್ತಮ ಕೃಷಿ ತಂತ್ರಗಳು'
    );
    addAssistantMessage(isKannada ? checklistKn : checklistEn);
  }
}

// OpenAI API Integration with Ollama Offline Support
async function getAIResponse(userMessage) {
  // Check network status first
  const isOnline = navigator.onLine;
  
  // If offline, use Ollama directly
  if (!isOnline) {
    console.log('Offline mode detected, using Ollama...');
    return await getOllamaResponse(userMessage);
  }
  
  try {
    // Build conversation history for context
    const messages = await buildConversationHistory(userMessage);
    
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        language: currentPageLanguage || 'en'
      })
    });

    // Try to parse JSON even for non-200 to use fallbackResponse
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // Non-JSON response or network error - try Ollama as fallback
      console.log('Network error detected, falling back to Ollama...');
      return await getOllamaResponse(userMessage);
    }

    // Helper: force Gemini retry via backend
    async function tryGemini(messagesForRetry) {
      try {
        const gemResp = await fetch(`${API_BASE}/api/chat?prefer=gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesForRetry || messages,
            language: currentPageLanguage || 'en'
          })
        });
        const gemData = await gemResp.json();
        if (gemResp.ok && gemData && gemData.reply) return gemData.reply;
        return null;
      } catch (e) {
        return null;
      }
    }

    if (!response.ok) {
      // First, attempt Gemini fallback directly
      const geminiReply = await tryGemini(messages);
      if (geminiReply) return geminiReply;

      // If server provided a fallback, use it; otherwise try Ollama
      const fb = data && (data.fallbackResponse || data.reply);
      if (fb) return fb;
      
      // Network issues - try Ollama as final fallback
      console.log('All online methods failed, trying Ollama...');
      return await getOllamaResponse(userMessage);
    }

    // Successful response; prefer actual reply
    const primary = data && data.reply;
    if (primary && typeof primary === 'string' && primary.trim()) return primary.trim();

    // If only fallback came back, try a Gemini retry once
    const fb = data && data.fallbackResponse;
    if (fb) {
      const geminiReply = await tryGemini(messages);
      if (geminiReply) return geminiReply;
      return fb;
    }

    // Last resort
    return getFallbackResponse();
  } catch (error) {
    console.error('API call failed:', error);
    // Try Ollama as final fallback for any network errors
    console.log('Exception caught, trying Ollama as final fallback...');
    try {
      return await getOllamaResponse(userMessage);
    } catch (ollamaError) {
      console.error('Ollama also failed:', ollamaError);
      throw error; // Return original error if Ollama also fails
    }
  }
}
















