# Turing

## Concept

Turing is a web-based social deduction game where players must decipher who is human and who is AI.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **UI:** shadcn/ui, Tailwind CSS
- **Backend:** Express, Socket.io
- **Tooling:** Storybook, ESLint, Prettier, Vitest

## Development

To install dependencies, run:
```bash
npm install --legacy-peer-deps
```

Commands: 
```
npm run start           - start app, storybook, and server
npm run app             - start app in dev mode
npm run server          - start server in dev mode
npm run storybook       - start storybook in dev mode
npm run build:storybook - build storybook
npm run build:app       - build app
npm run build:server    - build server
npm test                - run tests
```

## Model Configuration

The server can be configured to use different AI models. By default, it uses `gpt-4.1-nano`, but you can specify a different model in several ways:

### Option 1: Direct flag (recommended)
```bash
npm run start --model o3
```

### Option 2: Convenience scripts
```bash
npm run start:o3        # Use o3 model
npm run start:gpt4      # Use gpt-4o model  
npm run start:claude3.5 # Use Claude 3.5 Sonnet
npm run start:haiku     # Use Claude 3 Haiku
npm run start:no-model  # Disable AI models
```

### Option 3: Legacy format (still works)
```bash
npm run start -- --model o3
```