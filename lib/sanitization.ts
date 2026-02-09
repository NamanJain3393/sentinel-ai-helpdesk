/**
 * Data sanitization utilities for knowledge base solutions
 * Removes confidential information while preserving technical content
 */

/**
 * Sanitize a solution text by removing personal and confidential information
 */
export function sanitizeSolution(text: string): string {
    if (!text) return "";

    let sanitized = text;

    // Remove email addresses
    sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/gi, "[email]");

    // Remove phone numbers (various formats)
    sanitized = sanitized.replace(/\b\d{10}\b/g, "[phone]");
    sanitized = sanitized.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[phone]");
    sanitized = sanitized.replace(/\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, "[phone]");

    // Remove personal names (capitalized words that appear twice, like "John Smith")
    // This is a heuristic - may need refinement
    // sanitized = sanitized.replace(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, "[technician]");

    // Remove specific user IDs or employee IDs
    sanitized = sanitized.replace(/\b(ID|id|EMP|emp)[-:\s]?\d+\b/gi, "[ID]");

    // Remove IP addresses
    sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP address]");

    // Remove potential passwords/credentials patterns
    sanitized = sanitized.replace(/\b(pwd|password|pass|secret|token|key|cred|credential)s?[:=]\s*\S+/gi, "$1: [REDACTED]");

    // Remove proprietary server names (usually uppercase with numbers)
    sanitized = sanitized.replace(/\b[A-Z]{3,}\d{2,}[A-Z0-9-]*\b/g, "[server]");

    // Generalize location references
    sanitized = sanitized.replace(/\b(Floor|floor|Bldg|Building|building)\s+[A-Z0-9-]+\b/gi, "[location]");
    sanitized = sanitized.replace(/\b(Pillar|pillar|Desk|desk|Room|room)\s+(no\.?|number)?\s*[A-Z0-9-]+\b/gi, "[location]");

    // Remove dates that might be identifying
    sanitized = sanitized.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[date]");

    // Clean up multiple spaces
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
}

/**
 * Generalize a solution to make it more reusable
 */
export function generalizeSolution(text: string): string {
    if (!text) return "";

    let generalized = sanitizeSolution(text);

    // Convert specific device names to generic terms
    generalized = generalized.replace(/\b[A-Z]{2,}-[A-Z0-9-]+-[A-Z0-9-]+\b/g, "[device]");

    // Simplify resolution language
    generalized = generalized.replace(/Resolution:?\s*/gi, "");
    generalized = generalized.replace(/Issue Diagnostics:?\s*/gi, "");
    generalized = generalized.replace(/UPDATE[-:]?\s*/gi, "");

    // Remove signature-like patterns
    generalized = generalized.replace(/Thanks[\s\S]*?Regards,?[\s\S]*?$/gim, "");
    generalized = generalized.replace(/Best[\s\S]*?Regards,?[\s\S]*?$/gim, "");

    return generalized.trim();
}

/**
 * Extract the core issue from a ticket description
 */
export function extractIssue(description: string): string {
    if (!description) return "";

    // Remove common prefixes
    let issue = description.replace(/^(Dear|Hi|Hello)[\s\S]*?,\s*/i, "");

    // Take first sentence or first 200 characters
    const firstSentence = issue.match(/^[^.!?]+[.!?]/);
    if (firstSentence) {
        return firstSentence[0].trim();
    }

    return issue.substring(0, 200).trim() + (issue.length > 200 ? "..." : "");
}

/**
 * Format a solution as professional troubleshooting steps
 */
export function formatAsSteps(solution: string): string {
    if (!solution) return "";

    let sanitized = generalizeSolution(solution);

    // Remove markdown formatting
    sanitized = sanitized
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/^#+\s+/gm, '') // Remove headers
        .replace(/^[-*•]\s+/gm, '') // Remove bullet points
        .trim();

    // Split by newlines or periods to create steps
    const lines = sanitized.split(/\n+/).filter(s => s.trim().length > 5);

    if (lines.length > 1) {
        // Already has multiple lines, number them
        return lines.map((line, i) => {
            // Remove existing numbering if present
            const cleaned = line.replace(/^\d+\.?\s*/, '').trim();
            return `${i + 1}. ${cleaned}`;
        }).join('\n');
    }

    // Single line or short text, try to break by sentences
    const sentences = sanitized.split(/[.!]\\s+/).filter(s => s.trim().length > 10);

    if (sentences.length <= 1) {
        return sanitized;
    }

    return sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join("\n");
}
