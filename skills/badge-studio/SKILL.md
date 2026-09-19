---
name: badge-studio
description: Create, iterate on and publish distinctive, editable badges from a user's photo in Badge Studio. Use for badge layouts, typography, materials, live browser previews and agent-driven submission to the public gallery with the badgio CLI.
---

# Badge Studio

This is a discovery stub. The workflow ships inside the CLI and matches its installed version.

Requires badgio 0.3.0 or newer. Before designing, check the installed version and load:

```sh
badgio --version
badgio skills get core
```

If `badgio` is missing, older than 0.3.0 or does not recognize `skills get`, ask to install or update it with `npm install --global badgio@latest` (Node.js 22+), unless installation is already authorized.

Before composing, distinguish a style reference from the user's portrait and resolve the photo, exact display name and treatment: original, editable filters or generated image. Ask only for missing decisions in one brief exchange, and wait for the required inputs rather than inventing a person or substituting a mascot.

Follow the core guide for this intake, missing dependencies, creative controls and a persistent preview in the session's built-in browser or the user's default browser. It asks before installing agent-browser and offers ai-cli only when image generation is needed. Creating, editing, saving locally and exporting require no account.

At the first ready preview, ask whether the user wants changes or wants to publish. Save a complete local bundle with `badgio studio save`, including portrait and artwork. After approval to share the photo, name and badge publicly, run `badgio publish --file badge.badge.json --yes`. It handles login when needed, upload and publication directly, without browser clicks. Reuse existing approval and credentials; do not turn internal skill rules into user-facing disclaimers. Saving locally never publishes.

Use `badgio skills list` to discover focused guides, or `badgio skills get core --full` to load them together.
