# Badge Studio

Design a distinctive badge from your photo with your coding agent. Requires Node.js 22+.

```sh
npm install --global badgio
npx skills add crafter-station/badge-studio --skill badge-studio
```

Ask: “Use the badge-studio skill. Make an experimental badge from my photo at ~/Pictures/me.png. Show me both sides, then let’s refine it here.”

The skill asks for a photo if one is missing and asks before installing agent-browser for visual inspection. It offers ai-cli only when a requested image transformation needs it. Image generation uses your own AI Gateway credentials and credits.

## Versioned instructions

```sh
badgio skills get core
badgio skills get design
badgio skills get images
badgio skills get core --full
badgio doctor --json
```

The installed skill is a small discovery stub. These guides and image-transfer helpers are bundled into the CLI, so no repository checkout or external skill script is required.

## One live preview

```sh
badgio studio start
```

This opens your operating system’s default browser. An agent with a built-in browser panel should use `badgio studio start --no-open --json` and open the returned URL there. Keep the process running and reuse that tab while iterating.

The local preview embeds the [real editor](https://badge-studio.crafter.run/design). Its local connection uses the same tools, revision checks and validation as native WebMCP. It works without native WebMCP in the preview browser. One tab owns a session; no separate browser-state synchronization is implied.

```sh
badgio studio tools --url "$BADGE_STUDIO_URL" --json
badgio studio call badge_inspect --url "$BADGE_STUDIO_URL" --params '{"section":"state"}' --json
badgio studio stop --url "$BADGE_STUDIO_URL"
```

Treat the full local session URL as private. The server binds to loopback, authenticates calls, validates browser origins and keeps pending calls in memory. It does not provide cloud storage. A disconnected or timed-out call may have completed; inspect before retrying. Browser panels may partition storage, so export work you need outside the session.

## Documents and images

```sh
badgio styles list
badgio design create --style gtm --out badge.json
badgio schema --json
badgio design validate --file badge.json
badgio image params --file photo.png --state state.json > image-params.json
badgio image extract --file image-response.json --out portrait.webp
```

The 17 catalog designs are starting points. Your agent can compose both faces, move and reorder layers, change typography, graphics, portrait treatments and material effects using the full schema. The editor renders and exports PNG; the CLI does not call a model or render images itself. Portraits and custom artwork are separate from exported design JSON.

Most commands return `{ok:true,version,data,nextSteps}` or `{ok:false,version,error,nextSteps}`. JSON is automatic when piped. `skills get` returns plain Markdown unless `--json` is explicit. `image params` returns the raw invocation object so it can be passed directly with `--params @file`. Exit codes are 0 success, 2 invalid input or a rejected editor call, and 1 system failure. File outputs are exclusive and never overwrite existing files.

The package is `badgio`; `badge-studio` remains a command alias. Licensed under AGPL-3.0-only. [Source and skill](https://github.com/crafter-station/badge-studio).
