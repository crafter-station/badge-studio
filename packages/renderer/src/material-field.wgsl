import { perlin2d, fbmPerlin2d } from "@vgpu/wgsl-std/noise/perlin";
import { voronoi2d } from "@vgpu/wgsl-std/noise";

struct Field {
  time: f32,
  pointer: vec2f,
  seed: vec4f,
  layer0: vec4f,
  flow0: vec4f,
  layer1: vec4f,
  flow1: vec4f,
  layer2: vec4f,
  flow2: vec4f,
  layer3: vec4f,
  flow3: vec4f,
}

@group(0) @binding(0) var<uniform> field: Field;

fn layerAt(point: vec2f, shape: vec4f, flow: vec4f, previous: f32) -> f32 {
  if (flow.z <= 0.0) { return previous; }
  let a = shape.w;
  var p = vec2f(point.x * cos(a) - point.y * sin(a), point.x * sin(a) + point.y * cos(a));
  p *= shape.y * vec2f(shape.z, 1.0 / sqrt(shape.z));
  let drift = field.time * flow.y;
  p += field.seed.xy * 43.0 + vec2f(sin(drift * 0.7), cos(drift * 0.53)) * 0.7;
  let warp = vec2f(perlin2d(p * 0.62 + 3.1), perlin2d(p * 0.62 + 17.8));
  p += (warp + vec2f(previous * 0.65, -previous * 0.4)) * flow.x;
  var value = 0.0;
  if (shape.x < 0.5) {
    value = fbmPerlin2d(p, 2, 2.03, 0.38) * 1.6;
  } else if (shape.x < 1.5) {
    let cell = voronoi2d(p);
    value = (cell.f2 - cell.f1) * 1.6 - 0.5;
  } else if (shape.x < 2.5) {
    value = sin(p.x * 3.14159 + perlin2d(p * 0.45) * 2.0);
  } else {
    value = cos(length(p - field.seed.xy * 43.0) * 4.0);
  }
  return mix(previous + value * flow.z, previous * mix(1.0, value, flow.z), flow.w);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var p = vec2f((uv.x - 0.5) * 1.49, (0.5 - uv.y) * 2.26);
  let cursor = field.pointer * vec2f(0.745, -1.13);
  let offset = p - cursor;
  p += offset * exp(-dot(offset, offset) * 3.0) * length(field.pointer) * 0.22;
  var h = layerAt(p, field.layer0, field.flow0, 0.0);
  h = layerAt(p, field.layer1, field.flow1, h);
  h = layerAt(p, field.layer2, field.flow2, h);
  h = layerAt(p, field.layer3, field.flow3, h);
  let weight = max(1.0, field.flow0.z + field.flow1.z + field.flow2.z + field.flow3.z);
  h /= weight;
  return vec4f(h, dpdx(h) * (384.0 / 1.49), -dpdy(h) * (576.0 / 2.26), 1.0);
}
