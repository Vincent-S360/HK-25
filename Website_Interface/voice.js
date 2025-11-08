// Voice integration for Salahe
// Handles text-to-speech and speech-to-text functionality

// Global variables for voice features
// Using existing variables from script.js
// isListening, isSpeaking, recognition, and availableVoices are already declared
let voiceUtterance = null;
let lastSpokenWasPrompt = false;

function sanitizeForSpeech(text) {
  try {
    let t = String(text || '');
    // Strip markdown symbols and extra punctuation that get read literally
    t = t.replace(/\*+/g, '');           // asterisks
    t = t.replace(/[~`_^]+/g, '');        // misc markers
    t = t.replace(/[#>-]+\s*/g, '');     // headings and list markers
    t = t.replace(/https?:\/\/\S+/g, ''); // URLs
    // Normalize SC/ST to SC ST
    t = t.replace(/\bSC\s*\/\s*ST\b/gi, 'SC ST');
    // Remove numeric list prefixes like 1) 2) 3) at line starts
    t = t.replace(/(^|\n)\s*\d+[)\.:\-]\s+/g, '$1');
    // Expand percentage ranges like 40-50% -> forty to fifty percent
    t = t.replace(/\b(\d{1,3})\s*[\-–—]\s*(\d{1,3})\s*%\b/g, (m, a, b) => {
      return `${numberToWords(parseInt(a, 10))} to ${numberToWords(parseInt(b, 10))} percent`;
    });
    // Add natural pauses for better flow
    t = t.replace(/\. /g, '. ');
    t = t.replace(/\? /g, '? ');
    t = t.replace(/! /g, '! ');
    // Add slight pauses after colons and semicolons
    t = t.replace(/: /g, ', ');
    t = t.replace(/; /g, ', ');
    // Make numbers more natural
    t = t.replace(/\b(\d+)\b/g, (match, num) => {
      const n = parseInt(num);
      if (n <= 20) return numberToWords(n);
      return match;
    });
    t = t.replace(/\s{2,}/g, ' ');       // collapse whitespace
    return t.trim();
  } catch { return String(text || ''); }
}

function numberToWords(n) {
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine'];
  const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  if (isNaN(n) || n < 0 || n > 999) return String(n);
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return o ? `${tens[t]} ${ones[o]}` : tens[t];
  }
  const h = Math.floor(n / 100), r = n % 100;
  const head = `${ones[h]} hundred`;
  if (!r) return head;
  if (r < 10) return `${head} ${ones[r]}`;
  if (r < 20) return `${head} ${teens[r - 10]}`;
  const t = Math.floor(r / 10), o = r % 10;
  return o ? `${head} ${tens[t]} ${ones[o]}` : `${head} ${tens[t]}`;
}

// Initialize speech recognition
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Speech recognition not supported');
    return;
  }
  
  // Create speech recognition instance
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  // Configure recognition
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = currentPageLanguage === 'kn' ? 'kn-IN' : 'en-IN';
  
  // Add event handlers
  recognition.onstart = () => {
    isListening = true;
    updateMicButtonUI();
    showToast('🎙️ Listening...', 'info');
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    
    // Auto-send after a short delay
    setTimeout(() => {
      if (transcript.trim() !== '') {
        sendMessage();
      }
    }, 500);
  };
  
  recognition.onend = () => {
    isListening = false;
    updateMicButtonUI();
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    updateMicButtonUI();
    showToast('Speech recognition error: ' + event.error, 'error');
  };
}

// Toggle speech recognition on/off
function toggleSpeechRecognition() {
  if (!recognition) {
    initSpeechRecognition();
  }
  
  if (isListening) {
    recognition.stop();
    isListening = false;
    showToast('Stopped listening', 'info');
  } else {
    hideQuickActions();
    recognition.lang = currentPageLanguage === 'kn' ? 'kn-IN' : 'en-IN';
    try {
      recognition.start();
      isListening = true;
      showToast('🎙️ Listening...', 'info');
    } catch (error) {
      console.error('Speech recognition error:', error);
      showToast('Could not start speech recognition', 'error');
    }
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

// Get appropriate voice based on language
function getVoice(lang) {
  if (!availableVoices || availableVoices.length === 0) {
    availableVoices = window.speechSynthesis.getVoices();
  }
  
  let voice;
  // Try to find a female voice for the selected language
  if (lang === 'kn') {
    // For Kannada – prefer Aarushi/Sapna if available
    voice = availableVoices.find(v => v.lang === 'kn-IN' && /aarushi|sapna/i.test(v.name));
    if (!voice) voice = availableVoices.find(v => v.lang === 'kn-IN' && /female/i.test(v.name));
    if (!voice) voice = availableVoices.find(v => v.lang === 'kn-IN');
  } else {
    // For English (Indian accent preferred)
    voice = availableVoices.find(v => v.lang === 'en-IN' && /female/i.test(v.name));
    if (!voice) voice = availableVoices.find(v => v.lang === 'en-IN');
  }
  
  // Fallback to any available voice if specific language not found
  if (!voice) {
    voice = availableVoices.find(v => v.lang.startsWith(lang === 'kn' ? 'hi' : 'en') && /female/i.test(v.name));
    if (!voice) voice = availableVoices.find(v => v.lang.startsWith(lang === 'kn' ? 'hi' : 'en'));
  }
  
  // Last resort fallback
  if (!voice && availableVoices.length > 0) {
    voice = availableVoices[0];
  }
  
  return voice;
}

// Speak text using SpeechSynthesis
function speakText(text, lang) {
  // Respect global voice toggle and chat open state
  try {
    if (typeof voiceEnabled !== 'undefined' && !voiceEnabled) return;
    if (typeof chatInterface !== 'undefined' && chatInterface.classList.contains('hidden')) return;
  } catch (e) {}
  // Cancel any ongoing speech
  if (isSpeaking) {
    window.speechSynthesis.cancel();
  }
  
  // Detect if this utterance is the silence prompt
  const promptText = (typeof silencePrompts !== 'undefined' && typeof currentPageLanguage !== 'undefined')
    ? (silencePrompts[currentPageLanguage] || silencePrompts['en'])
    : '';
  const wasPrompt = lastSpokenWasPrompt || (promptText && text === promptText);
  lastSpokenWasPrompt = false;

  // Sanitize content to avoid reading markdown symbols like asterisks
  const speakContent = sanitizeForSpeech(text);
  if (!speakContent) return;

  // Detect Kannada script and pick language accordingly so Kannada solutions speak reliably
  let effectiveLang = lang;
  try {
    if (/[\u0C80-\u0CFF]/.test(speakContent)) {
      effectiveLang = 'kn';
    }
  } catch (e) {}

  // Create new utterance
  voiceUtterance = new SpeechSynthesisUtterance(speakContent);
  
  // Set language and voice
  voiceUtterance.lang = effectiveLang === 'kn' ? 'kn-IN' : 'en-IN';
  voiceUtterance.voice = getVoice(effectiveLang);
  
  // Set speech parameters for more natural speech
  if (effectiveLang === 'kn') {
    // Kannada settings
    voiceUtterance.rate = 0.9;
    voiceUtterance.pitch = 1.0;
    voiceUtterance.volume = 1.0;
  } else {
    // English settings - slower, slightly varied pitch for naturalness
    voiceUtterance.rate = 0.85;
    voiceUtterance.pitch = 0.95;
    voiceUtterance.volume = 1.0;
  }
  
  // Add event handlers
  voiceUtterance.onstart = () => {
    isSpeaking = true;
  };
  
  voiceUtterance.onend = () => {
    isSpeaking = false;
    // Schedule one-shot silence prompt only after actual assistant replies
    try {
      if (!wasPrompt) {
        // Clear any existing timeout before scheduling a new one
        if (typeof silenceTimeoutId !== 'undefined' && silenceTimeoutId) {
          try { clearTimeout(silenceTimeoutId); } catch (e) {}
          silenceTimeoutId = null;
        }
        // One-shot after 20s if user remained silent
        if (typeof lastUserInteractionAt !== 'undefined') {
          const delayMs = 20000;
          silenceTimeoutId = setTimeout(() => {
            // Guard: only when chat is open and voice is enabled
            if (typeof voiceEnabled !== 'undefined' && !voiceEnabled) return;
            if (typeof chatInterface !== 'undefined' && chatInterface.classList.contains('hidden')) return;
            const langCode = (typeof currentPageLanguage !== 'undefined') ? currentPageLanguage : 'en';
            const prompt = (typeof silencePrompts !== 'undefined' && silencePrompts[langCode]) ? silencePrompts[langCode] : 'You can click the mic to talk, or type your question.';
            // Only prompt if user stayed silent
            if (Date.now() - lastUserInteractionAt >= delayMs - 1000) {
              try { showToast(prompt, 'info'); } catch (e) {}
              // Speak the prompt once, and skip scheduling after it ends
              try { lastSpokenWasPrompt = true; speakText(prompt, langCode); } catch (e) {}
            }
          }, delayMs);
        }
      }
    } catch (e) {}
  };
  
  voiceUtterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    isSpeaking = false;
  };
  
  // Speak the text
  try {
    window.speechSynthesis.speak(voiceUtterance);
  } catch (error) {
    console.error('Speech synthesis error:', error);
    isSpeaking = false;
  }
}

// Initialize voice features
function initVoiceFeatures() {
  // Initialize speech recognition if not already initialized
  if (!recognition) {
    initSpeechRecognition();
  }
  
  // Initialize speech synthesis
  if ('speechSynthesis' in window) {
    // Get available voices
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        availableVoices = window.speechSynthesis.getVoices();
        
        // Speak the initial greeting when voices are loaded
        setTimeout(() => {
          const initialMessage = document.querySelector('#messages-container .assistant-message .message-bubble p[data-translate="chatGreeting"]');
          // Guard: do not interrupt ongoing speech, only greet once per entry
          if (
            initialMessage && initialMessage.textContent &&
            typeof chatInterface !== 'undefined' && !chatInterface.classList.contains('hidden') &&
            typeof voiceEnabled !== 'undefined' && voiceEnabled &&
            typeof initialGreetingSpoken !== 'undefined' && !initialGreetingSpoken &&
            typeof isSpeaking !== 'undefined' && !isSpeaking
          ) {
            speakText(initialMessage.textContent, currentPageLanguage);
            try { initialGreetingSpoken = true; } catch (e) {}
          }
        }, 800);
      };
    } else {
      // For browsers that don't support onvoiceschanged
      availableVoices = window.speechSynthesis.getVoices();
      setTimeout(() => {
        const initialMessage = document.querySelector('#messages-container .assistant-message .message-bubble p[data-translate="chatGreeting"]');
        if (
          initialMessage && initialMessage.textContent &&
          typeof chatInterface !== 'undefined' && !chatInterface.classList.contains('hidden') &&
          typeof voiceEnabled !== 'undefined' && voiceEnabled &&
          typeof initialGreetingSpoken !== 'undefined' && !initialGreetingSpoken &&
          typeof isSpeaking !== 'undefined' && !isSpeaking
        ) {
          speakText(initialMessage.textContent, currentPageLanguage);
          try { initialGreetingSpoken = true; } catch (e) {}
        }
      }, 800);
    }
  }
  
  // Add click event to replay speech for existing assistant messages
  document.querySelectorAll('.assistant-message .message-bubble').forEach(bubble => {
    bubble.style.cursor = 'pointer';
    bubble.addEventListener('click', () => {
      const messageText = bubble.querySelector('p').textContent;
      speakText(messageText, currentPageLanguage);
    });
  });
  
  // Monitor for new assistant messages
  const messagesContainer = document.getElementById('messages-container');
  if (messagesContainer) {
    // Create a mutation observer to watch for new messages
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if the added node is an assistant message
          mutation.addedNodes.forEach((node) => {
            if (node.classList && node.classList.contains('assistant-message')) {
              const messageBubble = node.querySelector('.message-bubble');
              const messageText = node.querySelector('.message-bubble p').textContent;
              
              if (messageBubble) {
                // Add click event to replay speech
                messageBubble.style.cursor = 'pointer';
                messageBubble.addEventListener('click', () => {
                  speakText(messageText, currentPageLanguage);
                });
              }
            }
          });
        }
      });
    });
    
    // Start observing the messages container
    observer.observe(messagesContainer, { childList: true });
  }
}

// Initialize voice features when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit to ensure other scripts have initialized
  setTimeout(initVoiceFeatures, 1000);
});