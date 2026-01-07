# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Signage Manager is a digital signage management system for Raspberry Pi displays. It consists of:
- **Web App**: Next.js admin dashboard for managing screens, assets, and playlists
- **Pi Client**: Python script that runs on Raspberry Pi displays

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### Web Application (Next.js App Router)

**Authentication**:
- Web admin: NextAuth.js with password-based credentials (`SIGNAGE_PASSWORD` env var)
- Pi clients: Per-screen API keys stored in `screens.api_key`, validated via `x-api-key` header

**API Routes Structure**:
- `/api/admin/*` - Protected routes for web dashboard (session-based auth)
- `/api/screens/[screenId]/*` - Public routes for Pi clients (API key auth via `src/lib/auth.ts`)
- `/api/assets/*` - Asset metadata and download endpoints for Pi clients

**Core Libraries** (`src/lib/`):
- `db.ts` - PostgreSQL connection pool (uses `pg` library)
- `auth.ts` - API key validation for Pi client requests
- `apiKeys.ts` - API key generation and redaction utilities

**Database Tables** (PostgreSQL):
- `screens` - Display configurations with unique API keys
- `assets` - Media files (stored in Vercel Blob)
- `playlists` - Per-screen content schedules with positioning
- `preset_playlists` / `preset_playlist_items` - Reusable playlist templates
- `heartbeats` - Pi client status reports

**Key Patterns**:
- Path alias `@/*` maps to `./src/*`
- All pages are client components using `useSession` for auth checks
- Assets uploaded via FormData to `/api/admin/assets`, stored in Vercel Blob
- Database setup via `/api/setup` (requires `SETUP_KEY` env var)

### Pi Client (`pi_client/`)

Python application that polls the web API, downloads assets, and displays content via Chromium kiosk mode. Configured via `.env` file with `SIGNAGE_API_URL`, `SIGNAGE_API_KEY`, and `SIGNAGE_SCREEN_ID`.

## Environment Variables

Required for development:
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
SIGNAGE_PASSWORD=...        # Admin login password
SETUP_KEY=...               # For /api/setup database initialization
BLOB_READ_WRITE_TOKEN=...   # Vercel Blob storage
```
