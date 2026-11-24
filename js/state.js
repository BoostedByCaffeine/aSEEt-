// =========================================================================
// 1. WORKSPACE PRESETS & APPLICATION STATE
// =========================================================================

export const WORKSPACE_PRESETS = {
  klasik3d: {
    label: 'klasik3d',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    backdropClass: 'bg-studio-klasik',
    keyColor: '#fff1d6',
    keyIntensity: 2.5,
    fillColor: '#9fc5ff',
    fillIntensity: 1.1,
    rimColor: '#7dd3fc',
    rimIntensity: 1.3,
    envIntensity: 1.0,
    toneMapping: 'ACESFilmic',
    exposure: 1.05,
    labFog: false,
    fogColor: '#151923',
    emissiveBoost: 1.0,
    gridPrimary: 0x3b4863,
    gridSecondary: 0x1d2332,
  },
  brewingbad: {
    label: 'Brewing Bad',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    backdropClass: 'bg-studio-brewing',
    keyColor: '#d1fae5',
    keyIntensity: 2.1,
    fillColor: '#38bdf8',
    fillIntensity: 0.9,
    rimColor: '#34d399',
    rimIntensity: 2.2,
    envIntensity: 0.85,
    toneMapping: 'AgX',
    exposure: 1.1,
    labFog: true,
    fogColor: '#0b1318',
    emissiveBoost: 1.35,
    gridPrimary: 0x1d4d4f,
    gridSecondary: 0x0f2428,
  },
  neutral: {
    label: 'Neutral Studio',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    backdropClass: 'bg-studio-neutral',
    keyColor: '#ffffff',
    keyIntensity: 2.2,
    fillColor: '#e2e8f0',
    fillIntensity: 1.2,
    rimColor: '#f8fafc',
    rimIntensity: 1.2,
    envIntensity: 1.1,
    toneMapping: 'Neutral',
    exposure: 1.0,
    labFog: false,
    fogColor: '#24272f',
    emissiveBoost: 1.0,
    gridPrimary: 0x4b5563,
    gridSecondary: 0x2a2f3a,
  },
  custom: {
    label: 'Custom Studio',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    backdropClass: 'bg-studio-neutral',
    keyColor: '#fff4e6',
    keyIntensity: 2.3,
    fillColor: '#a5c8ff',
    fillIntensity: 1.0,
    rimColor: '#c084fc',
    rimIntensity: 1.6,
    envIntensity: 1.0,
    toneMapping: 'AgX',
    exposure: 1.05,
    labFog: false,
    fogColor: '#161822',
    emissiveBoost: 1.0,
    gridPrimary: 0x4c4166,
    gridSecondary: 0x221f2e,
  },
};

export const MODEL_EXTS = new Set(['glb', 'gltf', 'obj', 'fbx', 'stl', 'ply']);
export const JS_EXTS = new Set(['js', 'mjs']);

export const JS_TEMPLATES = {
  snippet: `// Plain Three.js snippet — returns a THREE.Group directly
const group = new THREE.Group();
group.name = 'Procedural_CoffeeCup';

const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.05 });
const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x3b1f14, roughness: 0.12, metalness: 0.1 });

const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.72, 28), ceramicMat);
cup.name = 'Cup_Body';
cup.position.y = 0.36;
group.add(cup);

const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.38, 28), coffeeMat);
coffee.name = 'Coffee_Surface';
coffee.rotation.x = -Math.PI / 2;
coffee.position.y = 0.68;
group.add(coffee);

const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 12, 24, Math.PI), ceramicMat);
handle.name = 'Cup_Handle';
handle.rotation.z = -Math.PI / 2;
handle.position.set(0.39, 0.38, 0);
group.add(handle);

return group;`,

  animated: `// Animated procedural asset — return { scene, update }
const group = new THREE.Group();
group.name = 'Animated_BeaconProp';

const base = new THREE.Mesh(
  new THREE.CylinderGeometry(0.65, 0.8, 0.25, 8),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.7, flatShading: true })
);
base.position.y = 0.125;
group.add(base);

const core = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.38, 0),
  new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.4, flatShading: true })
);
core.name = 'Floating_Core';
core.position.y = 1.05;
group.add(core);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.58, 0.035, 8, 32),
  new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.9 })
);
ring.name = 'Orbit_Ring';
ring.position.y = 1.05;
group.add(ring);

return {
  scene: group,
  update(delta, elapsed) {
    core.rotation.y += delta * 1.4;
    core.position.y = 1.05 + Math.sin(elapsed * 2.5) * 0.12;
    ring.rotation.x = elapsed * 0.9;
    ring.rotation.y = elapsed * 1.2;
  },
};`,

  esm: `// Standard ES Module format — works identically in local .js files or pasted here
import * as THREE from 'three';

export default function createCrate(THREE_REF = THREE) {
  const group = new THREE_REF.Group();
  group.name = 'Stylized_Crate';

  const woodMat = new THREE_REF.MeshStandardMaterial({ color: 0x925f36, roughness: 0.82, metalness: 0.04 });
  const metalMat = new THREE_REF.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.85 });

  const core = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.0, 1.0, 1.0), woodMat);
  core.name = 'Crate_Body';
  core.position.y = 0.5;
  group.add(core);

  [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]].forEach(([x, z], idx) => {
    const post = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.1, 1.04, 0.1), metalMat);
    post.name = \`Corner_Bracket_\${idx + 1}\`;
    post.position.set(x, 0.5, z);
    group.add(post);
  });

  return group;
}`,
};

export const state = {
  codeStudioOpen: false,
  codeWordWrap: false,
  editingJsAssetId: null,
  workspace: 'klasik3d',
  leftOpen: true,
  rightOpen: true,
  zenMode: false,
  assets: [],
  activeAssetId: null,
  assetFilter: 'all',
  assetSearch: '',
  selectedObject: null,
  isolatedObject: null,
  inspectedMaterials: [],
  activeMaterialIndex: 0,
  shadingMode: 'pbr',
  backfaceMode: 'default',
  cameraMode: 'perspective',
  autoGround: true,
  turntable: false,
  turntableSpeed: 1.5,
  retroNearest: false,
  pixelScale: 1,
  labFog: false,
  emissiveBoost: 1.0,
  showGrid: true,
  showShadowPlane: true,
  showBBox: false,
  showAxes: false,
  showSkeleton: false,
  showVertexNormals: false,
  showHud: true,
  hudMinimized: false,
  envIntensity: 1.0,
  envRotationDeg: 0,
  customHdrActive: false,
  rigAzimuthDeg: 0,
  backdropMode: 'preset',
  customBgColor: '#121622',
  clips: [],
  activeClipIndex: 0,
  animPlaying: true,
  animLoop: true,
  animSpeed: 1.0,

  // Project Explorer & Direct Save state
  projectName: null,
  projectSearch: '',
  projectTree: null,
  activeProjectRelPath: null,
  hasSavedProjectHandle: false,
  jsDirty: false,

  showScaleRef: false,
  showEnvBackdrop: false,
  envBackdropBlur: 0.08,
  watchActiveFile: false,
  hierarchySearch: '',
  activeCustomProfileId: 'default-custom',
  customProfiles: [],
};
