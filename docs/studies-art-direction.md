# Five independent badge studies

The five custom studies are examples of reusable badge documents, separate from the twelve event and material references. They stay in Gallery and Studio; the landing orbit is unchanged.

The shared catalog is the source for the editor, CLI and renderer. Run `bun scripts/redesign-studies.ts` to reproduce these five documents. It validates each replacement before writing and preserves the other twelve entries.

| Study | Direction | Portrait | Reverse | Reference principle |
| --- | --- | --- | --- | --- |
| Herbario azul | Prussian-blue cyanotype and an ivory accession label | Original photo with a cyanotype filter and softened contact-print edges | Botanical collection record | Next Craft: a tactile substrate; Andes: a readable identity block |
| Frecuencia ácida | Acid-green type on a black club pass | Close monochrome crop, a slight olive tint, restrained vinyl reflection | Side B with the participant's role, frequency number and admission QR | IA Hackathon: disciplined technical hierarchy; Thermal: a recognizable signal vocabulary |
| Terracota postal | Warm terracotta paper, italic serif and a cancelled photo stamp | Existing portrait mounted at six degrees with a warm photographic filter | A postcard with recipient, event details and a QR postage stamp | She Ships: deliberate crop and placement; Next Craft: a human print quality |
| Ópalo lunar | Monumental editorial serif and quiet nacre | An elliptical monochrome portrait with a violet tint | An exhibition label on midnight violet | Prism and GTM: light as material, with legibility preserved |
| Radio risográfica | Cobalt and vermilion on uncoated stock | A blue-toned photo with an elliptical line screen | A station identification card | Vibecode: a coherent visual metaphor; IA Hackathon: clear credential hierarchy |

## Editing and material constraints

- Event title, participant name, role, organization, location, date and number remain participant or event bindings. Decorative writing stays editable text.
- No portrait was regenerated. Uploading a photo replaces the portrait layer without changing the person's pose, outfit or anatomy.
- Only Herbario's botanical substrate uses a new generated bitmap. All other new composition, type, stamps, waves, portrait treatments and QR codes use native layers.
- Both faces reserve the top 90 pixels for the lanyard slot. QR layers remain opaque, have a quiet zone and occupy at least 280 pixels on the reverse.
- Frecuencia and Ópalo use a smooth procedural coating. The legacy faceted prism and the GTM ribbon color effect are deliberately not their surface treatment.
- The material protection mask follows ellipse and arch portrait clips, avoiding a rectangular patch around a curved photo.

## Generated substrate

Herbario artwork: `apps/web/public/prism/showcase/b0960e23-8714-4f78-a614-3ec4dfaa27f5.png`.

Generated with `openai/gpt-image-2` through the authorized Vercel AI Gateway CLI route. Prompt: an authentic Prussian-blue cyanotype contact print with fine ivory fern fronds and grasses at the edges, a quiet center and top, and subtle cotton paper. No people, lettering, borders, labels or badge mockup. The production PNG uses an indexed palette; the original generation and full prompt are retained in the local image generation receipt.
