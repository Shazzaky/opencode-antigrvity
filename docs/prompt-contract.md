# Host prompt contract

For primary Antigravity requests, the plugin replaces OpenCode's assembled
system text at the HTTP request hook with the active agent's `system` field.
This excludes generated skills, AGENTS.md instructions, model identity and
environment metadata. A missing, empty or whitespace-only field means no
instructions; agent lookup failures propagate instead of falling back.

The adapter sends a nonempty agent prompt as one text block:

```xml
<instruction>
Configured agent system prompt, unchanged.
</instruction>
```

User content follows without a `[user]` marker or adapter boilerplate. The
plugin preserves OpenCode's new-child subagent introduction. It never adds
that introduction itself, so continuation messages are not prefixed again.
Conversation history, attachments and original tool results remain available
when continuing or rebuilding a trajectory. Changed/cleared instructions
retire the previous ACP context, including a parked tool turn once its results
are available, so old instructions are not silently retained.

ACP initialization omits optional `clientInfo` and advertises empty
`clientCapabilities`. Tool configuration uses the protocol's `mcpServers`
field with a server named `external_tool`; model selection is unchanged.

These rules govern the host input to ACP, not Antigravity's own internal
system prompt/metadata. Auxiliary title/generate requests keep their dedicated
utility behavior. This does not promise to resolve Google location restrictions.
