# Badge Studio

A local design studio for badges with personality. Explore nine event art directions and three physical originals, edit every layer, flip the badge, change its material and export it. Five original directions are also available in the editor.

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

The development portrait can be placed at `apps/web/public/prism/demo/railly.webp`; that directory is ignored. If it is absent, the renderer uses its neutral portrait fallback. You can upload a different photo in the editor. Preview images contain a sample participant and are included in this private repository.

## Use the CLI

```sh
bun run studio styles list
bun run studio design create --style gtm --out badge.json
bun run studio schema --json
bun run studio design validate --file badge.json
```

An agent can edit the JSON using the versioned schema and semantic validator. Choose **Importar JSON** in the editor to continue visually.

The CLI is local and does not generate images or call an LLM. It uses the same catalog and validator as the editor. It can build a Node 22-compatible binary; the package is not published.

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

This is a local prototype, not a production multi-tenant service. The inherited API stores designs and assets in local files and refuses to run on Vercel. Hosting the landing alone does not make the editor's persistence or generation production-ready. A hosted release needs durable storage, authorization, quotas and asset access tied to the account model.

Event SDK remains a separate initiative. See [provenance](docs/provenance.md).

## License

AGPL-3.0-only. Preserve the included font licenses and renderer attribution.
