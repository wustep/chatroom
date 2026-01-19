/**
 * Generic prompt template engine supporting handlebars-style syntax
 * Supports: {{property}}, {{#if}}, {{#each}}, {{#unless}}, nested properties
 */

import * as fs from "fs"
import * as path from "path"

type TemplateData = Record<string, unknown>

export class PromptTemplateEngine {
	/**
	 * Render a template string with provided data
	 */
	static render(template: string, data: TemplateData): string {
		return this.processTemplate(template, data)
	}

	/**
	 * Render a template file with provided data
	 */
	static renderFile(templatePath: string, data: TemplateData): string {
		const template = fs.readFileSync(templatePath, "utf8")
		return this.render(template, data)
	}

	/**
	 * Get template content based on priority: custom > file > default
	 */
	static getTemplate(
		defaultTemplate: string,
		customTemplate?: string,
		templateFile?: string,
	): string {
		// Priority 1: Custom template passed at runtime
		if (customTemplate) {
			return customTemplate
		}

		// Priority 2: Template file specified
		if (templateFile) {
			try {
				const templatePath = path.resolve(
					process.cwd(),
					"src/server/ai/templates",
					templateFile,
				)
				return fs.readFileSync(templatePath, "utf8")
			} catch {
				console.warn(`Template file ${templateFile} not found, using default`)
			}
		}

		// Priority 3: Default template
		return defaultTemplate
	}

	/**
	 * Process template with handlebars-style syntax
	 */
	private static processTemplate(template: string, data: TemplateData): string {
		let result = template

		// Process block helpers first (if, each, unless)
		result = this.processBlockHelpers(result, data)

		// Process simple variable substitutions
		result = this.processVariables(result, data)

		return result
	}

	/**
	 * Process block helpers: {{#if}}, {{#each}}, {{#unless}}
	 */
	private static processBlockHelpers(
		template: string,
		data: TemplateData,
	): string {
		let result = template

		// Process {{#if}} blocks
		result = this.processIfBlocks(result, data)

		// Process {{#each}} blocks
		result = this.processEachBlocks(result, data)

		// Process {{#unless}} blocks
		result = this.processUnlessBlocks(result, data)

		return result
	}

	/**
	 * Process {{#if property}}...{{/if}} and {{#if property}}...{{else}}...{{/if}}
	 */
	private static processIfBlocks(template: string, data: TemplateData): string {
		const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g
		const ifElseRegex =
			/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g

		// Process if-else blocks first
		template = template.replace(
			ifElseRegex,
			(_, condition, ifBlock, elseBlock) => {
				const value = this.getValue(condition.trim(), data)
				const isTrue = this.isTruthy(value)
				return isTrue ? ifBlock : elseBlock
			},
		)

		// Process simple if blocks
		template = template.replace(ifRegex, (_, condition, ifBlock) => {
			const value = this.getValue(condition.trim(), data)
			const isTrue = this.isTruthy(value)
			return isTrue ? ifBlock : ""
		})

		return template
	}

	/**
	 * Process {{#unless property}}...{{/unless}}
	 */
	private static processUnlessBlocks(
		template: string,
		data: TemplateData,
	): string {
		const unlessRegex = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g

		return template.replace(unlessRegex, (_, condition, block) => {
			const value = this.getValue(condition.trim(), data)
			const isTrue = this.isTruthy(value)
			return !isTrue ? block : ""
		})
	}

	/**
	 * Process {{#each array}}...{{/each}}
	 */
	private static processEachBlocks(
		template: string,
		data: TemplateData,
	): string {
		const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g

		return template.replace(eachRegex, (_, arrayPath, block) => {
			const array = this.getValue(arrayPath.trim(), data)

			if (!Array.isArray(array)) {
				return ""
			}

			return array
				.map((item, index) => {
					let itemBlock = block

					// Replace {{this}} with current item
					itemBlock = itemBlock.replace(/\{\{this\}\}/g, String(item))

					// Replace {{@index}} with current index
					itemBlock = itemBlock.replace(/\{\{@index\}\}/g, String(index))

					// Replace {{@last}} with boolean indicating if this is last item
					itemBlock = itemBlock.replace(
						/\{\{@last\}\}/g,
						String(index === array.length - 1),
					)

					// Replace {{@first}} with boolean indicating if this is first item
					itemBlock = itemBlock.replace(/\{\{@first\}\}/g, String(index === 0))

					return itemBlock
				})
				.join("")
		})
	}

	/**
	 * Process simple variable substitutions: {{property}} and {{property.nested}}
	 */
	private static processVariables(
		template: string,
		data: TemplateData,
	): string {
		// Match {{property}} but not {{#helper}} or {{/helper}}
		const variableRegex = /\{\{(?!#|\/|\{\{)([^}]+)\}\}/g

		return template.replace(variableRegex, (_, path) => {
			const value = this.getValue(path.trim(), data)
			return value != null ? String(value) : ""
		})
	}

	/**
	 * Get nested property value from data object
	 */
	private static getValue(path: string, data: TemplateData): unknown {
		if (path === "this") {
			return data
		}

		const parts = path.split(".")
		let current: unknown = data

		for (const part of parts) {
			if (current == null || typeof current !== "object") {
				return undefined
			}
			current = (current as Record<string, unknown>)[part]
		}

		return current
	}

	/**
	 * Check if a value is truthy (exists and is not empty)
	 */
	private static isTruthy(value: unknown): boolean {
		if (value == null) return false
		if (typeof value === "boolean") return value
		if (typeof value === "string") return value.trim().length > 0
		if (typeof value === "number") return value !== 0
		if (Array.isArray(value)) return value.length > 0
		if (typeof value === "object") return Object.keys(value).length > 0
		return Boolean(value)
	}
}
