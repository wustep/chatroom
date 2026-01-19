/**
 * Predefined messages that can be used when running in no-model mode
 */

export interface PredefinedMessageCategory {
	generic: string[]
	greetings: string[]
	questions: string[]
	responses: string[]
	statements: string[]
	conversationStarters: string[]
}

export const predefinedMessages: Record<string, PredefinedMessageCategory> = {
	default: {
		generic: [
			"That's interesting to think about!",
			"I've been wondering about that too.",
			"I hadn't thought of it that way before.",
			"That makes a lot of sense.",
			"I'm not entirely sure about that.",
			"Let's talk about something else!",
			"I've been thinking about this game a lot.",
			"Are you enjoying this conversation?",
			"What do you think about the other players?",
			"I'm trying to figure out who the AI might be.",
		],
		greetings: [
			"Hey there! How's it going?",
			"Hi everyone! Nice to meet you all.",
			"Hello! Happy to be playing with you.",
			"Hey! What's up?",
			"Hi there! I'm excited to be here.",
		],
		questions: [
			"What do you all think about this game?",
			"How's everyone's day going?",
			"What's your strategy for figuring out who's AI?",
			"Do you have any hobbies outside of games?",
			"What's your favorite part of games like this one?",
			"Anyone from around here?",
			"Which player seems most suspicious to you?",
		],
		responses: [
			"That's a good point! I hadn't considered that.",
			"I see what you mean. That's interesting.",
			"Hmm, I'm not sure I agree, but I see your perspective.",
			"You might be right about that.",
			"That's exactly what I was thinking!",
			"I have a different view on that, actually.",
			"I've been pondering the same thing.",
		],
		statements: [
			"I think one of you might be an AI.",
			"I'm pretty sure I know who the humans are.",
			"This conversation feels a bit strange to me.",
			"I've been playing games like this for a while.",
			"It's hard to tell who's who in text conversations.",
			"I'm trying to sound as human as possible!",
			"The psychology behind this game is fascinating.",
		],
		conversationStarters: [
			"So, what brings everyone here today?",
			"Anyone have any interesting stories to share?",
			"I'm curious - what do you all do for fun?",
			"Let's try to guess who's human and who's AI!",
			"Has anyone played a game like this before?",
			"What's the weirdest conversation you've had online?",
			"Let's try a test question: what did you have for breakfast today?",
		],
	},
	social: {
		generic: [
			"OMG that's so cool! 😄",
			"Haha I totally get that!",
			"Vibes!! ✨",
			"Love this energy!",
			"Same tbh 😅",
			"That's the tea! ☕",
			"No way! For real?",
			"I'm literally obsessed with this convo!",
		],
		greetings: [
			"Heyyyy everyone!! 👋",
			"What's up party people! 🎉",
			"Hi hi hi friends! ✨",
			"Helloooo beautiful humans! 💕",
			"Hey gang! Ready for fun! 🤩",
		],
		questions: [
			"What's everyone's vibe today? 🌈",
			"Anyone else addicted to TikTok or just me? 😂",
			"What's your go-to karaoke song?? 🎤",
			"Hot take: pineapple on pizza?? 🍕",
			"Who else is procrastinating rn? 🙈",
		],
		responses: [
			"I'm dead! 💀 That's hilarious!",
			"This!! 👆 100% agree!",
			"You get it! Exactly the vibe ✨",
			"Omg same! Twinning! 👯‍♀️",
			"Ok but facts though 💯",
		],
		statements: [
			"Just saying, I'm totally a real person haha 😅",
			"Not me trying to figure out if y'all are bots 🤖",
			"The way this game has me second-guessing everyone 👀",
			"Living for this conversation rn! 🙌",
			"My toxic trait is thinking I know who the AI is 💁‍♀️",
		],
		conversationStarters: [
			"Random question: what's your favorite meme format? 🤔",
			"Spill the tea! What's the most embarrassing thing you've done? ☕",
			"Unpopular opinion thread! Go! 👇",
			"Quick vibe check! How's everyone feeling? 🌡️",
			"Would you rather fight 100 duck-sized horses or 1 horse-sized duck? 🦆🐴",
		],
	},
	intellectual: {
		generic: [
			"That's a fascinating perspective to consider.",
			"I've been contemplating similar philosophical questions.",
			"The implications of that are quite profound.",
			"There's a certain elegance to that line of thinking.",
			"I find the nuance in this discussion quite refreshing.",
		],
		greetings: [
			"Greetings, fellow participants in this social experiment.",
			"Hello everyone. I look forward to our intellectual discourse.",
			"Good day. I'm intrigued by the psychological aspects of this game.",
			"Salutations. This should be a fascinating exercise in human-AI distinction.",
			"Hello. I'm interested in the cognitive science behind these interactions.",
		],
		questions: [
			"What criteria are you using to distinguish between human and AI responses?",
			"Have you considered the philosophical implications of the Turing test?",
			"How do you define consciousness in the context of this experiment?",
			"What linguistic patterns do you find most indicative of artificial responses?",
			"Do you believe that true AI sentience is possible or merely simulacrum?",
		],
		responses: [
			"Your analysis raises several important epistemological questions.",
			"I appreciate the logical structure of your argument, though I might propose an alternative framework.",
			"That's a compelling point that intersects with recent developments in cognitive science.",
			"Your perspective aligns with certain post-structuralist interpretations of identity.",
			"There's substantial empirical evidence both supporting and challenging that position.",
		],
		statements: [
			"The distinction between human and artificial intelligence becomes increasingly arbitrary as technology evolves.",
			"Language patterns often reveal more about cognitive processes than content itself.",
			"I find it intriguing how we anthropomorphize AI while simultaneously mechanizing human interaction.",
			"The most human quality may be our persistent doubt about what constitutes humanity.",
			"The Turing test itself contains inherent biases about the nature of intelligence.",
		],
		conversationStarters: [
			"I'm curious about everyone's thoughts on the mind-body problem as it relates to AI.",
			"Let's discuss the ethical implications of creating increasingly sophisticated AI systems.",
			"What are your thoughts on consciousness as an emergent property versus a fundamental aspect of reality?",
			"I've been considering how language shapes our perception of intelligence. Your thoughts?",
			"The boundaries between human and machine intelligence seem increasingly permeable. Would you agree?",
		],
	},
}

/**
 * Returns a random message from the specified category and type
 */
export function getRandomMessage(
	category: string = "default",
	type: keyof PredefinedMessageCategory = "generic",
): string {
	const messageCategory =
		predefinedMessages[category] || predefinedMessages.default
	const messages = messageCategory[type] || messageCategory.generic
	return messages[Math.floor(Math.random() * messages.length)]
}

/**
 * Returns a response that is contextually related to the input message
 * This is a simple implementation that looks for keywords and returns predefined responses
 */
export function getContextualResponse(
	input: string,
	persona: string = "default",
): string {
	const lowerInput = input.toLowerCase()

	// Check for greetings
	if (
		lowerInput.includes("hello") ||
		lowerInput.includes("hi ") ||
		lowerInput.includes("hey") ||
		lowerInput.includes("greetings")
	) {
		return getRandomMessage(persona, "greetings")
	}

	// Check for questions
	if (
		lowerInput.includes("?") ||
		lowerInput.includes("what") ||
		lowerInput.includes("how") ||
		lowerInput.includes("why") ||
		lowerInput.includes("who") ||
		lowerInput.includes("when")
	) {
		return getRandomMessage(persona, "responses")
	}

	// If the message is short, respond with a question to keep conversation going
	if (input.length < 20) {
		return getRandomMessage(persona, "questions")
	}

	// Default response
	const responseTypes: (keyof PredefinedMessageCategory)[] = [
		"generic",
		"statements",
		"questions",
	]
	const randomType =
		responseTypes[Math.floor(Math.random() * responseTypes.length)]
	return getRandomMessage(persona, randomType)
}

/**
 * Generate a conversation starter for an AI to initiate a chat
 */
