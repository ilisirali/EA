const { ESLint } = require("eslint");
const fs = require("fs");

(async function main() {
    const eslint = new ESLint();
    const results = await eslint.lintFiles(["src/**/*.tsx", "src/**/*.ts"]);

    let output = "";
    for (const result of results) {
        if (result.errorCount > 0 || result.warningCount > 0) {
            output += `\n${result.filePath}\n`;
            for (const msg of result.messages) {
                output += `  Line ${msg.line}: ${msg.message} (${msg.ruleId})\n`;
            }
        }
    }

    fs.writeFileSync("lint_results.txt", output, "utf8");
})().catch(console.error);
