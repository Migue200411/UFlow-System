<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ljArjlcqt0ZE4wm7o2emIxFlXJQ6xRKn

## Run Locally

**Prerequisites:** Node.js

### 1. Install dependencies
```bash
npm install
cd server && npm install
```

### 2. Configure Claude AI (optional)
Copy the environment template and add your API key:
```bash
cd server
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

> **Note:** Without Claude API, the app uses local NLP (keyword matching). With Claude, you get real AI responses.

### 3. Start the servers
**Terminal 1 - Claude Proxy (optional):**
```bash
cd server && npm start
```

**Terminal 2 - Main App:**
```bash
npm run dev
```

The app runs at `http://localhost:3000`
