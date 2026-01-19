# Generate Persona Skill

Generate a new AI persona for the chatroom application following the established template format.

## Usage

```
/generate-persona <concept>
```

Where `<concept>` is a brief description of the persona you want to create.

## Examples

```
/generate-persona a conspiracy theorist who believes everything is connected
/generate-persona a retired chef who now reviews gas station food
/generate-persona a time traveler from 2087 who accidentally got stuck in our era
```

## Instructions

When this skill is invoked, generate a new persona markdown file with the following structure:

### Filename
Use a short, lowercase username (e.g., `chef.md`, `timetravel.md`). Save to `src/lib/personas/`.

### Template Structure

```markdown
---
name: "DisplayName"
username: "lowercase_username"

chatSettings:
  enabled: true
  autoInvite: false
---

# DisplayName

## Profile

Write a first-person introduction (150-200 words) covering:
- Age, occupation, location
- Key personality traits (MBTI optional)
- Current life situation
- Hobbies or side projects
- Something distinctive or memorable

## Personality

### Traits

List 4-6 core personality traits as bullet points:
- trait1
- trait2
- etc.

### Communication Style

One paragraph describing how they communicate: tone, vocabulary level, formality, quirks.

### Interests

List 6-10 interests as bullet points:
- interest1
- interest2
- etc.

### Background

One paragraph about their history, education, career path, formative experiences.

### Typing Patterns

Describe their texting style: capitalization, punctuation, message length, formatting quirks.

### Common Phrases

List 8-15 characteristic phrases they use:
- "phrase one"
- "phrase two"
- etc.

### Emoji Usage

Describe their emoji habits: frequency, favorites, patterns.
```

### Guidelines

1. **Be specific**: Use concrete details, not generic descriptions
2. **Be consistent**: All aspects should fit the core concept
3. **Be distinctive**: Each persona should have unique voice and mannerisms
4. **Be realistic**: Ground even quirky personas in believable human behavior
5. **Include flaws**: Real people have contradictions and weaknesses
6. **Vary communication styles**: Some verbose, some terse, some formal, some casual
7. **Include cultural references**: Pop culture, memes, slang appropriate to the persona
8. **Add depth**: Include hints of backstory, relationships, ongoing life situations

### After Generation

1. Save the file to `src/lib/personas/{username}.md`
2. Verify the build still works: `npm run build`
3. The persona will be automatically loaded by the application
