// =========================================================================
// 13. RAYCAST MESH SELECTION, HIERARCHY TREE, MATERIAL & ANIMATION CONTROLLER
// =========================================================================

import * as THREE from 'three';
import { dom, escapeHtml } from './dom.js';
import { state } from './state.js';
import {
  currentModel,
  activeCamera,
  stageGroup,
  selectionBoxHelper,
  setSelectionBoxHelper,
  mixer,
  activeAction,
  setActiveAction,
  frameObject,
} from './scene.js';
import { loadAssetById, revokeAssetBlobUrls } from './loaders.js';
import { setCodeStudioOpen, syncCodeStudioToAsset } from './jsRunner.js';

export const raycaster = new THREE.Raycaster();
export const pointerDownPos = new THREE.Vector2();

export function setupRaycaster() {
  dom.canvas.addEventListener('pointerdown', (e) => {
    pointerDownPos.set(e.clientX, e.clientY);
  });

  dom.canvas.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || !currentModel) return;
    const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (moved > 5) return;

    const rect = dom.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, activeCamera);

    const hits = raycaster.intersectObject(currentModel, true).filter(
      (h) => h.object.isMesh && h.object.visible && !h.object.userData?.isAseetOverlay
    );

    if (hits.length > 0) {
      selectSceneObject(hits[0].object);
    } else {
      selectSceneObject(null);
    }
  });
}

export function selectSceneObject(obj) {
  state.selectedObject = obj;

  if (selectionBoxHelper) {
    stageGroup.remove(selectionBoxHelper);
    selectionBoxHelper.dispose?.();
    setSelectionBoxHelper(null);
  }

  if (obj) {
    const helper = new THREE.BoxHelper(obj, 0x38bdf8);
    setSelectionBoxHelper(helper);
    stageGroup.add(helper);
  }

  updateHierarchySelectionHighlight();
  refreshMaterialInspector();
}

export function renderAssetList() {
  dom.assetCountBadge.textContent = state.assets.length;

  document.querySelectorAll('.asset-filter-btn').forEach((btn) => {
    const active = btn.dataset.filter === state.assetFilter;
    btn.className = active
      ? 'asset-filter-btn flex-1 py-1 rounded-md text-[11px] font-semibold bg-obsidian-700 text-white transition'
      : 'asset-filter-btn flex-1 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 transition';
  });

  const query = state.assetSearch.trim().toLowerCase();
  const filtered = state.assets.filter((a) => {
    let matchFilter = true;
    if (state.assetFilter === '3d') matchFilter = a.sourceType === 'local';
    else if (state.assetFilter === 'js') matchFilter = a.sourceType === 'js';
    else if (state.assetFilter === 'demo') matchFilter = a.sourceType === 'demo';
    else matchFilter = true; // 'all'
    const matchQuery = !query || a.name.toLowerCase().includes(query) || a.format.toLowerCase().includes(query);
    return matchFilter && matchQuery;
  });

  dom.assetList.innerHTML = '';

  if (filtered.length === 0) {
    dom.assetList.innerHTML = '<div class="text-center py-8 text-xs text-slate-500">No matching assets.<br />Drop local 3D files anytime.</div>';
    return;
  }

  filtered.forEach((asset) => {
    const isActive = asset.id === state.activeAssetId;
    const tagBadge =
      asset.project === 'klasik3d'
        ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-mono">klasik3d</span>'
        : asset.project === 'brewingbad'
          ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-mono">Brewing Bad</span>'
          : '<span class="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[9px] font-mono">CALIB</span>';

    const card = document.createElement('div');
    card.className = `group rounded-xl p-2.5 border cursor-pointer transition ${isActive
        ? 'bg-obsidian-750 border-sky-400/55 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]'
        : 'bg-obsidian-850/70 border-obsidian-600/70 hover:border-obsidian-500 hover:bg-obsidian-750/70'
      }`;

    const formatStyle = asset.sourceType === 'js'
      ? 'bg-violet-500/20 border-violet-400/40 text-violet-200'
      : 'bg-obsidian-900 border-obsidian-600 text-slate-300';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs font-medium ${isActive ? 'text-white' : 'text-slate-200'} truncate" title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</div>
          <div class="text-[10px] text-slate-500 truncate mt-0.5">${escapeHtml(asset.subtitle)}</div>
        </div>
        <span class="px-1.5 py-0.5 rounded border text-[9px] font-mono shrink-0 ${formatStyle}">${escapeHtml(asset.format)}</span>
      </div>
      <div class="flex items-center justify-between mt-2">
        <div class="flex items-center gap-1.5">
          ${tagBadge}
          ${asset.sourceType === 'js' ? '<button class="view-code-btn text-[9px] font-mono text-violet-300 hover:text-violet-100 px-1 py-0.5 rounded bg-violet-500/15 transition" title="Read / Edit JS Code">&lt;/&gt; code</button>' : ''}
          ${asset.sourceType !== 'demo' ? '<button class="retag-btn opacity-0 group-hover:opacity-100 text-[9px] text-slate-400 hover:text-white transition" title="Switch project tag">⇄ tag</button>' : ''}
        </div>
        ${asset.sourceType !== 'demo' ? '<button class="remove-asset-btn opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-rose-400 transition" title="Remove from queue">✕</button>' : ''}
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.view-code-btn')) {
        e.stopPropagation();
        syncCodeStudioToAsset(asset);
        setCodeStudioOpen(true);
        return;
      }
      if (e.target.closest('.remove-asset-btn')) {
        e.stopPropagation();
        revokeAssetBlobUrls(asset);
        state.assets = state.assets.filter((a) => a.id !== asset.id);
        if (state.editingJsAssetId === asset.id) state.editingJsAssetId = null;
        renderAssetList();
        return;
      }
      if (e.target.closest('.retag-btn')) {
        e.stopPropagation();
        asset.project = asset.project === 'klasik3d' ? 'brewingbad' : 'klasik3d';
        renderAssetList();
        return;
      }
      loadAssetById(asset.id);
    });

    dom.assetList.appendChild(card);
  });
}

const collapsedHierarchyUuids = new Set();

export function expandAllHierarchyNodes() {
  collapsedHierarchyUuids.clear();
  rebuildHierarchyTree();
}

export function collapseAllHierarchyNodes() {
  collapsedHierarchyUuids.clear();
  if (currentModel) {
    currentModel.traverse((obj) => {
      if (!obj.userData?.isAseetOverlay && obj.children && obj.children.some((c) => !c.userData?.isAseetOverlay)) {
        collapsedHierarchyUuids.add(obj.uuid);
      }
    });
  }
  rebuildHierarchyTree();
}

export function rebuildHierarchyTree() {
  dom.hierarchyTree.innerHTML = '';
  if (!currentModel) {
    dom.nodeCountBadge.textContent = '0';
    return;
  }

  const query = (state.hierarchySearch || '').trim().toLowerCase();
  const matchedOrAncestorUuids = new Set();

  if (query) {
    const checkMatch = (obj) => {
      if (obj.userData?.isAseetOverlay) return false;
      const label = (obj.name || `${obj.type}`).toLowerCase();
      let hasMatchingChild = false;
      for (const child of obj.children) {
        if (checkMatch(child)) hasMatchingChild = true;
      }
      const isSelfMatch = label.includes(query);
      if (isSelfMatch || hasMatchingChild) {
        matchedOrAncestorUuids.add(obj.uuid);
        return true;
      }
      return false;
    };
    checkMatch(currentModel);
  }

  let count = 0;

  function buildNodeRow(obj, depth) {
    if (obj.userData?.isAseetOverlay) return;
    if (query && !matchedOrAncestorUuids.has(obj.uuid)) return;

    count++;

    const nonOverlayChildren = obj.children.filter((c) => !c.userData?.isAseetOverlay);
    const hasChildren = nonOverlayChildren.length > 0;
    const isCollapsed = !query && collapsedHierarchyUuids.has(obj.uuid);

    const row = document.createElement('div');
    row.dataset.uuid = obj.uuid;
    row.className = 'hierarchy-row flex items-center justify-between gap-1 py-1 px-1.5 rounded-lg hover:bg-obsidian-750 cursor-pointer transition group';
    row.style.paddingLeft = `${Math.min(depth * 12 + 6, 96)}px`;

    const collapseBtn = hasChildren
      ? `<button class="toggle-collapse-btn p-0.5 rounded hover:bg-obsidian-700 text-slate-400 hover:text-white transition shrink-0" title="${isCollapsed ? 'Expand' : 'Collapse'}">
          <svg class="w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>`
      : `<span class="w-4 shrink-0"></span>`;

    const iconColor = obj.isSkinnedMesh
      ? 'text-emerald-400'
      : obj.isMesh
        ? 'text-sky-400'
        : obj.isLight
          ? 'text-amber-400'
          : obj.isBone
            ? 'text-purple-400'
            : 'text-slate-500';

    const typeIcon = obj.isMesh
      ? `<svg class="w-3 h-3 shrink-0 ${iconColor}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>`
      : obj.isBone
        ? `<svg class="w-3 h-3 shrink-0 ${iconColor}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" /></svg>`
        : `<svg class="w-3 h-3 shrink-0 ${iconColor}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>`;

    const label = obj.name || `${obj.type}_${count}`;

    row.innerHTML = `
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        ${collapseBtn}
        ${typeIcon}
        <span class="truncate text-[11px] ${obj.visible ? 'text-slate-200' : 'text-slate-500 line-through'}">${escapeHtml(label)}</span>
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <button class="solo-node-btn opacity-0 group-hover:opacity-100 px-1 py-0.5 rounded text-[9px] font-mono ${state.isolatedObject === obj ? 'opacity-100 bg-amber-500/25 text-amber-300' : 'text-slate-400 hover:text-amber-300 hover:bg-obsidian-700'}" title="Solo / Isolate">S</button>
        <button class="vis-node-btn p-1 rounded text-slate-400 hover:text-white" title="Toggle Visibility">
          ${obj.visible
        ? '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>'
        : '<svg class="w-3 h-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M1 1l22 22" /></svg>'
      }
        </button>
      </div>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.closest('.toggle-collapse-btn')) {
        e.stopPropagation();
        if (collapsedHierarchyUuids.has(obj.uuid)) {
          collapsedHierarchyUuids.delete(obj.uuid);
        } else {
          collapsedHierarchyUuids.add(obj.uuid);
        }
        rebuildHierarchyTree();
        return;
      }
      if (e.target.closest('.vis-node-btn')) {
        e.stopPropagation();
        obj.visible = !obj.visible;
        rebuildHierarchyTree();
        return;
      }
      if (e.target.closest('.solo-node-btn')) {
        e.stopPropagation();
        toggleSoloObject(obj);
        return;
      }
      selectSceneObject(obj);
    });

    row.addEventListener('dblclick', () => {
      frameObject(obj, false);
    });

    dom.hierarchyTree.appendChild(row);

    if (!isCollapsed) {
      nonOverlayChildren.forEach((child) => buildNodeRow(child, depth + 1));
    }
  }

  buildNodeRow(currentModel, 0);
  dom.nodeCountBadge.textContent = count;
  updateHierarchySelectionHighlight();
}

export function updateHierarchySelectionHighlight() {
  dom.hierarchyTree.querySelectorAll('.hierarchy-row').forEach((row) => {
    const selected = state.selectedObject && row.dataset.uuid === state.selectedObject.uuid;
    row.classList.toggle('bg-sky-500/20', Boolean(selected));
    row.classList.toggle('border', Boolean(selected));
    row.classList.toggle('border-sky-400/40', Boolean(selected));
  });
}

export function toggleSoloObject(targetObj) {
  if (!currentModel) return;
  if (state.isolatedObject === targetObj) {
    state.isolatedObject = null;
    currentModel.traverse((o) => {
      if (!o.userData?.isAseetOverlay) o.visible = true;
    });
  } else {
    state.isolatedObject = targetObj;
    const keep = new Set();
    let cur = targetObj;
    while (cur) {
      keep.add(cur);
      cur = cur.parent;
    }
    targetObj.traverse((d) => keep.add(d));

    currentModel.traverse((o) => {
      if (o.userData?.isAseetOverlay) return;
      if (o.isMesh || o.isGroup || o.isObject3D) {
        o.visible = keep.has(o);
      }
    });
  }
  rebuildHierarchyTree();
}

export function refreshMaterialInspector() {
  const matSet = new Set();
  const root = state.selectedObject || currentModel;

  if (root) {
    root.traverse((obj) => {
      if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
      const orig = obj.userData.aseetOriginalMaterial;
      if (Array.isArray(orig)) orig.forEach((m) => m && matSet.add(m));
      else if (orig) matSet.add(orig);
    });
  }

  state.inspectedMaterials = Array.from(matSet);
  state.activeMaterialIndex = 0;

  dom.matSelectionBadge.textContent = state.selectedObject
    ? (state.selectedObject.name || state.selectedObject.type)
    : 'All Model Materials';

  dom.materialSelect.innerHTML = '';
  if (state.inspectedMaterials.length === 0) {
    dom.materialSelect.innerHTML = '<option>No editable materials</option>';
    dom.materialControlsPanel.classList.add('opacity-40', 'pointer-events-none');
    dom.textureChannelsList.innerHTML = '<div class="text-slate-500 text-[11px]">No textures attached.</div>';
    return;
  }

  dom.materialControlsPanel.classList.remove('opacity-40', 'pointer-events-none');
  state.inspectedMaterials.forEach((mat, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = mat.name || `${mat.type} #${i + 1}`;
    dom.materialSelect.appendChild(opt);
  });

  bindMaterialControls(state.inspectedMaterials[0]);
}

export function bindMaterialControls(mat) {
  if (!mat) return;
  dom.matTypeBadge.textContent = mat.type;

  const hasColor = Boolean(mat.color);
  dom.matColorRow.classList.toggle('hidden', !hasColor);
  if (hasColor) {
    const hex = `#${mat.color.getHexString()}`;
    dom.matColorPicker.value = hex;
    dom.matColorHex.textContent = hex;
  }

  const hasMetal = 'metalness' in mat;
  dom.matMetalRow.classList.toggle('hidden', !hasMetal);
  if (hasMetal) {
    dom.matMetalSlider.value = mat.metalness;
    dom.matMetalVal.textContent = mat.metalness.toFixed(2);
  }

  const hasRough = 'roughness' in mat;
  dom.matRoughRow.classList.toggle('hidden', !hasRough);
  if (hasRough) {
    dom.matRoughSlider.value = mat.roughness;
    dom.matRoughVal.textContent = mat.roughness.toFixed(2);
  }

  const hasEmissive = Boolean(mat.emissive);
  dom.matEmissiveRow.classList.toggle('hidden', !hasEmissive);
  if (hasEmissive) {
    dom.matEmissivePicker.value = `#${mat.emissive.getHexString()}`;
    dom.matEmissiveSlider.value = mat.emissiveIntensity ?? 1.0;
    dom.matEmissiveVal.textContent = (mat.emissiveIntensity ?? 1.0).toFixed(2);
  }

  dom.matOpacitySlider.value = mat.opacity ?? 1.0;
  dom.matOpacityVal.textContent = (mat.opacity ?? 1.0).toFixed(2);
  dom.matFlatToggle.checked = Boolean(mat.flatShading);
  dom.matSideSelect.value = String(mat.side ?? THREE.FrontSide);

  const channels = [
    { key: 'map', label: 'BaseColor / Albedo' },
    { key: 'normalMap', label: 'Normal Map' },
    { key: 'roughnessMap', label: 'Roughness Map' },
    { key: 'metalnessMap', label: 'Metalness Map' },
    { key: 'aoMap', label: 'Ambient Occlusion' },
    { key: 'emissiveMap', label: 'Emissive Map' },
    { key: 'alphaMap', label: 'Alpha Map' },
  ];

  const found = channels.filter((ch) => mat[ch.key] && mat[ch.key].isTexture);
  if (found.length === 0) {
    dom.textureChannelsList.innerHTML = '<div class="text-slate-500 text-[11px]">No texture maps bound to this material.</div>';
  } else {
    dom.textureChannelsList.innerHTML = found
      .map((ch) => {
        const img = mat[ch.key].image;
        const res = img && img.width ? `${img.width}×${img.height}` : 'GPU Tex';
        return `
          <div class="flex items-center justify-between py-1 px-2 rounded-lg bg-obsidian-900 border border-obsidian-600/70">
            <span class="text-slate-300 text-[11px]">${ch.label}</span>
            <span class="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono text-[10px]">${res}</span>
          </div>
        `;
      })
      .join('');
  }
}

export function getActiveMaterial() {
  return state.inspectedMaterials[state.activeMaterialIndex] || null;
}

// =========================================================================
// 14. ANIMATION CONTROLLER
// =========================================================================
export function playClip(index) {
  if (!mixer || !state.clips[index]) return;
  state.activeClipIndex = index;
  if (activeAction) activeAction.stop();

  const clip = state.clips[index];
  const newAction = mixer.clipAction(clip);
  setActiveAction(newAction);
  newAction.setLoop(state.animLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  newAction.clampWhenFinished = !state.animLoop;
  newAction.timeScale = state.animPlaying ? state.animSpeed : 0;
  newAction.play();

  updateAnimationUI();
}

export function updateAnimationUI() {
  const hasClips = state.clips.length > 0;
  dom.animBar.classList.toggle('hidden', !hasClips);
  if (!hasClips) return;

  dom.animClipSelect.innerHTML = '';
  state.clips.forEach((clip, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = clip.name || `Clip ${idx + 1}`;
    opt.selected = idx === state.activeClipIndex;
    dom.animClipSelect.appendChild(opt);
  });

  dom.animPlayIcon.classList.toggle('hidden', state.animPlaying);
  dom.animPauseIcon.classList.toggle('hidden', !state.animPlaying);

  dom.animLoopBtn.className = state.animLoop
    ? 'p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 transition'
    : 'p-1.5 rounded-lg bg-obsidian-900 text-slate-500 border border-obsidian-600 transition';
}

export function toggleAnimPlayPause() {
  if (!activeAction) return;
  state.animPlaying = !state.animPlaying;
  activeAction.timeScale = state.animPlaying ? state.animSpeed : 0;
  updateAnimationUI();
}
