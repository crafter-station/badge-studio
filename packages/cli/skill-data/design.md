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
- Use portrait crop, filters, masks and treatments already available before requesting a generated image.
- Change face backgrounds, material surface and every material/effect parameter the schema supports.
- Build an independent reverse with useful event information and a clear QR, instead of merely copying the front.
- Use `badge_edit` action `replace` for a comprehensive new composition. Use `patch` for iteration; an `upsert` is a complete layer, and `order` must include every layer ID once.

Layout changes are freeform inside the current rectangular badge format. Do not promise arbitrary shaders, HTML/CSS layers, new fonts, cut shapes or layer types outside the renderer. Use supported controls creatively. Optional generated artwork can add texture or illustration, while names and important text should remain editable layers.

## Constraints that keep the badge usable

The canvas is 1024 × 1536. Array order is paint order. Keep rotated bounds inside the canvas and reserve the top 90 pixels for the physical clip. Both faces need a name binding. The front needs 1–4 portraits. The back needs a role binding and an unrotated, unobstructed, square QR at least 280 pixels wide with contrast of 4.5 or greater. The schema and validator also enforce effect budgets and other bounds.

Read locks before editing. Do not unlock a person's deliberately locked layer without resolving their intent. Selecting a different style resets locks, so do not use style selection to bypass one.

Custom artwork requires both an image layer and imported bytes. A UUID alone is not an image. Preserve the original portrait and its alpha; do not invent a full body from a head-and-shoulders photo.

After composition, pause motion, inspect both faces at actual display size and check the material in motion. Improve obvious hierarchy or crop problems before showing the result. Follow-up requests such as “more chaotic,” “larger type,” or “make the back calmer” should modify the current composition in the same preview.
