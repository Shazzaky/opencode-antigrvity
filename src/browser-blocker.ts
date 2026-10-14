import { execFile } from "node:child_process";
import { win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { AgyError } from "./errors.js";

export const BLOCKED_BROWSER_MARKER = "AGY_INTERACTIVE_LOGIN_BLOCKED";
const execute = promisify(execFile);

/** Python webbrowser uses shlex even on Windows. No URL is evaluated by a shell. */
export function browserBlocker(platform = process.platform, environment: NodeJS.ProcessEnv = process.env) {
  const file = platform === "win32"
    ? win32.join(environment.SystemRoot || environment.SYSTEMROOT || "C:\\Windows", "System32", "cscript.exe")
    : "/bin/sh";
  const args = platform === "win32"
    ? ["//nologo", "//E:JScript", fileURLToPath(new URL("../src/browser-blocker.windows.js", import.meta.url))]
    : ["-c", `echo ${BLOCKED_BROWSER_MARKER} >&2`];
  // BROWSER is split on os.pathsep before shlex, including inside quotes.
  if (platform === "win32" && [file, ...args].some(value => value.includes(";"))) {
    throw new AgyError("unsupported", "Cannot disable ACP browser login from a Windows path containing a semicolon.", { code: "agy_browser_blocker" });
  }
  return { file, args, command: [...[file, ...args].map(value => JSON.stringify(value)), "%s"].join(" ") };
}

/** Validate the blocker before ACP starts, so a missing/disabled script host
 * cannot make Python fall back to the user's real browser. */
export async function prepareBrowserBlocker(environment: NodeJS.ProcessEnv): Promise<string> {
  const blocker = browserBlocker(process.platform, environment);
  try {
    const { stderr } = await execute(blocker.file, blocker.args, {
      env: environment, windowsHide: true, timeout: 5_000, maxBuffer: 4_096,
    });
    if (stderr.trim() !== BLOCKED_BROWSER_MARKER) throw new Error("Browser blocker did not acknowledge the request");
  } catch (cause) {
    throw new AgyError("unsupported", "Cannot disable ACP browser login. The platform script host must be available (Windows Script Host on Windows, /bin/sh on Unix). ACP was not started.", { code: "agy_browser_blocker", cause });
  }
  return blocker.command;
}
