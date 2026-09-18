# Preview assets

The editor and `LiveBadge` share their default participant data through `apps/web/src/lib/studio-participant.ts`. Prepared event portraits are selected by `portrait-studies.ts`; uploaded photos remain unchanged.

After changing the catalog, demo portraits, event metadata or renderer, refresh the physical fallback images from the running Gallery:

```sh
bun run build:packages
bun run dev
```

In a second terminal, with `agent-browser` installed:

```sh
bun scripts/capture-preview-assets.ts
```

The script opens its own WebGPU browser session, captures both settled faces of all 17 designs and closes the session. It writes the hero's `collection/materials` fronts, `collection/previews` faces and `showcase/previews` faces. An optional first argument selects another local origin.

The capture temporarily sizes each real Gallery preview to 720 × 960 CSS pixels. These images are fallback assets, not screenshots proving the unmodified Gallery layout. Inspect the resulting front and back images before deployment.
