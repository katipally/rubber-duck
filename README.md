# Rubber Duck

## Overview

Rubber Duck is a web application that analyzes public or private GitHub repositories using artificial intelligence. Users submit a repository URL; the system inspects the codebase, prioritizes files for review, and generates structured, critical commentary on selected files. Optional text-to-speech playback is provided via ElevenLabs.

The application was developed for **ElevenHacks** Week 1 (Cloudflare partner track). A public deployment reference is available at [rubber-duck.yashwanth-dev.workers.dev](https://rubber-duck.yashwanth-dev.workers.dev).

## Capabilities

- **Repository ingestion:** Accepts GitHub repository URLs; supports private repositories when a Personal Access Token (PAT) with appropriate read scope is supplied.
- **Automated file selection:** Uses Cloudflare Workers AI to evaluate the repository structure and surface files for commentary.
- **AI-generated reviews:** Produces detailed textual feedback per file through configurable large language models.
- **Speech synthesis:** Streams narration of generated text using ElevenLabs (model family including `eleven_flash_v2_5`).
- **Progression and history:** Maintains session state for review depth, configurable “shame level” tiers, and a history of reviewed files.
- **Operator configuration:** Model selection (e.g., Llama 3.1, Kimi K2.5, DeepSeek, Gemma) and voice selection are exposed in the client settings interface.
- **Visual feedback:** Client-side indicators reflect connection status, processing state, session metrics, and ambient background visualization scaled to session intensity.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Client application | React 19, Vite, Tailwind CSS v4 |
| Runtime and APIs | Cloudflare Workers, Durable Objects, Cloudflare Agents SDK |
| Inference | Cloudflare Workers AI (model configurable) |
| Speech | ElevenLabs streaming text-to-speech |
| Source control integration | GitHub REST API |
| Deployment | Cloudflare Pages / Workers (see `wrangler` configuration) |

## Prerequisites

- Node.js 18 or later
- Active Cloudflare account with Workers AI enabled
- ElevenLabs API credentials
- Wrangler CLI (typically installed via project dev dependencies)

## Installation

```bash
git clone https://github.com/katipally/rubber-duck.git
cd rubber-duck
npm install
```

## Configuration

Create a `.dev.vars` file in the project root for local development secrets:

```
ELEVENLABS_API_KEY=<your_elevenlabs_api_key>
```

Do not commit secrets. Ensure `.dev.vars` and `.env` remain listed in `.gitignore` as applicable.

## Local Development

```bash
npm start
```

This command starts the Vite development server with the Cloudflare Workers local integration.

For client-only layout and styling work without the Workers runtime, use:

```bash
npm run dev:ui
```

## Production Deployment

1. Configure the production secret:

   ```bash
   npx wrangler secret put ELEVENLABS_API_KEY
   ```

2. Build and deploy:

   ```bash
   npm run deploy
   ```

## Operational Flow

1. The user submits a GitHub repository URL (and optional PAT for private repositories).
2. The Worker agent retrieves repository metadata and file content via the GitHub API.
3. Workers AI selects candidate files and generates review text on demand.
4. The client displays results and may request audio rendering through the agent’s ElevenLabs integration.
5. Session state (including history and progression) is maintained by the Durable Object backing the agent.

## Architecture

```
Browser (React client)
    |
    +-- WebSocket (Agents / useAgent) --> Durable Object: RoastAgent
    |                                        |
    |                                        +-- GitHub REST API
    |                                        +-- Cloudflare Workers AI
    |                                        +-- ElevenLabs TTS
    |
    +-- Audio playback <-- data URI from agent speech response
```

## Security and Data Handling

- Personal Access Tokens are transmitted to the server only for repository access and should be scoped to minimum required read permissions.
- API keys must be stored as Wrangler secrets or local development variables, never in source control.

## License

MIT

## Attribution

Rubber Duck incorporates **ElevenLabs** streaming text-to-speech and **Cloudflare** Workers AI, Durable Objects, and the Agents SDK. Developed in connection with [ElevenHacks](https://hacks.elevenlabs.io/) Week 1.
