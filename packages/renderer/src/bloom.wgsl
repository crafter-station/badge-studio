struct Blur {
  direction: vec2f,
  extract: f32,
  threshold: f32,
}
@group(0) @binding(0) var<uniform> blur: Blur;
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

fn sampleSource(uv: vec2f) -> vec3f {
  let color = textureSampleLevel(source, linearSampler, uv, 0.0).rgb;
  return mix(color, max(color - vec3f(blur.threshold), vec3f(0.0)), blur.extract);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var color = sampleSource(uv) * 0.227027;
  color += (sampleSource(uv + blur.direction * 1.384615) + sampleSource(uv - blur.direction * 1.384615)) * 0.316216;
  color += (sampleSource(uv + blur.direction * 3.230769) + sampleSource(uv - blur.direction * 3.230769)) * 0.070270;
  return vec4f(color, 1.0);
}
