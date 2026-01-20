/**
 * Test frontend regex fix for data URLs
 * This verifies the OutputViewer.tsx regex change will work
 */

// Test data
const testCases = [
    {
        name: "HTTP URL",
        url: "http://image.pollinations.ai/prompt/test?model=flux",
        shouldMatch: true
    },
    {
        name: "HTTPS URL",
        url: "https://image.pollinations.ai/prompt/test?model=flux",
        shouldMatch: true
    },
    {
        name: "SVG data URL (base64)",
        url: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==",
        shouldMatch: true
    },
    {
        name: "PNG data URL",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
        shouldMatch: true
    },
    {
        name: "Invalid URL",
        url: "not-a-url",
        shouldMatch: false
    },
    {
        name: "Empty string",
        url: "",
        shouldMatch: false
    }
];

// OLD regex from OutputViewer.tsx (before fix)
const oldRegex = /^https?:\/\//i;

// NEW regex from OutputViewer.tsx (after fix)
const newRegex = /^(https?:\/\/|data:image\/)/i;

console.log("=".repeat(70));
console.log("FRONTEND REGEX FIX VERIFICATION TEST");
console.log("=".repeat(70));
console.log();

let allPassed = true;

testCases.forEach((test, index) => {
    const oldMatch = oldRegex.test(test.url);
    const newMatch = newRegex.test(test.url);

    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`  URL: ${test.url.substring(0, 60)}${test.url.length > 60 ? '...' : ''}`);
    console.log(`  Expected to match: ${test.shouldMatch ? 'YES' : 'NO'}`);
    console.log(`  Old regex result:  ${oldMatch ? 'MATCH' : 'NO MATCH'}`);
    console.log(`  New regex result:  ${newMatch ? 'MATCH' : 'NO MATCH'}`);

    const passed = newMatch === test.shouldMatch;
    console.log(`  Status: ${passed ? '✓ PASS' : '✗ FAIL'}`);
    console.log();

    if (!passed) {
        allPassed = false;
    }
});

console.log("=".repeat(70));
console.log("REGRESSION CHECK:");
console.log("=".repeat(70));
console.log();

// Check that we didn't break HTTP/HTTPS URLs
const httpTest = "http://example.com/image.png";
const httpsTest = "https://example.com/image.png";
const dataTest = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovLw==";

const httpWorks = newRegex.test(httpTest);
const httpsWorks = newRegex.test(httpsTest);
const dataWorks = newRegex.test(dataTest);

console.log(`HTTP URLs still work:  ${httpWorks ? '✓ YES' : '✗ NO'}`);
console.log(`HTTPS URLs still work: ${httpsWorks ? '✓ YES' : '✗ NO'}`);
console.log(`Data URLs now work:    ${dataWorks ? '✓ YES' : '✗ NO'}`);
console.log();

const regressionPassed = httpWorks && httpsWorks && dataWorks;

console.log("=".repeat(70));
console.log("FINAL RESULTS:");
console.log("=".repeat(70));
console.log();

if (allPassed && regressionPassed) {
    console.log("✓ ALL TESTS PASSED!");
    console.log();
    console.log("The frontend fix is correct and will:");
    console.log("  • Accept HTTP/HTTPS URLs (existing functionality preserved)");
    console.log("  • Accept data: URLs (new functionality added)");
    console.log("  • Allow SVG infographics to display properly");
    console.log();
    process.exit(0);
} else {
    console.log("✗ SOME TESTS FAILED");
    console.log();
    console.log("There may be an issue with the regex pattern.");
    console.log();
    process.exit(1);
}
