# Badge Studio

A design studio for badges with personality. Explore nine event art directions, three physical originals and five custom studies. Edit every layer, flip the badge, change its material and export it.

Try [Badge Studio](https://badge-studio.crafter.run), or create a document from your terminal with `bunx badg styles list`.

The landing is a draggable orbit of nine event badges plus Térmico, Prisma and Cromo, with depth, inertia and optional synthesized mechanical ticks. It supports keyboard rotation, reduced motion and light/dark themes.

## Run

Requires Bun 1.3+.

```sh
bun install
cp -n apps/web/.env.example apps/web/.env.local
bun run build:packages
bun run dev
```

Open `http://127.0.0.1:3004`. The editor is at `/design` and the local CLI guide at `/docs`.

Browsing, editing, JSON import/export and PNG export do not need credentials. Prompt-based generation and artwork generation use an optional Vercel AI Gateway key. Copy `apps/web/.env.example` to `apps/web/.env.local` and add your own key to enable those operations.

The bundled demo portrait and prepared event studies show the sample participant. You can upload a different photo in the editor; changing events preserves your uploaded photo.

## Use the CLI

```sh
bunx badg styles list
bunx badg design create --style gtm --out badge.json
bunx badg schema --json
bunx badg design validate --file badge.json
```

An agent can edit the JSON using the versioned schema and semantic validator. Choose **Importar JSON** in the editor to continue visually.

The npm package is `badg`, with `badg` and `badge-studio` commands. It requires Node.js 22 or newer and bundles the same catalog and validator as the editor. The CLI works locally and does not generate images, call an LLM or render PNGs. From a source checkout, use `bun run studio`.

See [the CLI contract](docs/cli-contract.md) and [the companion skill](skills/badge-studio/SKILL.md).

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

## Service boundary

The public studio uses `NEXT_PUBLIC_BADGE_STORAGE=browser` to save designs and illustrations in IndexedDB. Export JSON and images to keep a separate copy. Public AI generation and cloud sync are not enabled.

Local development can use the file-backed design API and an optional AI Gateway key. Hosted file storage is disabled. Multi-user generation needs account-scoped storage and consumption controls before it can be enabled.

Event SDK remains a separate initiative. See [provenance](docs/provenance.md).

## License

AGPL-3.0-only. Preserve the included font licenses and renderer attribution.
