// =========================================================================
// PRE-FLIGHT GAME OPTIMIZER: MERGE BY MATERIAL, TRANSFORM BAKER & AUDIT
// =========================================================================

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dom, showToast } from './dom.js';
import { state } from './state.js';
import {
  currentModel,
  currentAssetSize,
  currentAssetTriCount,
  setCurrentAssetTriCount,
  setCurrentAssetVertCount,
  requestRender,
} from './scene.js';
import { applyShadingMode } from './materials.js';

export function computeEstimatedTextureVramBytes(rootModel) {
  if (!rootModel) return 0;
  const seen = new Set();
  let totalBytes = 0;
  const keys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap'];

  rootModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
    const orig = obj.userData.aseetOriginalMaterial || obj.material;
    const mats = Array.isArray(orig) ? orig : [orig];
    mats.forEach((m) => {
      if (!m) return;
      keys.forEach((k) => {
        const tex = m[k];
        if (!tex || !tex.isTexture || seen.has(tex)) return;
        seen.add(tex);
        const img = tex.image;
        const w = img?.width || img?.videoWidth || 0;
        const h = img?.height || img?.videoHeight || 0;
        if (w > 0 && h > 0) {
          // 4 bytes RGBA * ~1.333 for mipmap chain
          totalBytes += w * h * 4 * 1.333;
        }
      });
    });
  });

  return totalBytes;
}

export function refreshOptimizerAudit(drawCalls = 0) {
  if (!dom.optCallsVal) return;

  let staticMeshes = 0;
  const uniqueMats = new Set();

  if (currentModel) {
    currentModel.traverse((obj) => {
      if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
      if (!obj.isSkinnedMesh) staticMeshes++;
      const orig = obj.userData.aseetOriginalMaterial || obj.material;
      const mats = Array.isArray(orig) ? orig : [orig];
      mats.forEach((m) => m && uniqueMats.add(m));
    });
  }

  dom.optCallsVal.textContent = String(drawCalls);
  dom.optTrisVal.textContent = currentAssetTriCount.toLocaleString();
  dom.optMeshCountVal.textContent = String(staticMeshes);
  dom.optMatCountVal.textContent = String(uniqueMats.size);
  if (dom.optCurrentHeightVal) {
    dom.optCurrentHeightVal.textContent = `${currentAssetSize.y.toFixed(2)}m`;
  }

  // Budget status badge
  if (drawCalls > 60 || currentAssetTriCount > 65000) {
    dom.optBudgetBadge.textContent = 'HEAVY';
    dom.optBudgetBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/35';
  } else if (drawCalls > 25 || currentAssetTriCount > 25000) {
    dom.optBudgetBadge.textContent = 'MODERATE';
    dom.optBudgetBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/35';
  } else {
    dom.optBudgetBadge.textContent = 'GAME READY';
    dom.optBudgetBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  }
}

function normalizeGeometryForMerge(sourceGeo, bakedMatrix, includeUv, includeColor) {
  const geo = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
  geo.applyMatrix4(bakedMatrix);

  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }

  const posCount = geo.attributes.position.count;
  const keepAttrs = new Set(['position', 'normal']);

  if (includeUv) {
    keepAttrs.add('uv');
    if (!geo.attributes.uv) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posCount * 2), 2));
    }
  }
  if (includeColor) {
    keepAttrs.add('color');
    if (!geo.attributes.color) {
      const ones = new Float32Array(posCount * 3).fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(ones, 3));
    }
  }

  Object.keys(geo.attributes).forEach((attrName) => {
    if (!keepAttrs.has(attrName)) {
      geo.deleteAttribute(attrName);
    }
  });

  return geo;
}

export function mergeStaticMeshesByMaterial({ onAfterModify } = {}) {
  if (!currentModel) {
    showToast('No model loaded to optimize.', 'warn');
    return;
  }

  // Strip debug overlays first & restore original materials
  const overlays = [];
  currentModel.traverse((o) => { if (o.userData?.isAseetOverlay) overlays.push(o); });
  overlays.forEach((o) => o.parent?.remove(o));

  currentModel.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(currentModel.matrixWorld).invert();

  const buckets = new Map(); // material -> Array<{ mesh, relMatrix }>
  const skippedSkinned = [];

  currentModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay || !obj.geometry) return;
    if (obj.isSkinnedMesh) {
      skippedSkinned.push(obj);
      return;
    }
    const origMat = obj.userData.aseetOriginalMaterial || obj.material;
    // Skip multi-material meshes to avoid corrupting material groups
    if (Array.isArray(origMat)) return;

    const relMatrix = new THREE.Matrix4().multiplyMatrices(invRoot, obj.matrixWorld);
    if (!buckets.has(origMat)) buckets.set(origMat, []);
    buckets.get(origMat).push({ mesh: obj, relMatrix });
  });

  let mergedMeshCount = 0;
  let bucketsMerged = 0;

  for (const [mat, items] of buckets.entries()) {
    if (items.length < 2) continue;

    const anyHasUv = items.some(({ mesh }) => Boolean(mesh.geometry.attributes.uv));
    const anyHasColor = items.some(({ mesh }) => Boolean(mesh.geometry.attributes.color));

    const prepared = items.map(({ mesh, relMatrix }) =>
      normalizeGeometryForMerge(mesh.geometry, relMatrix, anyHasUv, anyHasColor)
    );

    const mergedGeo = mergeGeometries(prepared, false);
    prepared.forEach((g) => g.dispose());

    if (!mergedGeo) continue;

    const mergedMesh = new THREE.Mesh(mergedGeo, mat);
    mergedMesh.name = `Merged_${mat.name || `Mat_${bucketsMerged + 1}`}`;
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;
    mergedMesh.userData.aseetOriginalMaterial = mat;

    // Remove source meshes and dispose their geometries
    items.forEach(({ mesh }) => {
      mesh.parent?.remove(mesh);
      mesh.geometry.dispose();
    });

    currentModel.add(mergedMesh);
    mergedMeshCount += items.length;
    bucketsMerged++;
  }

  // Prune empty non-root groups left behind
  const pruneEmpty = (node) => {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      pruneEmpty(child);
      if (child.isGroup && child.children.length === 0) {
        node.remove(child);
      }
    }
  };
  pruneEmpty(currentModel);

  // Recount tris & verts
  let tris = 0;
  let verts = 0;
  currentModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay || !obj.geometry) return;
    const pos = obj.geometry.attributes.position;
    if (pos) verts += pos.count;
    if (obj.geometry.index) tris += obj.geometry.index.count / 3;
    else if (pos) tris += pos.count / 3;
  });
  setCurrentAssetTriCount(Math.round(tris));
  setCurrentAssetVertCount(verts);

  applyShadingMode();
  if (onAfterModify) onAfterModify();
  requestRender();

  if (bucketsMerged === 0) {
    showToast(
      skippedSkinned.length > 0
        ? 'No mergeable static meshes (rigged SkinnedMeshes preserved).'
        : 'Model already has minimal meshes per material.',
      'info',
      2800
    );
  } else {
    showToast(
      `Merged ${mergedMeshCount} meshes into ${bucketsMerged} draw call(s)${skippedSkinned.length ? ' (rigged meshes kept)' : ''}`,
      'success',
      3200
    );
  }
}

export function rotateCurrentModelY(deg, { onAfterModify } = {}) {
  if (!currentModel) return;
  currentModel.rotation.y += THREE.MathUtils.degToRad(deg);
  currentModel.updateMatrixWorld(true);
  if (onAfterModify) onAfterModify();
  requestRender();
  showToast(`Rotated model ${deg > 0 ? `+${deg}` : deg}° on Y`, 'info', 1600);
}

export function scaleCurrentModelToHeight(targetHeight, { onAfterModify } = {}) {
  if (!currentModel) return;
  const h = parseFloat(targetHeight);
  if (!Number.isFinite(h) || h <= 0) {
    showToast('Enter a valid positive height in meters.', 'warn');
    return;
  }
  const curH = Math.max(currentAssetSize.y, 0.0001);
  const factor = h / curH;
  currentModel.scale.multiplyScalar(factor);
  currentModel.updateMatrixWorld(true);
  if (onAfterModify) onAfterModify();
  requestRender();
  showToast(`Scaled model height to ${h.toFixed(2)}m`, 'success', 2000);
}

export function bakeCurrentModelOriginBottomCenter({ onAfterModify } = {}) {
  if (!currentModel) return;
  currentModel.position.set(0, 0, 0);
  currentModel.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(currentModel);
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const offset = new THREE.Vector3(-center.x, -box.min.y, -center.z);

  // Bake offset directly into child objects so root position stays (0,0,0) on GLB export
  let shifted = false;
  currentModel.children.forEach((child) => {
    if (!child.userData?.isAseetOverlay) {
      child.position.add(offset);
      shifted = true;
    }
  });
  if (!shifted && currentModel.geometry) {
    currentModel.geometry.translate(offset.x, offset.y, offset.z);
  }
  currentModel.position.set(0, 0, 0);
  currentModel.updateMatrixWorld(true);
  if (onAfterModify) onAfterModify();
  requestRender();
  showToast('Centered & grounded pivot to Bottom-Center (Y=0)', 'success', 2000);
}
