import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { AgyError } from "./errors.js";
import { acpDistribution } from "./acp-install.js";

// Official Google distribution inspected for tool-filter implementation and
// verified against the official 1.3.0 archives. The Windows PyInstaller
// bytecode was reviewed for ToolFilterConfig -> _create_agent_config wiring:
// an empty enabledTools list disables built-ins and subagents, including the
// safe_view_file substitute. Windows runtime inference is not yet verified.
// Version strings alone are not a compatibility profile.
const profiles: Record<string, [string, string]> = {
  "linux-x64": ["cf6feaebdacfc2255dcfc8883db99b15de8554698554e2a1e78e5ccec1c68a20", "63042ca43fc7a69600683920f7706689b82cf8aecefe21dc18cf35e99c9dde4d"],
  "win32-x64": ["bc86a76bfe422a58aed70300fdab65457c7439b9fcb7d3f6c314ea6f79601fa3", "b200d5e01725784b45f99ee532b0da22f5fb43f01b16ecd69f225bf1ddf36557"],
  // macOS ARM64 PAR's embedded tool_filter.py/server.py reviewed: [] becomes
  // an empty allowlist, disables all built-ins including safe_view_file and
  // subagents/browser; create, restore and rebuild preserve the filter.
  // Static isolation review, not authenticated runtime inference verification.
  "darwin-arm64": ["cb1f0725183ed922079ed6cd1d2422b4d8be44c5fb60be3e9a43d8d04f99a18e", "b04b00662c1821b953a409d43626b86d1229130eeb2078b4e1304c06199aa481"],
};
async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function assertHostToolCompatibility(executable: string, platform = process.platform, arch = process.arch): Promise<void> {
  const profile = profiles[`${platform}-${arch}`];
  try {
    if (profile && await sha256(executable) === profile[0] && await sha256(join(dirname(executable), acpDistribution(platform, arch).companion)) === profile[1]) return;
  } catch { /* Missing companion or unknown executable fails closed. */ }
  throw new AgyError("unsupported", `This ACP executable pair does not match a reviewed host-tool isolation profile for ${platform}-${arch}. Use the official Antigravity 1.3.0 Linux x64, Windows x64 or macOS ARM64 distribution, including its platform-specific companion. Other platforms/builds require a reviewed profile; version text and executable overrides are not sufficient.`, { code: "agy_acp_compatibility" });
}
