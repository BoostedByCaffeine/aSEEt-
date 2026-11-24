// =========================================================================
// 5. SHARED PROCEDURAL INSPECTION MATERIALS & SHADING LOGIC
// =========================================================================

import * as THREE from 'three';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import { dom, showToast } from './dom.js';
import { state, WORKSPACE_PRESETS } from './state.js';
import {
  currentModel,
  currentAssetSize,
  currentAssetTriCount,
  vertexNormalsGroup,
  scene,
  renderer,
  handleViewportResize,
  requestRender,
  applyToneMapping,
  applyBackdropMode,
} from './scene.js';
import { applyWorkspacePreset } from './ui.js';

export { applyToneMapping, applyBackdropMode, applyWorkspacePreset };

export function createUvCheckerTexture() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cols = 8;
  const cell = size / cols;
  const palette = [
    ['#1e293b', '#334155'],
    ['#0f3d56', '#165a7e'],
    ['#14452f', '#1c6443'],
    ['#4a2511', '#6e371a'],
  ];
  const letters = 'ABCDEFGH';

  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      const quad = (y >= 4 ? 2 : 0) + (x >= 4 ? 1 : 0);
      const odd = (x + y) % 2;
      ctx.fillStyle = palette[quad][odd];
      ctx.fillRect(x * cell, y * cell, cell, cell);

      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(x * cell, y * cell);
      ctx.lineTo((x + 1) * cell, (y + 1) * cell);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = 'bold 34px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${letters[x]}${y + 1}`, x * cell + cell / 2, y * cell + cell / 2);
    }
  }

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, size - 16, size - 16);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const sharedMaterials = {
  clay: new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.56,
    metalness: 0.04,
  }),
  normals: new THREE.MeshNormalMaterial({}),
  uv: new THREE.MeshStandardMaterial({
    map: createUvCheckerTexture(),
    roughness: 0.65,
    metalness: 0.05,
  }),
  wireOnly: new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
  }),
  wireOverlay: new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.5,
    polygonOffsetUnits: -1.5,
  }),
  backfaceHighlight: new THREE.MeshBasicMaterial({
    color: 0xff2a85,
    side: THREE.BackSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }),
};

export const sharedMatSet = new Set(Object.values(sharedMaterials));

export function getOrBuildUnlitMaterial(origMat) {
  if (!origMat) return new THREE.MeshBasicMaterial({ color: 0xffffff });
  if (origMat.userData.aseetUnlitCached) return origMat.userData.aseetUnlitCached;
  const unlit = new THREE.MeshBasicMaterial({
    color: origMat.color ? origMat.color.clone() : new THREE.Color(0xffffff),
    map: origMat.map || null,
    vertexColors: Boolean(origMat.vertexColors),
    transparent: Boolean(origMat.transparent),
    opacity: origMat.opacity ?? 1.0,
    alphaMap: origMat.alphaMap || null,
    side: origMat.side ?? THREE.FrontSide,
  });
  origMat.userData.aseetUnlitCached = unlit;
  return unlit;
}

export function applyShadingMode() {
  document.querySelectorAll('.shade-btn').forEach((btn) => {
    const active = btn.dataset.shade === state.shadingMode;
    btn.className = active
      ? 'shade-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/25 text-sky-200 border border-sky-400/40 transition'
      : 'shade-btn px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-transparent transition';
  });

  if (!currentModel) return;

  const toRemove = [];
  currentModel.traverse((obj) => {
    if (obj.userData?.aseetOverlayType === 'wire') toRemove.push(obj);
  });
  toRemove.forEach((o) => o.parent?.remove(o));

  currentModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
    const orig = obj.userData.aseetOriginalMaterial;
    if (!orig) return;

    switch (state.shadingMode) {
      case 'pbr':
        obj.material = orig;
        break;
      case 'litwire':
        obj.material = orig;
        {
          const wireMesh = obj.isSkinnedMesh
            ? new THREE.SkinnedMesh(obj.geometry, sharedMaterials.wireOverlay)
            : new THREE.Mesh(obj.geometry, sharedMaterials.wireOverlay);
          if (obj.isSkinnedMesh && obj.skeleton) wireMesh.bind(obj.skeleton, obj.bindMatrix);
          wireMesh.userData.isAseetOverlay = true;
          wireMesh.userData.aseetOverlayType = 'wire';
          wireMesh.raycast = () => { };
          obj.add(wireMesh);
        }
        break;
      case 'wire':
        obj.material = sharedMaterials.wireOnly;
        break;
      case 'clay':
        obj.material = sharedMaterials.clay;
        break;
      case 'normals':
        obj.material = sharedMaterials.normals;
        break;
      case 'uv':
        obj.material = sharedMaterials.uv;
        break;
      case 'unlit':
        if (Array.isArray(orig)) obj.material = orig.map(getOrBuildUnlitMaterial);
        else obj.material = getOrBuildUnlitMaterial(orig);
        break;
    }
  });

  applyBackfaceMode();
  requestRender();
}

export function applyBackfaceMode() {
  const labels = { default: 'Front', double: '2-Side', highlight: 'Backface' };
  dom.quickBackfaceLabel.textContent = labels[state.backfaceMode];
  dom.quickBackfaceBtn.classList.toggle('text-pink-300', state.backfaceMode === 'highlight');
  dom.quickBackfaceBtn.classList.toggle('bg-pink-500/20', state.backfaceMode === 'highlight');
  dom.quickBackfaceBtn.classList.toggle('text-sky-300', state.backfaceMode === 'double');

  document.querySelectorAll('.backface-mode-btn').forEach((btn) => {
    const active = btn.dataset.backface === state.backfaceMode;
    const highlightStyle = btn.dataset.backface === 'highlight'
      ? 'bg-pink-500/25 text-pink-200 border border-pink-400/40'
      : 'bg-sky-500/25 text-sky-200 border border-sky-400/40';
    btn.className = active
      ? `backface-mode-btn py-1.5 rounded text-[11px] font-semibold transition ${highlightStyle}`
      : 'backface-mode-btn py-1.5 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 border border-transparent transition';
  });

  if (!currentModel) return;

  const toRemove = [];
  currentModel.traverse((obj) => {
    if (obj.userData?.aseetOverlayType === 'backface') toRemove.push(obj);
  });
  toRemove.forEach((o) => o.parent?.remove(o));

  currentModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];

    mats.forEach((m) => {
      if (!m) return;
      if (state.backfaceMode === 'double') {
        m.side = THREE.DoubleSide;
      } else if (state.backfaceMode === 'highlight') {
        m.side = THREE.FrontSide;
      } else {
        m.side = m.userData?.aseetDefaults?.side ?? THREE.FrontSide;
      }
      m.needsUpdate = true;
    });

    if (state.backfaceMode === 'highlight') {
      const bfMesh = obj.isSkinnedMesh
        ? new THREE.SkinnedMesh(obj.geometry, sharedMaterials.backfaceHighlight)
        : new THREE.Mesh(obj.geometry, sharedMaterials.backfaceHighlight);
      if (obj.isSkinnedMesh && obj.skeleton) bfMesh.bind(obj.skeleton, obj.bindMatrix);
      bfMesh.userData.isAseetOverlay = true;
      bfMesh.userData.aseetOverlayType = 'backface';
      bfMesh.raycast = () => { };
      obj.add(bfMesh);
    }
  });
  requestRender();
}

export function applyRetroTextureFilter() {
  dom.retroNearestToggle.checked = state.retroNearest;
  if (!currentModel) return;

  const texKeys = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
  currentModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
    const orig = obj.userData.aseetOriginalMaterial;
    const mats = Array.isArray(orig) ? orig : [orig];
    mats.forEach((m) => {
      if (!m) return;
      texKeys.forEach((k) => {
        const tex = m[k];
        if (tex && tex.isTexture) {
          tex.magFilter = state.retroNearest ? THREE.NearestFilter : THREE.LinearFilter;
          tex.minFilter = state.retroNearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
          tex.needsUpdate = true;
        }
      });
    });
  });
  requestRender();
}

export function applyPixelScale() {
  dom.pixelScaleReadout.textContent = `${state.pixelScale}x`;
  document.querySelectorAll('.pixel-scale-btn').forEach((btn) => {
    const active = parseFloat(btn.dataset.pixelScale) === state.pixelScale;
    btn.className = active
      ? 'pixel-scale-btn py-1 rounded text-[11px] font-mono font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/40 transition'
      : 'pixel-scale-btn py-1 rounded text-[11px] font-mono text-slate-400 hover:text-slate-200 border border-transparent transition';
  });

  const dpr = Math.min(window.devicePixelRatio, 2);
  const effectiveRatio = state.pixelScale < 1 ? state.pixelScale : dpr;
  renderer.setPixelRatio(effectiveRatio);
  dom.canvas.classList.toggle('pixelated-canvas', state.pixelScale < 1);
  handleViewportResize();
  requestRender();
}

export function applyEmissiveBoost() {
  dom.emissiveBoostSlider.value = state.emissiveBoost;
  dom.emissiveBoostVal.textContent = `${state.emissiveBoost.toFixed(2)}x`;
  if (!currentModel) return;

  currentModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
    const orig = obj.userData.aseetOriginalMaterial;
    const mats = Array.isArray(orig) ? orig : [orig];
    mats.forEach((m) => {
      if (m && 'emissiveIntensity' in m && m.userData?.aseetDefaults) {
        const base = m.userData.aseetUserEmissive ?? m.userData.aseetDefaults.emissiveIntensity;
        m.emissiveIntensity = base * state.emissiveBoost;
      }
    });
  });
  requestRender();
}

export function applyLabFog() {
  dom.labFogToggle.checked = state.labFog;
  if (state.labFog) {
    const preset = WORKSPACE_PRESETS[state.workspace];
    scene.fog = new THREE.FogExp2(new THREE.Color(preset.fogColor), 0.065);
  } else {
    scene.fog = null;
  }
  requestRender();
}

export function applyEnvBackdrop() {
  if (dom.envBackdropToggle) dom.envBackdropToggle.checked = state.showEnvBackdrop;
  if (dom.envBlurSlider) dom.envBlurSlider.value = state.envBackdropBlur;
  if (dom.envBlurVal) dom.envBlurVal.textContent = state.envBackdropBlur.toFixed(2);

  if (state.showEnvBackdrop && scene.environment) {
    scene.background = scene.environment;
    scene.backgroundBlurriness = state.envBackdropBlur;
  } else {
    scene.background = null;
  }
  requestRender();
}

export function clearVertexNormals() {
  while (vertexNormalsGroup.children.length > 0) {
    const h = vertexNormalsGroup.children[0];
    vertexNormalsGroup.remove(h);
    h.geometry?.dispose?.();
    h.material?.dispose?.();
  }
}

export function rebuildVertexNormalsIfEnabled() {
  clearVertexNormals();
  if (!state.showVertexNormals || !currentModel) return;

  if (currentAssetTriCount > 45000) {
    showToast(`Vertex normals disabled: mesh exceeds 45k tris (${currentAssetTriCount.toLocaleString()})`, 'warn', 3200);
    state.showVertexNormals = false;
    dom.helperNormalsToggle.checked = false;
    return;
  }

  const maxDim = Math.max(currentAssetSize.x, currentAssetSize.y, currentAssetSize.z, 0.5);
  const normalLen = maxDim * 0.04;
  currentModel.traverse((obj) => {
    if (obj.isMesh && !obj.userData?.isAseetOverlay && obj.geometry?.attributes?.normal) {
      const helper = new VertexNormalsHelper(obj, normalLen, 0x34d399);
      vertexNormalsGroup.add(helper);
    }
  });
}
