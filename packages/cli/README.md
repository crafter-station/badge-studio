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

The catalog designs are starting points. Your agent can compose both faces, move and reorder layers, change typography, graphics, portrait treatments and material effects using the full schema. The editor renders and exports PNG; the CLI does not call a model or render images itself. Portraits and custom artwork are separate from exported design JSON.

Most commands return `{ok:true,version,data,nextSteps}` or `{ok:false,version,error,nextSteps}`. JSON is automatic when piped. `skills get` returns plain Markdown unless `--json` is explicit. `image params` returns the raw invocation object so it can be passed directly with `--params @file`. Exit codes are 0 success, 2 invalid input or a rejected editor call, and 1 system failure. File outputs are exclusive and never overwrite existing files.

## Publish with your agent

Your agent closes the first preview with “Want to change anything or publish it?” It saves a portable bundle containing the design, participant, portrait and artwork before publication:

```sh
badgio studio save --url "$BADGE_STUDIO_URL" --out badge.badge.json
badgio publish --file badge.badge.json --dry-run
badgio publish --file badge.badge.json --yes
badgio publish status --file badge.badge.json
```

`--yes` means you approved sharing this exact badge, including its photo, name and editable design. Publication runs directly from the bundle, even after the editor closes. Retries reuse the same operation and return the same public URL.

The first publication opens Clerk device login in your default browser and continues automatically once you connect. There is no manual Publish button. Subsequent publications reuse the OS credential store. `badgio login --no-open` prints the verification link for a session browser; `badgio logout` revokes the connection. `BADGIO_TOKEN` supports existing OAuth access tokens in headless environments. Credentials never appear on stdout or in the local operation log.

Creation, local saving, editing and export remain anonymous. `--dry-run` validates the actual bundle without authentication or network calls. `BADGIO_DISABLE_PUBLISH=1` disables public writes. `BADGIO_STATE_DIR` overrides the local operation/receipt directory; keep it private. JSON progress events are on stderr; the final result and durable receipt are on stdout.

The existing editor tools still support author-only updates and withdrawal. Your agent verifies the public link before calling publication complete.

The package is `badgio`; `badge-studio` remains a command alias. Licensed under AGPL-3.0-only. [Source and skill](https://github.com/crafter-station/badge-studio).
