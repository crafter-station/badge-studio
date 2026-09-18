# Badge Studio core

Create a distinctive, fully editable badge from the user's photo. Use the live editor as the source of truth and keep the same preview open for natural-language revisions. The coding agent supplies the art direction; Badge Studio supplies the canvas, materials and validation.

## Start with the person

Use an image already attached or identified in the conversation. Otherwise ask for a photo or its local path before designing. Ask for a name and an event or mood only when the conversation does not provide them. Never silently substitute the example portrait. Preserve the person's face, framing, pose and proportions.

## Set up only what is missing

Run `badgio doctor --json`. This only checks installed tools; it does not install anything or send images anywhere.

- Missing agent-browser: explain that it is used to inspect and visually verify the badge. Ask once, “May I install agent-browser and its browser runtime?” After approval run `npm install --global agent-browser` and `agent-browser install`, then `agent-browser skills get core`. Respect any installation authorization already given. If declined, explain that the agent-browser verification path is unavailable; the manual editor and badgio's local connection still work.
- Agent-browser present: load `agent-browser skills get core` before using it. Check its live help for WebMCP and connection options; do not assume every installed version supports them.
- Missing ai-cli: do nothing yet. Load `badgio skills get images` only when a requested change requires image generation, pixel art, a new illustration or background removal that editable filters cannot supply. Ask before installing or spending generation credits.

## Put the actual canvas in the user's browser

Start one persistent process:

```sh
badgio studio start --no-open --json
```

It prints a local session URL in `data.url` and keeps running. Keep the process alive for the session. Treat the complete URL as a local capability; do not publish it or log it in shared reports.

1. If the coding session exposes a browser panel opener (for example in Codex or Cursor), open that local URL there. Use the actual available capability, not assumptions about the agent's name.
2. Otherwise start without `--no-open`; `badgio studio start` opens the operating system's default browser. If already started, use the platform's normal URL opener on the returned URL.
3. Do not present agent-browser's separate automation window as the final preview. Never replace the user's browser with Chrome or change their default browser.
4. Reuse the original preview tab and URL for all iterations. Only one tab owns the local connection. Do not open the URL in another browser just to take a screenshot.

The local page contains the real website editor. Its connection calls the same tools and validators as native WebMCP, even when that browser has no native WebMCP support. Photos supplied to a tool travel through the local connection to the editor. The CLI keeps pending calls in memory; it does not provide cloud sync or automatically upload your work to a cloud database.

For development only, `--site http://127.0.0.1:3004` uses a local web checkout. It is not an arbitrary remote-site proxy.

## Edit the visible preview

Save the returned URL in a session variable such as `BADGE_STUDIO_URL`. Discover tools and wait for the editor:

```sh
badgio studio tools --url "$BADGE_STUDIO_URL" --json
badgio studio call badge_inspect --url "$BADGE_STUDIO_URL" --params '{"section":"state"}' --json
```

Wait for `data.ready: true`. Discover input schemas before calling a tool. The first edit uses the latest revision. Subsequent edits use the revision returned by the previous call.

| Tool | Purpose |
| --- | --- |
| `badge_inspect` | State, catalog, schema or saved designs |
| `badge_edit` | Patch, full replacement, select style, locks, undo |
| `badge_set_participant` | Name, role, organization, number, QR URL and reverse metadata |
| `badge_set_image` | Import portrait/artwork, remove portrait, or explicitly use the example |
| `badge_get_image` | Export portrait/artwork bytes for requested external processing |
| `badge_view` | Front/back, material motion, theme and mobile panel |
| `badge_library` | Save/load in this browser |
| `badge_export` | Editable JSON or a rendered PNG download |
| `badge_cancel` | Cancel an active operation by its inspected ID |

Set the supplied participant through `badge_set_participant`, which dismisses onboarding. Import the original photo:

```sh
badgio studio call badge_inspect --url "$BADGE_STUDIO_URL" --params '{"section":"state"}' --json > state.json
badgio image params --file "/absolute/path/portrait.png" --state state.json > image-params.json
badgio studio call badge_set_image --url "$BADGE_STUDIO_URL" --params @image-params.json --json
```

PNG, JPEG and WebP are supported, up to 4 MB. Resize locally when necessary and preserve transparency. Image helpers ship inside badgio; no script path from a skill install is needed.

Load `badgio skills get design` before composing. Inspect the catalog and schema, choose a useful starting composition and then change it freely. Style selection resets locks. `badge_edit` `patch` accepts complete layer upserts and layer ordering; `replace` accepts a whole document. Honor existing locks and preserve readable QR and participant bindings.

## Agent-browser and native WebMCP

Prefer agent-browser connected to the same user-visible preview when that browser exposes a supported connection. Read its current connection instructions, obtain permission when connecting requires changing browser settings, and select the exact existing preview tab. Discover the editor frame with `webmcp list`; pass its frame ID. Do not claim that automatic connection works with every default browser or built-in panel.

```sh
agent-browser --session badge-design webmcp list badge_inspect --json
agent-browser --session badge-design webmcp invoke badge_inspect --frame "<discovered-frame>" --params '{"section":"state"}' --json
```

When the user's preview cannot be controlled by agent-browser, use `badgio studio call` to edit it. Use an isolated agent-browser session for visual verification of the same document and images through the normal editor tools. Keep that verification separate from the human preview; it is not shared browser storage. Do not navigate the local session URL in the verification browser, since that would compete for ownership.

If native WebMCP is unavailable in the verification browser, use its normal UI controls. Do not invent browser capabilities or claim visual verification you could not perform.

## Iterate without restarting

After each request, inspect current state, apply a focused change, check both faces and show the same preview. A stale revision means a person edited the badge: inspect again and merge their edit. Never blindly replay a rejected mutation. Do not send parallel mutations.

Inspect `ok` in every result. Native agent-browser JSON wraps the tool result in `data.output`; badgio returns the tool's data in its usual `{ok, version, data}` envelope. A successful transport is not proof an edit succeeded.

If a call times out or disconnects, its side effect may already have happened. Reconnect, inspect state, and only then decide whether to retry. `badge_cancel` uses the operation ID from inspection and waits for cleanup. Undo covers layout changes, not shared photos, profile fields, completed saves or downloads.

Validate visually, not just against the schema: front/back hierarchy, portrait crop, text overflow, material, contrast and QR clearance. Save the finished design with `badge_library`; export a PNG or JSON when requested. Downloaded JSON excludes portrait bytes and custom artwork, so retain original image files. Browser storage may be partitioned in embedded previews; export work you want to keep independently.

Leave the preview process alive while the user is iterating. When they finish, `badgio studio stop --url "$BADGE_STUDIO_URL"` closes the connection. Stop only your own agent-browser verification session.

## Offline fallback

`badgio styles list`, `badgio schema --json`, `badgio design create --style gtm --out badge.json`, and `badgio design validate --file badge.json` work without a browser. File creation is exclusive; use a new output path. Import the JSON in the editor and supply its images separately. The CLI does not generate images or render PNGs itself.
