@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var glow: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

fn present(color: vec3f) -> vec3f {
  let c = max(color * 0.82, vec3f(0.0));
  let mapped = clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
  return select(mapped * 12.92, 1.055 * pow(mapped, vec3f(1.0 / 2.4)) - 0.055, mapped > vec3f(0.0031308));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let base = textureSampleLevel(scene, linearSampler, uv, 0.0);
  if (base.a < 0.99) { return base; }
  let bloom = textureSampleLevel(glow, linearSampler, uv, 0.0).rgb * (1.0 - smoothstep(0.72, 0.82, uv.y));
  let grain = (fract(sin(dot(uv * vec2f(textureDimensions(scene)), vec2f(127.1, 311.7))) * 43758.5453) - 0.5) * 0.005;
  return vec4f(clamp(present(base.rgb + bloom * 0.38) + grain, vec3f(0.0), vec3f(1.0)), base.a);
}
