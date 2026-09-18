---
name: badge-studio
description: Create or customize editable Badge Studio designs from the local catalog, inspect the design schema, validate layers and materials, and hand JSON documents to the web editor. Use when a user asks to design a badge, reproduce an art direction, modify a badge layout, or operate the Badge Studio CLI.
---

# Badge Studio

Run with `bunx badg`, install `badg` globally, or use `bun run studio` from the repository root. The package is `badg`; the app is Badge Studio. The `badge-studio` command remains an alias.

1. Inspect `badg schema --json` and `badg styles list`.
2. Create a starting document: `badg design create --style gtm --out badge.json`.
3. Edit that document according to the user's art direction. Preserve schema version, both faces and participant bindings.
4. Run `badg design validate --file badge.json`. Correct errors until validation passes.
5. Hand the file to the user and open `https://badge-studio.crafter.run/design` or the local editor. Use **Importar JSON**, then inspect front and back before declaring visual success.

Use `--dry-run` on `design create` to preview. Output JSON is automatic when piped. `--out` refuses existing files; choose a new path rather than deleting or replacing user work. Without `--out`, the complete design is returned in `data.design`.

The success envelope is `{ok:true,version,data,nextSteps}`. Errors are `{ok:false,version,error:{code,message},nextSteps}`. Exit codes: 0 success, 2 invalid input, 1 system failure. Diagnostics go to stderr. No command prompts.

The canvas is 1024 × 1536 pixels. Layers paint in array order. Keep a name-bound text layer on both faces, 1–4 front portraits, and a role binding and readable QR on the back. Reserve the top 90px for the clip. Use the validator for rotated bounds, QR contrast and overlap.

Art direction can change typography, layout, graphics, portrait filters, effect fields and material recipes. It is not limited to recoloring. The CLI itself does not call an LLM, generate images or render a PNG. The web editor renders and exports; optional server-side generation requires a configured gateway key.

Artwork UUIDs point to assets in the web app. Built-in assets ship with it. Custom images need separate transfer to that app. Participant portraits are separate from style documents.

The landing showcases nine event references plus the original Térmico, Prisma and Cromo materials. The full editor and CLI also include five custom directions. Current editable shape is a rectangular badge; pins and merch are not implemented.
