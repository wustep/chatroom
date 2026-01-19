# Chatroom - Claude Code Context

## Project Overview

Multi-channel AI chat application with personas and theming. Forked from the Turing project.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Backend**: Express.js 5, Socket.IO, Node.js
- **AI**: Anthropic Claude, OpenAI GPT-4

## Key Directories

- `src/app/` - React application pages and components
- `src/components/` - Reusable UI components (shadcn/ui based)
- `src/lib/personas/` - AI persona definitions (markdown files)
- `src/server/` - Express server and Socket.IO handlers
- `src/styles/themes/` - Theme CSS files (light, dark, mIRC)

## Personas

AI personas are defined in `src/lib/personas/*.md` files. Each persona has:
- YAML frontmatter with name, username, and settings
- Markdown body with profile, personality traits, communication style, etc.

Use `/generate-persona <concept>` to create new personas.

## Commands

- `npm run dev` - Start both app and server in development
- `npm run build` - Build app and server for production
- `npm run lint` - Run ESLint

## Chat Commands

Users can use these in-chat:
- `/join #channel` - Join a channel
- `/invite PersonaName` - Invite an AI persona
- `/kick PersonaName` - Remove an AI persona
- `/topic "New topic"` - Set channel topic

## Skills

- `/generate-persona` - Generate a new AI persona following the template
