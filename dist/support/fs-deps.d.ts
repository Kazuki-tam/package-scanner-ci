import type fs from "node:fs";
import type path from "node:path";
/** Minimal filesystem + path deps for tests (dependency injection). */
export type FsReadDeps = {
    existsSync?: typeof fs.existsSync;
    readFileSync?: typeof fs.readFileSync;
    realpathSync?: (filePath: fs.PathLike) => string;
};
export type PathFsDeps = FsReadDeps & {
    pathModule?: typeof path;
};
//# sourceMappingURL=fs-deps.d.ts.map