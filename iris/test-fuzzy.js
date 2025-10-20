import { fuzzyReplaceRoomNames } from './fuzzy-match.js';

const roomNames = [
    'Conference Room A',
    'Focus Pod B',
    'Meeting Room C',
    'Virtual Lab D',
    'Presentation Suite'
];

const testCases = [
    'when is conference available tomorrow?',
    'book focus tomorrow at 2pm for 1 hour',
    'is meeting available?',
    'book virtual tomorrow at 3pm',
    'show me presentation availability',
    'book focuss tomorrow',
    'book Conference Room A tomorrow at 2pm',
    'when is CONFERENCE ROOM A available?',
    'book virtul lab tomorrow',
    'can I book focus for a meeting tomorrow afternoon?'
];

console.log('='.repeat(60));
console.log('Fuzzy Matching Test');
console.log('='.repeat(60));

testCases.forEach((command, index) => {
    console.log(`\nTest ${index + 1}: "${command}"`);
    const result = fuzzyReplaceRoomNames(command, roomNames);

    if (result.replacements.length > 0) {
        console.log('✓ Replacements found:');
        result.replacements.forEach(r => {
            console.log(`  "${r.original}" → "${r.replacement}" (${r.confidence.toFixed(1)}% confidence)`);
        });
        console.log(`  Corrected: "${result.correctedInput}"`);
        console.log(`  Overall confidence: ${result.confidence}`);
    } else {
        console.log('✗ No replacements (no fuzzy matches found)');
    }
});
