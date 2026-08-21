# Videology — Agent Instructions

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 + DaisyUI 5
- PostgreSQL via Prisma 7 (`@prisma/adapter-pg` + `pg`)
- JWT auth (HttpOnly cookies)
- AI: OpenAI / OpenRouter (GPT-4o-mini)
- Transcription: GROQ whisper-large-v3-turbo or OpenAI whisper-1
- Video processing: FFmpeg, yt-dlp
- Storage: Supabase Storage (cloud) or local filesystem

## Code Conventions
- Server utilities go in `lib/`, client components in `components/`
- Use the shared `lib/shell.ts` for URL sanitization and OpenRouter key detection
- Never hardcode secrets — always read from environment variables
- All shell commands must sanitize user-provided URLs via `sanitizeUrl()` from `lib/shell.ts`

## Build & Lint
```bash
npm run lint
npm run build
```
