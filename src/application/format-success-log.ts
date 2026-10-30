function toSingleLine(value: string): string {
  let sanitized = "";

  for (const char of value) {
    const code = char.charCodeAt(0);
    sanitized += code <= 0x1f || code === 0x7f ? " " : char;
  }

  return sanitized;
}

export function formatAnalysisSuccessLog(result: {
  analysisId: string;
  totalPackages: number | null;
  malwareCount: number;
}): string {
  const analysisId = toSingleLine(result.analysisId);
  const packages = result.totalPackages ?? "?";

  return `PackageScanner: analysis ${analysisId}, packages ${packages}, malware ${result.malwareCount}`;
}
