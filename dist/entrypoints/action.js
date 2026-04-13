/**
 * CI helper entrypoint for the GitHub Action.
 */
import { runPackageScannerAction } from "../application/run-package-scanner-action.js";
function writeStdout(message) {
    process.stdout.write(`${message}\n`);
}
function writeStderr(message) {
    process.stderr.write(`${message}\n`);
}
try {
    const result = await runPackageScannerAction();
    writeStdout(`PackageScanner: analysis ${result.analysisId}, packages ${result.totalPackages ?? "?"}, malware ${result.malwareCount}`);
}
catch (error) {
    const message = error instanceof Error ? error.message : "PackageScanner: unknown action error";
    writeStderr(message);
    process.exit(1);
}
//# sourceMappingURL=action.js.map