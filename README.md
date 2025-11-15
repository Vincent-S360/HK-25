# 🌾 Salahe — Smart AgriTech linked with Advice, Hub, and Emotion

> Public setup guide: see `docs/PublicSetup.md` for adding your own API keys and Firebase config safely.

> “A farmer shouldn’t need to learn technology.  
> Technology should learn to speak the farmer’s language.”

---

## 🌟 Overview

**Salahe** is a bilingual (Kannada + English) AI-powered digital companion designed to assist farmers through **voice-based guidance, emotional support, and agricultural intelligence**.  
It connects **modern AI** with **grassroots accessibility**, making information, advice, and empathy available to every farmer — online or offline.

Our built-in assistant **Sada** (“ಸದಾ” — meaning *Always*) listens, understands, and responds like a trusted friend — providing personalized agricultural insights, government aid details, and emotional encouragement.

---

## 🧠 Inspiration

Rural farmers face countless challenges — from unpredictable weather and fluctuating market prices to lack of guidance and emotional distress.  
Technology often fails them because it speaks a language they don’t understand — both technically and linguistically.

We asked ourselves:  
> “What if an AI could speak *their* language, feel *their* struggles, and guide them like a friend?”

That question became **Salahe** — *Advice, Always.*

---


## ⚙️ Features

### 🎙️ Voice-Enabled Chat
- Farmers can talk directly to **Sada** in **Kannada or English**.
- Sada replies both as **text and speech** — creating a natural, human-like interaction.

### 💬 Bilingual Intelligence
- Auto-detects user language and responds accordingly.
- Kannada + Indian-accent English for inclusivity and regional ease.

### ☁️ Online + Offline Mode
- **Online Mode:** Powered by **Gemini API** (primary) and **OpenAI GPT-4o** (fallback).  
- **Offline Mode:** Runs on **Ollama (Aya)** model, enabling English text chat without internet.
- Ensures uninterrupted assistance even in rural areas with poor connectivity.

### 🧾 Smart Market Advisor
- Fetches real-time crop prices from official sources like  
  [Raita Mitra](https://raitamitra.karnataka.gov.in) and [KSAMC](https://ksamc.karnataka.gov.in).  
- Suggests where farmers can sell their produce for the **best profit**.
- Example:  
  > “The highest price for Groundnut is ₹7200 per quintal at Raichur market. You can sell there to earn more!”

### 🌿 Exotic Crop Hub
- Educates farmers about **exotic and high-value crops**, their cultivation methods, and profitability.
- Empowers rural communities to explore global agricultural opportunities.

### 🔐 Firebase Integration
- Handles **user authentication**, **chat storage**, and **data persistence** securely.
- Farmers’ history and preferences are stored safely for continuous personalization.

### ❤️ Emotional Support
- Sada is built with **empathetic response modeling**, offering encouragement and motivation.
- Detects distress cues and gently guides farmers toward mental health resources.

---

## 🧩 System Architecture

```plaintext
🎙️ Voice Input
      ↓
[Speech-to-Text API]
      ↓
🧠 SADA (AI Core)
 → Gemini (Primary)
 → OpenAI (Fallback)
 → Ollama (Offline English)
      ↓
[Response Processing + Translation]
      ↓
💬 Voice + Text Output
      ↓
☁️ Firebase (Auth + Firestore Logging)

### 📴 Offline System Flow & Architecture

```plaintext
Internet available? 
   ↓
✅ YES → Normal flow (Gemini → OpenAI)
   ↓
User gets full bilingual voice-enabled chat

❌ NO → Offline fallback activated
   ↓
1. Local Ollama service starts (pre-installed)
2. Aya model (multilingual text LLM) handles text chat in English
3. Sada switches to offline mode message:
   "Offline mode active — answering locally."
4. Farmer types question → Ollama Aya replies instantly (text-only)
5. Chat stored locally or in cache until connection returns
6. Once online, chats sync to Firebase automatically

