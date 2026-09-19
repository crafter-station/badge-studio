# Optional image transformations

Use this after the user chooses generation or requests a change that needs new image content. A style reference alone does not authorize transforming the portrait. Honor an original-photo or filters-only choice; editable monochrome, tint, thermal, crop and other native treatments do not require ai-cli.

Distinguish transforming the person's photo from generating separate decorative artwork. A portrait transformation needs the actual portrait, not just the style reference. Keep the person's identity, framing, pose and proportions. For separate artwork, leave the portrait unchanged unless the user also requested its transformation.

Check `badgio doctor --json`. If ai-cli is missing, ask whether to install it for the requested transformation, then run:

```sh
npm install --global ai-cli
ai image --help
ai models --type image --json
```

Use the installed CLI's setup instructions for the user's AI Gateway credentials. Never put keys in chat, files, prompts, page storage, WebMCP arguments or the session URL. Explain that generation sends the selected source images to an external provider and uses Gateway credits separately from the coding agent's subscription. Confirm that processing and spending if not already authorized. If declined, offer the original photo or editable filters and continue with the user's choice.

Use the original local photo where available. To transform the current editor photo instead:

```sh
badgio studio call badge_get_image --url "$BADGE_STUDIO_URL" --params '{"target":"portrait"}' --json > portrait-response.json
badgio image extract --file portrait-response.json --out portrait.webp
```

The extraction helper also accepts agent-browser's WebMCP JSON envelope and refuses to overwrite files. Keep image bytes out of the conversation.

Choose a currently available model that accepts reference images. Verify the installed `ai image --help` flags, then use a prompt tailored to the design:

```sh
ai image -m "$BADGE_IMAGE_MODEL" -i portrait.webp --output transformed.png --json \
  "Transform only the supplied portrait into detailed pixel art. Preserve this person, head-and-shoulders framing, pose and proportions. No typography and no invented body."
```

For a cutout, request background removal explicitly and inspect whether the output has real alpha. An opaque background is not transparency. Do not report an image as transformed if generation failed; keep the original and explain the failure.

Import the result using a fresh state:

```sh
badgio studio call badge_inspect --url "$BADGE_STUDIO_URL" --params '{"section":"state"}' --json > state.json
badgio image params --file transformed.png --state state.json > image-params.json
badgio studio call badge_set_image --url "$BADGE_STUDIO_URL" --params @image-params.json --json
```

For artwork, add an image layer first, then pass `--target artwork` to `image params`. Inspect the resulting badge on both faces. Original and generated images stay separate so the user can return to the photograph.
