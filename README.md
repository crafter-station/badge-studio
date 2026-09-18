# Badge Studio

A design studio for badges with personality. Explore nine event art directions, three physical originals and five custom studies. Edit every layer, flip the badge, change its material and export it.

Try [Badge Studio](https://badge-studio.crafter.run), or create a document from your terminal with `npx badgio styles list`.

The landing is a draggable orbit of nine event badges plus Térmico, Prisma and Cromo, with depth, inertia and optional synthesized mechanical ticks. It supports keyboard rotation, reduced motion and light/dark themes.

## Use the CLI

Requires Node.js 22 or newer and npm.

```sh
npx badgio styles list
npx badgio design create --style gtm --out badge.json
npx badgio schema --json
npx badgio design validate --file badge.json
```

An agent can edit the JSON using the versioned schema and semantic validator. Choose **Importar JSON** in the editor to continue visually.

The npm package is `badgio`, with `badgio` and `badge-studio` commands. It bundles the same catalog and validator as the editor and runs directly on Node.js. Install it globally with `npm install --global badgio` to run `badgio` without `npx`.

The CLI creates and validates editable JSON. The web studio renders and exports the badge. Image generation and LLM calls are not part of the CLI.

See [the CLI contract](docs/cli-contract.md) and [the companion skill](skills/badge-studio/SKILL.md).

## Develop the studio

The monorepo uses Bun 1.3+ for workspace installation and its test runner. Published CLI users only need Node.js and npm.

```sh
bun install
cp -n apps/web/.env.example apps/web/.env.local
bun run build:packages
bun run dev
```

Open `http://127.0.0.1:3004`. The editor is at `/design` and the local CLI guide at `/docs`. After building, run the local CLI on Node with `npm run studio -- styles list`.

Browsing, editing, JSON import/export and PNG export do not need credentials. Prompt-based generation and artwork generation use an optional Vercel AI Gateway key. Copy `apps/web/.env.example` to `apps/web/.env.local` and add your own key to enable those operations.

Upload a photo once in the editor, or choose **Probar con foto de ejemplo** to try the fictional sample portrait. Your photo and name carry across all 17 styles, the gallery and the landing page. The profile is saved in this browser and restored on your next visit. Replace or remove the photo from the profile bar at any time.

The sample portrait has a transparent background so each badge supplies its own setting. Transparent PNG/WebP uploads retain their alpha through resizing, portrait filters and export. Background removal for arbitrary uploaded photos is not included. Run `bun run test:portraits` with agent-browser installed to verify real Canvas2D compositing and image resizing.

## Structure

- `apps/web`: Next.js landing, editor, local design API and assets.
- `packages/design`: canonical schema, 17 directions, semantic validation.
- `packages/renderer`: Canvas/WebGPU rendering and material system.
- `packages/cli`: local document creation, schema inspection and validation.

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
npm run test:npm -- /absolute/path/to/badgio-0.1.1.tgz
npm run test:npm -- badgio@0.1.1
```

## Service boundary

The public studio uses `NEXT_PUBLIC_BADGE_STORAGE=browser` to save designs and illustrations in IndexedDB. Participant photos and profile details are also stored locally, separately from the editable design documents. Photos are not uploaded to a server. Export JSON and images to keep a separate copy. Public AI generation and cloud sync are not enabled.

Local development can use the file-backed design API and an optional AI Gateway key. Hosted file storage is disabled. Multi-user generation needs account-scoped storage and consumption controls before it can be enabled.

Event SDK remains a separate initiative. See [provenance](docs/provenance.md).

## Brand assets

Open Graph images, a square social card, vector marks, favicon and app icons are in `apps/web/public/brand-assets`. Regenerate them from the bundled badge renders with `bun run --cwd apps/web brand:assets`. The web metadata uses the 1200 × 630 PNG. Icon artwork follows the existing Phosphor Stack mark; the renderer, event credits and font licenses remain in [provenance](docs/provenance.md).

## License

AGPL-3.0-only. Preserve the included font licenses and renderer attribution.
