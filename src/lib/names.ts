/**
 * Silly random name generator for chat participants
 */

const adjectives = [
	"Quirky",
	"Wonky",
	"Zippy",
	"Bubbly",
	"Fuzzy",
	"Wiggly",
	"Zany",
	"Bouncy",
	"Giggly",
	"Sparkly",
	"Wobbly",
	"Jiggly",
	"Snazzy",
	"Peppy",
	"Dizzy",
	"Jazzy",
	"Wacky",
	"Jumpy",
	"Goofy",
	"Slippy",
]

const nouns = [
	"Panda",
	"Pickle",
	"Noodle",
	"Muffin",
	"Potato",
	"Penguin",
	"Banana",
	"Wizard",
	"Burger",
	"Llama",
	"Waffle",
	"Robot",
	"Narwhal",
	"Badger",
	"Pumpkin",
	"Dragon",
	"Bunny",
	"Squirrel",
	"Cupcake",
	"Gecko",
]

/**
 * Generates a random silly name
 * @returns A randomly generated silly name like "QuirkyPanda" or "WackyNarwhal"
 */
export function generateSillyName(): string {
	const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
	const noun = nouns[Math.floor(Math.random() * nouns.length)]
	return `${adjective}${noun}`
}

/**
 * Generate a unique player ID
 * @returns A string ID for the player
 */
export function generatePlayerId(): string {
	const randomPart = Math.random().toString(36).substring(2, 7)
	return randomPart
}

/**
 * Generate a more realistic first-last name combination for chat mode.
 */
export function generateRealName(): string {
	const firstNames = [
		"Liam",
		"Olivia",
		"Noah",
		"Emma",
		"Oliver",
		"Ava",
		"Elijah",
		"Sophia",
		"William",
		"Isabella",
		"James",
		"Mia",
		"Benjamin",
		"Charlotte",
		"Lucas",
		"Amelia",
		"Henry",
		"Evelyn",
		"Alexander",
		"Harper",
		"Michael",
		"Ella",
		"Ethan",
		"Abigail",
		"Daniel",
		"Emily",
		"Matthew",
		"Elizabeth",
		"Sebastian",
		"Sofia",
	]

	const lastNames = [
		"Smith",
		"Johnson",
		"Williams",
		"Brown",
		"Jones",
		"Garcia",
		"Miller",
		"Davis",
		"Rodriguez",
		"Martinez",
		"Hernandez",
		"Lopez",
		"Gonzalez",
		"Wilson",
		"Anderson",
		"Thomas",
		"Taylor",
		"Moore",
		"Jackson",
		"Martin",
		"Lee",
		"Perez",
		"Thompson",
		"White",
		"Harris",
		"Sanchez",
		"Clark",
		"Ramirez",
		"Lewis",
		"Robinson",
	]

	const first = firstNames[Math.floor(Math.random() * firstNames.length)]
	const last = lastNames[Math.floor(Math.random() * lastNames.length)]
	return `${first} ${last}`
}
