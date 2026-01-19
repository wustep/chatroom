import dotenv from "dotenv"
import { RequestHandler, Router } from "express"
import fetch from "node-fetch"

dotenv.config()

const router = Router()

// --- Authentication Middleware ---
const usageApiAuthToken = process.env.USAGE_API_AUTH_TOKEN

const authenticateUsageApi: RequestHandler = (req, res, next) => {
	if (usageApiAuthToken) {
		const authHeader = req.headers.authorization
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			res
				.status(401)
				.json({ error: "Unauthorized: Missing or invalid bearer token." })
			return
		}

		const token = authHeader.split(" ")[1]
		if (token !== usageApiAuthToken) {
			res.status(401).json({ error: "Unauthorized: Invalid token." })
			return
		}
	}
	next()
}

interface CostResult {
	object: string // "organization.costs.result"
	amount: {
		value: number
		currency: string
	}
	line_item: string | null
	project_id: string | null
}

interface CostBucket {
	object: string // "bucket"
	start_time: number
	end_time: number
	results: CostResult[]
}

/**
 * Structure of the OpenAI costs API response
 */
interface OpenAICostsResponse {
	object: string // "page"
	data: CostBucket[]
	has_more: boolean
	next_page: string | null
}

/**
 * Structure of the OpenAI completions usage API response per OpenAI docs
 */
interface CompletionUsageResult {
	object: string // "organization.usage.completions.result"
	input_tokens: number
	output_tokens: number
	input_cached_tokens: number
	input_audio_tokens: number
	output_audio_tokens: number
	num_model_requests: number
	project_id: string | null
	user_id: string | null
	api_key_id: string | null
	model: string | null
	batch: boolean | null
}

interface CompletionUsageBucket {
	object: string // "bucket"
	start_time: number
	end_time: number
	results: CompletionUsageResult[]
}

// Define structure for the completions usage API response
interface OpenAICompletionsUsageResponse {
	object: string // "page"
	data: CompletionUsageBucket[]
	has_more: boolean
	next_page: string | null
}

// Anthropic doesn't offer a usage API, so we'll need to implement that separately eventually.

const adminKey = process.env.OPENAI_ADMIN_KEY
const OPENAI_COSTS_API_URL = "https://api.openai.com/v1/organization/costs"
const OPENAI_COMPLETIONS_USAGE_API_URL =
	"https://api.openai.com/v1/organization/usage/completions"

interface DailyUsageRecord {
	date: string // YYYY-MM-DD format
	cost: number
	completions?: number
	contextTokens?: number
	generatedTokens?: number
	// New fields for grouped data
	costByLineItem?: Record<string, number>
	completionsByModel?: Record<
		string,
		{
			completions: number
			contextTokens: number
			generatedTokens: number
		}
	>
}

interface OpenAIUsageResponse {
	dailyUsage?: DailyUsageRecord[]
	error?: string
	details?: string
}

interface OpenAIUsageRequestParams {
	startTime?: string
	endTime?: string
}

// --- In-Memory Cache ---
// Cache only stores the totals, not the grouped data for simplicity
const dailyTotalsCache = new Map<
	string,
	Omit<DailyUsageRecord, "costByLineItem" | "completionsByModel">
>()

// --- Helper Functions ---
const formatDateToYYYYMMDD = (date: Date): string => {
	return date.toISOString().split("T")[0]
}

const getStartOfDayUTC = (date: Date): Date => {
	const startOfDay = new Date(date)
	startOfDay.setUTCHours(0, 0, 0, 0)
	return startOfDay
}

/**
 * @description Fetches the OpenAI cost and completion usage data using daily aggregation.
 * Returns total daily usage AND usage grouped by line_item (costs) and model (completions).
 * Implements in-memory caching for *total* usage of past days. Grouped data is always fetched.
 * Requires Bearer token authentication if USAGE_API_AUTH_TOKEN is set.
 */
const fetchOpenAIUsage: RequestHandler<
	OpenAIUsageRequestParams,
	OpenAIUsageResponse
> = async (req, res) => {
	if (!adminKey) {
		res
			.status(503)
			.json({ error: "OpenAI Admin Key not configured or invalid." })
		return
	}

	try {
		// 1. Parse Request Dates and Get Current Date (UTC)
		const requestedStartTime = parseInt(req.query.startTime as string, 10)
		const requestedEndTime = parseInt(req.query.endTime as string, 10)

		if (isNaN(requestedStartTime) || isNaN(requestedEndTime)) {
			throw new Error("Invalid startTime or endTime.")
		}

		const requestedStartDate = getStartOfDayUTC(
			new Date(requestedStartTime * 1000),
		)
		// Adjust end date to be inclusive for the loop logic
		const requestedEndDateInclusive = new Date(requestedEndTime * 1000)
		// Make sure end date is at least start date
		if (requestedEndDateInclusive < requestedStartDate) {
			throw new Error("End time cannot be before start time.")
		}
		const todayUTC = getStartOfDayUTC(new Date())

		// 2. Identify Dates to Fetch (always fetch for grouped data)
		const finalUsageDataMap = new Map<string, DailyUsageRecord>()
		const datesToFetch = new Set<string>()
		let earliestDateToFetch: Date | null = null
		let latestDateToFetch: Date | null = null // This will be the *inclusive* end date

		const currentDate = new Date(requestedStartDate)
		while (currentDate <= requestedEndDateInclusive) {
			const dateStr = formatDateToYYYYMMDD(currentDate)
			datesToFetch.add(dateStr) // Always add date to fetch for grouped data

			// Initialize map entry with cached totals if available for past dates
			const isPastDate = currentDate < todayUTC
			if (isPastDate && dailyTotalsCache.has(dateStr)) {
				finalUsageDataMap.set(dateStr, {
					...dailyTotalsCache.get(dateStr)!,
					costByLineItem: {}, // Initialize empty, will be populated by fetch
					completionsByModel: {}, // Initialize empty
				})
			} else {
				// Initialize with zeros if not cached
				finalUsageDataMap.set(dateStr, {
					date: dateStr,
					cost: 0,
					completions: 0,
					contextTokens: 0,
					generatedTokens: 0,
					costByLineItem: {},
					completionsByModel: {},
				})
			}

			if (!earliestDateToFetch || currentDate < earliestDateToFetch) {
				earliestDateToFetch = new Date(currentDate)
			}
			// Keep track of the latest date we *actually* need to query for
			if (!latestDateToFetch || currentDate > latestDateToFetch) {
				latestDateToFetch = new Date(currentDate)
			}

			currentDate.setUTCDate(currentDate.getUTCDate() + 1)
		}

		// 3. Fetch Data from API if Necessary
		if (datesToFetch.size > 0 && earliestDateToFetch && latestDateToFetch) {
			const apiStartTime = Math.floor(earliestDateToFetch.getTime() / 1000)
			// API end_time is exclusive, so add one day to the *inclusive* latest date
			const apiEndTimeExclusive = new Date(latestDateToFetch)
			apiEndTimeExclusive.setUTCDate(apiEndTimeExclusive.getUTCDate() + 1)
			const apiEndTime = Math.floor(apiEndTimeExclusive.getTime() / 1000)

			const headers = {
				Authorization: `Bearer ${adminKey}`,
				"Content-Type": "application/json",
			}

			// --- Paginated Fetch Function ---
			const fetchPaginatedData = async <
				ResponseType extends {
					data: BucketType[]
					has_more: boolean
					next_page: string | null
				},
				BucketType,
			>(
				initialUrl: URL,
			): Promise<BucketType[]> => {
				let allData: BucketType[] = []
				let currentUrl: URL | null = initialUrl
				let pageCount = 0

				while (currentUrl) {
					pageCount++
					// console.log(`Fetching page ${pageCount} for ${initialUrl.pathname}...`);
					const responseRaw = await fetch(currentUrl.toString(), {
						method: "GET",
						headers,
					})

					if (!responseRaw.ok) {
						const errorBody = await responseRaw.json().catch(() => ({}))
						console.error(
							`[fetchPaginatedData] API Error (${responseRaw.status}) on page ${pageCount} for ${initialUrl.pathname}:`,
							JSON.stringify(errorBody, null, 2),
						)
						// Try to return partial data if some pages succeeded
						console.warn(
							`Returning partial data for ${initialUrl.pathname} due to error.`,
						)
						currentUrl = null // Stop pagination
						break
					}

					const responseJson = (await responseRaw.json()) as ResponseType
					allData = allData.concat(responseJson.data)

					if (responseJson.has_more && responseJson.next_page) {
						const nextCursor = responseJson.next_page
						// Creating a completely new URL object ensures searchParams are clean
						const nextPageUrl = new URL(initialUrl.origin + initialUrl.pathname)
						initialUrl.searchParams.forEach((value, key) => {
							if (key !== "page") {
								nextPageUrl.searchParams.set(key, value)
							}
						})
						nextPageUrl.searchParams.set("page", nextCursor)
						currentUrl = nextPageUrl
						// console.log("Next page URL:", currentUrl.toString());
					} else {
						currentUrl = null
					}
				}
				// console.log(`Finished fetching ${allData.length} buckets for ${initialUrl.pathname}`);
				return allData
			}
			// --- End Paginated Fetch Function ---

			// Prepare initial URLs for the required range
			const costUrl = new URL(OPENAI_COSTS_API_URL)
			Object.entries({
				start_time: String(apiStartTime),
				end_time: String(apiEndTime),
				bucket_width: "1d",
				group_by: "line_item", // Keep this group_by
				limit: "180", // Max limit for daily cost buckets
			}).forEach(([key, value]) => costUrl.searchParams.append(key, value))

			const completionsUrl = new URL(OPENAI_COMPLETIONS_USAGE_API_URL)
			Object.entries({
				start_time: String(apiStartTime),
				end_time: String(apiEndTime),
				bucket_width: "1d",
				group_by: "model", // Keep this group_by
				limit: "31", // Max limit for daily completion buckets
			}).forEach(([key, value]) =>
				completionsUrl.searchParams.append(key, value),
			)

			// Fetch all pages for both endpoints in parallel
			const [allCostBuckets, allCompletionBuckets] = await Promise.all([
				fetchPaginatedData<OpenAICostsResponse, CostBucket>(costUrl),
				fetchPaginatedData<
					OpenAICompletionsUsageResponse,
					CompletionUsageBucket
				>(completionsUrl),
			])

			// 4. Process API Results, updating the finalUsageDataMap
			// Clear existing totals and grouped data for fetched dates before processing new results
			datesToFetch.forEach(dateStr => {
				const record = finalUsageDataMap.get(dateStr)
				if (record) {
					record.cost = 0
					record.completions = 0
					record.contextTokens = 0
					record.generatedTokens = 0
					record.costByLineItem = {}
					record.completionsByModel = {}
				}
			})

			// Process Cost Buckets
			allCostBuckets.forEach((bucket: CostBucket) => {
				const dateStr = formatDateToYYYYMMDD(new Date(bucket.start_time * 1000))
				if (finalUsageDataMap.has(dateStr)) {
					const record = finalUsageDataMap.get(dateStr)!
					for (const result of bucket.results) {
						const lineItem = result.line_item || "Unknown"
						const cost = result.amount.value

						// Add to total cost for the day
						record.cost = (record.cost || 0) + cost

						// Add to grouped cost
						record.costByLineItem![lineItem] =
							(record.costByLineItem![lineItem] || 0) + cost
					}
				}
			})

			// Process Completion Buckets
			allCompletionBuckets.forEach((bucket: CompletionUsageBucket) => {
				const dateStr = formatDateToYYYYMMDD(new Date(bucket.start_time * 1000))
				if (finalUsageDataMap.has(dateStr)) {
					const record = finalUsageDataMap.get(dateStr)!
					for (const result of bucket.results) {
						const model = result.model || "Unknown"
						const completions = result.num_model_requests
						const contextTokens = result.input_tokens
						const generatedTokens = result.output_tokens

						// Add to totals for the day
						record.completions = (record.completions || 0) + completions
						record.contextTokens = (record.contextTokens || 0) + contextTokens
						record.generatedTokens =
							(record.generatedTokens || 0) + generatedTokens

						// Add to grouped completions
						if (!record.completionsByModel![model]) {
							record.completionsByModel![model] = {
								completions: 0,
								contextTokens: 0,
								generatedTokens: 0,
							}
						}
						record.completionsByModel![model].completions += completions
						record.completionsByModel![model].contextTokens += contextTokens
						record.completionsByModel![model].generatedTokens += generatedTokens
					}
				}
			})

			// 5. Update Cache with new *totals* for past dates
			finalUsageDataMap.forEach((record, dateStr) => {
				const recordDate = getStartOfDayUTC(new Date(dateStr))
				// Cache only the totals
				if (recordDate < todayUTC) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { costByLineItem, completionsByModel, ...totals } = record
					dailyTotalsCache.set(dateStr, totals)
				}
			})
		}

		// 6. Convert Map to Array, Sort and Return
		const finalUsageData = Array.from(finalUsageDataMap.values())
		finalUsageData.sort((a, b) => a.date.localeCompare(b.date))

		res.json({ dailyUsage: finalUsageData })
	} catch (error: unknown) {
		console.error("Error fetching OpenAI usage:", error)
		const message =
			error instanceof Error ? error.message : "An unknown error occurred"
		res
			.status(500)
			.json({ error: "Failed to fetch OpenAI usage", details: message })
	}
}

// Apply the authentication middleware ONLY to the /openai route
router.get("/openai", authenticateUsageApi, fetchOpenAIUsage)

export default router
