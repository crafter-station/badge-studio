# Badge Studio

Create editable badges with personality from your terminal or coding agent.

```sh
bunx badgio styles list
bunx badgio design create --style gtm --out badge.json
bunx badgio schema --json
bunx badgio design validate --file badge.json
```

Or install the command:

```sh
bun add --global badgio
badgio --help
```

Requires Node.js 22 or newer. Open [Badge Studio](https://badge-studio.crafter.run/design), choose **Importar JSON**, upload your photo and export your badge.

The package is `badgio`; the app is Badge Studio. The `badge-studio` command remains available as an alias.

The package contains 17 starting designs, the document schema and its validator. Your agent can change typography, placement, portrait filters, graphics and material effects. Both faces remain editable in the web studio.

JSON output is automatic when piped. `design create --out` creates new files and refuses to overwrite existing files. Use `--dry-run` to preview a write.

The CLI does not call an LLM, generate images or render PNGs. It creates and validates style documents; the web studio renders and exports them. Artwork and participant photos are separate from the JSON. Built-in artwork is available in the studio; custom artwork must be imported separately.

Success: `{ok:true,version,data,nextSteps}`. Failure: `{ok:false,version,error,nextSteps}`. Exit codes: 0 success, 2 invalid input, 1 system error.

[Source and companion agent skill](https://github.com/crafter-station/badge-studio). Licensed under AGPL-3.0-only.
