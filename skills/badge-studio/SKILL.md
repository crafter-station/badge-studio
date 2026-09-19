---
name: badge-studio
description: Create, iterate on and publish distinctive, editable badges from a user's photo in Badge Studio. Use for badge layouts, typography, materials, live browser previews and agent-driven submission to the public gallery with the badgio CLI.
---

# Badge Studio

This is a discovery stub. The workflow ships inside the CLI and matches its installed version.

Requires badgio 0.2.2 or newer. Before designing, check the installed version and load:

```sh
badgio --version
badgio skills get core
```

If `badgio` is missing, older than 0.2.2 or does not recognize `skills get`, ask to install or update it with `npm install --global badgio@latest` (Node.js 22+), unless installation is already authorized.

Before composing, distinguish a style reference from the user's portrait and resolve the photo, exact display name and treatment: original, editable filters or generated image. Ask only for missing decisions in one brief exchange, and wait for the required inputs rather than inventing a person or substituting a mascot.

Follow the core guide for this intake, missing dependencies, creative controls and a persistent preview in the session's built-in browser or the user's default browser. It asks before installing agent-browser and offers ai-cli only when image generation is needed. Creating, editing, saving locally and exporting require no account.

After showing the finished badge, offer to publish it to the public community gallery. The agent can prepare and submit the complete badge through WebMCP, then help confirm the actual preview with the user's Clerk account. Ask before making the photo and participant details public. Saving locally does not publish.

Use `badgio skills list` to discover focused guides, or `badgio skills get core --full` to load them together.
