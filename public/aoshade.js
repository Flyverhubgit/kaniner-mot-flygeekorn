// ===================================================================
//  [NY] MYK SKYGGELEGGING I HJØRNER (ambient occlusion) 🌗 – bare PC på Grafikk Høy
//  Mørkere der klosser møtes (innerhjørner, under kanter, langs bakken ved vegger) = mer dybde, mindre "flatt".
//  Billig variant: en ekstra dybde-tegning i halv oppløsning (uten farger/lys) + ett lite filter.
//  Sjekker PAR av punkter rundt hver piksel: på en flat flate tar de hverandre ut, i et hjørne gjør de ikke det.
//  ANGRE: sett AO_ON = false.
// ===================================================================
const AO_ON = true;
const AO_STRENGTH = 0.8;                                // hvor mørke hjørnene blir (0..1)
const AO_RADIUS = 0.7;                                  // meter rundt hvert punkt
let aoRT = null, aoPass = null, aoMatP = null, aoMatI = null, aoHide = [], aoSolid = [], aoHideAt = 0, aoFail = false;

const AO_SHADER = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, near: { value: 0.1 }, far: { value: 1000 },
    res: { value: new THREE.Vector2(1, 1) }, proj: { value: 1 }, strength: { value: AO_STRENGTH }, radius: { value: AO_RADIUS } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    '#include <packing>',
    'uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform float near, far, proj, strength, radius; uniform vec2 res;',
    'varying vec2 vUv;',
    'float vz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }',   // avstand i meter
    'void main(){',
    '  vec4 col = texture2D(tDiffuse, vUv);',
    '  float z = vz(vUv);',
    '  if (z > 140.0) { gl_FragColor = col; return; }',                   // langt unna / himmel: ingenting
    '  float px = clamp(radius * proj / z, 2.0, 36.0);',                  // radius i piksler
    '  float occ = 0.0;',
    '  for (int i = 0; i < 8; i++) {',
    '    float a = float(i) * 0.3927 + fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5) * 0.39;',   // 8 retninger (+ litt støy)
    '    float r = px * (0.5 + 0.5 * fract(float(i) * 0.618));',
    '    vec2 o = vec2(cos(a), sin(a)) * r / res;',
    '    float dA = z - vz(vUv + o), dB = z - vz(vUv - o);',               // >0 = punktet er nærmere kameraet enn oss
    '    float m = (dA + dB) * 0.5;',                                      // flat flate: ca. 0. Innerhjørne: > 0
    '    float far2 = max(dA, dB);',
    '    occ += smoothstep(0.02, 0.22, m) * (1.0 - smoothstep(0.9, 2.0, far2));',   // bare nære hjørner (ikke en vegg langt foran)',
    '  }',
    '  float ao = 1.0 - strength * occ / 8.0;',
    '  ao = mix(1.0, ao, 1.0 - smoothstep(60.0, 140.0, z));',              // tones ut på avstand
    '  gl_FragColor = vec4(col.rgb * ao, col.a);',
    '}'].join('\n')
};

function aoSetup() {
  if (aoPass || aoFail) return;
  try {
    aoRT = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    aoRT.depthTexture = new THREE.DepthTexture(2, 2);
    aoRT.depthTexture.type = THREE.UnsignedIntType;
    // to materialer: three.js r128 gjenbruker feil shader hvis samme overstyrings-materiale brukes på både instanserte og vanlige objekter
    aoMatP = new THREE.MeshBasicMaterial({ colorWrite: false });
    aoMatI = new THREE.MeshBasicMaterial({ colorWrite: false });
    aoPass = new THREE.ShaderPass(AO_SHADER);
    aoPass.uniforms.tDepth.value = aoRT.depthTexture;
    gfxComposer.insertPass(aoPass, 1);                                    // rett etter selve bildet, før glød og farger
  } catch (e) { console.warn('AO av:', e); aoFail = true; aoPass = null; }
}

// Navneskilt, partikler og gjennomsiktige ting skal ikke lage skygge i hjørner
// Ett dybde-materiale per "type" objekt (three.js r128 sjekker ikke alle forskjellene når det gjenbruker en shader)
const aoMats = {};
function aoMatFor(o) {
  const k = (o.isInstancedMesh ? 'I' : 'P') + (o.instanceColor ? 'C' : '') + (o.isSkinnedMesh ? 'S' : '') +
    (o.geometry && o.geometry.morphAttributes && o.geometry.morphAttributes.position ? 'M' : '');
  return aoMats[k] || (aoMats[k] = new THREE.MeshBasicMaterial({ colorWrite: false }));
}
function aoRefreshHide() {
  aoHide = []; aoSolid = [];
  scene.traverseVisible(o => {
    if (o.isSprite || o.isPoints || o.isLine) aoHide.push(o);
    else if (o.isMesh) { if (o.material && (Array.isArray(o.material) ? o.material[0] : o.material).transparent) aoHide.push(o); else aoSolid.push(o); }
  });
}

function aoBeforeRender() {
  if (!AO_ON || aoFail || typeof gfxComposer === 'undefined' || !gfxComposer || isTouch) { if (aoPass) aoPass.enabled = false; return; }
  aoSetup();
  if (!aoPass) return;
  const m = typeof currentMap !== 'undefined' ? currentMap : '';
  aoPass.enabled = m !== 'space' && m !== 'sea';                          // ikke i rommet / under vann
  if (!aoPass.enabled) return;
  const size = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
  const w = Math.max(2, Math.floor(size.x * pr / 2)), h = Math.max(2, Math.floor(size.y * pr / 2));
  if (aoRT.width !== w || aoRT.height !== h) aoRT.setSize(w, h);
  const now = performance.now();
  if (now - aoHideAt > 1000) { aoHideAt = now; aoRefreshHide(); }
  // dybde-tegning (halv oppløsning, ingen farger)
  const vis = aoHide.map(o => o.visible); aoHide.forEach(o => { o.visible = false; });
  const mats = aoSolid.map(o => o.material);
  aoSolid.forEach(o => { o.material = aoMatFor(o); });
  const bg = scene.background;
  scene.background = null;
  try { renderer.setRenderTarget(aoRT); renderer.clear(); renderer.render(scene, camera); }
  catch (e) { console.warn('AO av:', e); aoFail = true; aoPass.enabled = false; }
  renderer.setRenderTarget(null);
  scene.background = bg;
  aoSolid.forEach((o, i) => { o.material = mats[i]; });
  aoHide.forEach((o, i) => { o.visible = vis[i]; });
  const u = aoPass.uniforms;
  u.near.value = camera.near; u.far.value = camera.far;
  u.res.value.set(size.x * pr, size.y * pr);
  u.proj.value = (size.y * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
}

if (AO_ON && typeof gfxPostRender === 'function') {
  const gfxPostRenderOld = gfxPostRender;
  gfxPostRender = function () {
    if (GFX_HIGH && typeof POST_ON !== 'undefined' && POST_ON) aoBeforeRender();
    return gfxPostRenderOld.apply(this, arguments);
  };
}
