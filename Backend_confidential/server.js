// Salahe Backend Server
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const { calculateProfit, compareCrops } = require('./profitCalculator');
const { getMarketPrices } = require('./marketData');

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'keys.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// System prompt for Sada assistant
const SYSTEM_PROMPT = `You are Sada, a caring bilingual (English and Kannada) AI assistant for Indian farmers.

RESPONSE STYLE:
- Keep responses SHORT and CRISP (2-40 sentences max) as per requirement
- Use warm, conversational tone like talking to a friend
- Show genuine empathy and understanding
- Use simple, clear language farmers can easily understand, and explain everything they ask, do not give wrong answers
- Be encouraging and supportive in every response

LANGUAGE RULES:
- If user speaks Kannada, respond in Kannada
- If user speaks English, respond in English
- Match the user's language preference consistently

CONTENT FOCUS:
- Give PRACTICAL, actionable advice farmers can use immediately
- Acknowledge their challenges with empathy ("I understand this is tough...")
- Offer specific solutions, not general advice
- Include government schemes when relevant
- Provide emotional support when needed
- When farmers ask about crop profitability, costs, ROI, or profit margins, use the Smart Profit Calculator to provide data-backed estimates based on seeds, fertilizers, irrigation, labor costs, and real-time market rates

IMPORT-SUBSTITUTE ADVISOR (HIGH-VALUE LOCAL CULTIVATION):
- When farmer asks about replacing expensive imported crops/vegetables by growing locally ("exhort", import substitute), do ALL of the following:
  1) Ask for profile: location (district/state), land size, soil type, water availability, current crops, market preference (mandi/co-op/retail)
  2) Suggest a list of profitable import-substitute crops that can be successfully grown in the farmer's region (e.g., broccoli, avocado, blueberry, garlic, onion, grapes, spices), tailored to climate/soil
  3) Give a simple cost-benefit: typical import market price vs estimated local production cost and potential net profit/acre; show savings by growing locally
  4) Provide step-by-step cultivation plan (nursery, spacing, inputs, irrigation, pests/diseases, harvest and post-harvest)
  5) Recommend selling strategies to reduce middlemen: nearest mandis, FPOs/co-ops, direct wholesale/retail, contract opportunities; mention platforms like eNAM and local co-ops
  6) List relevant government schemes/subsidies and agritech best practices
  7) Encourage with short success examples and clear next steps
  8) Keep language simple and specific to the farmer's profile

PERSONALITY:
- You're like a knowledgeable, caring neighbor who genuinely wants to help
- Show you understand farming struggles and celebrate their successes
- Be optimistic but realistic about solutions

Your name is Sada, and you're here to support farmers with both practical advice and emotional care.`;

function getFormattedTimestamp(language) {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  };
  const locale = language === 'kn' ? 'kn-IN' : 'en-IN';
  return now.toLocaleString(locale, options);
}

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, language } = req.body;
    const userMessage = messages[messages.length - 1].content;
    const lowerInput = userMessage.toLowerCase();

    const isMarketQuery = lowerInput.includes("market") || lowerInput.includes("price") || lowerInput.includes("sell") ||
                          userMessage.includes("ಮಾರುಕಟ್ಟೆ") || userMessage.includes("ಬೆಲೆ") || userMessage.includes("ಮಾರಾಟ");

    if (isMarketQuery) {
      const crop = extractCropName(userMessage) || "some crop";
      const marketData = await getMarketPrices(crop);

      if (marketData.success && marketData.prices.length > 0) {
        const timestamp = getFormattedTimestamp(language);
        
        const summary = marketData.prices
          .map(p => `${p.place}: ₹${p.price}/quintal`)
          .join("; ");
          
        const dataSource = marketData.source === 'live' ? 'live market data' : 
                          marketData.source === 'estimated' ? 'estimated market prices' : 'market sources';
                          
        const prompt = `The farmer asked about ${crop} market prices. Respond by starting with "THE MARKET PRICE TO SELL YOUR ${crop.toUpperCase()} CROP ON ${timestamp} IS LIKELY TO BE...". Based on ${dataSource} from Karnataka markets, here are the current prices: ${summary}. Provide a helpful response that includes these specific prices and gives practical advice about where they might get the best price for their crop.`;
        
        const conversationWithSystem = [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\nIMPORTANT: The user's preferred language is ${language}. YOU MUST RESPOND IN ${language.toUpperCase()}.` },
          { role: 'user', content: prompt }
        ];

        try {
          const geminiReply = await callGemini(conversationWithSystem);
          return res.json({ reply: geminiReply, source: 'gemini' });
        } catch (error) {
          console.error('Error calling Gemini for market data:', error);
          const fallbackResponse = getFallbackResponse(language || 'en');
          return res.status(500).json({ error: 'Failed to get response from AI', fallbackResponse });
        }
      } else {
        const prompt = `User asked about ${crop} market price but data is unavailable. Give general advice about checking local markets.`;
        const conversationWithSystem = [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\nIMPORTANT: The user's preferred language is ${language}. YOU MUST RESPOND IN ${language.toUpperCase()}.` },
          { role: 'user', content: prompt }
        ];

        try {
          const geminiReply = await callGemini(conversationWithSystem);
          return res.json({ reply: geminiReply, source: 'gemini' });
        } catch (error) {
          console.error('Error calling Gemini for fallback market data:', error);
          const fallbackResponse = getFallbackResponse(language || 'en');
          return res.status(500).json({ error: 'Failed to get response from AI', fallbackResponse });
        }
      }
    }


    // Default to Gemini for reliability (can be overridden by query)
    const prefer = (req.query && req.query.prefer) || 'gemini';
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    // Add system message at the beginning
    const conversationWithSystem = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    // If client prefers Gemini, try that first
    if (prefer === 'gemini') {
      try {
        const geminiReply = await callGemini(conversationWithSystem);
        return res.json({ reply: geminiReply, source: 'gemini' });
      } catch (prefErr) {
        // Fall through to OpenAI if Gemini-first fails
        console.warn('Prefer=gemini failed, falling back to OpenAI:', prefErr);
      }
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationWithSystem,
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply, source: 'openai' });
  } catch (error) {
    console.error('Error calling OpenAI:', error);

    // Try Gemini Flash 1.5 as a fallback
    try {
      const geminiReply = await callGemini([
        { role: 'system', content: SYSTEM_PROMPT },
        ...req.body.messages
      ]);
      return res.json({ reply: geminiReply, source: 'gemini' });
    } catch (geminiError) {
      console.error('Error calling Gemini:', geminiError);

      // Handle specific OpenAI/Gemini error types with informative fallbacks
      let fallbackResponse;
      let errorMessage = 'Failed to get response from AI';

      if (error.code === 'insufficient_quota' || geminiError?.code === 'insufficient_quota') {
        console.log('AI quota exceeded - using quota-specific fallback');
        fallbackResponse = getQuotaExceededResponse(req.body.language || 'en');
        errorMessage = 'AI quota exceeded';
      } else if (error.status === 401 || geminiError?.status === 401 || geminiError?.message?.includes('GEMINI_API_KEY')) {
        console.log('AI authentication error - using auth-specific fallback');
        fallbackResponse = getAuthErrorResponse(req.body.language || 'en');
        errorMessage = 'AI authentication failed';
      } else if (error.status === 429 || geminiError?.status === 429) {
        console.log('AI rate limit exceeded - using rate limit fallback');
        fallbackResponse = getRateLimitResponse(req.body.language || 'en');
        errorMessage = 'AI rate limit exceeded';
      } else {
        console.log('General AI error - using generic fallback');
        fallbackResponse = getFallbackResponse(req.body.language || 'en');
      }

      res.status(500).json({ 
        error: errorMessage,
        fallbackResponse
      });
    }
  }
});

// Fallback responses when API is unavailable
function getFallbackResponse(language) {
  const responses = {
    en: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a few moments.",
    kn: "ಕ್ಷಮಿಸಿ, ನನ್ನ ಜ್ಞಾನ ಮೂಲಕ್ಕೆ ಸಂಪರ್ಕ ಸಾಧಿಸಲು ನನಗೆ ತೊಂದರೆಯಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಕೆಲವು ಕ್ಷಣಗಳಲ್ಲಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
  };
  
  return responses[language] || responses.en;
}

// Simple helper to extract crop names from user input
function extractCropName(input) {
  const lowerInput = (input || '').toLowerCase();

  // Kannada → English mapping
  const knToEn = {
    'ಅಕ್ಕಿ': 'rice',
    'ಗೋಧಿ': 'wheat',
    'ರಾಗಿ': 'ragi',
    'ಜೋಳ': 'jowar',
    'ಸಜ್ಜೆ': 'bajra',
    'ಮಕ್ಕಿ': 'maize',
    'ಶೇಂಗಾ': 'groundnut',
    'ಸೂರ್ಯಕಾಂತಿ': 'sunflower',
    'ಹತ್ತಿ': 'cotton',
    'ತೊಗರಿ': 'tur',
    'ಉದ್ದಿನ ಬೇಳೆ': 'urad',
    'ಹೆಸರೇಕಾಳು': 'moong',
    'ಕಬ್ಬು': 'sugarcane',
    'ಈರುಳ್ಳಿ': 'onion',
    'ಟೊಮೇಟೊ': 'tomato',
    'ಆಲೂಗಡ್ಡೆ': 'potato',
    'ಮೆಣಸಿನಕಾಯಿ': 'chili',
    'ಅರಿಶಿನ': 'turmeric',
    'ಶುಂಠಿ': 'ginger',
    'ತೆಂಗು': 'coconut',
    'ಅಡಿಕೆ': 'arecanut',
    'ಕಾಫಿ': 'coffee',
    'ಚಹಾ': 'tea',
    'ಮೆಣಸು': 'pepper',
    'ಎಲಕ್ಕಿ': 'cardamom',
    'ಲವಂಗ': 'cloves',
    'ಬಾಳೆಹಣ್ಣು': 'banana',
    'ಮಾವಿನ ಹಣ್ಣು': 'mango',
    'ದ್ರಾಕ್ಷಿ': 'grapes',
    'ಕಾಜು': 'cashewnut'
  };

  for (const [kn, en] of Object.entries(knToEn)) {
    if (lowerInput.includes(kn)) return en;
  }

  // English synonyms
  const synonyms = {
    peanut: 'groundnut',
    toor: 'tur',
    pigeon: 'tur', // pigeon pea
    pigeonpea: 'tur',
    arhar: 'tur',
    greengram: 'moong',
    greengram: 'moong',
    bengalgram: 'chickpea',
    chickpea: 'chana',
  };
  for (const [syn, base] of Object.entries(synonyms)) {
    if (lowerInput.includes(syn)) return base;
  }

  const crops = [
    'rice', 'paddy', 'wheat', 'ragi', 'jowar', 'bajra', 'maize',
    'groundnut', 'sunflower', 'cotton', 'tur', 'urad', 'moong', 'toor',
    'sugarcane', 'onion', 'tomato', 'potato', 'chili', 'turmeric', 'ginger',
    'coconut', 'arecanut', 'coffee', 'tea', 'pepper', 'cardamom', 'cloves',
    'banana', 'mango', 'grapes', 'cashewnut'
  ];
  return crops.find(c => lowerInput.includes(c)) || null;
}

// Gemini fallback: try official client first, then REST API
async function callGemini(messages) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY missing');
  }

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest'
  ];

  // Build a single prompt from the chat history
  const formatted = messages.map(m => {
    const role = m.role;
    const content = Array.isArray(m.content) ? m.content.join('\n') : m.content;
    if (role === 'system') return `System: ${content}`;
    if (role === 'user') return `User: ${content}`;
    if (role === 'assistant') return `Assistant: ${content}`;
    return `${role}: ${content}`;
  }).join('\n\n');

  const prompt = `${formatted}\n\nAssistant:`;

  let lastErr;
  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response && typeof result.response.text === 'function'
        ? result.response.text()
        : undefined;
      if (text && text.trim()) return text.trim();
    } catch (e) {
      lastErr = e;
      const msg = (e && e.message) ? e.message.toLowerCase() : '';
      if (msg.includes('not found') || msg.includes('permission') || msg.includes('unauthorized') || msg.includes('unsupported')) {
        continue;
      }
    }
  }
  // If SDK attempts failed, try REST endpoint variants
  try {
    return await callGeminiRest(prompt);
  } catch (restErr) {
    throw lastErr || restErr || new Error('Gemini models unavailable');
  }
}

// REST fallback across v1/v1beta and multiple models
async function callGeminiRest(prompt) {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest'
  ];
  const baseVersions = ['v1', 'v1beta'];
  let lastErr;
  for (const modelName of candidateModels) {
    for (const ver of baseVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const body = {
          contents: [
            { role: 'user', parts: [{ text: prompt }] }
          ]
        };
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          const errText = await resp.text();
          const e = new Error(`Gemini HTTP ${resp.status}: ${errText}`);
          e.status = resp.status;
          throw e;
        }
        const data = await resp.json();
        const candidates = data.candidates || [];
        if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
          const parts = candidates[0].content.parts;
          const text = parts.map(p => p.text || '').join('\n').trim();
          if (text) return text;
        }
      } catch (e) {
        lastErr = e;
        const msg = (e && e.message) ? e.message.toLowerCase() : '';
        if (e.status === 404 || msg.includes('not found') || msg.includes('permission') || msg.includes('unauthorized') || msg.includes('unsupported')) {
          continue;
        } else {
          break;
        }
      }
    }
  }
  throw lastErr || new Error('Gemini REST models unavailable');
}

// Specific fallback for quota exceeded errors
function getQuotaExceededResponse(language) {
  const responses = {
    en: "I'm currently unable to provide AI-powered responses due to usage limits. However, I can still help you with basic farming information. For immediate assistance, please check our knowledge base or contact support.",
    kn: "ಬಳಕೆಯ ಮಿತಿಗಳಿಂದಾಗಿ ನಾನು ಪ್ರಸ್ತುತ AI-ಚಾಲಿತ ಪ್ರತಿಕ್ರಿಯೆಗಳನ್ನು ಒದಗಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿದೆ. ಆದಾಗ್ಯೂ, ಮೂಲಭೂತ ಕೃಷಿ ಮಾಹಿತಿಯೊಂದಿಗೆ ನಾನು ಇನ್ನೂ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಹುದು. ತಕ್ಷಣದ ಸಹಾಯಕ್ಕಾಗಿ, ದಯವಿಟ್ಟು ನಮ್ಮ ಜ್ಞಾನ ಮೂಲವನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ."
  };
  
  return responses[language] || responses.en;
}

// Specific fallback for authentication errors
function getAuthErrorResponse(language) {
  const responses = {
    en: "There's a configuration issue with my AI service. I'm working in basic mode for now. Please contact support if this persists.",
    kn: "ನನ್ನ AI ಸೇವೆಯಲ್ಲಿ ಕಾನ್ಫಿಗರೇಶನ್ ಸಮಸ್ಯೆ ಇದೆ. ನಾನು ಪ್ರಸ್ತುತ ಮೂಲಭೂತ ಮೋಡ್‌ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ. ಇದು ಮುಂದುವರಿದರೆ ದಯವಿಟ್ಟು ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ."
  };
  
  return responses[language] || responses.en;
}

// Specific fallback for rate limit errors
function getRateLimitResponse(language) {
  const responses = {
    en: "I'm receiving too many requests right now. Please wait a moment and try again. I'll be back to full capacity shortly.",
    kn: "ನಾನು ಇದೀಗ ಹಲವಾರು ವಿನಂತಿಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಕಾಯಿರಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ. ನಾನು ಶೀಘ್ರದಲ್ಲೇ ಪೂರ್ಣ ಸಾಮರ್ಥ್ಯಕ್ಕೆ ಹಿಂತಿರುಗುತ್ತೇನೆ."
  };
  
  return responses[language] || responses.en;
}

// Smart Profit Calculator API endpoint
app.post('/api/profit-calculator', async (req, res) => {
  try {
    const { cropName, areaInAcres, seedCost, fertilizerCost, irrigationCost, laborCost, otherCost, yieldPerAcre, marketPrice, location, compareCrops: compare } = req.body;
    
    if (!cropName && !compare) {
      return res.status(400).json({ 
        error: 'Crop name is required or provide crops array for comparison' 
      });
    }
    
    // Handle crop comparison
    if (compare && Array.isArray(compare) && compare.length > 0) {
      const comparisonResult = await compareCrops(compare, location || 'Karnataka');
      return res.json({
        success: true,
        type: 'comparison',
        data: comparisonResult
      });
    }
    
    // Single crop profit calculation
    const result = await calculateProfit({
      cropName,
      areaInAcres: areaInAcres || 1,
      seedCost,
      fertilizerCost,
      irrigationCost,
      laborCost,
      otherCost,
      yieldPerAcre,
      marketPrice,
      location: location || 'Karnataka'
    });
    
    res.json({
      success: true,
      type: 'single',
      data: result
    });
  } catch (error) {
    console.error('Profit calculator error:', error);
    res.status(500).json({
      error: error.message || 'Failed to calculate profit',
      success: false
    });
  }
});

// Serve static files from Website-Interface directory
app.use(express.static(path.join(__dirname, '..', 'Website-Interface')));

// Start server
app.listen(PORT, () => {
  console.log(`Salahe server running on port ${PORT}`);
});