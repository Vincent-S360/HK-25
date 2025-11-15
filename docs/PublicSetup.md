# Public Setup (Keys + Firebase)

To run this project safely in a public fork or clone, add your own keys and Firebase config. No personal credentials are committed.

## 1) Backend API Keys
- Create `Backend_confidential/keys.env` (or use `.env`) with:
  - `OPENAI_API_KEY=<your OpenAI key>`
  - `GEMINI_API_KEY=<your Google AI Studio key>`
- Use the provided `Backend_confidential/keys.env.example` or `.env.example` as templates.
- These files are ignored by Git via `.gitignore`.

## 2) Frontend Firebase Config
- Create a Firebase project and enable:
  - Authentication (Email/Password) if you want login/history
  - Firestore if you want chat persistence
- Copy `Website_Interface/firebase.config.example.js` to `Website_Interface/firebase.config.js` and fill values from the Firebase console:
  - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, and `databaseURL` (if using RTDB)
- The app runs in guest mode if no Firebase config is provided.

## 3) Run
- Backend: start your server; it reads keys from `Backend_confidential/keys.env`.
- Frontend: open `Website_Interface/index.html` in a browser.

## 4) Keep Secrets Safe
- Do not commit `Website_Interface/firebase.config.js`, `Backend_confidential/keys.env`, or `Backend_confidential/.env`.
- Use the provided `*.example` files as templates.