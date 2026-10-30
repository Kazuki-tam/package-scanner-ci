/**
 * CI helper entrypoint for the GitHub Action.
 */
import { formatAnalysisSuccessLog } from "../application/format-success-log.js";
import { runPackageScannerAction } from "../application/run-package-scanner-action.js";

function writeStdout(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message: string): void {
  process.stderr.write(`${message}\n`);
}

try {
  const result = await runPackageScannerAction();
  writeStdout(formatAnalysisSuccessLog(result));
} catch (error) {
  const message = error instanceof Error ? error.message : "PackageScanner: unknown action error";
  writeStderr(message);
  process.exit(1);
}
