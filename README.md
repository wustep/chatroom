# Chatroom

Multi-channel AI chat application with personas and theming.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **UI:** shadcn/ui, Tailwind CSS v4
- **Backend:** Express 5, Socket.IO
- **AI:** Anthropic Claude, OpenAI GPT-4

## Development

Install dependencies:
```bash
npm install --legacy-peer-deps
```

Commands:
```bash
npm run dev       # Start app and server in development
npm run dev:none  # Start without AI models (for UI development)
npm run build     # Build app and server for production
npm run lint      # Run ESLint
```

## Model Configuration

The server can be configured to use different AI models via the `DEFAULT_MODEL` environment variable or command line flags.

### Environment Variable
Set `DEFAULT_MODEL` in your `.env` file:
```
DEFAULT_MODEL=claude-3-5-sonnet-20241022
```

### Command Line
```bash
npm run server -- --model claude-3-5-sonnet-20241022
```

## Personas

AI personas are defined in `src/lib/personas/*.md` files. Each persona has:
- YAML frontmatter with name, username, and settings
- Markdown body with profile, personality traits, communication style, etc.

## Chat Commands

Users can use these in-chat:
- `/join #channel` - Join a channel
- `/invite PersonaName` - Invite an AI persona
- `/kick PersonaName` - Remove an AI persona
- `/topic "New topic"` - Set channel topic
