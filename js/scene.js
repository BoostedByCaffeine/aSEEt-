// =========================================================================
// 4. WEBGL2 CONTEXT, THREE.JS RENDERER, SCENE, CAMERAS & LIGHTING
// =========================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { dom } from './dom.js';
import { state, WORKSPACE_PRESETS } from './state.js';

let glContext = null;
export let isWebGL2 = false;

try {
  glContext = dom.canvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  if (glContext) {
    isWebGL2 = true;
  }
} catch (err) {
  console.warn('WebGL2 explicit init warning:', err);
}

export { glContext };

export const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  context: glContext || undefined,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);

(function detectGpuDiagnostics() {
  const gl = renderer.getContext();
  const webgl2Active = (typeof WebGL2RenderingContext !== 'undefined') && (gl instanceof WebGL2RenderingContext);
  dom.hudContextLabel.textContent = webgl2Active ? 'WEBGL2 ACTIVE' : 'WEBGL1 FALLBACK';
  if (!webgl2Active) {
    dom.hudWebglDot.classList.remove('bg-emerald-400');
    dom.hudWebglDot.classList.add('bg-amber-400');
  }
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    dom.hudGpuName.textContent = gpuName || 'Hardware WebGL2 GPU';
    dom.hudGpuName.title = dom.hudGpuName.textContent;
  } catch {
    dom.hudGpuName.textContent = 'WebGL2 Renderer';
  }
})();

export const scene = new THREE.Scene();

export const perspCamera = new THREE.PerspectiveCamera(42, 1, 0.01, 2000);
perspCamera.position.set(3.2, 2.2, 4.2);

export const orthoCamera = new THREE.OrthographicCamera(-3, 3, 3, -3, -500, 2000);
orthoCamera.position.copy(perspCamera.position);

export let activeCamera = perspCamera;
export function setActiveCamera(cam) {
  activeCamera = cam;
}

export const controls = new OrbitControls(activeCamera, dom.canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.screenSpacePanning = true;
controls.maxDistance = 500;
controls.minDistance = 0.05;
controls.target.set(0, 0.8, 0);
controls.update();

let renderActiveUntil = performance.now() + 1000;
export function requestRender(holdMs = 650) {
  renderActiveUntil = Math.max(renderActiveUntil, performance.now() + holdMs);
}
export function isRenderActive(now = performance.now()) {
  return now <= renderActiveUntil;
}
controls.addEventListener('change', () => requestRender(650));
controls.addEventListener('start', () => requestRender(1200));

export const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
export const proceduralEnvRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
export let customEnvRT = null;
export function setCustomEnvRT(rt) {
  customEnvRT = rt;
}
scene.environment = proceduralEnvRT.texture;
scene.environmentIntensity = state.envIntensity;

export const lightRig = new THREE.Group();
lightRig.name = '__aSEEt_LightRig';
scene.add(lightRig);

export const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.45);
lightRig.add(hemiLight);

export const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.5);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 40;
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 6;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.02;
lightRig.add(keyLight);

export const fillLight = new THREE.DirectionalLight(0x9fc5ff, 1.1);
fillLight.position.set(-6, 4, 3);
lightRig.add(fillLight);

export const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.3);
rimLight.position.set(-2, 5, -7);
lightRig.add(rimLight);

export const stageGroup = new THREE.Group();
stageGroup.name = '__aSEEt_Stage';
scene.add(stageGroup);

function buildHumanScaleRef() {
  const grp = new THREE.Group();
  grp.name = '__aSEEt_HumanScaleRef';
  const mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    wireframe: false,
    depthWrite: false,
  });
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.4,
    wireframe: true,
  });

  const addPart = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    const w = new THREE.Mesh(geo, wireMat);
    m.add(w);
    grp.add(m);
  };

  // Total height = 1.75m
  addPart(new THREE.SphereGeometry(0.11, 12, 10), 0, 1.64, 0);          // Head
  addPart(new THREE.CylinderGeometry(0.18, 0.14, 0.56, 10), 0, 1.21, 0); // Torso
  addPart(new THREE.CylinderGeometry(0.06, 0.05, 0.88, 8), -0.1, 0.44, 0); // Left Leg
  addPart(new THREE.CylinderGeometry(0.06, 0.05, 0.88, 8), 0.1, 0.44, 0);  // Right Leg
  addPart(new THREE.CylinderGeometry(0.045, 0.04, 0.62, 8), -0.24, 1.15, 0); // Left Arm
  addPart(new THREE.CylinderGeometry(0.045, 0.04, 0.62, 8), 0.24, 1.15, 0);  // Right Arm

  grp.position.set(-1.35, 0, 0);
  grp.visible = false;
  return grp;
}

export const humanScaleRef = buildHumanScaleRef();
stageGroup.add(humanScaleRef);

export let floorGrid = new THREE.GridHelper(16, 32, 0x3b4863, 0x1d2332);
floorGrid.position.y = -0.001;
floorGrid.material.transparent = true;
floorGrid.material.opacity = 0.65;
stageGroup.add(floorGrid);
export function setFloorGrid(grid) {
  floorGrid = grid;
}

export const shadowPlaneGeo = new THREE.PlaneGeometry(30, 30);
export const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.36 });
export const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = 0;
shadowPlane.receiveShadow = true;
stageGroup.add(shadowPlane);

export const worldAxesHelper = new THREE.AxesHelper(2.2);
worldAxesHelper.visible = false;
stageGroup.add(worldAxesHelper);

export let bboxHelper = null;
export function setBboxHelper(helper) {
  bboxHelper = helper;
}

export let selectionBoxHelper = null;
export function setSelectionBoxHelper(helper) {
  selectionBoxHelper = helper;
}

export let skeletonHelper = null;
export function setSkeletonHelper(helper) {
  skeletonHelper = helper;
}

export const vertexNormalsGroup = new THREE.Group();
vertexNormalsGroup.name = '__aSEEt_VertexNormals';
stageGroup.add(vertexNormalsGroup);

export const assetRoot = new THREE.Group();
assetRoot.name = '__aSEEt_AssetRoot';
scene.add(assetRoot);

export let currentModel = null;
export function setCurrentModel(m) {
  currentModel = m;
}

export const currentAssetBounds = new THREE.Box3();
export const currentAssetSize = new THREE.Vector3(1, 1, 1);
export const currentAssetCenter = new THREE.Vector3(0, 0.5, 0);

export let currentAssetTriCount = 0;
export function setCurrentAssetTriCount(c) {
  currentAssetTriCount = c;
}

export let currentAssetVertCount = 0;
export function setCurrentAssetVertCount(c) {
  currentAssetVertCount = c;
}

export let currentCustomShaderUniforms = [];
export function setCurrentCustomShaderUniforms(u) {
  currentCustomShaderUniforms = u;
}

export let currentCustomUpdateFn = null;
export function setCurrentCustomUpdateFn(fn) {
  currentCustomUpdateFn = fn;
}

export let mixer = null;
export function setMixer(m) {
  mixer = m;
}

export let activeAction = null;
export function setActiveAction(a) {
  activeAction = a;
}

// =========================================================================
// CAMERA FRAMING, VIEW PRESETS & PERSPECTIVE/ORTHOGRAPHIC SYNC
// =========================================================================
export let cameraTween = null;
export function setCameraTween(t) {
  cameraTween = t;
}

export function animateCameraTo(targetPos, targetLookAt, durationMs = 380) {
  requestRender(durationMs + 200);
  cameraTween = {
    startTime: performance.now(),
    duration: durationMs,
    fromPos: activeCamera.position.clone(),
    toPos: targetPos.clone(),
    fromTarget: controls.target.clone(),
    toTarget: targetLookAt.clone(),
  };
}

export function updateOrthoFrustumFromDistance(dist) {
  const rect = dom.viewport.getBoundingClientRect();
  const aspect = Math.max(rect.width, 1) / Math.max(rect.height, 1);
  const halfH = Math.tan(THREE.MathUtils.degToRad(perspCamera.fov / 2)) * dist;
  const halfW = halfH * aspect;
  orthoCamera.left = -halfW;
  orthoCamera.right = halfW;
  orthoCamera.top = halfH;
  orthoCamera.bottom = -halfH;
  orthoCamera.updateProjectionMatrix();
}

export function frameObject(obj, instant = false) {
  const box = obj ? new THREE.Box3().setFromObject(obj) : currentAssetBounds.clone();
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.2);

  const fovRad = THREE.MathUtils.degToRad(perspCamera.fov);
  const dist = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.55;

  const dir = new THREE.Vector3(0.75, 0.45, 0.95).normalize();
  const targetPos = center.clone().addScaledVector(dir, dist);

  updateOrthoFrustumFromDistance(dist);

  if (instant) {
    cameraTween = null;
    activeCamera.position.copy(targetPos);
    controls.target.copy(center);
    controls.update();
    requestRender(600);
  } else {
    animateCameraTo(targetPos, center, 380);
  }
}

export function frameAsset(instant = false) {
  frameObject(currentModel, instant);
}

export function snapCameraPreset(view) {
  const center = currentAssetCenter.clone();
  const dist = Math.max(activeCamera.position.distanceTo(controls.target), 1.5);
  const dirs = {
    iso: new THREE.Vector3(0.75, 0.48, 0.92).normalize(),
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),
    left: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(1, 0, 0),
    top: new THREE.Vector3(0, 1, 0.001).normalize(),
    bottom: new THREE.Vector3(0, -1, 0.001).normalize(),
  };
  const dir = dirs[view] || dirs.iso;
  animateCameraTo(center.clone().addScaledVector(dir, dist), center, 340);
  requestRender(600);
}

export function toggleCameraProjection() {
  const dist = activeCamera.position.distanceTo(controls.target);
  const pos = activeCamera.position.clone();
  const tgt = controls.target.clone();

  if (state.cameraMode === 'perspective') {
    state.cameraMode = 'orthographic';
    updateOrthoFrustumFromDistance(dist);
    orthoCamera.position.copy(pos);
    orthoCamera.lookAt(tgt);
    activeCamera = orthoCamera;
    dom.quickCameraModeBtn.textContent = 'ORTHO';
    dom.quickCameraModeBtn.classList.add('text-sky-300');
  } else {
    state.cameraMode = 'perspective';
    perspCamera.position.copy(pos);
    perspCamera.lookAt(tgt);
    activeCamera = perspCamera;
    dom.quickCameraModeBtn.textContent = 'PERSP';
    dom.quickCameraModeBtn.classList.remove('text-sky-300');
  }
  controls.object = activeCamera;
  controls.target.copy(tgt);
  controls.update();
  requestRender(600);
}

export function handleViewportResize() {
  const rect = dom.viewport.getBoundingClientRect();
  const w = Math.max(Math.floor(rect.width), 1);
  const h = Math.max(Math.floor(rect.height), 1);

  perspCamera.aspect = w / h;
  perspCamera.updateProjectionMatrix();

  const dist = activeCamera.position.distanceTo(controls.target);
  updateOrthoFrustumFromDistance(Math.max(dist, 0.5));

  renderer.setSize(w, h, false);
  requestRender(600);
}

const resizeObserver = new ResizeObserver(() => handleViewportResize());
resizeObserver.observe(dom.viewport);
window.addEventListener('resize', handleViewportResize);

export function applyToneMapping(mode) {
  const map = {
    ACESFilmic: THREE.ACESFilmicToneMapping,
    AgX: THREE.AgXToneMapping,
    Neutral: THREE.NeutralToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    Linear: THREE.LinearToneMapping,
  };
  renderer.toneMapping = map[mode] ?? THREE.ACESFilmicToneMapping;
  requestRender();
}

export function applyBackdropMode() {
  dom.viewport.classList.remove(
    'bg-studio-klasik', 'bg-studio-brewing', 'bg-studio-neutral',
    'bg-studio-dark', 'bg-studio-light', 'bg-studio-checker'
  );
  dom.viewport.style.background = '';

  if (state.backdropMode === 'preset') {
    dom.viewport.classList.add(WORKSPACE_PRESETS[state.workspace].backdropClass);
  } else if (state.backdropMode === 'dark') {
    dom.viewport.classList.add('bg-studio-dark');
  } else if (state.backdropMode === 'light') {
    dom.viewport.classList.add('bg-studio-light');
  } else if (state.backdropMode === 'checker') {
    dom.viewport.classList.add('bg-studio-checker');
  } else if (state.backdropMode === 'custom') {
    dom.viewport.style.background = state.customBgColor;
  }

  document.querySelectorAll('.bg-preset-btn').forEach((btn) => {
    const active = btn.dataset.bg === state.backdropMode;
    btn.className = active
      ? 'bg-preset-btn py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/40 transition'
      : 'bg-preset-btn py-1.5 px-2 rounded-lg text-[11px] font-medium bg-obsidian-900 text-slate-400 hover:text-slate-200 border border-obsidian-600 transition';
  });
  requestRender();
}
