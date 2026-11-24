// =========================================================================
// 18. MAIN RENDER & TELEMETRY ANIMATION LOOP & BOOTSTRAP
// =========================================================================

import * as THREE from 'three';
import { dom, showToast } from './dom.js';
import { state } from './state.js';
import { DEMO_ASSETS } from './demos.js';
import {
  renderer,
  scene,
  activeCamera,
  controls,
  cameraTween,
  setCameraTween,
  currentCustomShaderUniforms,
  currentCustomUpdateFn,
  setCurrentCustomUpdateFn,
  selectionBoxHelper,
  vertexNormalsGroup,
  currentAssetTriCount,
  currentAssetVertCount,
  currentModel,
  mixer,
  activeAction,
  handleViewportResize,
  isRenderActive,
  requestRender,
} from './scene.js';
import { applyPixelScale } from './materials.js';
import { initGizmo, renderAxesGizmo } from './gizmo.js';
import { setupRaycaster, renderAssetList } from './inspector.js';
import { loadAssetById, openProjectFileNode } from './loaders.js';
import { initProjectFs, setProjectFileOpenHandler } from './projectFs.js';
import { initCustomStudioProfiles } from './studioProfiles.js';
import { computeEstimatedTextureVramBytes, refreshOptimizerAudit } from './optimizer.js';
import {
  switchLeftTab,
  switchRightTab,
  applyWorkspacePreset,
  initUIEventListeners,
} from './ui.js';
import { setJsError, updateCodeLineNumbers } from './jsRunner.js';

const clock = new THREE.Clock();
let fpsFrames = 0;
let fpsAccum = 0;
let hudUpdateAccum = 0;

export function animate() {
  requestAnimationFrame(animate);

  const needsContinuous =
    state.turntable ||
    Boolean(cameraTween) ||
    Boolean(currentCustomUpdateFn) ||
    currentCustomShaderUniforms.length > 0 ||
    (Boolean(mixer && activeAction) && state.animPlaying);

  if (document.hidden || (!needsContinuous && !isRenderActive())) {
    dom.hudFps.textContent = 'IDLE';
    dom.hudFps.className = 'text-sky-400 font-semibold';
    return;
  }

  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.elapsedTime;

  for (const u of currentCustomShaderUniforms) {
    if (u.uTime) u.uTime.value = elapsed;
  }

  if (currentCustomUpdateFn) {
    try {
      currentCustomUpdateFn(delta, elapsed);
    } catch (err) {
      console.error('Procedural JS update() error:', err);
      setCurrentCustomUpdateFn(null);
      setJsError(`Runtime error in update(): ${err.message || err}`);
      showToast('Paused JS update() due to runtime error', 'error', 3500);
    }
  }

  if (cameraTween) {
    const t = Math.min((performance.now() - cameraTween.startTime) / cameraTween.duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    activeCamera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, ease);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, ease);
    if (t >= 1) setCameraTween(null);
  }

  controls.autoRotate = state.turntable;
  controls.autoRotateSpeed = state.turntableSpeed;
  controls.update();

  if (mixer && activeAction) {
    mixer.update(delta);
    const clip = state.clips[state.activeClipIndex];
    if (clip && clip.duration > 0) {
      const cur = activeAction.time % clip.duration;
      dom.animTimelineSlider.value = (cur / clip.duration).toFixed(3);
      dom.animTimecode.textContent = `${cur.toFixed(2)} / ${clip.duration.toFixed(2)}s`;
    }
  }

  if (selectionBoxHelper) selectionBoxHelper.update();
  if (vertexNormalsGroup.children.length > 0) {
    vertexNormalsGroup.children.forEach((h) => h.update?.());
  }

  renderer.render(scene, activeCamera);
  renderAxesGizmo();

  fpsFrames++;
  fpsAccum += delta;
  hudUpdateAccum += delta;
  if (hudUpdateAccum >= 0.25) {
    const fps = Math.round(fpsFrames / Math.max(fpsAccum, 0.001));
    dom.hudFps.textContent = `${fps} FPS`;
    dom.hudFps.className = fps >= 50
      ? 'text-emerald-400 font-semibold'
      : fps >= 30
        ? 'text-amber-400 font-semibold'
        : 'text-rose-400 font-semibold';

    const info = renderer.info;
    const calls = info.render.calls;
    dom.hudDrawCalls.textContent = calls;
    dom.hudDrawCalls.className = calls > 60
      ? 'text-rose-400 font-semibold'
      : calls > 25
        ? 'text-amber-400 font-semibold'
        : 'text-emerald-400 font-semibold';

    dom.hudTris.textContent = currentAssetTriCount.toLocaleString();
    dom.hudVerts.textContent = currentAssetVertCount.toLocaleString();
    dom.hudTexGeo.textContent = `${info.memory.textures}/${info.memory.geometries}`;
    if (dom.hudVram) {
      dom.hudVram.textContent = `${(computeEstimatedTextureVramBytes(currentModel) / (1024 * 1024)).toFixed(1)} MB`;
    }
    refreshOptimizerAudit(calls);

    fpsFrames = 0;
    fpsAccum = 0;
    hudUpdateAccum = 0;
  }
}

// =========================================================================
// 19. BOOTSTRAP
// =========================================================================
export function initStudio() {
  state.assets = [...DEMO_ASSETS];
  initGizmo();
  setupRaycaster();
  initUIEventListeners();

  setProjectFileOpenHandler(openProjectFileNode);
  initProjectFs();

  initCustomStudioProfiles();

  switchLeftTab('assets');
  switchRightTab('view');
  applyPixelScale();
  applyWorkspacePreset('klasik3d', false);
  handleViewportResize();
  updateCodeLineNumbers();
  renderAssetList();
  loadAssetById('demo-klasik3d');

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestRender(800);
  });

  animate();
  window.__aseetStudioReady = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudio);
} else {
  initStudio();
}
