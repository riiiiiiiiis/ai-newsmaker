# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
- `npm run start` or `vercel dev --yes` - Start local development server with Vercel runtime
- `npm install` - Install dependencies (only marked for markdown parsing)

### Build & Deploy
- `npm run build` - Build with Vercel  
- **IMPORTANT: DO NOT use `vercel deploy` commands - deployment happens automatically via GitHub push**

### Testing
- `node test-full-flow.js` - Test complete pipeline without Telegram sending
- `node test-fetch.js` - Test GitHub content fetching
- `node test-translation.js` - Test OpenRouter translation
- `node test-markdown.js` - Test markdown processing

### Manual Endpoint Testing
```bash
# Local testing
curl -X POST http://localhost:3000/api/daily-report \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Production testing  
curl -X POST https://your-app.vercel.app/api/daily-report \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Architecture

This is a minimalist serverless Telegram bot that translates Reddit AI trends from English to Russian and posts them to a Telegram channel.

### Core Flow
```
Vercel Cron (12:00 UTC) → /api/daily-report.js → 
[Fetch GitHub MD] → [OpenRouter Translation] → [MD→HTML] → [Telegram Send]
```

### Edge Functions Architecture  
- **api/daily-report.js** - Main bot logic using Edge Runtime (300s timeout on free plan)
- **api/status.js** - Health checks and monitoring
- **api/test.js** - Component testing endpoints
- **api/post-deploy-verify.js** - Deployment verification
- All functions use Edge Runtime for extended timeout (vs 10s Node.js limit)
- Uses Web Standard APIs (fetch, crypto.subtle) instead of Node.js APIs

### Environment Variables (see .env.example)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from BotFather
- `TELEGRAM_CHANNEL_ID` - Channel ID (e.g., @channel_name or -1001234567890)
- `OPENROUTER_API_KEY` - OpenRouter API key for AI translation
- `CRON_SECRET` - Secret for securing cron endpoint
- `GITHUB_RAW_URL` - Source markdown file URL
- `LAST_CONTENT_HASH` - Auto-managed content change detection

### Key Features
- **Change Detection**: SHA-256 hash comparison to avoid duplicate posts
- **Rate Limiting**: Built-in delays between Telegram API calls
- **Message Splitting**: Automatic chunking for Telegram's 4096 character limit
- **Error Handling**: Graceful handling of GitHub, OpenRouter, and Telegram failures
- **Security**: Bearer token authentication for cron endpoint

### Vercel Configuration
- `vercel.json` defines daily cron job at 12:00 UTC
- Edge Functions automatically support up to 300 seconds timeout on free plan
- Serverless deployment optimized for minimal cost (~$0.30/month)

## Philosophy

"Zero dependencies where possible" - maximizes use of Node.js 18+ built-in capabilities for a sub-200 line MVP that works from first deployment.