import fs from "node:fs";
import path from "node:path";

import { detectLockfile, inferManagerFromFilename } from "../domain/lockfile.js";
import type { PathFsDeps } from "../support/fs-deps.js";

function defaultRealpathSync(filePath: fs.PathLike): string {
  return typeof fs.realpathSync.native === "function"
    ? fs.realpathSync.native(filePath)
    : fs.realpathSync(filePath);
}

function tryRealpathSync(
  filePath: fs.PathLike,
  realpathSync: (filePath: fs.PathLike) => string,
): string | undefined {
  try {
    return realpathSync(filePath);
  } catch {
    return undefined;
  }
}

function isPathInside(basePath: string, candidatePath: string, pathModule: typeof path): boolean {
  const relativePath = pathModule.relative(basePath, candidatePath);
  return (
    relativePath === "" || (!relativePath.startsWith("..") && !pathModule.isAbsolute(relativePath))
  );
}

function assertPathInside(
  basePath: string,
  candidatePath: string,
  label: string,
  pathModule: typeof path,
): void {
  if (!isPathInside(basePath, candidatePath, pathModule)) {
    throw new Error(`PackageScanner: ${label} must stay within the GitHub workspace.`);
  }
}

function resolveWorkspaceScopedPath(
  basePath: string,
  inputPath: string,
  label: string,
  {
    existsSync = fs.existsSync,
    realpathSync = defaultRealpathSync,
    pathModule = path,
  }: Pick<PathFsDeps, "existsSync" | "realpathSync" | "pathModule"> = {},
): string {
  if (pathModule.isAbsolute(inputPath)) {
    throw new Error(
      `PackageScanner: ${label} must be a relative path within the GitHub workspace.`,
    );
  }

  const candidatePath = pathModule.resolve(basePath, inputPath);
  assertPathInside(basePath, candidatePath, label, pathModule);

  if (!existsSync(candidatePath)) {
    return candidatePath;
  }

  const realBasePath = tryRealpathSync(basePath, realpathSync) || basePath;
  const realCandidatePath = tryRealpathSync(candidatePath, realpathSync) || candidatePath;

  assertPathInside(realBasePath, realCandidatePath, label, pathModule);
  return realCandidatePath;
}

export function getTrimmedEnv(env: NodeJS.ProcessEnv, name: string): string {
  return (env[name] || "").trim();
}

export function readFileIfExists(
  filePath: string,
  { existsSync = fs.existsSync, readFileSync = fs.readFileSync }: PathFsDeps = {},
): string | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }
  return readFileSync(filePath, "utf8");
}

export interface ResolveLockfileInputResult {
  content: string | undefined;
  /** Resolved manager (env override, auto-detect, or inferred from filename). */
  manager: string | undefined;
}

export function resolveLockfileInput(
  dir: string,
  env: NodeJS.ProcessEnv,
  {
    existsSync = fs.existsSync,
    readFileSync = fs.readFileSync,
    realpathSync = defaultRealpathSync,
    pathModule = path,
  }: PathFsDeps = {},
): ResolveLockfileInputResult {
  const lockfileInput = getTrimmedEnv(env, "PACKAGE_SCANNER_LOCKFILE");
  const managerInput = getTrimmedEnv(env, "PACKAGE_SCANNER_PACKAGE_MANAGER");
  const detectedLockfile = lockfileInput ? null : detectLockfile(dir, { existsSync, pathModule });
  const relativePath = lockfileInput || detectedLockfile?.relativePath || "";

  if (!relativePath) {
    return {
      content: undefined,
      manager: managerInput || undefined,
    };
  }

  const absolutePath = resolveWorkspaceScopedPath(dir, relativePath, "lockfile path", {
    existsSync,
    realpathSync,
    pathModule,
  });
  const content = readFileIfExists(absolutePath, { existsSync, readFileSync });

  if (!content) {
    throw new Error(`PackageScanner: lockfile not found: ${absolutePath}`);
  }

  const inferred = inferManagerFromFilename(pathModule.basename(relativePath));
  const manager = managerInput || detectedLockfile?.manager || inferred || undefined;

  return {
    content,
    manager,
  };
}

export function resolvePackageJsonInput(
  dir: string,
  env: NodeJS.ProcessEnv,
  {
    existsSync = fs.existsSync,
    readFileSync = fs.readFileSync,
    realpathSync = defaultRealpathSync,
    pathModule = path,
  }: PathFsDeps = {},
): string | undefined {
  const packageJsonInput = getTrimmedEnv(env, "PACKAGE_SCANNER_PACKAGE_JSON") || "package.json";
  const absolutePath = resolveWorkspaceScopedPath(dir, packageJsonInput, "package-json path", {
    existsSync,
    realpathSync,
    pathModule,
  });
  return readFileIfExists(absolutePath, { existsSync, readFileSync });
}

export function resolveWorkingDirectory(
  env: NodeJS.ProcessEnv,
  cwd: string,
  pathModule: typeof path,
): string {
  const workspace = env.GITHUB_WORKSPACE || cwd;
  const resolvedWorkspace = pathModule.resolve(workspace);
  return resolveWorkspaceScopedPath(
    resolvedWorkspace,
    env.PACKAGE_SCANNER_WORKING_DIRECTORY || ".",
    "working-directory",
    { pathModule },
  );
}
