import fs from "node:fs";
import path from "node:path";
import { detectLockfile, inferManagerFromFilename } from "../domain/lockfile.js";
function defaultRealpathSync(filePath) {
    return typeof fs.realpathSync.native === "function"
        ? fs.realpathSync.native(filePath)
        : fs.realpathSync(filePath);
}
function tryRealpathSync(filePath, realpathSync) {
    try {
        return realpathSync(filePath);
    }
    catch {
        return undefined;
    }
}
function isPathInside(basePath, candidatePath, pathModule) {
    const relativePath = pathModule.relative(basePath, candidatePath);
    return (relativePath === "" || (!relativePath.startsWith("..") && !pathModule.isAbsolute(relativePath)));
}
function assertPathInside(basePath, candidatePath, label, pathModule) {
    if (!isPathInside(basePath, candidatePath, pathModule)) {
        throw new Error(`PackageScanner: ${label} must stay within the GitHub workspace.`);
    }
}
function resolveWorkspaceScopedPath(basePath, inputPath, label, { existsSync = fs.existsSync, realpathSync = defaultRealpathSync, pathModule = path, } = {}) {
    if (pathModule.isAbsolute(inputPath)) {
        throw new Error(`PackageScanner: ${label} must be a relative path within the GitHub workspace.`);
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
export function getTrimmedEnv(env, name) {
    return (env[name] || "").trim();
}
export function readFileIfExists(filePath, { existsSync = fs.existsSync, readFileSync = fs.readFileSync } = {}) {
    if (!existsSync(filePath)) {
        return undefined;
    }
    return readFileSync(filePath, "utf8");
}
export function resolveLockfileInput(dir, env, { existsSync = fs.existsSync, readFileSync = fs.readFileSync, realpathSync = defaultRealpathSync, pathModule = path, } = {}) {
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
export function resolvePackageJsonInput(dir, env, { existsSync = fs.existsSync, readFileSync = fs.readFileSync, realpathSync = defaultRealpathSync, pathModule = path, } = {}) {
    const packageJsonInput = getTrimmedEnv(env, "PACKAGE_SCANNER_PACKAGE_JSON") || "package.json";
    const absolutePath = resolveWorkspaceScopedPath(dir, packageJsonInput, "package-json path", {
        existsSync,
        realpathSync,
        pathModule,
    });
    return readFileIfExists(absolutePath, { existsSync, readFileSync });
}
export function resolveWorkingDirectory(env, cwd, pathModule) {
    const workspace = env.GITHUB_WORKSPACE || cwd;
    const resolvedWorkspace = pathModule.resolve(workspace);
    return resolveWorkspaceScopedPath(resolvedWorkspace, env.PACKAGE_SCANNER_WORKING_DIRECTORY || ".", "working-directory", { pathModule });
}
//# sourceMappingURL=action-inputs.js.map