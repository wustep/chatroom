# Prompt Template Engine

Chatroom uses a flexible Handlebars-style template system for AI prompts, allowing for dynamic persona customization and reusable prompt templates.

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

### Chat Response (`chat-response.hbs`)
Used for chat conversations. Includes:
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
  customTemplate
)
```

### Method 3: PersonaManager API

```typescript
import { PersonaManager } from "@/server/ai/PersonaManager"

const personaManager = PersonaManager.getInstance()

// Set custom template
personaManager.setPersonaTemplate(
  "Alex",
  "chat",
  "templates/alex-conversational.hbs"
)

// Get template path
const templatePath = personaManager.getPersonaTemplate("Alex", "chat")
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
    chatSettings: {
      enabled: boolean
      autoInvite: boolean
    }
    templates?: {
      chat?: string
      starter?: string
    }
    // Any additional custom fields
  },
  name: string,  // Convenience field (same as persona.name)
  conversationHistory: string,  // Formatted chat history
  // Any additional context fields
}
```

## Advanced Examples

### Conditional Template

```handlebars
💬 **CHAT MODE** - Have a natural conversation.

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
2. **Use descriptive names** - `alex-conversational.hbs` vs `template1.hbs`
3. **Test with edge cases** - What if personality is undefined?
4. **Include fallbacks** - Always have an `{{else}}` for important conditionals
5. **Document custom templates** - Comment complex logic
6. **Version control templates** - Treat them like code!
