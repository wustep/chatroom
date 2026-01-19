const adjectives = [
	"Silly",
	"Wacky",
	"Goofy",
	"Zany",
	"Clever",
	"Daring",
	"Mystic",
	"Cosmic",
	"Robo",
	"Cyber",
	"Sneaky",
	"Tricky",
	"Brave",
	"Bold",
	"Swift",
	"Agile",
	"Gentle",
	"Quiet",
	"Lucky",
	"Magic",
]

const nouns = [
	"Wombat",
	"Narwhal",
	"Penguin",
	"Capybara",
	"Fox",
	"Badger",
	"Otter",
	"Panda",
	"Sloth",
	"Quokka",
	"Robot",
	"Android",
	"Cipher",
	"Sprite",
	"Phantom",
	"Specter",
	"Jester",
	"Oracle",
	"Golem",
	"Sphinx",
]

export function generateSillyName(): string {
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
	const noun = nouns[Math.floor(Math.random() * nouns.length)]
	const num = Math.floor(Math.random() * 100)
	return `${adj}${noun}${num}`
}
