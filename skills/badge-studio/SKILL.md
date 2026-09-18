---
name: badge-studio
description: Design badges in the live Badge Studio editor through native WebMCP or use the badgio CLI offline. Read and edit both faces, layers, typography, materials, participant data and images; save, undo and export. Use ai-cli outside the browser only when the user requests image generation or transformation.
---

# Badge Studio

The web stays editable by people and agents. Use your own reasoning for art direction and layout; the page does not call an LLM. Optional image generation runs externally through `ai-cli` with the user's AI Gateway credentials, then imports the result into the editor.

## Live editor with WebMCP

Use a browser with native WebMCP support. With agent-browser, use a dedicated session and enable WebGPU:

```sh
agent-browser --session badge-design --webgpu open https://badge-studio.crafter.run/design
agent-browser --session badge-design webmcp list badge_inspect --json
agent-browser --session badge-design webmcp invoke badge_inspect --params '{"section":"state"}' --json
```

Read the discovered tool metadata, including its frame ID. Pass `--frame` when multiple frames expose matching names. Wait for `ready: true` in the state. Tools are scoped to this editor tab and are unregistered when you leave it.

| Tool | Purpose |
| --- | --- |
| `badge_inspect` | `section`: state, catalog, schema or local library |
| `badge_edit` | Atomic patch, full document replacement, select style, explicit locks, undo |
| `badge_set_participant` | Shared name/role/organization/number, QR URL and reverse metadata |
| `badge_set_image` | Import portrait/artwork bytes, use example or remove portrait |
| `badge_get_image` | Explicit export of portrait/artwork bytes for external processing |
| `badge_view` | Front/back, motion, theme and mobile panel |
| `badge_library` | Save or load a design in this browser |
| `badge_export` | Browser download of editable JSON or rendered PNG |
| `badge_cancel` | Cancel an active operation using its ID from inspection |

Tools return `{ok:true,data}` or `{ok:false,error:{code,message}}`. `agent-browser --json` wraps this in `data.output`. Treat the `ok` field as authoritative; a successful browser transport can contain a rejected editor operation.

Every edit needs `expectedRevision` from the latest inspection or mutation receipt. A stale revision rejects the operation without changing the badge. Refresh state and merge your change with any human edit. Mutations return compact receipts; inspect again when you need the full document. Do not issue parallel mutations. To stop an active operation, inspect `operation.id` and call `badge_cancel` with `operationId`. Native invocation cancellation is forwarded when the browser supplies a signal; some experimental implementations do not. Explicit cancellation waits for cleanup. Cancellation cannot roll back a completed save, profile change or download, so inspect state before retrying after an uncertain outcome.

To skip onboarding, use `badge_set_participant` with the requested name. To use the fictional example, invoke `badge_set_image` with `action: "example"`. Never replace a user's image with the example unless requested.

For a layout:

1. Read `badge_inspect` state, catalog and schema as needed.
2. Select a reference with `badge_edit` action `select`, or keep the current document.
3. Think through the art direction yourself. Use `badge_edit` action `patch` with `edits` for names, event, backgrounds, material and front/back `upsert`, `remove`, `order`. An upsert is a complete layer, not a partial field patch.
4. For a larger redesign, send `action: "replace"` and the complete `design`. Both faces and every supported material/graphic/filter control are available through the schema.
5. Existing locks are enforced. You may hide a locked layer; other changes require explicit unlock. Selecting a different starting style resets locks, matching the manual UI.
6. Inspect the rendered front and back with screenshots. `badge_view` changes the face or pauses motion. A schema-valid document is not proof of visual quality.
7. Save with `badge_library`, export with `badge_export`, or undo the last document edit with `badge_edit`.

Document undo covers layouts, not the shared profile or photo. Preserve an image before replacing it if the user may want to restore it. Shared identity and photos persist in this browser; documents save only when requested. No tool publishes or spends generation credits.

## Image transformations with ai-cli

Use editable portrait filters for monochrome, thermal, tint, crop and other treatments already in the schema. Only generate when changing the actual image is necessary and the user has authorized that operation.

Requires Node.js 22+, `ai-cli`, and credentials in the caller's environment or keychain. Do not paste credentials into WebMCP arguments, page storage, prompts or files. Gateway image usage is separate from the coding agent's subscription.

```sh
npm install --global ai-cli
ai models --type image --json
ai image --help
```

Choose a currently available model that accepts reference images. Preserve face identity, framing, pose and proportions; do not invent a full body. For She Ships and other photographic directions, prefer the original photo with editable filters.

Export the current photo without dumping base64 into the conversation:

```sh
agent-browser --session badge-design webmcp invoke badge_get_image --params '{"target":"portrait"}' --json > portrait-response.json
node scripts/image-transfer.mjs extract portrait-response.json portrait.webp
```

The helper path is relative to this skill's directory. It refuses to overwrite an existing output file.

Generate externally, substituting a verified reference-capable model ID:

```sh
ai image -m "$BADGE_IMAGE_MODEL" -i portrait.webp --output transformed.png --json \
  "Transform only the supplied portrait into detailed pixel art. Preserve this person, head-and-shoulders framing, pose and proportions. No typography and no invented body." > generation.json
```

For background removal, request it explicitly, then inspect whether the result has genuine alpha. Model support varies; an opaque background is not transparency. A deterministic local cutout tool can produce the same importable PNG/WebP.

Import the resulting file using a fresh revision:

```sh
agent-browser --session badge-design webmcp invoke badge_inspect --params '{"section":"state"}' --json > state.json
node scripts/image-transfer.mjs import transformed.png state.json portrait > image-params.json
agent-browser --session badge-design webmcp invoke badge_set_image --params @image-params.json --json
```

For artwork, use the `artwork` target and ensure the design has image layers. The imported portrait is shared across styles; layout filters remain editable. Inspect the badge after import. The web never starts `ai-cli` or sends the image to AI Gateway itself.

## Offline document workflow

Requires Node.js 22 or newer and npm. Run with `npx --yes badgio`, install with `npm install --global badgio`, or use `npm run studio -- <command>` from a built repository checkout. The package is `badgio`; the app is Badge Studio. The `badge-studio` command remains an alias.

1. Inspect `npx --yes badgio schema --json` and `npx --yes badgio styles list`.
2. Create a starting document: `npx --yes badgio design create --style gtm --out badge.json`.
3. Edit that document according to the user's art direction. Preserve schema version, both faces and participant bindings.
4. Run `npx --yes badgio design validate --file badge.json`. Correct errors until validation passes.
5. Hand the file to the user and open `https://badge-studio.crafter.run/design` or the local editor. Use **Importar JSON**, then inspect front and back before declaring visual success.

Use `--dry-run` on `design create` to preview. Output JSON is automatic when piped. `--out` refuses existing files; choose a new path rather than deleting or replacing user work. Without `--out`, the complete design is returned in `data.design`.

The success envelope is `{ok:true,version,data,nextSteps}`. Errors are `{ok:false,version,error:{code,message},nextSteps}`. Exit codes: 0 success, 2 invalid input, 1 system failure. Diagnostics go to stderr. No command prompts.

The canvas is 1024 × 1536 pixels. Layers paint in array order. Keep a name-bound text layer on both faces, 1–4 front portraits, and a role binding and readable QR on the back. Reserve the top 90px for the clip. Use the validator for rotated bounds, QR contrast and overlap.

Art direction can change typography, layout, graphics, portrait filters, effect fields and material recipes. It is not limited to recoloring. The CLI itself does not call an LLM, generate images or render a PNG. The web editor renders and exports; use external ai-cli for requested image generation.

Artwork UUIDs point to assets in the web app. Built-in assets ship with it. Custom images need separate transfer to that app. Participant portraits are separate from style documents.

The landing showcases nine event references plus the original Térmico, Prisma and Cromo materials. The full editor and CLI also include five custom directions. Current editable shape is a rectangular badge; pins and merch are not implemented.

If native WebMCP is unavailable, keep the manual browser controls or use the offline JSON workflow. Do not claim that every browser or coding agent supports WebMCP automatically.
