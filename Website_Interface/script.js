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










