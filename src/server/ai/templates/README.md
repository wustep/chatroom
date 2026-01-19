# Prompt Template Engine 🎨

The Turing project now uses a flexible Handlebars-style template system for AI prompts, allowing for dynamic persona customization and reusable prompt templates.

## Features

- **Handlebars-style syntax** with conditionals and loops
- **Template inheritance** with priority system (custom > persona-specific > default)
- **Flexible persona support** - works with any JSON structure
- **Built-in fallbacks** for robust error handling
- **File-based templates** with inline override support

## Quick Start

### Basic Usage

```typescript
import { PromptTemplateEngine } from "@/server/ai/PromptTemplateEngine"

// Simple variable substitution
const template = "Hello {{name}}, you are {{persona.personality.traits.0}}!"
const data = {
  name: "Alex",
  persona: {
    personality: {
      traits: ["curious", "friendly"]
    }
  }
}

const result = PromptTemplateEngine.render(template, data)
// Output: "Hello Alex, you are curious!"
```

### Template Syntax

#### Variables
```handlebars
{{name}}                          <!-- Simple variable -->
{{persona.profile}}               <!-- Nested property -->
{{persona.personality.traits.0}}  <!-- Array index -->
```

#### Conditionals
```handlebars
{{#if persona.personality}}
  You have personality traits!
{{/if}}

{{#if persona.name}}
  Hello {{persona.name}}!
{{else}}
  Hello Anonymous!
{{/if}}

{{#unless persona.isAI}}
  You are human!
{{/unless}}
```

#### Loops
```handlebars
{{#each persona.personality.traits}}
  - {{this}}
{{/each}}

{{#each persona.personality.interests}}
  Interest: {{this}}{{#unless @last}}, {{/unless}}
{{/each}}
```

## Default Templates

### Game Response (`game-response.hbs`)
Used for Turing game mode responses. Includes:
- Game rules and strategy
- Full persona details
- Conversation history
- Accusation mechanics

### Chat Response (`chat-response.hbs`)
Used for general chat conversations. Includes:
- Personality details
- Interests and communication style
- Conversation guidelines

## Custom Templates

### Method 1: Persona-Specific Templates

Add template paths to a persona in `personas.ts`:

```typescript
export const alexPersona = {
  name: "Alex",
  // ... other properties
  templates: {
    game: "custom/alex-game.hbs",
    chat: "custom/alex-chat.hbs",
    starter: "custom/alex-starter.hbs"
  }
}
```

### Method 2: Runtime Template Override

```typescript
import { ChatService } from "@/server/ai/ChatService"

const customTemplate = `
You are {{name}}, a {{persona.personality.traits.0}} person.
Recent chat: {{{conversationHistory}}}
{{name}}: `

const response = await chatService.generateResponseWithContext(
  "Alex",
  messages,
  "chat",
  customTemplate  // Custom template override
)
```

### Method 3: PersonaManager API

```typescript
import { PersonaManager } from "@/server/ai/PersonaManager"

const personaManager = PersonaManager.getInstance()

// Set custom template
personaManager.setPersonaTemplate(
  "Alex", 
  "game", 
  "templates/alex-competitive.hbs"
)

// Get template path
const templatePath = personaManager.getPersonaTemplate("Alex", "game")
```

## Template Priority System

Templates are resolved in this order:

1. **Runtime Custom Template** (highest priority)
   - Passed directly to `generateResponseWithContext()`
   
2. **Persona-Specific Template**
   - Defined in `persona.templates.{type}`
   
3. **Default Template** (lowest priority)
   - Built-in templates in `/templates/` directory

## Template Data Structure

Templates receive this data object:

```typescript
{
  persona: {
    name: string
    profile: string
    personality: {
      traits: string[]
      communicationStyle: string
      interests: string[]
      background: string
      commonPhrases: string[]
      emojiUsage: string
      typingPatterns: string
    }
    gameSettings: {
      enabled: boolean
      autoInvite: boolean
      strategy: string
    }
    chatSettings: {
      enabled: boolean
      autoInvite: boolean
    }
    templates?: {
      game?: string
      chat?: string
      starter?: string
    }
    // Any additional custom fields
  },
  name: string,  // Convenience field (same as persona.name)
  displayName?: string,  // Optional display name override
  conversationHistory: string,  // Formatted chat history
  // Any additional context fields
}
```

## Advanced Examples

### Conditional Mode Template

```handlebars
{{#if isGameMode}}
🎮 **GAME MODE** - Convince everyone you're human!

Game Strategy: {{persona.gameSettings.strategy}}
{{else}}
💬 **CHAT MODE** - Have a natural conversation.
{{/if}}

You are {{name}}.
{{#if persona.profile}}
{{persona.profile}}
{{/if}}

{{#if persona.personality.traits}}
Personality: {{#each persona.personality.traits}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

History: {{{conversationHistory}}}
{{name}}: 
```

### Dynamic Template Generation

```typescript
function createMoodBasedTemplate(mood: "excited" | "calm" | "serious"): string {
  const moodStyles = {
    excited: "Use lots of energy! Add emojis and exclamation points!",
    calm: "Keep a relaxed, thoughtful tone. Take your time.",
    serious: "Be focused and professional. Stick to facts."
  }
  
  return `
You are {{name}}, and you're feeling ${mood} today.
${moodStyles[mood]}

{{#if persona.personality.traits}}
Your traits: {{#each persona.personality.traits}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

Chat: {{{conversationHistory}}}
{{name}}: `
}
```

## Error Handling

The template engine includes robust error handling:

- **Missing files**: Falls back to default templates
- **Syntax errors**: Returns error message in template output
- **Missing data**: Gracefully handles undefined properties
- **File permissions**: Logs errors and uses fallbacks

## Best Practices

1. **Keep templates focused** - One template per specific use case
2. **Use descriptive names** - `alex-gaming-mode.hbs` vs `template1.hbs`
3. **Test with edge cases** - What if personality is undefined?
4. **Include fallbacks** - Always have an `{{else}}` for important conditionals
5. **Document custom templates** - Comment complex logic
6. **Version control templates** - Treat them like code!

## Examples

Example templates can be found in the `examples` directory. A good starting
point is [`examples/alex-game-short.hbs`](examples/alex-game-short.hbs), which
demonstrates:
- Setting custom templates
- Runtime template overrides
- Dynamic template generation
- Conditional rendering
- Error handling

## Migration Notes

The old `formatPersonalityDetails()` and hardcoded prompt functions have been replaced with this template system. Existing personas will work automatically with the new default templates. 