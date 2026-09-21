struct Params {
  resolution: vec2f,
  angles: vec2f,
  pointer: vec2f,
  light: vec2f,
  spectral: f32,
  finish: f32,
  time: f32,
  lift: f32,
  fluidity: f32,
  activity: f32,
  surfaceKind: f32,
  thermal: f32,
  customMaterial: vec4f,
  coating: vec4f,
  faceRegion: vec4f,
  signature: vec4f,
  heat0: vec4f,
  heat1: vec4f,
  heat2: vec4f,
  heat3: vec4f,
  roll: f32,
  topographic: f32,
  designMode: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var portrait: texture_2d<f32>;
@group(0) @binding(2) var printSampler: sampler;
@group(0) @binding(3) var opticalAtlas: texture_2d<f32>;
@group(0) @binding(4) var foil: texture_2d<f32>;
@group(0) @binding(5) var reversePrint: texture_2d<f32>;
@group(0) @binding(6) var materialField: texture_2d<f32>;
@group(0) @binding(7) var designMask: texture_2d<f32>;
@group(0) @binding(8) var designEffects: texture_2d<f32>;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn rotateX(p: vec3f, a: f32) -> vec3f {
  return vec3f(p.x, p.y * cos(a) - p.z * sin(a), p.y * sin(a) + p.z * cos(a));
}

fn rotateY(p: vec3f, a: f32) -> vec3f {
  return vec3f(p.x * cos(a) + p.z * sin(a), p.y, -p.x * sin(a) + p.z * cos(a));
}

fn rotateZ(p: vec3f, a: f32) -> vec3f {
  return vec3f(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a), p.z);
}

fn toLocal(p: vec3f) -> vec3f {
  return rotateX(rotateY(rotateZ(p, -params.roll), -params.angles.y), -params.angles.x);
}

fn toWorld(p: vec3f) -> vec3f {
  return rotateZ(rotateY(rotateX(p, params.angles.x), params.angles.y), params.roll);
}

fn linear(color: vec3f) -> vec3f {
  return select(color / 12.92, pow((color + 0.055) / 1.055, vec3f(2.4)), color > vec3f(0.04045));
}

fn roundedRect(p: vec2f, bounds: vec2f, radius: f32) -> f32 {
  let q = abs(p) - bounds + radius;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

fn badgeDistance(p: vec3f) -> f32 {
  let face = roundedRect(p.xy, vec2f(0.75, 1.135), 0.105);
  let q = vec2f(face, abs(p.z) - 0.038);
  let body = min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - 0.020;
  let slot = roundedRect(p.xy - vec2f(0.0, 1.008), vec2f(0.156, 0.025), 0.024);
  let bevel = clamp(0.5 + 0.5 * (body + slot) / 0.014, 0.0, 1.0);
  return mix(-slot, body, bevel) + 0.014 * bevel * (1.0 - bevel);
}

fn geometricNormal(p: vec3f) -> vec3f {
  let e = vec2f(0.0006, 0.0);
  return normalize(vec3f(
    badgeDistance(p + e.xyy) - badgeDistance(p - e.xyy),
    badgeDistance(p + e.yxy) - badgeDistance(p - e.yxy),
    badgeDistance(p + e.yyx) - badgeDistance(p - e.yyx)
  ));
}

fn spectrum(phase: f32) -> vec3f {
  return 0.5 + 0.5 * cos(6.2831853 * (vec3f(0.0, 0.33, 0.67) + phase));
}

fn panel(direction: vec3f, forwardInput: vec3f, size: vec2f, feather: f32) -> f32 {
  let forward = normalize(forwardInput);
  let helper = select(vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(forward.y) > 0.92);
  let right = normalize(cross(helper, forward));
  let up = cross(forward, right);
  let facing = dot(direction, forward);
  if (facing <= 0.01) { return 0.0; }
  let local = abs(vec2f(dot(direction, right), dot(direction, up)) / facing);
  let edges = vec2f(1.0) - smoothstep(size, size + feather, local);
  return edges.x * edges.y;
}

fn studio(directionInput: vec3f) -> vec3f {
  let d = rotateX(rotateY(normalize(directionInput), params.light.x * 0.64), params.light.y * 0.52);
  let room = mix(vec3f(0.035, 0.042, 0.060), vec3f(0.18, 0.20, 0.24), smoothstep(-0.7, 0.8, d.y));
  let left = panel(d, vec3f(-0.48, 0.32, 0.81), vec2f(0.20, 0.65), 0.19);
  let right = panel(d, vec3f(0.61, 0.35, 0.71), vec2f(0.50, 0.15), 0.12);
  let ceiling = panel(d, vec3f(-0.12, 0.89, 0.40), vec2f(0.90, 0.17), 0.10);
  let fill = panel(d, vec3f(0.0, -0.70, 0.71), vec2f(0.55, 0.34), 0.25);
  return room + vec3f(1.0, 0.96, 0.92) * left * 3.4
    + vec3f(0.80, 0.89, 1.0) * right * 4.2
    + vec3f(1.0) * ceiling * 2.6 + vec3f(0.70, 0.76, 0.90) * fill * 0.85;
}

fn dielectricFresnel(ior: f32, facing: f32) -> f32 {
  let ratio = (ior - 1.0) / (ior + 1.0);
  let f0 = ratio * ratio;
  return f0 + (1.0 - f0) * pow(1.0 - clamp(facing, 0.0, 1.0), 5.0);
}

fn background() -> vec3f {
  if (params.finish > 1.5) { return vec3f(0.055, 0.057, 0.070); }
  if (params.finish > 0.5) { return vec3f(0.924, 0.91, 0.94); }
  return vec3f(0.938, 0.934, 0.918);
}

fn facet(p: vec2f) -> vec4f {
  let unique = p + (params.signature.xy - 0.5) * vec2f(0.21, 0.19);
  let uv = clamp(vec2f(unique.x / 1.6 + 0.5, 0.5 - unique.y / 2.4), vec2f(0.0), vec2f(0.99999));
  let texel = textureLoad(opticalAtlas, vec2i(uv * vec2f(textureDimensions(opticalAtlas))), 0);
  return vec4f(texel.xy * 2.0 - 1.0, (texel.z - 0.5) * 0.14, texel.w * 0.07);
}

fn printed(uv: vec2f) -> vec3f {
  let safe = clamp(uv, vec2f(0.001), vec2f(0.999));
  var color = textureSampleLevel(portrait, printSampler, safe, 0.0).rgb;
  if (params.surfaceKind > 0.5) { return linear(color); }
  if (params.finish > 0.5 && params.finish < 1.5) {
    let offset = vec2f(0.0027, 0.0);
    color = color * 0.4
      + textureSampleLevel(portrait, printSampler, safe + offset, 0.0).rgb * 0.15
      + textureSampleLevel(portrait, printSampler, safe - offset, 0.0).rgb * 0.15
      + textureSampleLevel(portrait, printSampler, safe + offset.yx, 0.0).rgb * 0.15
      + textureSampleLevel(portrait, printSampler, safe - offset.yx, 0.0).rgb * 0.15;
    color = mix(color, vec3f(0.82, 0.81, 0.91), 0.10);
  }
  if (params.finish > 1.5) { color *= vec3f(0.81, 0.86, 0.98); }
  return linear(color);
}

fn transmission(p: vec3f, ray: vec3f, normal: vec3f, ior: f32, depth: f32) -> vec4f {
  let inside = refract(ray, normal, 1.0 / ior);
  let travel = (-0.17 - depth - p.z) / min(inside.z, -0.1);
  let destination = p + inside * max(travel, 0.0);
  let uv = vec2f(destination.x / 1.49 + 0.5, 0.5 - destination.y / 2.26);
  let absorption = vec3f(0.16, 0.065, 0.028) * select(1.0, 2.6, params.finish > 1.5);
  let attenuation = exp(-absorption * max(travel, 0.0));
  return vec4f(printed(uv) * attenuation, max(travel, 0.0));
}

fn heatSpot(p: vec2f, point: vec4f) -> f32 {
  return exp(-dot(p - point.xy, p - point.xy) / 0.065) * point.z;
}

fn materialSample(uv: vec2f) -> vec4f {
  let texel = vec2f(1.5 / 384.0, 1.5 / 576.0);
  return textureSampleLevel(materialField, printSampler, uv, 0.0) * 0.4
    + textureSampleLevel(materialField, printSampler, uv + vec2f(texel.x, 0.0), 0.0) * 0.15
    + textureSampleLevel(materialField, printSampler, uv - vec2f(texel.x, 0.0), 0.0) * 0.15
    + textureSampleLevel(materialField, printSampler, uv + vec2f(0.0, texel.y), 0.0) * 0.15
    + textureSampleLevel(materialField, printSampler, uv - vec2f(0.0, texel.y), 0.0) * 0.15;
}

fn ribbonColor(h: f32, uv: vec2f) -> vec3f {
  let pink = exp(-pow(abs((h + 0.03) / 0.22), 2.0)) * 0.92;
  let violet = exp(-pow(abs((h - 0.13) / 0.15), 2.0)) * 0.54;
  let cyan = exp(-pow(abs((h - 0.35) / 0.13), 2.0)) * 0.72;
  let halo = exp(-pow(abs((h + 0.31) / 0.14), 2.0)) * 0.48;
  var color = mix(vec3f(0.975, 0.94, 0.955), vec3f(0.96, 0.39, 0.99), pink);
  color = mix(color, vec3f(0.71, 0.49, 0.98), violet);
  color = mix(color, vec3f(0.57, 0.96, 0.98), cyan);
  color = mix(color, vec3f(0.64, 0.96, 0.96), halo);
  color += (hash(floor(uv * vec2f(1024.0, 1536.0))) - 0.5) * 0.022;
  return linear(clamp(color, vec3f(0.0), vec3f(1.0)));
}

fn reverseCard(p: vec3f, rd: vec3f, normal: vec3f) -> vec3f {
  let uv = clamp(vec2f(0.5 - p.x / 1.49, 0.5 - p.y / 2.26), vec2f(0.001), vec2f(0.999));
  let printedColor = textureSampleLevel(reversePrint, printSampler, uv, 0.0).rgb;
  var print = linear(printedColor);
  if (params.customMaterial.w > 0.5) {
    let ink = 1.0 - smoothstep(0.35, 0.87, max(max(printedColor.r, printedColor.g), printedColor.b));
    let lower = step(vec2f(76.0, 958.0) / vec2f(1024.0, 1536.0), uv);
    let upper = step(uv, vec2f(464.0, 1346.0) / vec2f(1024.0, 1536.0));
    let qr = select(lower.x * lower.y * upper.x * upper.y, textureSampleLevel(designMask, printSampler, uv, 0.0).g, params.designMode.x > 1.5);
    print = mix(ribbonColor(materialSample(uv).x, uv), print, max(ink, qr));
  }
  if (params.designMode.x > 1.5 && params.designMode.z > 0.0) {
    let protection = textureSampleLevel(designMask, printSampler, uv, 0.0).g;
    print = linear(applyDesignEffects(pow(max(print, vec3f(0.0)), vec3f(1.0 / 2.2)), uv, true, protection));
  }
  let front = pow(max(-normal.z, 0.0), 12.0);
  var optical = normal;
  if (params.coating.w > 0.0) {
    let field = materialSample(uv);
    let slope = field.yz * params.coating.x * 0.045;
    optical = normalize(mix(normal, normalize(vec3f(slope.x, -slope.y, -1.0)), front));
  }
  let reflected = studio(toWorld(reflect(rd, optical))) * mix(1.0, 1.05 - params.customMaterial.x * 0.7, params.customMaterial.z);
  let edge = exp(-abs(roundedRect(p.xy, vec2f(0.746, 1.13), 0.109) + 0.012) * 310.0);
  let film = select(spectrum(p.y * 0.20 + params.light.x * 0.2 + params.signature.z), vec3f(0.33, 0.48, 0.72), params.topographic > 0.5);
  let sheenMask = smoothstep(0.73, 0.95, uv.x) * mix(0.02, 0.055, params.coating.w);
  let sheen = reflected * sheenMask * select(1.0, 0.2, params.surfaceKind > 0.5 && params.surfaceKind < 1.5);
  return mix(reflected * 0.25, print + sheen, front) + edge * (reflected * 0.25 + film * 0.15);
}

fn proceduralCard(p: vec3f, rd: vec3f, geometric: vec3f) -> vec3f {
  let uv = clamp(vec2f(p.x / 1.49 + 0.5, 0.5 - p.y / 2.26), vec2f(0.001), vec2f(0.999));
  let field = materialSample(uv);
  let front = pow(max(geometric.z, 0.0), 12.0);
  let faceCenter = vec2f((params.faceRegion.x - 0.5) * 1.49, (0.5 - params.faceRegion.y) * 2.26);
  let radius = max(params.faceRegion.z, 0.1);
  let offset = p.xy - faceCenter;
  let faceOffset = offset / vec2f(radius * 1.8, radius * 2.8);
  let squaredOffset = faceOffset * faceOffset;
  let identity = smoothstep(0.2, 0.85, exp(-dot(squaredOffset, squaredOffset)));
  let footer = 1.0 - smoothstep(0.69, 0.88, uv.y);
  let mask = params.coating.w * (1.0 - identity) * footer;
  let slope = field.yz * params.coating.x * 0.075;
  let normal = normalize(mix(geometric, normalize(vec3f(-slope, 1.0)), front));
  let lens = slope * params.coating.y * 0.085 * mask;
  let chromatic = lens * params.customMaterial.y * 0.24;
  let r = printed(uv + lens + chromatic);
  let g = printed(uv + lens);
  let b = printed(uv + lens - chromatic);
  var photo = vec3f(r.r, g.g, b.b);
  if (params.customMaterial.w > 0.5) {
    let lower = step(vec2f(174.0, 510.0) / vec2f(1024.0, 1536.0), uv);
    let upper = step(uv, vec2f(850.0, 1174.0) / vec2f(1024.0, 1536.0));
    let portraitMask = select(lower.x * lower.y * upper.x * upper.y, textureSampleLevel(designMask, printSampler, uv, 0.0).r, params.designMode.x > 1.5);
    photo = mix(ribbonColor(field.x, uv), printed(uv), portraitMask);
  }
  if (params.designMode.x > 1.5 && params.designMode.y > 0.0) {
    let protection = textureSampleLevel(designMask, printSampler, uv, 0.0).r;
    photo = linear(applyDesignEffects(pow(max(photo, vec3f(0.0)), vec3f(1.0 / 2.2)), uv, false, protection));
  }
  let facing = clamp(dot(-rd, normal), 0.0, 1.0);
  let reflection = studio(toWorld(reflect(rd, normal)));
  let roughness = params.customMaterial.x;
  let environment = mix(reflection, vec3f(dot(reflection, vec3f(0.2126, 0.7152, 0.0722))), roughness * 0.3);
  let thickness = 360.0 + field.x * 180.0;
  let film = 0.5 + 0.5 * cos(12.56637 * thickness * max(0.3, facing) / vec3f(650.0, 510.0, 475.0));
  let metal = params.surfaceKind > 1.5;
  let satin = params.surfaceKind > 0.5 && !metal;
  let fresnel = dielectricFresnel(1.52, facing);
  var coating = photo * (0.92 + field.x * 0.10 * params.coating.x);
  if (metal) {
    coating = mix(photo * 0.75, environment * vec3f(0.72, 0.79, 0.88), 0.64 - roughness * 0.3);
    coating += film * params.coating.z * 0.22;
  } else {
    let reflectance = mix(0.038 + fresnel * 0.3, 0.016, f32(satin));
    coating += environment * reflectance * (1.0 - roughness * 0.65);
    coating += film * params.coating.z * (0.055 + 0.09 * (1.0 - facing));
    let caustic = exp(-pow(abs((field.x - 0.12) / 0.055), 2.0)) * params.coating.y;
    coating += mix(vec3f(0.8, 0.91, 1.0), film, params.coating.z) * caustic * 0.08;
  }
  var color = mix(photo, coating, mask);
  if (params.topographic > 0.5) {
    let contour = 1.0 - smoothstep(0.01, 0.045, abs(fract(field.x * 13.0) - 0.5));
    let lightSweep = exp(-pow(abs((uv.x - 0.5 - params.light.x * 0.7) * 3.0), 2.0));
    let trace = mix(vec3f(0.20, 0.30, 0.48), vec3f(0.48, 0.64, 0.96), lightSweep);
    color += trace * contour * (1.0 - identity) * footer * 0.20;
  }
  color = mix(environment * select(vec3f(0.38, 0.45, 0.57), vec3f(0.68, 0.74, 0.84), metal), color, front);
  let lettering = textureSampleLevel(foil, printSampler, uv, 0.0);
  color = mix(color, linear(lettering.rgb) * (0.90 + film * params.coating.z * 0.07), lettering.a * front);
  let perimeter = roundedRect(p.xy, vec2f(0.746, 1.13), 0.109);
  let rim = exp(-abs(perimeter + 0.012) * 600.0);
  let bezel = exp(-abs(perimeter) * 220.0);
  color += rim * (environment * 0.27 + film * params.coating.z * 0.22 + 0.12);
  color += bezel * environment * 0.12;
  let slot = abs(roundedRect(p.xy - vec2f(0.0, 1.008), vec2f(0.163, 0.032), 0.028));
  color += exp(-slot * 400.0) * environment * 0.20;
  return max(color, vec3f(0.0));
}

fn smoothCard(p: vec3f, rd: vec3f, geometric: vec3f) -> vec3f {
  let uv = clamp(vec2f(p.x / 1.49 + 0.5, 0.5 - p.y / 2.26), vec2f(0.001), vec2f(0.999));
  let photo = printed(uv);
  let front = pow(max(geometric.z, 0.0), 12.0);
  let chrome = params.surfaceKind > 1.5;
  let thermal = params.thermal > 0.5;
  let faceCenter = vec2f((params.faceRegion.x - 0.5) * 1.49, (0.5 - params.faceRegion.y) * 2.26);
  let offset = p.xy - faceCenter;
  let radius = max(params.faceRegion.z, 0.1);
  let identity = exp(-pow(abs(offset.x / (radius * 1.6)), 4.0) - pow(abs(offset.y / (radius * 2.6)), 4.0));
  let warp = params.fluidity * 0.045;
  let wave = vec2f(
    sin(p.y * 2.2 + params.time * 0.22 + params.signature.z * 6.28) * warp,
    cos(p.x * 2.8 - params.time * 0.16) * warp
  );
  let slope = vec2f(p.x * 0.18 + p.y * 0.06, p.y * 0.06 - p.x * 0.03) + wave;
  let normal = normalize(mix(geometric, normalize(vec3f(slope, 1.0)), front));
  let reflected = studio(toWorld(reflect(rd, normal))) * mix(1.0, 1.05 - params.customMaterial.x * 0.7, params.customMaterial.z);
  let facing = clamp(dot(-rd, normal), 0.0, 1.0);
  let perimeter = roundedRect(p.xy, vec2f(0.746, 1.13), 0.109);
  let edge = exp(-abs(perimeter + 0.012) * 100.0);
  let hairline = exp(-abs(perimeter + 0.013) * 760.0);
  let scratch = hash(floor(p.xy * vec2f(3100.0, 1800.0)));
  let grain = (scratch - 0.5) * select(0.018, 0.075, thermal);
  var color = photo * (0.96 + grain);
  if (chrome) {
    let sweep = p.x + p.y * 0.38 - params.light.x * 1.2 + params.light.y * 0.35;
    let broad = exp(-pow(abs((sweep + 0.39) / 0.31), 2.0));
    let strip = exp(-pow(abs((sweep - 0.53) / (0.055 + params.customMaterial.x * 0.11)), 2.0));
    let darkBand = exp(-pow(abs((sweep - 0.16) / 0.19), 2.0));
    let metallic = vec3f(0.88, 0.94, 1.0) * (0.025 + broad * 0.31 + strip * 0.42);
    let portraitMask = 1.0 - identity * 0.72;
    let footerMask = 1.0 - smoothstep(0.65, 0.86, uv.y) * 0.93;
    color = photo * (0.88 + broad * 0.35 - darkBand * 0.29);
    color += (reflected * 0.08 + metallic) * portraitMask * footerMask;
    color = mix(reflected * vec3f(0.62, 0.68, 0.75), color, front);
    color += edge * reflected * 0.20 + hairline * vec3f(0.75, 0.86, 1.0);
    color += grain * 0.025;
  } else {
    let clearcoat = dielectricFresnel(1.46, facing);
    color += reflected * clearcoat * 0.10 * (1.0 - identity * 0.80);
    let warm = mix(vec3f(0.85, 0.018, 0.17), vec3f(1.0, 0.27, 0.012), 0.5 + 0.5 * sin(p.y * 3.6 + p.x * 2.0));
    let inkEdge = select(vec3f(0.27, 0.36, 0.48), warm, thermal);
    let wear = 0.38 + scratch * 0.62;
    let edgeBloom = exp(-abs(perimeter + 0.015) * 37.0);
    color = mix(inkEdge * 0.16, color, front);
    color += (edge * 0.40 + edgeBloom * 0.18) * inkEdge * wear;
    color += hairline * mix(vec3f(0.55), inkEdge, 0.65) * 0.4;
    if (thermal) {
      let heat = min(1.0, heatSpot(p.xy, params.heat0) + heatSpot(p.xy, params.heat1) * 0.72 + heatSpot(p.xy, params.heat2) * 0.48 + heatSpot(p.xy, params.heat3) * 0.25);
      let pigment = mix(vec3f(0.9, 0.025, 0.045), vec3f(1.0, 0.53, 0.035), heat);
      color = mix(color, color * 0.68 + pigment * 0.5, heat * (1.0 - identity * 0.45) * (1.0 - smoothstep(0.70, 0.84, uv.y)));
    }
  }
  let lettering = textureSampleLevel(foil, printSampler, uv, 0.0);
  color += spectrum(p.y * 0.35 + params.light.x * 0.2 + params.signature.z) * edge * params.customMaterial.y * 0.2;
  let foilColor = linear(lettering.rgb) * select(0.90, 0.88 + dot(reflected, vec3f(0.04)), chrome);
  color = mix(color, foilColor, lettering.a * front);
  let slot = abs(roundedRect(p.xy - vec2f(0.0, 1.008), vec2f(0.163, 0.032), 0.028));
  color += exp(-slot * 400.0) * select(vec3f(0.12, 0.10, 0.18), reflected * 0.30, chrome);
  return max(color, vec3f(0.0));
}

fn applyDesignEffects(inputColor: vec3f, uv: vec2f, back: bool, protectedMask: f32) -> vec3f {
  var color = inputColor;
  let count = i32(select(params.designMode.y, params.designMode.z, back));
  let rowStart = select(0, 24, back);
  for (var i = 0; i < min(count, 24); i++) {
    let box = textureLoad(designEffects, vec2i(0, rowStart + i), 0);
    let config = textureLoad(designEffects, vec2i(1, rowStart + i), 0);
    let local = (uv - box.xy) / max(box.zw, vec2f(0.001));
    if (all(local >= vec2f(0.0)) && all(local <= vec2f(1.0))) {
      let a = textureLoad(designEffects, vec2i(2, rowStart + i), 0).rgb;
      let b = textureLoad(designEffects, vec2i(3, rowStart + i), 0).rgb;
      let c = textureLoad(designEffects, vec2i(4, rowStart + i), 0).rgb;
      let kind = i32(round(config.x * 8.0));
      let scale = config.y * 6.0;
      let t = params.time * 0.2;
      let q = local + params.light * 0.07;
      var wave = sin(q.x * 5.0 * scale + sin(q.y * 4.0 + t) * 2.5 - t);
      var line = 0.0;
      if (kind == 2) {
        wave = sin((length(q - vec2f(0.4, 0.6)) * 12.0 + sin(q.x * 8.0 + t) * 0.7) * scale);
        line = pow(abs(wave), 18.0) * 0.18;
      } else if (kind == 3) {
        wave = sin(length((q - vec2f(0.5)) * vec2f(1.0, 0.8)) * 30.0 * scale - t);
        line = pow(abs(wave), 22.0) * 0.2;
      } else if (kind == 4) {
        wave = hash(floor(q * 1000.0)) * 0.3;
      }
      let band = 0.5 + 0.5 * wave;
      var art = mix(a, b, smoothstep(0.05, 0.7, band));
      art = mix(art, c, smoothstep(0.55, 0.97, band));
      art += line;
      if (kind == 5) {
        let position = vec2f((local.x - 0.5) * 1.49, (0.5 - local.y) * 2.26);
        let time = params.time * 0.2;
        let bend = sin(position.y * 2.4 + time * 0.22 + params.signature.x * 1.7) * 0.28 + sin(position.y * 1.15 - time * 0.14) * 0.13;
        let offset = position - params.light * vec2f(0.745, -1.13);
        let touch = exp(-dot(offset, offset) * 4.0) * (params.light.x * 0.20 - params.light.y * 0.12);
        let flow = (position.x * 0.9 + bend + touch) * scale;
        let pink = exp(-pow(abs((flow + 0.03) / 0.22), 2.0)) * 0.92;
        let violet = exp(-pow(abs((flow - 0.13) / 0.15), 2.0)) * 0.54;
        let cyan = exp(-pow(abs((flow - 0.35) / 0.13), 2.0)) * 0.72;
        let halo = exp(-pow(abs((flow + 0.31) / 0.14), 2.0)) * 0.48;
        art = mix(a, b, pink);
        art = mix(art, mix(b, c, 0.34), violet);
        art = mix(art, c, cyan);
        art = mix(art, mix(c, a, 0.15), halo);
        art += (hash(floor(uv * vec2f(1024.0, 1536.0))) - 0.5) * 0.022;
      }
      let border = smoothstep(0.0, 0.007, min(min(local.x, local.y), min(1.0-local.x, 1.0-local.y)));
      color = mix(color, art, config.z * (1.0 - protectedMask) * border);
    }
  }
  return color;
}

fn layeredDesignCard(p: vec3f, rd: vec3f, normal: vec3f) -> vec3f {
  let back = p.z < 0.0;
  let uv = clamp(vec2f(select(p.x, -p.x, back) / 1.49 + 0.5, 0.5 - p.y / 2.26), vec2f(0.0), vec2f(1.0));
  var color = textureSampleLevel(portrait, printSampler, uv, 0.0).rgb;
  if (back) { color = textureSampleLevel(reversePrint, printSampler, uv, 0.0).rgb; }
  let mask = textureSampleLevel(designMask, printSampler, uv, 0.0);
  let protectedMask = select(mask.r, mask.g, back);
  color = applyDesignEffects(color, uv, back, protectedMask);
  color = linear(color);
  let facing = abs(dot(normal, -rd));
  let rim = pow(1.0 - facing, 3.0);
  let reflected = studio(toWorld(reflect(rd, normal)));
  let finish = params.surfaceKind;
  let strength = select(0.018, 0.16, finish > 1.5);
  color += reflected * (rim * 0.38 + strength * (1.0-protectedMask));
  color += spectrum(uv.x + uv.y * 0.4 + params.light.x * 0.3) * params.customMaterial.y * (rim * 0.3 + 0.04 * (1.0-protectedMask));
  return max(color, vec3f(0.0));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let aspect = params.resolution.x / params.resolution.y;
  let screen = vec2f((uv.x * 2.0 - 1.0) * aspect, 1.0 - uv.y * 2.0);
  let originWorld = vec3f(0.0, 0.0, 3.7);
  let framing = min(1.0, aspect / 0.64);
  let focalLength = 2.58 * framing;
  let directionWorld = normalize(vec3f(screen, -focalLength));
  let ro = toLocal(originWorld - vec3f(0.0, params.lift, 0.0));
  let rd = toLocal(directionWorld);
  var distance = max(length(ro) - 1.55, 0.0);
  var hit = false;
  let tolerance = 0.18 / params.resolution.y;
  var p = ro + rd * distance;
  for (var i = 0; i < 72; i++) {
    p = ro + rd * distance;
    let stepDistance = badgeDistance(p);
    if (stepDistance < tolerance) { hit = true; break; }
    distance += stepDistance;
    if (distance > 6.0) { break; }
  }
  let shadowPosition = screen - vec2f(0.02 + params.angles.y * 0.09, -0.92) * framing;
  let shadowFade = smoothstep(-1.0, -0.90, screen.y) * smoothstep(0.0, 0.18, aspect - abs(screen.x));
  let shadow = exp(-pow(abs(shadowPosition.x / (0.55 * framing)), 2.0) - pow(abs(shadowPosition.y / (0.10 * framing)), 2.0)) * 0.18 * shadowFade;
  if (!hit) {
    let plane = ro + rd * (-ro.z / rd.z);
    let slot = roundedRect(plane.xy - vec2f(0.0, 1.008), vec2f(0.156, 0.025), 0.024);
    if (params.surfaceKind > 0.5 && slot < 0.0) { return vec4f(0.0006, 0.0008, 0.0012, 1.0); }
    return vec4f(vec3f(0.19, 0.19, 0.24) * shadow, shadow);
  }

  let geometric = geometricNormal(p);
  if (params.designMode.x > 0.5 && params.designMode.x < 1.5) { return vec4f(layeredDesignCard(p, rd, geometric), 1.0); }
  if (p.z < -0.005) { return vec4f(reverseCard(p, rd, geometric), 1.0); }
  if (params.coating.w > 0.0) { return vec4f(proceduralCard(p, rd, geometric), 1.0); }
  if (params.surfaceKind > 0.5) { return vec4f(smoothCard(p, rd, geometric), 1.0); }
  let facets = facet(p.xy);
  let face = pow(max(geometric.z, 0.0), 16.0);
  let footer = smoothstep(-0.77, -0.55, p.y);
  let faceCenter = vec2f((params.faceRegion.x - 0.5) * 1.49, (0.5 - params.faceRegion.y) * 2.26);
  let faceRadius = max(params.faceRegion.z, 0.1);
  let faceOffset = p.xy - faceCenter;
  let identity = exp(-pow(abs(faceOffset.x / (faceRadius * 1.49)), 4.0) - pow(abs(faceOffset.y / (faceRadius * 2.26)), 4.0));
  let flowPhase = params.time * 0.38 + params.signature.z * 6.283;
  let flow = vec2f(
    sin(p.y * 7.2 + p.x * 2.8 + flowPhase) * 0.55 + cos(p.y * 4.1 - p.x * 6.3 - flowPhase * 0.73) * 0.45,
    cos(p.x * 6.2 - p.y * 2.9 + flowPhase * 0.81) * 0.55 + sin(p.y * 3.8 + p.x * 4.7 - flowPhase * 0.6) * 0.45
  );
  let edgeFade = smoothstep(0.0, 0.07, -roundedRect(p.xy, vec2f(0.74, 1.12), 0.10));
  let flowMask = face * footer * (1.0 - identity) * edgeFade;
  let flowAmount = mix(0.018, 0.10, params.fluidity) * (1.0 + params.activity * 0.8);
  let softenedFacets = facets.xy * mix(0.48, 0.76, smoothstep(0.0, 0.022, facets.w));
  let opticalNormal = softenedFacets + flow * flowAmount * flowMask;
  let facetedNormal = normalize(vec3f(opticalNormal, sqrt(max(1.0 - dot(opticalNormal, opticalNormal), 0.05))));
  var normal = normalize(mix(geometric, facetedNormal, face * footer * 0.78));
  if (dot(normal, -rd) < 0.0) { normal = -normal; }
  let facing = clamp(dot(-rd, normal), 0.0, 1.0);
  let fresnel = dielectricFresnel(1.52, facing);
  let dispersion = 0.095 * params.spectral;
  let depth = (0.025 + facets.z * 0.48) * footer;
  let eyeLeft = exp(-pow(abs((faceOffset.x + faceRadius * 0.67) / (faceRadius * 0.48)), 4.0) - pow(abs((faceOffset.y - faceRadius * 0.28) / (faceRadius * 0.26)), 4.0));
  let eyeRight = exp(-pow(abs((faceOffset.x - faceRadius * 0.67) / (faceRadius * 0.48)), 4.0) - pow(abs((faceOffset.y - faceRadius * 0.28) / (faceRadius * 0.26)), 4.0));
  let transmissionNormal = normalize(mix(geometric, normal, 0.50 * (1.0 - max(identity * 0.82, max(eyeLeft, eyeRight) * 0.92))));
  let r = transmission(p, rd, transmissionNormal, 1.52 - dispersion, depth);
  let g = transmission(p, rd, transmissionNormal, 1.52, depth);
  let b = transmission(p, rd, transmissionNormal, 1.52 + dispersion, depth);
  var transmitted = vec3f(r.r, g.g, b.b);

  let printEdge = roundedRect(p.xy, vec2f(0.737, 1.12), 0.10);
  let printOpacity = 1.0 - smoothstep(-0.006, 0.008, printEdge);
  let reflectedDirection = toWorld(reflect(rd, normal));
  let headRegion = exp(-pow(abs(faceOffset.x / (faceRadius * 1.76)), 4.0) - pow(abs(faceOffset.y / (faceRadius * 3.04)), 6.0));
  let reflection = studio(reflectedDirection) * (1.0 - headRegion * 0.80);
  let rimEnvironment = studio(toWorld(refract(rd, geometric, 1.0 / 1.52)));
  let clearEdge = linear(background()) * vec3f(0.48, 0.56, 0.66) + rimEnvironment * 0.12;
  transmitted = mix(clearEdge, transmitted, printOpacity);
  transmitted += vec3f(0.004, 0.009, 0.018) * printOpacity;

  let filmPhase = params.signature.w * 0.2 + facets.z * 4.0 + (1.0 - facing) * 4.5 + params.light.x * 0.35;
  let film = spectrum(filmPhase);
  let filmAmount = params.spectral * (0.008 + pow(1.0 - facing, 1.5) * 0.085);
  let fresnelRgb = clamp(vec3f(fresnel) + film * filmAmount, vec3f(0.0), vec3f(1.0));
  var color = transmitted * (vec3f(1.0) - fresnelRgb) + reflection * fresnelRgb;
  let pearlEdge = exp(-pow(abs((abs(p.x) - 0.65) / 0.13), 2.0)) * (1.0 - identity);
  let pearlLight = studio(toWorld(reflect(rd, geometric))) * vec3f(0.024, 0.026, 0.030);
  color += pearlLight * pearlEdge * face * footer;
  let panelLuminance = dot(reflection, vec3f(0.2126, 0.7152, 0.0722));
  let panelHighlight = smoothstep(0.7, 3.0, panelLuminance) * 0.006 * face;
  color += reflection * panelHighlight;

  let focusX = -0.42 + params.light.x * 0.58;
  let focusY = -0.23 - params.light.y * 0.60 + sin(params.time * 0.27) * 0.10;
  let leftSpot = exp(-pow(abs((p.x - focusX) / 0.28), 2.0) - pow(abs((p.y - focusY) / 0.50), 2.0));
  let rightSpot = exp(-pow(abs((p.x - 0.53 + params.light.x * 0.2) / 0.19), 2.0) - pow(abs((p.y - 0.62 + params.light.y * 0.5) / 0.32), 2.0));
  let seam = exp(-pow(abs((facets.w - 0.005) / 0.010), 2.0));
  let litFacet = smoothstep(0.035, 0.30, dot(opticalNormal, normalize(vec2f(-0.8 + params.light.x, 0.45 - params.light.y))));
  let caustic = seam * (leftSpot + rightSpot * 0.55) * litFacet * face * footer * (1.0 - identity * 0.86);
  let rainbow = spectrum(facets.w * 22.0 + dot(opticalNormal, vec2f(0.35, -0.25)) + params.light.x * 0.4);
  color += rainbow * caustic * params.spectral * 0.30;
  let ribbonCoordinate = p.x - focusX + (p.y - focusY) * 0.24 + sin(p.y * 5.0 + flowPhase) * mix(0.015, 0.08, params.fluidity);
  let ribbon = exp(-pow(abs(ribbonCoordinate / 0.035), 2.0)) * exp(-pow(abs((p.y - focusY) / 0.29), 2.0));
  let ribbonHalo = exp(-pow(abs(ribbonCoordinate / 0.12), 2.0)) * exp(-pow(abs((p.y - focusY) / 0.42), 2.0));
  let ribbonColor = mix(vec3f(0.82, 0.90, 1.0), spectrum(ribbonCoordinate * 7.0 + 0.12), params.spectral * 0.75);
  color += (ribbon * 0.29 + ribbonHalo * 0.028) * ribbonColor * face * footer * (1.0 - identity);

  let foilRay = refract(rd, geometric, 1.0 / 1.52);
  let foilPoint = p + foilRay * max((-0.015 - p.z) / min(foilRay.z, -0.1), 0.0);
  let foilUv = vec2f(foilPoint.x / 1.49 + 0.5, 0.5 - foilPoint.y / 2.26);
  let lettering = textureSampleLevel(foil, printSampler, clamp(foilUv, vec2f(0.0), vec2f(1.0)), 0.0);
  let foilFilm = spectrum(foilUv.x * 0.46 + foilUv.y * 0.28 + params.light.x * 0.5 + params.angles.y * 0.7);
  let foilReflection = studio(toWorld(reflect(rd, geometric)));
  let foilColor = linear(lettering.rgb) * (vec3f(0.76) + foilFilm * params.spectral * 0.17) + foilReflection * 0.038;
  color = mix(color, foilColor, lettering.a * printOpacity * face);

  let perimeter = roundedRect(p.xy, vec2f(0.746, 1.13), 0.109);
  let rim = exp(-abs(perimeter) * 620.0);
  let innerRim = exp(-abs(perimeter + 0.021) * 570.0);
  let polishedRim = exp(-abs(perimeter + 0.012) * 820.0);
  let rimLight = clamp(0.65 - p.x * 0.6 + p.y * 0.17 + dot(p.xy / max(length(p.xy), 0.001), params.light) * 0.55, 0.15, 1.4);
  color += rim * mix(vec3f(0.28), film * 0.42 + 0.13, params.spectral * 0.55) * rimLight;
  color += innerRim * vec3f(0.09, 0.12, 0.17);
  color += polishedRim * vec3f(0.55, 0.63, 0.74) * rimLight;
  let glintY = 0.61 - params.light.y * 0.85 + sin(params.time * 0.23) * 0.15;
  let edgeGlint = exp(-pow(abs((p.y - glintY) / 0.19), 2.0)) * smoothstep(0.58, 0.73, abs(p.x));
  color += (rim + polishedRim) * edgeGlint * mix(vec3f(1.0), film * 0.8 + 0.25, params.spectral * 0.65) * 0.75;
  let slotEdge = abs(roundedRect(p.xy - vec2f(0.0, 1.008), vec2f(0.163, 0.032), 0.028));
  color += exp(-slotEdge * 360.0) * rimEnvironment * 0.16;
  let surfaceTexture = hash(p.xy * 1630.0);
  let mist = (pow(surfaceTexture, 14.0) - 0.067) * (0.010 + panelHighlight * 0.6) * face * footer;
  color += mist;
  return vec4f(max(color, vec3f(0.0)), 1.0);
}
