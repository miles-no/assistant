# Fuzzy Matching - Work in Progress

## Current Status

Fuzzy matching logic is **implemented and working** when tested in isolation, but **not yet integrated** with the LLM flow properly.

## What Works

### Fuzzy Match Module (`fuzzy-match.js`)
- ✅ Levenshtein distance calculation
- ✅ Substring matching with high confidence (80%+)
- ✅ 2-word phrase matching (e.g., "virtul lab" → "Virtual Lab D")
- ✅ Misspelling correction with lower threshold (45%+)
- ✅ Common word filtering (avoids false positives like "meeting" → "Meeting Room C")
- ✅ Exact match detection (skips replacement when full room name present)

### Test Results
```bash
node test-fuzzy.js
```
All test cases pass:
- "conference" → "Conference Room A" ✓
- "focus" → "Focus Pod B" ✓
- "virtual" → "Virtual Lab D" ✓
- "presentation" → "Presentation Suite" ✓
- "focuss" (typo) → "Focus Pod B" ✓
- "virtul lab" (typo) → "Virtual Lab D" ✓
- "Conference Room A" → no change (already correct) ✓

## What Doesn't Work

### Playwright Tests Failing (9/10 failed)
```bash
npx playwright test fuzzy-matching.spec.js
```

**Root Cause**: LLM returns incorrect room names despite fuzzy-corrected input:
- Input: "book focus tomorrow"
- Fuzzy-corrected: "book Focus Pod B tomorrow" ✅
- LLM still returns: "Focus Room" ❌ (doesn't exist in database)

**Why**: The LLM is extracting room names independently from the corrected input, likely using its own pattern matching or prior training.

## Architecture Issue

Current flow:
```
User Input → Fuzzy Matching → Corrected Input → LLM → Tool Call (wrong room name)
```

The problem: LLM doesn't respect the corrected room name in the input.

## Possible Solutions (To Investigate)

### Option 1: Add Room Names to System Prompt
Add the valid room list to IRIS_SYSTEM_PROMPT so LLM knows what rooms exist:
```javascript
const IRIS_SYSTEM_PROMPT = `
...
AVAILABLE ROOMS:
- Conference Room A
- Focus Pod B
- Meeting Room C
- Virtual Lab D
- Presentation Suite

When extracting room names, ONLY use names from this list.
`;
```

### Option 2: Post-LLM Room Name Correction
Apply fuzzy matching AFTER the LLM extracts a room name:
```javascript
// In executeMCPTool() or tool parsing
if (toolCall.name === 'create_booking' && toolCall.arguments.roomName) {
    const corrected = findBestRoomMatch(toolCall.arguments.roomName, getRoomNames());
    if (corrected.confidence >= 60) {
        toolCall.arguments.roomName = corrected.match;
    }
}
```

### Option 3: Room Name Validation Layer
Add validation in the booking tool execution that checks if room exists, and if not, attempts fuzzy match before calling API.

## Files Modified

- `/Users/henry/dev/miles/booking/iris/fuzzy-match.js` - Core fuzzy matching logic
- `/Users/henry/dev/miles/booking/iris/server.js` - Integration (lines 429-442, 204-216)
- `/Users/henry/dev/miles/booking/iris/playwright.config.js` - Headless mode (line 16)
- `/Users/henry/dev/miles/booking/iris/tests/fuzzy-matching.spec.js` - Updated room names
- `/Users/henry/dev/miles/booking/iris/test-fuzzy.js` - Test script

## Next Steps

1. **Choose architectural approach** (Option 1, 2, or 3 above)
2. **Implement chosen solution**
3. **Verify Playwright tests pass**
4. **Clean up test files** (test-fuzzy.js can be removed after testing)
5. **Consider dynamic room fetching** (replace hardcoded list in getRoomNames())

## Testing

```bash
# Test fuzzy logic in isolation
node test-fuzzy.js

# Test integration with Playwright
npx playwright test fuzzy-matching.spec.js

# Test specific case manually
curl -X POST http://localhost:3002/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "book focus tomorrow at 2pm", "userId": "...", "token": "..."}'
```

## Notes

- Fuzzy matching currently processes user input BEFORE LLM
- Room names hardcoded in `getRoomNames()` should eventually be fetched from API
- Consider caching room names with periodic refresh
- Levenshtein distance threshold tuning may be needed based on real-world usage
