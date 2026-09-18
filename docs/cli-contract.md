# CLI contract, version 0.2.0

Badge Studio owns this contract. A design is the version 1 document in `packages/design`: two 1024 × 1536 faces, ordered layers, bound participant text, portrait filters, artwork references and a physical material recipe.

The CLI runs locally. It does not call an LLM, generate raster images, spend credits or publish anything. An agent edits the document using the runtime schema and validates the result with the same validator as the editor.

| Command | Data returned | Side effect |
| --- | --- | --- |
| `skills list` | Bundled guide names and descriptions | None |
| `skills get NAME [--full]` | Markdown (or JSON with explicit `--json`) | None |
| `doctor` | Installed agent-browser and optional ai-cli status | None; never installs |
| `studio start [--no-open]` | Private local URL, site and PID | Starts a loopback process; opens the OS default browser unless suppressed |
| `studio tools --url URL` | Connected state and tool metadata | None |
| `studio call TOOL --url URL --params JSON_OR_@FILE` | Editor tool result | The discovered tool's documented effect |
| `studio stop --url URL` | Stop receipt | Ends this local session |
| `image params --file IMAGE --state RESPONSE` | Raw image import arguments | None |
| `image extract --file RESPONSE --out FILE` | Path and byte count | Exclusive file creation |
| `styles list` | `styles: {id, name, description, surface, faces}[]` | None |
| `schema` | `documentVersion`, canvas, JSON Schema, semantic constraints | None |
| `design create --style ID` | `design`, `path`, `written`, `dryRun` | None unless `--out` |
| `design create --style ID --out FILE` | Same document and receipt | Creates a new file exclusively, mode 0600 |
| `design validate --file FILE` | `valid`, `path`, `name`, `documentVersion` | None |

Success output is `{ok:true, version, data, nextSteps}`. Failure output is `{ok:false, version, error:{code,message}, nextSteps}`. JSON is automatic for non-TTY stdout or with `--json`; diagnostics go to stderr. `skills get` emits plain Markdown unless `--json` is explicit. `image params` emits raw arguments for direct `--params @file` use. Exit 0 means success, 2 means invalid input or a rejected editor operation, 1 means system failure. No command prompts.

`--dry-run` uses the real catalog, validation and destination checks without writing. Existing files and symlinks are refused, including during dry run. The final `wx` open protects against a destination race. A process interruption can leave a partial new file; the CLI never overwrites it silently. The CLI never installs dependencies or starts paid operations. The skill asks for any needed installation or generation authorization.

The JSON Schema covers structure; `design validate` additionally checks bounds, bindings, QR placement and contrast. Artwork UUIDs reference assets served by the app and are not embedded in JSON. The shipped catalog's artwork assets are included in the web app. Custom generated assets must be transferred separately.

Distribution: the `badgio` npm package contains a Node 22-compatible binary and bundles the shared catalog and validator. Run `npx badgio`, install with `npm install --global badgio`, or use `npm run studio -- <command>` from a built source checkout. For unattended agents, `npx --yes badgio` accepts npm's installation prompt. The `badge-studio` binary remains an alias.

`npm run test:npm -- <tarball-or-package>` verifies npx's binary resolution, a clean npm install, all 17 style round trips, schema output, overwrite protection and the compatibility alias. It runs outside the monorepo with a separate npm cache and a PATH without Bun.

## Live preview connection

The process binds an OS-selected port on `127.0.0.1`. A 256-bit capability in the preview URL fragment authenticates tool calls. The local page embeds the production editor, or an explicitly selected local development origin. Calls use local HTTP and exact-origin/source-checked postMessage; the website never fetches localhost. No browser debugging flags or cross-origin CORS permission are required for this connection.

Only one browser tab owns a session. The server checks Host and Origin and refuses cross-site browser requests. It authenticates every API request, bounds request bodies to 12 MB and concurrent calls to eight, and expires calls after 40 seconds. Editor tool timeouts remain 35 seconds. Caller cancellation and disconnect release pending calls; the preview aborts operations when its connection is lost. An ambiguous outcome is never automatically retried.

`studio start` remains in the foreground. Agents should keep that process alive, use `--no-open` when their session has a browser panel, and otherwise let the OS open the default browser. The local connection and native WebMCP share the same editor state and tool validation. This is not browser-storage synchronization or cloud persistence. Browser panels may partition storage; exported JSON still excludes image bytes.
