# vgpu landing material

This study adapts the projected studio-panel mask and dielectric Fresnel response from the open-source vgpu landing page, and applies its approach of optical-distance absorption, HDR reflection highlights, bloom and final tone mapping to a portrait badge.

Upstream: https://github.com/vercel-labs/vgpu

Inspected commit: `9a3f844e8288b11ba4e3c5a88ce03f8b9e864666`, on September 12, 2026.

Relevant files under `apps/docs/app/[lang]/(home)/components/prism-background/`:

- `environment/environment.wgsl`
- `pipelines/shared/glass/glass.wgsl`
- `pipelines/shared/glass/glass-common.wgsl`
- `pipelines/shared/glass/glass-back.wgsl`
- `pipelines/shared/spectral/spectral.wgsl`

Also inspected `apps/docs/examples/glass-fractal/hero-glass-transmission.wgsl`.

The upstream MIT license and copyright notice are preserved in `LICENSE.vgpu`. The badge geometry, facet atlas, portrait composition and UI are specific to this study. The upstream landing renderer was not copied wholesale.
