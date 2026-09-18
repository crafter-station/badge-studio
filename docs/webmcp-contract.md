# Browser agent contract

The web editor remains editable. WebMCP exposes the same client-side documents, participant data, images, materials, view, local library and exports to a connected coding agent. It does not execute prompts, run shell commands, receive API keys or call a model.

The coding agent supplies layout reasoning using its own subscription. Optional image generation runs outside the browser through `ai-cli` and the user's AI Gateway credentials. The result returns as image bytes. Browser tools accept PNG, JPEG and WebP data URLs, never arbitrary remote URLs.

## Contract

- Tool names start with `badge_`. Read tools are annotated read-only; edit and download tools are not.
- Success is `{ok:true,data}`. Failure is `{ok:false,error:{code,message}}`, with validation details where available.
- Editing tools require the revision from `badge_inspect`. A stale revision fails without changing the document.
- Full-document replacement and batch edits use the same structural and semantic validator as the editor and CLI. Name and role bindings, QR readability, canvas bounds, and locks remain enforced.
- One edit call is one undo step. A rejected batch changes nothing. Switching a starting style explicitly resets locks, matching the manual selector.
- Concurrent mutations fail as busy; reads remain available. `badge_cancel` takes the active `operation.id` from inspection, aborts that operation and waits for cleanup. Native cancellation is forwarded when the browser provides a signal. Experimental Chromium can omit that signal, so consumers must use explicit cancellation. Leaving the editor unregisters tools and cancels in-flight tool work.
- Cancellation prevents pending commits. A completed IndexedDB transaction, profile update or initiated download is not rolled back. Inspect the current state and library before retrying after an ambiguous response.
- Image content is returned only by an explicit image/export request. Normal inspection includes metadata, not image bytes or credentials.
- Native tools are feature-detected using `document.modelContext`. The same tool objects can also register with the badgio local preview connection, which checks an exact loopback parent origin, window source and session token. This is a separate transport, not an emulated browser WebMCP API. Unsupported browsers retain all manual controls and can use this connection without native WebMCP.

## Runtime boundaries

| Boundary | Verification |
| --- | --- |
| Native registration and cleanup | Real agent-browser discovery, invoke, navigation away and return |
| Layout changes | Read, edit, inspect and rendered before/after; one-step undo |
| Untrusted input | Invalid layout, stale revision, locked edit, oversized/unsupported image rejected |
| Client storage | Save/load through the existing browser store; errors reported without false success |
| Images | Export source, import a local image, verify photo/material rendering and alpha |
| Inference | No model tools and no paid network request during browser operations |

## Upstream references

- [WebMCP explainer](https://github.com/webmachinelearning/webmcp/blob/main/README.md), observed September 18, 2026.
- [WebMCP implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md).
- [ai-cli image commands](https://github.com/vercel-labs/ai-cli/blob/main/packages/ai-cli/README.md).

Reference-image support and transparent output depend on the chosen image model. Asking for background removal is not a guarantee of alpha. Inspect the returned image before applying it; a deterministic local cutout tool is also compatible with the same import path.

## Local preview transport

`badgio studio start` serves a loopback shell containing the actual editor in an iframe. The editor accepts tool calls only from that parent window with an exact loopback origin and matching fragment capability. The parent authenticates with its own local server, forwards discovered tool metadata and carries invocation/results through postMessage. Tool execution reuses every native revision, lock, validation, timeout and cancellation check.

One tab owns a session. Opening another tab does not duplicate or synchronize its state. Agent-browser may attach to a supported existing browser connection and use discovered native tools, or inspect a separate verification copy; that copy must not be represented as the user's preview. The CLI bridge can operate the original visible preview independently of that browser's automation support.
