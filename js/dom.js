// =========================================================================
// 2. DOM ELEMENT REFERENCES & UI NOTIFICATION UTILITIES
// =========================================================================

export const dom = {
  viewport: document.getElementById('viewportContainer'),
  canvas: document.getElementById('webglCanvas'),
  gizmoCanvas: document.getElementById('axesGizmoCanvas'),
  fileInput: document.getElementById('fileInput'),
  jsFileInput: document.getElementById('jsFileInput'),
  folderInput: document.getElementById('folderInput'),
  openProjectBtn: document.getElementById('openProjectBtn'),
  codeStudioToggleBtn: document.getElementById('codeStudioToggleBtn'),
  codeStudioDrawer: document.getElementById('codeStudioDrawer'),
  jsSourceBadge: document.getElementById('jsSourceBadge'),
  jsDirtyDot: document.getElementById('jsDirtyDot'),
  saveJsCodeBtn: document.getElementById('saveJsCodeBtn'),
  saveAsJsCodeBtn: document.getElementById('saveAsJsCodeBtn'),
  jsAssetNameInput: document.getElementById('jsAssetNameInput'),
  jsTemplateSelect: document.getElementById('jsTemplateSelect'),
  jsLineNumbers: document.getElementById('jsLineNumbers'),
  jsCodeInput: document.getElementById('jsCodeInput'),
  jsErrorBanner: document.getElementById('jsErrorBanner'),
  jsErrorText: document.getElementById('jsErrorText'),
  jsEditorStatus: document.getElementById('jsEditorStatus'),
  jsWrapToggleBtn: document.getElementById('jsWrapToggleBtn'),
  topHeader: document.getElementById('topHeader'),
  leftSidebar: document.getElementById('leftSidebar'),
  rightSidebar: document.getElementById('rightSidebar'),
  exitZenChip: document.getElementById('exitZenChip'),
  headerProjectTag: document.getElementById('headerProjectTag'),

  assetList: document.getElementById('assetListContainer'),
  assetCountBadge: document.getElementById('assetCountBadge'),
  nodeCountBadge: document.getElementById('nodeCountBadge'),
  assetSearchInput: document.getElementById('assetSearchInput'),
  hierarchyTree: document.getElementById('hierarchyTreeContainer'),
  hierarchyAssetTitle: document.getElementById('hierarchyAssetTitle'),

  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingLabel: document.getElementById('loadingLabel'),
  dropOverlay: document.getElementById('dropOverlay'),
  toastStack: document.getElementById('toastStack'),
  shortcutsModal: document.getElementById('shortcutsModal'),
  snapshotPopover: document.getElementById('snapshotPopover'),
  exportMenuBtn: document.getElementById('exportMenuBtn'),
  exportPopover: document.getElementById('exportPopover'),
  exportGlbBtn: document.getElementById('exportGlbBtn'),
  exportJsGeoBtn: document.getElementById('exportJsGeoBtn'),
  exportJsBase64Btn: document.getElementById('exportJsBase64Btn'),

  // Left sidebar tab panels
  leftTabAssets: document.getElementById('leftTabAssets'),
  leftTabProject: document.getElementById('leftTabProject'),
  leftTabHierarchy: document.getElementById('leftTabHierarchy'),

  // Project Explorer
  projectRootLabel: document.getElementById('projectRootLabel'),
  refreshProjectBtn: document.getElementById('refreshProjectBtn'),
  projectOpenDirBtn: document.getElementById('projectOpenDirBtn'),
  reconnectProjectBtn: document.getElementById('reconnectProjectBtn'),
  reconnectProjectName: document.getElementById('reconnectProjectName'),
  projectSearchInput: document.getElementById('projectSearchInput'),
  projectTreeContainer: document.getElementById('projectTreeContainer'),

  diagnosticsHud: document.getElementById('diagnosticsHud'),
  hudDetailsBody: document.getElementById('hudDetailsBody'),
  hudContextLabel: document.getElementById('hudContextLabel'),
  hudWebglDot: document.getElementById('hudWebglDot'),
  hudFps: document.getElementById('hudFps'),
  hudGpuName: document.getElementById('hudGpuName'),
  hudDrawCalls: document.getElementById('hudDrawCalls'),
  hudTris: document.getElementById('hudTris'),
  hudVerts: document.getElementById('hudVerts'),
  hudTexGeo: document.getElementById('hudTexGeo'),
  hudDims: document.getElementById('hudDims'),

  animBar: document.getElementById('animationBar'),
  animPlayPauseBtn: document.getElementById('animPlayPauseBtn'),
  animPlayIcon: document.getElementById('animPlayIcon'),
  animPauseIcon: document.getElementById('animPauseIcon'),
  animClipSelect: document.getElementById('animClipSelect'),
  animTimelineSlider: document.getElementById('animTimelineSlider'),
  animTimecode: document.getElementById('animTimecode'),
  animLoopBtn: document.getElementById('animLoopBtn'),
  animSpeedSlider: document.getElementById('animSpeedSlider'),
  animSpeedVal: document.getElementById('animSpeedVal'),

  quickBackfaceBtn: document.getElementById('quickBackfaceBtn'),
  quickBackfaceLabel: document.getElementById('quickBackfaceLabel'),
  quickCameraModeBtn: document.getElementById('quickCameraModeBtn'),
  quickTurntableBtn: document.getElementById('quickTurntableBtn'),

  retroNearestToggle: document.getElementById('retroNearestToggle'),
  pixelScaleReadout: document.getElementById('pixelScaleReadout'),
  labFogToggle: document.getElementById('labFogToggle'),
  emissiveBoostSlider: document.getElementById('emissiveBoostSlider'),
  emissiveBoostVal: document.getElementById('emissiveBoostVal'),
  helperGridToggle: document.getElementById('helperGridToggle'),
  helperShadowPlaneToggle: document.getElementById('helperShadowPlaneToggle'),
  helperBBoxToggle: document.getElementById('helperBBoxToggle'),
  helperAxesToggle: document.getElementById('helperAxesToggle'),
  helperSkeletonToggle: document.getElementById('helperSkeletonToggle'),
  skeletonStatusBadge: document.getElementById('skeletonStatusBadge'),
  helperNormalsToggle: document.getElementById('helperNormalsToggle'),
  helperHudToggle: document.getElementById('helperHudToggle'),
  autoGroundToggle: document.getElementById('autoGroundToggle'),
  fovSlider: document.getElementById('fovSlider'),
  fovVal: document.getElementById('fovVal'),
  turntableToggle: document.getElementById('turntableToggle'),
  turntableSpeedSlider: document.getElementById('turntableSpeedSlider'),
  turntableSpeedVal: document.getElementById('turntableSpeedVal'),

  envSourceBadge: document.getElementById('envSourceBadge'),
  envIntensitySlider: document.getElementById('envIntensitySlider'),
  envIntensityVal: document.getElementById('envIntensityVal'),
  envRotationSlider: document.getElementById('envRotationSlider'),
  envRotationVal: document.getElementById('envRotationVal'),
  resetEnvBtn: document.getElementById('resetEnvBtn'),
  rigAzimuthSlider: document.getElementById('rigAzimuthSlider'),
  rigAzimuthVal: document.getElementById('rigAzimuthVal'),
  keyIntSlider: document.getElementById('keyIntSlider'),
  keyIntVal: document.getElementById('keyIntVal'),
  keyColorPicker: document.getElementById('keyColorPicker'),
  fillIntSlider: document.getElementById('fillIntSlider'),
  fillIntVal: document.getElementById('fillIntVal'),
  fillColorPicker: document.getElementById('fillColorPicker'),
  rimIntSlider: document.getElementById('rimIntSlider'),
  rimIntVal: document.getElementById('rimIntVal'),
  rimColorPicker: document.getElementById('rimColorPicker'),
  toneMappingSelect: document.getElementById('toneMappingSelect'),
  exposureSlider: document.getElementById('exposureSlider'),
  exposureVal: document.getElementById('exposureVal'),
  customBgPicker: document.getElementById('customBgPicker'),

  matSelectionBadge: document.getElementById('matSelectionBadge'),
  materialSelect: document.getElementById('materialSelect'),
  materialControlsPanel: document.getElementById('materialControlsPanel'),
  matTypeBadge: document.getElementById('matTypeBadge'),
  matColorRow: document.getElementById('matColorRow'),
  matColorPicker: document.getElementById('matColorPicker'),
  matColorHex: document.getElementById('matColorHex'),
  matMetalRow: document.getElementById('matMetalRow'),
  matMetalSlider: document.getElementById('matMetalSlider'),
  matMetalVal: document.getElementById('matMetalVal'),
  matRoughRow: document.getElementById('matRoughRow'),
  matRoughSlider: document.getElementById('matRoughSlider'),
  matRoughVal: document.getElementById('matRoughVal'),
  matEmissiveRow: document.getElementById('matEmissiveRow'),
  matEmissivePicker: document.getElementById('matEmissivePicker'),
  matEmissiveSlider: document.getElementById('matEmissiveSlider'),
  matEmissiveVal: document.getElementById('matEmissiveVal'),
  matOpacitySlider: document.getElementById('matOpacitySlider'),
  matOpacityVal: document.getElementById('matOpacityVal'),
  matFlatToggle: document.getElementById('matFlatToggle'),
  matSideSelect: document.getElementById('matSideSelect'),
  textureChannelsList: document.getElementById('textureChannelsList'),

  hudVram: document.getElementById('hudVram'),
  watchProjectFileBtn: document.getElementById('watchProjectFileBtn'),
  watchDot: document.getElementById('watchDot'),
  hierarchySearchInput: document.getElementById('hierarchySearchInput'),
  helperScaleRefToggle: document.getElementById('helperScaleRefToggle'),
  envBackdropToggle: document.getElementById('envBackdropToggle'),
  envBlurSlider: document.getElementById('envBlurSlider'),
  envBlurVal: document.getElementById('envBlurVal'),
  customStudioCard: document.getElementById('customStudioCard'),
  customProfileSelect: document.getElementById('customProfileSelect'),
  customProfileNameInput: document.getElementById('customProfileNameInput'),
  importProfilesInput: document.getElementById('importProfilesInput'),
  optBudgetBadge: document.getElementById('optBudgetBadge'),
  optCallsVal: document.getElementById('optCallsVal'),
  optTrisVal: document.getElementById('optTrisVal'),
  optMeshCountVal: document.getElementById('optMeshCountVal'),
  optMatCountVal: document.getElementById('optMatCountVal'),
  optCurrentHeightVal: document.getElementById('optCurrentHeightVal'),
  optTargetHeightInput: document.getElementById('optTargetHeightInput'),
};

// =========================================================================
// 3. TOAST NOTIFICATION SYSTEM
// =========================================================================
export function showToast(message, type = 'info', duration = 3000) {
  const colors = {
    info: 'border-sky-500/40 text-slate-100',
    success: 'border-emerald-500/45 text-emerald-200',
    warn: 'border-amber-500/45 text-amber-200',
    error: 'border-rose-500/50 text-rose-200',
  };
  const dotColors = {
    info: 'bg-sky-400',
    success: 'bg-emerald-400',
    warn: 'bg-amber-400',
    error: 'bg-rose-400',
  };
  const toast = document.createElement('div');
  toast.className = `toast-enter glass-panel px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border ${colors[type] || colors.info}`;
  toast.innerHTML = `<span class="w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[type] || dotColors.info}"></span><span>${escapeHtml(message)}</span>`;
  dom.toastStack.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    setTimeout(() => toast.remove(), 260);
  }, duration);
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function setLoading(active, label = 'Loading 3D Asset...') {
  dom.loadingLabel.textContent = label;
  dom.loadingOverlay.classList.toggle('hidden', !active);
}
