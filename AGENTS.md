# Badge Studio

- The published CLI runs on Node.js 22+. Use npm/npx for public commands, docs and agent instructions.
- Use Bun for monorepo maintenance and Biome for linting and formatting.
- Keep Event SDK independent. Do not edit a sibling repository as a side effect.
- The schema and catalog in `packages/design` are shared by the editor, CLI and renderer.
- Landing content is the nine event reference badges plus Térmico, Prisma and Cromo. Custom explorations remain inside the editor.
- Preserve both faces, participant bindings, QR readability and physical material semantics.
- Use agent-browser for browser verification. Verify actual rendered and interactive results.
- No code comments or coauthor trailers unless requested.
- No deployment, package publication or change of repository visibility without an explicit request.
- Preserve AGPL-3.0-only provenance and bundled font licenses.
