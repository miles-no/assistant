/**
 * Fuzzy Matching Utility for Room Names
 * Uses Levenshtein distance algorithm for string similarity
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
function levenshteinDistance(a, b) {
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-100) between two strings
 * @param {string} input - User input
 * @param {string} target - Target string to match against
 * @returns {number} - Similarity percentage (0-100)
 */
function calculateSimilarity(input, target) {
    // Normalize strings (lowercase, trim)
    const normalizedInput = input.toLowerCase().trim();
    const normalizedTarget = target.toLowerCase().trim();

    // Exact match
    if (normalizedInput === normalizedTarget) {
        return 100;
    }

    // Check if input is substring of target
    if (normalizedTarget.includes(normalizedInput)) {
        // Higher score for substring matches
        return 85 + (15 * (normalizedInput.length / normalizedTarget.length));
    }

    // Check if target is substring of input
    if (normalizedInput.includes(normalizedTarget)) {
        return 85 + (15 * (normalizedTarget.length / normalizedInput.length));
    }

    // Calculate Levenshtein distance
    const distance = levenshteinDistance(normalizedInput, normalizedTarget);
    const maxLength = Math.max(normalizedInput.length, normalizedTarget.length);

    // Convert distance to similarity percentage
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return Math.max(0, similarity);
}

/**
 * Find best matching room name with confidence score
 * @param {string} input - User input (e.g., "teamrom", "focus", "skagen")
 * @param {Array<string>} roomNames - Available room names
 * @returns {Object} - { match: string, confidence: number (0-100), allMatches: Array }
 */
export function findBestRoomMatch(input, roomNames) {
    if (!input || !roomNames || roomNames.length === 0) {
        return { match: null, confidence: 0, allMatches: [] };
    }

    // Calculate similarity for each room
    const matches = roomNames.map(roomName => ({
        name: roomName,
        confidence: calculateSimilarity(input, roomName)
    }));

    // Sort by confidence (descending)
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
        match: matches[0].name,
        confidence: matches[0].confidence,
        allMatches: matches
    };
}

/**
 * Get confidence level category
 * @param {number} confidence - Confidence score (0-100)
 * @returns {string} - 'high' | 'medium' | 'low'
 */
export function getConfidenceLevel(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 40) return 'medium';
    return 'low';
}

/**
 * Replace room names in user input with fuzzy matched names
 * @param {string} input - User input command
 * @param {Array<string>} roomNames - Available room names
 * @returns {Object} - { correctedInput: string, replacements: Array, confidence: string }
 */
export function fuzzyReplaceRoomNames(input, roomNames) {
    if (!input || !roomNames || roomNames.length === 0) {
        return { correctedInput: input, replacements: [], confidence: 'low' };
    }

    const normalizedInput = input.toLowerCase();

    // Step 1: Check if input already contains an exact room name match
    // If so, don't do any fuzzy matching - it's already correct
    for (const roomName of roomNames) {
        if (normalizedInput.includes(roomName.toLowerCase())) {
            return { correctedInput: input, replacements: [], confidence: 'high' };
        }
    }

    // Step 2: Try to find a room reference
    // Prioritize single high-confidence words, then try 2-word phrases
    const words = input.split(/\s+/);
    const commonWords = ['book', 'when', 'available', 'tomorrow', 'today', 'show', 'is', 'the', 'for', 'at', 'on', 'in', 'a', 'an', 'can', 'could', 'would', 'meeting', 'room', 'lab'];

    let bestMatch = null;
    let bestWord = null;

    // First try: Single words with high confidence (substring matches)
    for (const word of words) {
        // Skip very short words and common words
        if (word.length < 4) continue;
        if (commonWords.includes(word.toLowerCase())) continue;

        const result = findBestRoomMatch(word, roomNames);

        // High confidence threshold for single words (80%+)
        // This catches clear substring matches like "conference" in "Conference Room A"
        if (result.confidence >= 80) {
            if (!bestMatch || result.confidence > bestMatch.confidence) {
                bestMatch = result;
                bestWord = word;
            }
        }
    }

    // If no high-confidence single word, try 2-word combinations
    // This catches patterns like "virtul lab" that need both words
    if (!bestMatch) {
        for (let i = 0; i < words.length - 1; i++) {
            const twoWords = `${words[i]} ${words[i + 1]}`;
            if (twoWords.length < 6) continue;

            const result = findBestRoomMatch(twoWords, roomNames);
            if (result.confidence >= 60) { // Higher threshold for 2-word phrases
                if (!bestMatch || result.confidence > bestMatch.confidence) {
                    bestMatch = result;
                    bestWord = twoWords;
                }
            }
        }
    }

    // Last resort: Single words with lower confidence (misspellings)
    if (!bestMatch) {
        for (const word of words) {
            if (word.length < 4) continue;
            if (commonWords.includes(word.toLowerCase())) continue;

            const result = findBestRoomMatch(word, roomNames);

            // Lower threshold to catch misspellings like "focuss" (45%+)
            if (result.confidence >= 45) {
                if (!bestMatch || result.confidence > bestMatch.confidence) {
                    bestMatch = result;
                    bestWord = word;
                }
            }
        }
    }

    // Step 3: If we found a good match, replace ONLY that word
    if (bestMatch && bestWord) {
        const regex = new RegExp(`\\b${bestWord}\\b`, 'gi');
        const correctedInput = input.replace(regex, bestMatch.match);

        return {
            correctedInput,
            replacements: [{
                original: bestWord,
                replacement: bestMatch.match,
                confidence: bestMatch.confidence
            }],
            confidence: getConfidenceLevel(bestMatch.confidence)
        };
    }

    // No fuzzy matches found
    return { correctedInput: input, replacements: [], confidence: 'low' };
}

export default {
    findBestRoomMatch,
    getConfidenceLevel,
    fuzzyReplaceRoomNames
};
