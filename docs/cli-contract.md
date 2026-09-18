# CLI contract, version 0.1.1

Badge Studio owns this contract. A design is the version 1 document in `packages/design`: two 1024 × 1536 faces, ordered layers, bound participant text, portrait filters, artwork references and a physical material recipe.

The CLI runs locally. It does not call an LLM, generate raster images, spend credits or publish anything. An agent edits the document using the runtime schema and validates the result with the same validator as the editor.

| Command | Data returned | Side effect |
| --- | --- | --- |
| `styles list` | `styles: {id, name, description, surface, faces}[]` | None |
| `schema` | `documentVersion`, canvas, JSON Schema, semantic constraints | None |
| `design create --style ID` | `design`, `path`, `written`, `dryRun` | None unless `--out` |
| `design create --style ID --out FILE` | Same document and receipt | Creates a new file exclusively, mode 0600 |
| `design validate --file FILE` | `valid`, `path`, `name`, `documentVersion` | None |

Success output is `{ok:true, version, data, nextSteps}`. Failure output is `{ok:false, version, error:{code,message}, nextSteps}`. JSON is automatic for non-TTY stdout or with `--json`; diagnostics go to stderr. Exit 0 means success, 2 means invalid input, 1 means system failure. No command prompts.

`--dry-run` uses the real catalog, validation and destination checks without writing. Existing files and symlinks are refused, including during dry run. The final `wx` open protects against a destination race. A process interruption can leave a partial new file; the CLI never overwrites it silently. There is no delete, remote write, credential storage or paid operation, so no approval or audit machinery is needed.

The JSON Schema covers structure; `design validate` additionally checks bounds, bindings, QR placement and contrast. Artwork UUIDs reference assets served by the app and are not embedded in JSON. The shipped catalog's artwork assets are included in the web app. Custom generated assets must be transferred separately.

Distribution: the `badgio` npm package contains a Node 22-compatible binary and bundles the shared catalog and validator. Run `npx badgio`, install with `npm install --global badgio`, or use `npm run studio -- <command>` from a built source checkout. For unattended agents, `npx --yes badgio` accepts npm's installation prompt. The `badge-studio` binary remains an alias.

`npm run test:npm -- <tarball-or-package>` verifies npx's binary resolution, a clean npm install, all 17 style round trips, schema output, overwrite protection and the compatibility alias. It runs outside the monorepo with a separate npm cache and a PATH without Bun.
