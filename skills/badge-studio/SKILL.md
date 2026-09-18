---
name: badge-studio
description: Create and iterate on distinctive, editable badges from a user's photo in Badge Studio. Use for badge layouts, typography, materials, portrait treatments and live browser previews with the badgio CLI.
---

# Badge Studio

This is a discovery stub. The workflow ships inside the CLI and matches its installed version.

Before designing, load:

```sh
badgio skills get core
```

If `badgio` is missing or does not recognize `skills get`, ask to install or update it with `npm install --global badgio` (Node.js 22+), unless installation is already authorized.

Follow the core guide for the photo, missing dependencies, creative controls and a persistent preview in the session's built-in browser or the user's default browser. It asks before installing agent-browser and offers ai-cli only when image generation is needed.

Use `badgio skills list` to discover focused guides, or `badgio skills get core --full` to load them together.
