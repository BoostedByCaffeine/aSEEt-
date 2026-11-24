// =========================================================================
// 10 & 15-17. WORKSPACE PRESETS, SCREENSHOTS & UI EVENT LISTENERS
// =========================================================================

import * as THREE from 'three';
import { dom, showToast } from './dom.js';
import { state, WORKSPACE_PRESETS, JS_TEMPLATES } from './state.js';
import {
  renderer,
  scene,
  activeCamera,
  stageGroup,
  lightRig,
  keyLight,
  fillLight,
  rimLight,
  floorGrid,
  setFloorGrid,
  shadowPlane,
  worldAxesHelper,
  bboxHelper,
  selectionBoxHelper,
  skeletonHelper,
  humanScaleRef,
  perspCamera,
  controls,
  proceduralEnvRT,
  applyToneMapping,
  applyBackdropMode,
  frameAsset,
  snapCameraPreset,
  toggleCameraProjection,
  handleViewportResize,
  currentModel,
  mixer,
  activeAction,
  requestRender,
} from './scene.js';
import {
  applyShadingMode,
  applyBackfaceMode,
  applyRetroTextureFilter,
  applyPixelScale,
  applyEmissiveBoost,
  applyLabFog,
  applyEnvBackdrop,
  rebuildVertexNormalsIfEnabled,
} from './materials.js';
import {
  selectSceneObject,
  renderAssetList,
  rebuildHierarchyTree,
  refreshMaterialInspector,
  expandAllHierarchyNodes,
  collapseAllHierarchyNodes,
  bindMaterialControls,
  getActiveMaterial,
  toggleAnimPlayPause,
  playClip,
  updateAnimationUI,
} from './inspector.js';
import {
  handleIncomingFiles,
  extractDroppedFiles,
  alignAndMeasureAsset,
  runCodeFromEditor,
  exportCurrentModelAsGlb,
} from './loaders.js';
import {
  setCodeStudioOpen,
  setJsError,
  updateCodeLineNumbers,
  updateEditorCursorStatus,
} from './jsRunner.js';
import {
  openProjectFolder,
  reconnectLastProject,
  refreshProjectTree,
  renderProjectTree,
  setProjectFileWatchEnabled,
} from './projectFs.js';
import {
  saveJsFromEditor,
  convertCurrentModelToJs,
  setJsDirty,
} from './jsExporter.js';
import {
  applyCustomProfileById,
  saveCurrentAsCustomProfile,
  deleteSelectedCustomProfile,
  exportCustomProfilesJson,
  importCustomProfilesJson,
} from './studioProfiles.js';
import {
  mergeStaticMeshesByMaterial,
  rotateCurrentModelY,
  scaleCurrentModelToHeight,
  bakeCurrentModelOriginBottomCenter,
  refreshOptimizerAudit,
} from './optimizer.js';

export function applyWorkspacePreset(name, announce = true) {
  const preset = WORKSPACE_PRESETS[name];
  if (!preset) return;
  state.workspace = name;

  document.querySelectorAll('.workspace-btn').forEach((btn) => {
    const active = btn.dataset.workspace === name;
    btn.className = active
      ? 'workspace-btn px-2.5 py-1 rounded-md text-xs font-semibold bg-obsidian-700 text-white shadow-sm transition flex items-center gap-1.5'
      : 'workspace-btn px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5';
  });

  dom.headerProjectTag.textContent = preset.label;
  dom.headerProjectTag.className = `hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${preset.badgeClass}`;

  document.getElementById('klasikToolsCard')?.classList.toggle('ring-1', name === 'klasik3d');
  document.getElementById('klasikToolsCard')?.classList.toggle('ring-amber-400/50', name === 'klasik3d');
  document.getElementById('brewingToolsCard')?.classList.toggle('ring-1', name === 'brewingbad');
  document.getElementById('brewingToolsCard')?.classList.toggle('ring-emerald-400/50', name === 'brewingbad');
  dom.customStudioCard?.classList.toggle('ring-1', name === 'custom');
  dom.customStudioCard?.classList.toggle('ring-violet-400/50', name === 'custom');

  keyLight.color.set(preset.keyColor);
  keyLight.intensity = preset.keyIntensity;
  fillLight.color.set(preset.fillColor);
  fillLight.intensity = preset.fillIntensity;
  rimLight.color.set(preset.rimColor);
  rimLight.intensity = preset.rimIntensity;

  dom.keyColorPicker.value = preset.keyColor;
  dom.keyIntSlider.value = preset.keyIntensity;
  dom.keyIntVal.textContent = preset.keyIntensity.toFixed(1);

  dom.fillColorPicker.value = preset.fillColor;
  dom.fillIntSlider.value = preset.fillIntensity;
  dom.fillIntVal.textContent = preset.fillIntensity.toFixed(1);

  dom.rimColorPicker.value = preset.rimColor;
  dom.rimIntSlider.value = preset.rimIntensity;
  dom.rimIntVal.textContent = preset.rimIntensity.toFixed(1);

  state.envIntensity = preset.envIntensity;
  scene.environmentIntensity = preset.envIntensity;
  dom.envIntensitySlider.value = preset.envIntensity;
  dom.envIntensityVal.textContent = preset.envIntensity.toFixed(2);

  dom.toneMappingSelect.value = preset.toneMapping;
  applyToneMapping(preset.toneMapping);

  renderer.toneMappingExposure = preset.exposure;
  dom.exposureSlider.value = preset.exposure;
  dom.exposureVal.textContent = preset.exposure.toFixed(2);

  state.labFog = preset.labFog;
  applyLabFog();
  state.emissiveBoost = preset.emissiveBoost;
  applyEmissiveBoost();

  stageGroup.remove(floorGrid);
  floorGrid.geometry.dispose();
  floorGrid.material.dispose();
  const newFloorGrid = new THREE.GridHelper(16, 32, preset.gridPrimary, preset.gridSecondary);
  newFloorGrid.position.y = -0.001;
  newFloorGrid.material.transparent = true;
  newFloorGrid.material.opacity = 0.65;
  newFloorGrid.visible = state.showGrid;
  setFloorGrid(newFloorGrid);
  stageGroup.add(newFloorGrid);

  applyBackdropMode();
  requestRender();

  if (announce) {
    showToast(`Workspace switched to ${preset.label}`, 'info', 2000);
  }
}

export function captureScreenshot(transparentAlpha = false) {
  dom.snapshotPopover.classList.add('hidden');
  const prevGrid = floorGrid.visible;
  const prevShadow = shadowPlane.visible;
  const prevAxes = worldAxesHelper.visible;
  const prevBBox = bboxHelper ? bboxHelper.visible : false;
  const prevSel = selectionBoxHelper ? selectionBoxHelper.visible : false;
  const prevFog = scene.fog;

  if (transparentAlpha) {
    floorGrid.visible = false;
    shadowPlane.visible = false;
    worldAxesHelper.visible = false;
    if (bboxHelper) bboxHelper.visible = false;
    if (selectionBoxHelper) selectionBoxHelper.visible = false;
    scene.fog = null;
    renderer.setClearColor(0x000000, 0);
  } else {
    const bgColors = {
      klasik3d: 0x151923,
      brewingbad: 0x0b1318,
      neutral: 0x24272f,
    };
    let fillHex = bgColors[state.workspace] || 0x0b0d12;
    if (state.backdropMode === 'dark') fillHex = 0x0b0d12;
    else if (state.backdropMode === 'light') fillHex = 0xd8dde6;
    else if (state.backdropMode === 'custom') fillHex = new THREE.Color(state.customBgColor).getHex();
    renderer.setClearColor(fillHex, 1);
  }

  renderer.render(scene, activeCamera);

  try {
    const dataUrl = dom.canvas.toDataURL('image/png');
    const asset = state.assets.find((a) => a.id === state.activeAssetId);
    const safeName = (asset ? asset.name : 'scene').replace(/[^a-z0-9_-]/gi, '_');
    const link = document.createElement('a');
    link.download = `aSEEt_${safeName}_${transparentAlpha ? 'alpha' : 'studio'}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Saved ${transparentAlpha ? 'Transparent Alpha' : 'Studio'} PNG snapshot`, 'success');
  } catch (err) {
    showToast('Could not capture PNG snapshot', 'error');
  } finally {
    renderer.setClearColor(0x000000, 0);
    floorGrid.visible = prevGrid;
    shadowPlane.visible = prevShadow;
    worldAxesHelper.visible = prevAxes;
    if (bboxHelper) bboxHelper.visible = prevBBox;
    if (selectionBoxHelper) selectionBoxHelper.visible = prevSel;
    scene.fog = prevFog;
  }
}

export function applyPanelVisibility() {
  if (state.zenMode && state.codeStudioOpen) setCodeStudioOpen(false);
  dom.leftSidebar.classList.toggle('sidebar-collapsed', state.zenMode || !state.leftOpen);
  dom.rightSidebar.classList.toggle('sidebar-collapsed', state.zenMode || !state.rightOpen);
  dom.topHeader.classList.toggle('hidden', state.zenMode);
  dom.exitZenChip.classList.toggle('hidden', !state.zenMode);
  setTimeout(handleViewportResize, 210);
}

export function switchLeftTab(tab) {
  dom.leftTabAssets?.classList.toggle('hidden', tab !== 'assets');
  dom.leftTabProject?.classList.toggle('hidden', tab !== 'project');
  dom.leftTabHierarchy?.classList.toggle('hidden', tab !== 'hierarchy');
  document.querySelectorAll('.left-tab-btn').forEach((b) => {
    const active = b.dataset.leftTab === tab;
    b.className = active
      ? 'left-tab-btn flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-obsidian-700 text-white transition'
      : 'left-tab-btn flex-1 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 transition';
  });
}

export function switchRightTab(tab) {
  document.getElementById('rightTabView')?.classList.toggle('hidden', tab !== 'view');
  document.getElementById('rightTabLighting')?.classList.toggle('hidden', tab !== 'lighting');
  document.getElementById('rightTabMaterial')?.classList.toggle('hidden', tab !== 'material');
  document.getElementById('rightTabOptimize')?.classList.toggle('hidden', tab !== 'optimize');
  if (tab === 'optimize') {
    refreshOptimizerAudit(renderer.info.render.calls);
  }
  document.querySelectorAll('.right-tab-btn').forEach((b) => {
    const active = b.dataset.rightTab === tab;
    b.className = active
      ? 'right-tab-btn flex-1 py-1.5 rounded-lg text-xs font-semibold bg-obsidian-700 text-white transition'
      : 'right-tab-btn flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition';
  });
}

export function initUIEventListeners() {
  document.querySelectorAll('.left-tab-btn').forEach((b) =>
    b.addEventListener('click', () => switchLeftTab(b.dataset.leftTab))
  );
  document.querySelectorAll('.right-tab-btn').forEach((b) =>
    b.addEventListener('click', () => switchRightTab(b.dataset.rightTab))
  );

  document.getElementById('toggleLeftBtn').addEventListener('click', () => {
    state.leftOpen = !state.leftOpen;
    applyPanelVisibility();
  });
  document.getElementById('toggleRightBtn').addEventListener('click', () => {
    state.rightOpen = !state.rightOpen;
    applyPanelVisibility();
  });
  document.getElementById('zenToggleBtn').addEventListener('click', () => {
    state.zenMode = !state.zenMode;
    applyPanelVisibility();
  });
  dom.exitZenChip.addEventListener('click', () => {
    state.zenMode = false;
    applyPanelVisibility();
  });

  document.querySelectorAll('.workspace-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.workspace === 'custom') {
        applyCustomProfileById(state.activeCustomProfileId, true);
      } else {
        applyWorkspacePreset(btn.dataset.workspace, true);
      }
    });
  });

  // Custom Studio Controls
  dom.customProfileSelect?.addEventListener('change', (e) => {
    applyCustomProfileById(e.target.value, true);
  });
  document.getElementById('saveCustomProfileBtn')?.addEventListener('click', () => {
    saveCurrentAsCustomProfile();
  });
  document.getElementById('deleteCustomProfileBtn')?.addEventListener('click', () => {
    deleteSelectedCustomProfile();
  });
  document.getElementById('exportProfilesBtn')?.addEventListener('click', () => {
    exportCustomProfilesJson();
  });
  document.getElementById('importProfilesBtn')?.addEventListener('click', () => {
    dom.importProfilesInput?.click();
  });
  dom.importProfilesInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      importCustomProfilesJson(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Optimizer & Transform Baker Controls
  const onAfterModify = () => {
    alignAndMeasureAsset();
    rebuildHierarchyTree();
    refreshMaterialInspector();
    refreshOptimizerAudit(renderer.info.render.calls);
  };

  document.getElementById('optMergeByMatBtn')?.addEventListener('click', () => {
    mergeStaticMeshesByMaterial({ onAfterModify });
  });

  document.querySelectorAll('.opt-rot-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      rotateCurrentModelY(Number(btn.dataset.rotY), { onAfterModify });
    });
  });

  document.getElementById('optApplyHeightBtn')?.addEventListener('click', () => {
    scaleCurrentModelToHeight(dom.optTargetHeightInput?.value, { onAfterModify });
  });

  document.getElementById('optBakeOriginBtn')?.addEventListener('click', () => {
    bakeCurrentModelOriginBottomCenter({ onAfterModify });
  });

  document.getElementById('optExportGlbShortcutBtn')?.addEventListener('click', () => {
    exportCurrentModelAsGlb();
  });

  // Viewport Helpers: 1.75m Scale Reference
  dom.helperScaleRefToggle?.addEventListener('change', (e) => {
    state.showScaleRef = e.target.checked;
    humanScaleRef.visible = state.showScaleRef;
    requestRender();
  });

  // HDRI Backdrop Controls
  dom.envBackdropToggle?.addEventListener('change', (e) => {
    state.showEnvBackdrop = e.target.checked;
    applyEnvBackdrop();
  });
  dom.envBlurSlider?.addEventListener('input', (e) => {
    state.envBackdropBlur = parseFloat(e.target.value);
    applyEnvBackdrop();
  });

  // Project File Watcher Toggle
  dom.watchProjectFileBtn?.addEventListener('click', () => {
    setProjectFileWatchEnabled(!state.watchActiveFile);
  });

  // Hierarchy Search & Expand/Collapse
  dom.hierarchySearchInput?.addEventListener('input', (e) => {
    state.hierarchySearch = e.target.value;
    rebuildHierarchyTree();
  });
  document.getElementById('expandAllNodesBtn')?.addEventListener('click', () => {
    expandAllHierarchyNodes();
  });
  document.getElementById('collapseAllNodesBtn')?.addEventListener('click', () => {
    collapseAllHierarchyNodes();
  });

  // Interaction render wake hooks
  dom.canvas.addEventListener('pointerdown', () => requestRender(1200));
  dom.canvas.addEventListener('wheel', () => requestRender(800), { passive: true });
  document.addEventListener('input', () => requestRender(650), { passive: true });
  document.addEventListener('change', () => requestRender(650), { passive: true });

  document.getElementById('openFilesBtn').addEventListener('click', () => dom.fileInput.click());
  document.getElementById('sidebarDropTrigger').addEventListener('click', () => dom.fileInput.click());
  document.getElementById('openFolderBtn')?.addEventListener('click', () => dom.folderInput.click());
  document.getElementById('openProjectBtn')?.addEventListener('click', async () => {
    switchLeftTab('project');
    await openProjectFolder();
  });

  // Project Explorer UI Events
  document.getElementById('projectOpenDirBtn')?.addEventListener('click', () => {
    openProjectFolder();
  });
  dom.refreshProjectBtn?.addEventListener('click', () => {
    refreshProjectTree(true);
  });
  dom.reconnectProjectBtn?.addEventListener('click', () => {
    reconnectLastProject();
  });
  dom.projectSearchInput?.addEventListener('input', (e) => {
    state.projectSearch = e.target.value;
    renderProjectTree();
  });

  dom.fileInput.addEventListener('change', (e) => {
    handleIncomingFiles(e.target.files);
    e.target.value = '';
  });
  dom.folderInput.addEventListener('change', (e) => {
    handleIncomingFiles(e.target.files);
    e.target.value = '';
  });

  // Export Popover & Converters
  document.getElementById('exportMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.exportPopover?.classList.toggle('hidden');
  });
  document.getElementById('exportGlbBtn')?.addEventListener('click', () => {
    dom.exportPopover?.classList.add('hidden');
    exportCurrentModelAsGlb();
  });
  document.getElementById('exportJsGeoBtn')?.addEventListener('click', () => {
    convertCurrentModelToJs('geometry');
  });
  document.getElementById('exportJsBase64Btn')?.addEventListener('click', () => {
    convertCurrentModelToJs('base64');
  });

  dom.codeStudioToggleBtn.addEventListener('click', () => setCodeStudioOpen(!state.codeStudioOpen));
  document.getElementById('sidebarCodeTrigger').addEventListener('click', () => setCodeStudioOpen(true));
  document.getElementById('closeCodeStudioBtn').addEventListener('click', () => setCodeStudioOpen(false));
  document.getElementById('runJsCodeBtn').addEventListener('click', runCodeFromEditor);
  document.getElementById('loadJsFileBtn').addEventListener('click', () => dom.jsFileInput.click());
  document.getElementById('saveJsCodeBtn')?.addEventListener('click', () => {
    saveJsFromEditor({ saveAs: false });
  });
  document.getElementById('saveAsJsCodeBtn')?.addEventListener('click', () => {
    saveJsFromEditor({ saveAs: true });
  });

  dom.jsFileInput.addEventListener('change', (e) => {
    handleIncomingFiles(e.target.files);
    e.target.value = '';
  });

  dom.jsCodeInput.addEventListener('input', () => {
    setJsDirty(true);
    updateCodeLineNumbers();
  });
  dom.jsCodeInput.addEventListener('click', updateEditorCursorStatus);
  dom.jsCodeInput.addEventListener('keyup', updateEditorCursorStatus);
  dom.jsCodeInput.addEventListener('scroll', () => {
    dom.jsLineNumbers.scrollTop = dom.jsCodeInput.scrollTop;
  });
  dom.jsCodeInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCodeFromEditor();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      saveJsFromEditor({ saveAs: e.shiftKey });
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = dom.jsCodeInput.selectionStart;
      const end = dom.jsCodeInput.selectionEnd;
      const val = dom.jsCodeInput.value;
      dom.jsCodeInput.value = val.slice(0, start) + '  ' + val.slice(end);
      dom.jsCodeInput.selectionStart = dom.jsCodeInput.selectionEnd = start + 2;
      setJsDirty(true);
      updateCodeLineNumbers();
    }
  });

  dom.jsTemplateSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (!key || !JS_TEMPLATES[key]) return;
    state.editingJsAssetId = null;
    dom.jsCodeInput.value = JS_TEMPLATES[key];
    const names = { snippet: 'CoffeeCup_Snippet.js', animated: 'BeaconProp_Animated.js', esm: 'StylizedCrate_ESM.js' };
    dom.jsAssetNameInput.value = names[key] || 'Custom_Asset.js';
    dom.jsSourceBadge.textContent = 'TEMPLATE';
    setJsDirty(true);
    setJsError(null);
    updateCodeLineNumbers();
    e.target.value = '';
  });

  dom.jsWrapToggleBtn.addEventListener('click', () => {
    state.codeWordWrap = !state.codeWordWrap;
    dom.jsCodeInput.classList.toggle('whitespace-pre', !state.codeWordWrap);
    dom.jsCodeInput.classList.toggle('whitespace-pre-wrap', state.codeWordWrap);
    dom.jsCodeInput.classList.toggle('break-words', state.codeWordWrap);
    dom.jsWrapToggleBtn.classList.toggle('bg-violet-500/20', state.codeWordWrap);
    dom.jsWrapToggleBtn.classList.toggle('text-violet-200', state.codeWordWrap);
    dom.jsWrapToggleBtn.classList.toggle('border-violet-400/40', state.codeWordWrap);
  });

  document.getElementById('jsCopyBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(dom.jsCodeInput.value);
      showToast('Copied JS code to clipboard', 'success', 1800);
    } catch {
      showToast('Clipboard access unavailable', 'warn');
    }
  });

  document.getElementById('jsClearBtn').addEventListener('click', () => {
    state.editingJsAssetId = null;
    dom.jsCodeInput.value = '';
    dom.jsAssetNameInput.value = 'Custom_Asset.js';
    dom.jsSourceBadge.textContent = 'SCRATCHPAD';
    setJsDirty(false);
    setJsError(null);
    updateCodeLineNumbers();
    dom.jsCodeInput.focus();
  });

  let dragCounter = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dom.dropOverlay.classList.remove('hidden');
  });
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) dom.dropOverlay.classList.add('hidden');
  });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dom.dropOverlay.classList.add('hidden');
    const files = await extractDroppedFiles(e.dataTransfer);
    handleIncomingFiles(files);
  });

  document.getElementById('snapshotMenuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    dom.snapshotPopover.classList.toggle('hidden');
  });
  document.getElementById('snapStudioBtn').addEventListener('click', () => captureScreenshot(false));
  document.getElementById('snapAlphaBtn').addEventListener('click', () => captureScreenshot(true));
  window.addEventListener('click', (e) => {
    if (!e.target.closest('#snapshotPopover') && !e.target.closest('#snapshotMenuBtn')) {
      dom.snapshotPopover.classList.add('hidden');
    }
    if (!e.target.closest('#exportPopover') && !e.target.closest('#exportMenuBtn')) {
      dom.exportPopover?.classList.add('hidden');
    }
  });

  document.getElementById('shortcutsBtn').addEventListener('click', () => dom.shortcutsModal.classList.toggle('hidden'));
  document.getElementById('closeShortcutsBtn').addEventListener('click', () => dom.shortcutsModal.classList.add('hidden'));
  dom.shortcutsModal.addEventListener('click', (e) => {
    if (e.target === dom.shortcutsModal) dom.shortcutsModal.classList.add('hidden');
  });

  dom.assetSearchInput.addEventListener('input', (e) => {
    state.assetSearch = e.target.value;
    renderAssetList();
  });
  document.querySelectorAll('.asset-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.assetFilter = btn.dataset.filter;
      renderAssetList();
    });
  });

  document.getElementById('unhideAllBtn').addEventListener('click', () => {
    if (!currentModel) return;
    state.isolatedObject = null;
    currentModel.traverse((o) => {
      if (!o.userData?.isAseetOverlay) o.visible = true;
    });
    rebuildHierarchyTree();
  });
  document.getElementById('clearSelectionBtn').addEventListener('click', () => selectSceneObject(null));

  document.querySelectorAll('.shade-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.shadingMode = btn.dataset.shade;
      applyShadingMode();
    });
  });
  dom.quickBackfaceBtn.addEventListener('click', () => {
    const order = ['default', 'double', 'highlight'];
    state.backfaceMode = order[(order.indexOf(state.backfaceMode) + 1) % order.length];
    applyBackfaceMode();
  });
  dom.quickCameraModeBtn.addEventListener('click', toggleCameraProjection);
  document.getElementById('quickFrameBtn').addEventListener('click', () => frameAsset(false));
  dom.quickTurntableBtn.addEventListener('click', () => {
    state.turntable = !state.turntable;
    dom.turntableToggle.checked = state.turntable;
    dom.quickTurntableBtn.classList.toggle('text-sky-300', state.turntable);
    dom.quickTurntableBtn.classList.toggle('bg-sky-500/20', state.turntable);
  });
  document.querySelectorAll('.cam-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => snapCameraPreset(btn.dataset.camView));
  });

  document.getElementById('toggleHudCollapseBtn').addEventListener('click', () => {
    state.hudMinimized = !state.hudMinimized;
    dom.hudDetailsBody.classList.toggle('hidden', state.hudMinimized);
  });

  dom.retroNearestToggle.addEventListener('change', (e) => {
    state.retroNearest = e.target.checked;
    applyRetroTextureFilter();
  });
  document.querySelectorAll('.pixel-scale-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.pixelScale = parseFloat(btn.dataset.pixelScale);
      applyPixelScale();
    });
  });
  dom.labFogToggle.addEventListener('change', (e) => {
    state.labFog = e.target.checked;
    applyLabFog();
  });
  dom.emissiveBoostSlider.addEventListener('input', (e) => {
    state.emissiveBoost = parseFloat(e.target.value);
    applyEmissiveBoost();
  });

  document.querySelectorAll('.backface-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.backfaceMode = btn.dataset.backface;
      applyBackfaceMode();
    });
  });

  dom.helperGridToggle.addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    floorGrid.visible = state.showGrid;
  });
  dom.helperShadowPlaneToggle.addEventListener('change', (e) => {
    state.showShadowPlane = e.target.checked;
    shadowPlane.visible = state.showShadowPlane;
  });
  dom.helperBBoxToggle.addEventListener('change', (e) => {
    state.showBBox = e.target.checked;
    if (bboxHelper) bboxHelper.visible = state.showBBox;
  });
  dom.helperAxesToggle.addEventListener('change', (e) => {
    state.showAxes = e.target.checked;
    worldAxesHelper.visible = state.showAxes;
  });
  dom.helperSkeletonToggle.addEventListener('change', (e) => {
    state.showSkeleton = e.target.checked;
    if (skeletonHelper) skeletonHelper.visible = state.showSkeleton;
  });
  dom.helperNormalsToggle.addEventListener('change', (e) => {
    state.showVertexNormals = e.target.checked;
    rebuildVertexNormalsIfEnabled();
  });
  dom.helperHudToggle.addEventListener('change', (e) => {
    state.showHud = e.target.checked;
    dom.diagnosticsHud.classList.toggle('hidden', !state.showHud);
  });

  dom.autoGroundToggle.addEventListener('change', (e) => {
    state.autoGround = e.target.checked;
    alignAndMeasureAsset();
    frameAsset(false);
  });
  dom.fovSlider.addEventListener('input', (e) => {
    perspCamera.fov = parseFloat(e.target.value);
    perspCamera.updateProjectionMatrix();
    dom.fovVal.textContent = `${perspCamera.fov}°`;
  });
  dom.turntableToggle.addEventListener('change', (e) => {
    state.turntable = e.target.checked;
    dom.quickTurntableBtn.classList.toggle('text-sky-300', state.turntable);
    dom.quickTurntableBtn.classList.toggle('bg-sky-500/20', state.turntable);
  });
  dom.turntableSpeedSlider.addEventListener('input', (e) => {
    state.turntableSpeed = parseFloat(e.target.value);
    dom.turntableSpeedVal.textContent = state.turntableSpeed.toFixed(2);
  });
  document.getElementById('inspectorFrameBtn').addEventListener('click', () => frameAsset(false));
  document.getElementById('inspectorResetCamBtn').addEventListener('click', () => {
    if (state.cameraMode !== 'perspective') toggleCameraProjection();
    perspCamera.fov = 42;
    perspCamera.updateProjectionMatrix();
    dom.fovSlider.value = 42;
    dom.fovVal.textContent = '42°';
    frameAsset(false);
  });

  dom.envIntensitySlider.addEventListener('input', (e) => {
    state.envIntensity = parseFloat(e.target.value);
    scene.environmentIntensity = state.envIntensity;
    dom.envIntensityVal.textContent = state.envIntensity.toFixed(2);
  });
  dom.envRotationSlider.addEventListener('input', (e) => {
    state.envRotationDeg = parseFloat(e.target.value);
    if (scene.environmentRotation) scene.environmentRotation.y = THREE.MathUtils.degToRad(state.envRotationDeg);
    dom.envRotationVal.textContent = `${state.envRotationDeg}°`;
  });
  dom.resetEnvBtn.addEventListener('click', () => {
    scene.environment = proceduralEnvRT.texture;
    state.customHdrActive = false;
    dom.envSourceBadge.textContent = 'RoomEnv';
    dom.resetEnvBtn.classList.add('hidden');
    showToast('Reverted to Procedural Studio IBL', 'info');
  });

  dom.rigAzimuthSlider.addEventListener('input', (e) => {
    state.rigAzimuthDeg = parseFloat(e.target.value);
    lightRig.rotation.y = THREE.MathUtils.degToRad(state.rigAzimuthDeg);
    dom.rigAzimuthVal.textContent = `${state.rigAzimuthDeg}°`;
  });
  document.getElementById('resetLightsBtn').addEventListener('click', () =>
    applyWorkspacePreset(state.workspace, false)
  );

  dom.keyIntSlider.addEventListener('input', (e) => {
    keyLight.intensity = parseFloat(e.target.value);
    dom.keyIntVal.textContent = keyLight.intensity.toFixed(1);
  });
  dom.keyColorPicker.addEventListener('input', (e) => keyLight.color.set(e.target.value));
  dom.fillIntSlider.addEventListener('input', (e) => {
    fillLight.intensity = parseFloat(e.target.value);
    dom.fillIntVal.textContent = fillLight.intensity.toFixed(1);
  });
  dom.fillColorPicker.addEventListener('input', (e) => fillLight.color.set(e.target.value));
  dom.rimIntSlider.addEventListener('input', (e) => {
    rimLight.intensity = parseFloat(e.target.value);
    dom.rimIntVal.textContent = rimLight.intensity.toFixed(1);
  });
  dom.rimColorPicker.addEventListener('input', (e) => rimLight.color.set(e.target.value));

  dom.toneMappingSelect.addEventListener('change', (e) => applyToneMapping(e.target.value));
  dom.exposureSlider.addEventListener('input', (e) => {
    renderer.toneMappingExposure = parseFloat(e.target.value);
    dom.exposureVal.textContent = renderer.toneMappingExposure.toFixed(2);
  });

  document.querySelectorAll('.bg-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.backdropMode = btn.dataset.bg;
      applyBackdropMode();
  requestRender();
    });
  });
  dom.customBgPicker.addEventListener('input', (e) => {
    state.customBgColor = e.target.value;
    state.backdropMode = 'custom';
    applyBackdropMode();
  requestRender();
  });

  dom.materialSelect.addEventListener('change', (e) => {
    state.activeMaterialIndex = parseInt(e.target.value, 10) || 0;
    bindMaterialControls(getActiveMaterial());
  });
  dom.matColorPicker.addEventListener('input', (e) => {
    const m = getActiveMaterial();
    if (m && m.color) {
      m.color.set(e.target.value);
      dom.matColorHex.textContent = e.target.value;
    }
  });
  dom.matMetalSlider.addEventListener('input', (e) => {
    const m = getActiveMaterial();
    if (m && 'metalness' in m) {
      m.metalness = parseFloat(e.target.value);
      dom.matMetalVal.textContent = m.metalness.toFixed(2);
    }
  });
  dom.matRoughSlider.addEventListener('input', (e) => {
    const m = getActiveMaterial();
    if (m && 'roughness' in m) {
      m.roughness = parseFloat(e.target.value);
      dom.matRoughVal.textContent = m.roughness.toFixed(2);
    }
  });
  dom.matEmissivePicker.addEventListener('input', (e) => {
    const m = getActiveMaterial();
    if (m && m.emissive) m.emissive.set(e.target.value);
  });
  dom.matEmissiveSlider.addEventListener('input', (e) => {
    const m = getActiveMaterial();
    if (m && 'emissiveIntensity' in m) {
      const val = parseFloat(e.target.value);
      m.userData.aseetUserEmissive = val;
      m.emissiveIntensity = val;
      dom.matEmissiveVal.textContent = val.toFixed(2);
    }
  });
  dom.matOpacitySlider.addEventListener('input', (e) => {
    const m = getActiveMaterial();
    if (!m) return;
    const val = parseFloat(e.target.value);
    m.opacity = val;
    m.transparent = val < 0.99 || Boolean(m.userData?.aseetDefaults?.transparent);
    m.needsUpdate = true;
    dom.matOpacityVal.textContent = val.toFixed(2);
  });
  dom.matFlatToggle.addEventListener('change', (e) => {
    const m = getActiveMaterial();
    if (m) {
      m.flatShading = e.target.checked;
      m.needsUpdate = true;
    }
  });
  dom.matSideSelect.addEventListener('change', (e) => {
    const m = getActiveMaterial();
    if (m) {
      m.side = parseInt(e.target.value, 10);
      m.needsUpdate = true;
    }
  });
  document.getElementById('resetMatBtn').addEventListener('click', () => {
    const m = getActiveMaterial();
    const d = m?.userData?.aseetDefaults;
    if (!m || !d) return;
    if (d.color && m.color) m.color.copy(d.color);
    if (d.metalness !== null) m.metalness = d.metalness;
    if (d.roughness !== null) m.roughness = d.roughness;
    if (d.emissive && m.emissive) m.emissive.copy(d.emissive);
    delete m.userData.aseetUserEmissive;
    if ('emissiveIntensity' in m) m.emissiveIntensity = d.emissiveIntensity * state.emissiveBoost;
    m.opacity = d.opacity;
    m.transparent = d.transparent;
    m.flatShading = d.flatShading;
    m.side = d.side;
    m.needsUpdate = true;
    bindMaterialControls(m);
    showToast('Material restored to defaults', 'info', 1800);
  });

  dom.animPlayPauseBtn.addEventListener('click', toggleAnimPlayPause);
  dom.animClipSelect.addEventListener('change', (e) => playClip(parseInt(e.target.value, 10)));
  dom.animLoopBtn.addEventListener('click', () => {
    state.animLoop = !state.animLoop;
    const action = activeAction;
    if (action) {
      action.setLoop(state.animLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = !state.animLoop;
    }
    updateAnimationUI();
  });
  dom.animSpeedSlider.addEventListener('input', (e) => {
    state.animSpeed = parseFloat(e.target.value);
    dom.animSpeedVal.textContent = `${state.animSpeed.toFixed(1)}x`;
    if (activeAction && state.animPlaying) activeAction.timeScale = state.animSpeed;
  });
  dom.animTimelineSlider.addEventListener('input', (e) => {
    if (!activeAction || !mixer) return;
    const clip = state.clips[state.activeClipIndex];
    const targetTime = parseFloat(e.target.value) * (clip?.duration || 1);
    activeAction.time = targetTime;
    mixer.update(0);
  });

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'escape') {
      if (state.codeStudioOpen) {
        setCodeStudioOpen(false);
        return;
      }
      if (!dom.shortcutsModal.classList.contains('hidden')) {
        dom.shortcutsModal.classList.add('hidden');
        return;
      }
      selectSceneObject(null);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (state.codeStudioOpen) {
        saveJsFromEditor({ saveAs: e.shiftKey });
      }
      return;
    }

    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const shadeKeys = { '1': 'pbr', '2': 'litwire', '3': 'wire', '4': 'clay', '5': 'normals', '6': 'uv', '7': 'unlit' };
    if (shadeKeys[key]) {
      state.shadingMode = shadeKeys[key];
      applyShadingMode();
      return;
    }

    if (key === 'c') {
      setCodeStudioOpen(!state.codeStudioOpen);
    } else if (key === 'e' && e.shiftKey) {
      e.preventDefault();
      exportCurrentModelAsGlb();
    } else if (key === 'f') {
      frameAsset(false);
    } else if (key === 'r') {
      document.getElementById('inspectorResetCamBtn').click();
    } else if (key === 'h') {
      state.zenMode = !state.zenMode;
      applyPanelVisibility();
    } else if (key === 'g') {
      state.showGrid = !state.showGrid;
      floorGrid.visible = state.showGrid;
      dom.helperGridToggle.checked = state.showGrid;
    } else if (key === 'w') {
      state.shadingMode = state.shadingMode === 'litwire' ? 'pbr' : 'litwire';
      applyShadingMode();
    } else if (key === 't') {
      dom.quickTurntableBtn.click();
    } else if (key === 'o') {
      toggleCameraProjection();
    } else if (key === ' ' && state.clips.length > 0) {
      e.preventDefault();
      toggleAnimPlayPause();
    } else if (e.key === '?') {
      dom.shortcutsModal.classList.toggle('hidden');
    }
  });
}
