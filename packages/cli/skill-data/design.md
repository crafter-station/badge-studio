# Art direction, with room to invent

The catalog is a reference library, not a template ceiling. Aim for the specificity of Vibecode Fest, She Ships, IA Hackathon and Hack the Andes: a coherent visual idea that changes composition, type, image treatment and material together. Avoid a generic centered photo and a stack of labels unless the user's brief calls for that.

Inspect `badge_inspect` with `section: "catalog"` and `section: "schema"` or use `badgio styles list` and `badgio schema --json`. Those live schemas are authoritative for fields, enums and limits. Read a relevant catalog document as an example; do not guess fields.

Choose one strong visual idea from the person's brief. A few possible directions:

- An oversized condensed headline sliced across an asymmetric portrait, small ticket metadata and an acid color field.
- A photographic editorial cover with quiet serif typography, botanical silhouettes and a reverse that reads like a field note.
- A pixel arcade pass with a transformed portrait, modular grid, saturated highlights and a legible terminal-like reverse.
- An Andean expedition credential with bold geographic forms, cropped typography and a material that catches light.

These are prompts for invention, not recipes to repeat. Explain the direction briefly, then compose it rather than asking the user to place every layer.

## The full canvas is editable

- Position, size, rotate, hide, duplicate, remove and reorder layers on either face.
- Set typography, scale, weight, alignment, color and name/role bindings.
- Compose vector shapes, SVG paths, graphic patterns, text, portraits, images, QR and effects using the layer kinds exposed by the schema.
- Honor the agreed portrait treatment. Use supported crop, masks and editable filters where that choice calls for them; load the images guide for requested generation.
- Change face backgrounds, material surface and every material/effect parameter the schema supports.
- Build an independent reverse with useful event information and a clear QR, instead of merely copying the front.
- Use `badge_edit` action `replace` for a comprehensive new composition. Use `patch` for iteration; an `upsert` is a complete layer, and `order` must include every layer ID once.

Layout changes are freeform inside the current rectangular badge format. Do not promise arbitrary shaders, HTML/CSS layers, new fonts, cut shapes or layer types outside the renderer. Use supported controls creatively. Optional generated artwork can add texture or illustration, while names and important text should remain editable layers.

## Make the composition survive different people

Use the event title, artwork and material for the most expressive typography. Give variable identity text enough space to stay readable when the person changes. A composition that works only for a short example name is unfinished.

Default to the complete `name` binding, with `segment: "all"` or no segment. `first` means every word except the last, and `last` means the last word; these are not cultural given-name/surname fields. Two such layers repeat a single-word name and can squeeze a compound name into the smaller block. Use a split only when the person's requested display name and the intended reuse justify it.

For a reusable name area, prefer a generous width and enough height for multiple lines with `fit: "wrap"`, `baseline: "top"` and neutral tracking. Set its type size and line height together. Keep the entire area on a predictable contrasting surface, including where extra lines appear. Move decoration or resize the portrait before sacrificing name legibility.

Wrapping can still split an oversized word in the middle. Check wide and hyphenated surnames in the rendered result; a narrower supported typeface or a different size can keep them intact. Give long roles and organizations their own line budget so they do not become tiny after the name is fixed.

`shrink` only fits the width; it can make text arbitrarily small. `spread` also distributes characters across the line, which can look broken for a short name. Negative tracking can collide when a long value shrinks. These settings are useful for controlled display text, but are not a substitute for a variable-content layout. Keep full names, accents and compound surnames; do not silently abbreviate them to rescue the composition.

Before presenting a reusable design, render both faces with the actual name, a short single-word name and a long compound name. Include a wide or unbroken name and the intended writing system when relevant. Try realistic long role and organization values too. Use an isolated verification session for these substitutions, and restore its original participant afterward. Do not change the person's shared profile just to run a test.

Inspect the results at the preview's normal size: complete identity, legible type, sensible line breaks, contrast across the whole name area, portrait clearance and unchanged QR space. A schema pass or an oversized PNG does not establish readability. If a case fails, adjust the composition and rerender it; do not call the design universally adaptive after checking only one person.

## Constraints that keep the badge usable

The canvas is 1024 × 1536. Array order is paint order. Keep rotated bounds inside the canvas and reserve the top 90 pixels for the physical clip. Both faces need a name binding. The front needs 1–4 portraits. The back needs a role binding and an unrotated, unobstructed, square QR at least 280 pixels wide with contrast of 4.5 or greater. The schema and validator also enforce effect budgets and other bounds.

Read locks before editing. Do not unlock a person's deliberately locked layer without resolving their intent. Selecting a different style resets locks, so do not use style selection to bypass one.

Custom artwork requires both an image layer and imported bytes. A UUID alone is not an image. Preserve the original portrait and its alpha; do not invent a full body from a head-and-shoulders photo.

After composition, pause motion, inspect both faces at actual display size and check the material in motion. Improve obvious hierarchy or crop problems before showing the result. Follow-up requests such as “more chaotic,” “larger type,” or “make the back calmer” should modify the current composition in the same preview.
