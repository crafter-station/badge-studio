# Badge Studio

A design studio for badges with personality. Explore nine event art directions, three physical originals and five custom studies. Edit every layer, flip the badge, change its material and export it.

Try [Badge Studio](https://badge-studio.crafter.run), or create a document from your terminal with `npx badgio styles list`.

The landing is a draggable orbit of nine event badges plus Térmico, Prisma and Cromo, with depth, inertia and optional synthesized mechanical ticks. It supports keyboard rotation, reduced motion and light/dark themes.

## Design with your agent

Requires Node.js 22 or newer.

```sh
npm install --global badgio
npx skills add crafter-station/badge-studio --skill badge-studio
```

Ask your agent to use the badge-studio skill, attach your photo or provide its path, and describe the badge you want. The agent asks before installing agent-browser for visual verification. It offers ai-cli only when a requested image transformation needs it.

The skill is a small discovery stub. Versioned instructions, creative guidance and image-transfer helpers ship inside the CLI:

```sh
badgio skills get core
badgio skills get core --full
badgio doctor
```

The preview opens in the coding session’s built-in browser when available, otherwise in your default browser. Keep asking for changes in the same conversation and watch the same editable canvas update. The seventeen catalog designs are starting points; agents can compose both faces using the full layer, typography, image and material schema.

`badgio studio start` opens the default browser. Agents with browser panels use `--no-open --json` and open the returned local URL themselves. Keep that process alive while designing. The local connection and native WebMCP invoke the same nine editor tools, revision checks, locks, undo and validation. Only one preview tab owns a local session. A browser without native WebMCP can still use the local connection.

```sh
badgio studio tools --url "$BADGE_STUDIO_URL" --json
badgio studio call badge_inspect --url "$BADGE_STUDIO_URL" --params '{"section":"state"}' --json
```

For image generation, your agent can use [ai-cli](https://github.com/vercel-labs/ai-cli) with your AI Gateway credentials and authorization, then import the result. Ordinary layouts and editable portrait filters need no model. Keys stay outside the page; image generation uses separate Gateway credits.

See [the CLI guide](packages/cli/README.md), [CLI contract](docs/cli-contract.md), [browser contract](docs/webmcp-contract.md) and [skill stub](skills/badge-studio/SKILL.md).

## Work with a document

```sh
badgio styles list
badgio design create --style gtm --out badge.json
badgio schema --json
badgio design validate --file badge.json
```

Import the JSON in the editor to continue visually. Portraits and custom artwork are separate. The `badge-studio` command remains an alias. The CLI does not call a model or render PNGs; the editor renders and exports them.

## Develop the studio

The monorepo uses Bun 1.3+ for workspace installation and its test runner. Published CLI users only need Node.js and npm.

```sh
bun install
cp -n apps/web/.env.example apps/web/.env.local
bun run build:packages
bun run dev
```

Open `http://127.0.0.1:3004`. The editor is at `/design` and the local CLI guide at `/docs`. After building, run the local CLI on Node with `npm run studio -- styles list`.

Browsing, editing, JSON import/export, PNG export and WebMCP do not need credentials. Browser storage is the default. Image generation belongs to the external coding agent and its own ai-cli environment.

Upload a photo once in the editor, or choose **Probar con foto de ejemplo** to try the fictional sample portrait. Your photo and name carry across all 17 styles, the gallery and the landing page. The profile is saved in this browser and restored on your next visit. Replace or remove the photo from the profile bar at any time.

The sample portrait has a transparent background so each badge supplies its own setting. Transparent PNG/WebP uploads retain their alpha through resizing, portrait filters and export. Background removal for arbitrary uploaded photos is not included. Run `bun run test:portraits` with agent-browser installed to verify real Canvas2D compositing and image resizing.

## Structure

- `apps/web`: Next.js landing, editor, local design API and assets.
- `packages/design`: canonical schema, 17 directions, semantic validation.
- `packages/renderer`: Canvas/WebGPU rendering and material system.
- `packages/cli`: bundled agent guides, live preview connection, image helpers and document validation.

The current document format represents rectangular, two-sided badges. Additional formats such as pins and stickers need explicit shape, safe-area and export contracts before being added.

## Check

```sh
bun run check
bun run typecheck
bun test
bun run build
```

Verify a packed or published CLI with npm and npx in an isolated consumer:

```sh
npm run test:npm -- /absolute/path/to/badgio-0.2.0.tgz
npm run test:npm -- badgio@0.2.0
```

## Service boundary

The public studio uses browser storage by default (`NEXT_PUBLIC_BADGE_STORAGE=browser`) to save designs and illustrations in IndexedDB. Participant photos and profile details are also stored locally, separately from the editable design documents. Photos are not uploaded to a cloud server. Agent-supplied images travel through the local preview connection when it is used. Browser panels may partition storage. Export JSON and images to keep a separate copy. Public server-side AI generation and cloud sync are not enabled.

The legacy file-backed experiment is available only with `NEXT_PUBLIC_BADGE_STORAGE=server` in local development. Hosted file storage is disabled. WebMCP exposes deterministic editor controls, never legacy generation endpoints or credentials.

Event SDK remains a separate initiative. See [provenance](docs/provenance.md).

## Brand assets

Open Graph images, a square social card, vector marks, favicon and app icons are in `apps/web/public/brand-assets`. Regenerate them from the bundled badge renders with `bun run --cwd apps/web brand:assets`. The web metadata uses the 1200 × 630 PNG. Icon artwork follows the existing Phosphor Stack mark; the renderer, event credits and font licenses remain in [provenance](docs/provenance.md).

## License

AGPL-3.0-only. Preserve the included font licenses and renderer attribution.
