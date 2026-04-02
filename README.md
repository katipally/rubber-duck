# 🦆 Rubber Duck

**The Senior Dev That Roasts Your Code**

> *"I got tired of normal rubber duck debugging, so I built an AI that verbally abuses me for writing bad code."*

Rubber Duck is an AI-powered code roasting app. Paste a GitHub repo URL, and a savage AI senior developer will auto-pick your worst files and roast them one-by-one with escalating brutality — complete with condescending voice acting powered by ElevenLabs.

**Built for [ElevenHacks](https://hacks.elevenlabs.io/) Week 1 (Cloudflare Partner)**

---

## 🔥 Features

- **GitHub Repo Roasting** — Paste any public (or private with PAT) GitHub repo URL
- **Auto-Pick Worst Files** — AI scans your repo and identifies the most roast-worthy code
- **Savage Voice Roasts** — ElevenLabs streaming TTS speaks devastating roasts in a condescending voice
- **Escalating Shame Levels** — The duck gets progressively meaner:
  - 🟢 Novice Shame → 🟡 Intermediate Shame → 🟠 Senior Shame → 🔴 Staff-Level Shame → 💀 Architect-Level Shame
- **Animated Rubber Duck** — Bobs, glows, shakes, and has a full meltdown at max shame
- **Shame Dashboard** — Track your roast count, shame level, and complete roast history
- **Configurable AI** — Pick your LLM model (Llama 3.1, Kimi K2.5, DeepSeek, Gemma) and ElevenLabs voice
- **Particle Effects** — Background particles that intensify from calm white to red fire as shame increases
- **Roast-Themed Errors** — "Even your error handling is broken. Remarkable."

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Cloudflare Workers + Durable Objects (Agents SDK) |
| LLM | Cloudflare Workers AI (configurable model) |
| Voice | ElevenLabs Streaming TTS (eleven_flash_v2_5) |
| Code Source | GitHub REST API |
| Deployment | Cloudflare Pages |

## 📦 Setup

### Prerequisites

- Node.js 18+
- [Cloudflare account](https://dash.cloudflare.com/) with Workers AI enabled
- [ElevenLabs account](https://elevenlabs.io/) with API key
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/rubber-duck.git
cd rubber-duck
npm install
```

### 2. Configure Environment

Create `.dev.vars` for backend secrets:
```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 3. Run Locally

```bash
npm start
```

This starts Vite dev server with Cloudflare Workers local runtime.

### 4. Deploy

```bash
# Set the production secret
npx wrangler secret put ELEVENLABS_API_KEY

# Build and deploy
npm run deploy
```

## 🎮 How It Works

1. **Paste a GitHub URL** — Enter any repo URL (add a PAT for private repos)
2. **AI Scans Your Repo** — Workers AI analyzes the file tree and picks the worst files
3. **Get Roasted** — Click files to get devastatingly specific, targeted roasts
4. **Listen to the Pain** — ElevenLabs speaks the roast in a condescending voice
5. **Watch It Escalate** — Each roast increases your shame level, making the duck meaner
6. **Try Not to Cry** — The duck will question your career choices

## 🧠 Architecture

```
Browser (React)
    │
    ├── useAgent() WebSocket ──→ Cloudflare Durable Object (RoastAgent)
    │                                  │
    │                                  ├── GitHub REST API (fetch repo/files)
    │                                  ├── Cloudflare Workers AI (generate roasts)
    │                                  └── ElevenLabs TTS (generate audio)
    │
    └── Audio playback ←── base64 data URI from agent.speak()
```

## 📄 License

MIT

## 🏆 ElevenHacks

Built with ❤️ and sleep deprivation for [ElevenHacks](https://hacks.elevenlabs.io/) Week 1.

- **ElevenLabs**: Streaming Text-to-Speech (eleven_flash_v2_5)
- **Cloudflare**: Workers AI, Durable Objects (Agents SDK), Pages

#ElevenHacks @elevenlabsio @CloudflareDev
