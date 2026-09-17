# Implementation decisions

- Contract origin: defined. Badge Studio owns the version 1 design schema and shares it between CLI and editor.
- Extraction preserves the original AGPL-3.0-only license and source provenance. Event SDK remains independent.
- cligentic `detect`: hybrid. Use TTY detection and explicit JSON output, omit unused OS detection. Do not accept `NO_JSON` because it would weaken the automatic machine-output contract.
- cligentic `style`: hybrid. Retain central ANSI/NO_COLOR control and visible-width padding; use Node's `stripVTControlCharacters` and keep the monochrome palette compact. No unused terminal helpers.
- cligentic `banner`: hybrid. Retain stderr-only presentation on human help, use a one-line wordmark instead of the large ASCII alphabet.
- No registry files installed: inspected the live registry sources, adapted only these primitives without UI registry setup or unused dependencies. No CLI `components.json` introduced; the web app retains the editor’s existing shadcn configuration.
- Trust ladder, secret prompt, audit, async job ledger: rejected for this scope. No networking, destructive operation, credential input or paid generation exists in this CLI.
- Mutations create new files only. `--dry-run` checks the actual document and destination. No `--force` option.
- Landing motion uses imperative transforms and Web Audio, with no React state updates per frame. Existing renderer is loaded only on editor routes.
- Landing now shows only the nine event reference badges, following the user’s correction. Five custom directions remain available inside the editor. Pins and other formats are future scope.

- Restored the original thermal palette, faceted prism and polished chrome as editable material documents. Recipes without a procedural field use the existing native physical shader path; text and metadata stay independent layers. New portrait filter values reuse the existing photographic pixel transforms.
