// =========================================================================
// 7. MEMORY DISPOSAL & ASSET LOADING ENGINE
// =========================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { dom, showToast, setLoading } from './dom.js';
import { state, MODEL_EXTS, JS_EXTS } from './state.js';
import {
  renderer,
  scene,
  stageGroup,
  assetRoot,
  pmremGenerator,
  currentModel,
  setCurrentModel,
  currentAssetBounds,
  currentAssetSize,
  currentAssetCenter,
  currentAssetTriCount,
  setCurrentAssetTriCount,
  currentAssetVertCount,
  setCurrentAssetVertCount,
  setCurrentCustomShaderUniforms,
  setCurrentCustomUpdateFn,
  keyLight,
  bboxHelper,
  setBboxHelper,
  selectionBoxHelper,
  setSelectionBoxHelper,
  skeletonHelper,
  setSkeletonHelper,
  humanScaleRef,
  mixer,
  setMixer,
  setActiveAction,
  customEnvRT,
  setCustomEnvRT,
  frameAsset,
  requestRender,
} from './scene.js';
import { evaluateProceduralJs, setCodeStudioOpen, setJsError, syncCodeStudioToAsset } from './jsRunner.js';
import {
  sharedMatSet,
  clearVertexNormals,
  rebuildVertexNormalsIfEnabled,
  applyShadingMode,
  applyBackfaceMode,
  applyRetroTextureFilter,
  applyEmissiveBoost,
  applyEnvBackdrop,
} from './materials.js';
import {
  renderAssetList,
  rebuildHierarchyTree,
  refreshMaterialInspector,
  updateAnimationUI,
  playClip,
} from './inspector.js';
import {
  projectRootHandle,
  buildProjectFileMapFor,
  saveWithPicker,
  refreshProjectTree,
  setWatchedProjectFile,
} from './projectFs.js';
import { setJsDirty } from './jsExporter.js';

export function revokeAssetBlobUrls(asset) {
  if (!asset) return;
  if (asset.url && typeof asset.url === 'string' && asset.url.startsWith('blob:')) {
    URL.revokeObjectURL(asset.url);
  }
  if (asset.mtlUrl && typeof asset.mtlUrl === 'string' && asset.mtlUrl.startsWith('blob:')) {
    URL.revokeObjectURL(asset.mtlUrl);
  }
  if (asset.fileMap && asset.fileMap instanceof Map) {
    const revoked = new Set();
    for (const u of asset.fileMap.values()) {
      if (typeof u === 'string' && u.startsWith('blob:') && !revoked.has(u)) {
        revoked.add(u);
        URL.revokeObjectURL(u);
      }
    }
  }
}

export function clearOverlayChildren(root) {
  if (!root) return;
  const toRemove = [];
  root.traverse((obj) => {
    if (obj.userData && obj.userData.isAseetOverlay) {
      toRemove.push(obj);
    }
  });
  toRemove.forEach((child) => {
    if (child.parent) child.parent.remove(child);
  });
}

export function disposeCurrentAsset() {
  setCurrentCustomUpdateFn(null);
  if (mixer) {
    mixer.stopAllAction();
    mixer.uncacheRoot(assetRoot);
    setMixer(null);
  }
  setActiveAction(null);
  state.clips = [];
  state.activeClipIndex = 0;
  updateAnimationUI();

  if (bboxHelper) {
    stageGroup.remove(bboxHelper);
    bboxHelper.dispose?.();
    setBboxHelper(null);
  }
  if (selectionBoxHelper) {
    stageGroup.remove(selectionBoxHelper);
    selectionBoxHelper.dispose?.();
    setSelectionBoxHelper(null);
  }
  if (skeletonHelper) {
    stageGroup.remove(skeletonHelper);
    skeletonHelper.dispose?.();
    setSkeletonHelper(null);
  }
  clearVertexNormals();

  if (currentModel) {
    clearOverlayChildren(currentModel);
    const disposedGeos = new Set();
    const disposedMats = new Set();
    const disposedTexs = new Set();

    const disposeMaterial = (mat) => {
      if (!mat || sharedMatSet.has(mat) || disposedMats.has(mat)) return;
      disposedMats.add(mat);
      if (mat.userData?.aseetUnlitCached) {
        disposeMaterial(mat.userData.aseetUnlitCached);
        delete mat.userData.aseetUnlitCached;
      }
      const texKeys = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
        'emissiveMap', 'alphaMap', 'bumpMap', 'displacementMap', 'specularMap',
      ];
      texKeys.forEach((k) => {
        if (mat[k] && !disposedTexs.has(mat[k])) {
          disposedTexs.add(mat[k]);
          mat[k].dispose();
        }
      });
      mat.dispose();
    };

    currentModel.traverse((obj) => {
      if (obj.geometry && !disposedGeos.has(obj.geometry)) {
        disposedGeos.add(obj.geometry);
        obj.geometry.dispose();
      }
      const orig = obj.userData?.aseetOriginalMaterial;
      if (Array.isArray(orig)) orig.forEach(disposeMaterial);
      else if (orig) disposeMaterial(orig);

      const unlit = obj.userData?.aseetUnlitMaterial;
      if (Array.isArray(unlit)) unlit.forEach(disposeMaterial);
      else if (unlit) disposeMaterial(unlit);

      if (Array.isArray(obj.material)) obj.material.forEach(disposeMaterial);
      else if (obj.material) disposeMaterial(obj.material);
    });

    assetRoot.remove(currentModel);
    setCurrentModel(null);
  }

  setCurrentCustomShaderUniforms([]);
  state.selectedObject = null;
  state.isolatedObject = null;
  state.inspectedMaterials = [];
}

export function alignAndMeasureAsset() {
  if (!currentModel) return;
  currentModel.position.set(0, 0, 0);
  currentModel.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(currentModel);
  if (box.isEmpty()) {
    currentAssetBounds.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
  } else {
    const center = box.getCenter(new THREE.Vector3());
    if (state.autoGround) {
      currentModel.position.x -= center.x;
      currentModel.position.z -= center.z;
      currentModel.position.y -= box.min.y;
      currentModel.updateMatrixWorld(true);
    }
    currentAssetBounds.setFromObject(currentModel);
  }

  currentAssetBounds.getSize(currentAssetSize);
  currentAssetBounds.getCenter(currentAssetCenter);

  if (humanScaleRef) {
    humanScaleRef.position.x = -(currentAssetSize.x * 0.5 + 0.65);
  }

  const maxDim = Math.max(currentAssetSize.x, currentAssetSize.y, currentAssetSize.z, 1);
  const shadowSpan = Math.max(maxDim * 1.8, 3.5);
  keyLight.shadow.camera.left = -shadowSpan;
  keyLight.shadow.camera.right = shadowSpan;
  keyLight.shadow.camera.top = shadowSpan;
  keyLight.shadow.camera.bottom = -shadowSpan;
  keyLight.shadow.camera.far = Math.max(shadowSpan * 8, 40);
  keyLight.shadow.camera.updateProjectionMatrix();

  if (bboxHelper) {
    stageGroup.remove(bboxHelper);
    bboxHelper.dispose?.();
  }
  const newBbox = new THREE.Box3Helper(currentAssetBounds, 0x38bdf8);
  newBbox.visible = state.showBBox;
  setBboxHelper(newBbox);
  stageGroup.add(newBbox);

  dom.hudDims.textContent = `${currentAssetSize.x.toFixed(2)} × ${currentAssetSize.y.toFixed(2)} × ${currentAssetSize.z.toFixed(2)}`;
  requestRender(800);
}

export function prepareLoadedModel(
  model,
  animations = [],
  shaderUniforms = [],
  customUpdateFn = null,
  { preserveCamera = false } = {}
) {
  setCurrentModel(model);
  setCurrentCustomShaderUniforms(shaderUniforms);
  setCurrentCustomUpdateFn(customUpdateFn);

  let triCount = 0;
  let vertCount = 0;
  let hasSkeleton = false;

  model.traverse((obj) => {
    if (obj.isSkinnedMesh) hasSkeleton = true;
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;

      if (obj.geometry && !obj.geometry.attributes.normal) {
        obj.geometry.computeVertexNormals();
      }

      if (obj.geometry) {
        const pos = obj.geometry.attributes.position;
        if (pos) vertCount += pos.count;
        if (obj.geometry.index) triCount += obj.geometry.index.count / 3;
        else if (pos) triCount += pos.count / 3;
      }

      obj.userData.aseetOriginalMaterial = obj.material;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!m) return;
        if (!m.userData.aseetDefaults) {
          m.userData.aseetDefaults = {
            color: m.color ? m.color.clone() : null,
            metalness: m.metalness ?? null,
            roughness: m.roughness ?? null,
            emissive: m.emissive ? m.emissive.clone() : null,
            emissiveIntensity: m.emissiveIntensity ?? 1.0,
            opacity: m.opacity ?? 1.0,
            transparent: m.transparent ?? false,
            flatShading: m.flatShading ?? false,
            side: m.side ?? THREE.FrontSide,
          };
        }
      });
    }
  });

  setCurrentAssetTriCount(Math.round(triCount));
  setCurrentAssetVertCount(vertCount);

  assetRoot.add(model);
  alignAndMeasureAsset();

  if (hasSkeleton) {
    const helper = new THREE.SkeletonHelper(model);
    helper.visible = state.showSkeleton;
    setSkeletonHelper(helper);
    stageGroup.add(helper);
    dom.skeletonStatusBadge.textContent = 'RIGGED';
    dom.skeletonStatusBadge.className = 'px-1.5 py-0.2 rounded bg-emerald-500/20 text-[9px] font-mono text-emerald-300';
  } else {
    dom.skeletonStatusBadge.textContent = 'NONE';
    dom.skeletonStatusBadge.className = 'px-1.5 py-0.2 rounded bg-obsidian-700 text-[9px] font-mono text-slate-400';
  }

  if (animations && animations.length > 0) {
    const newMixer = new THREE.AnimationMixer(model);
    setMixer(newMixer);
    state.clips = animations;
    state.activeClipIndex = 0;
    state.animPlaying = true;
    playClip(0);
  } else {
    state.clips = [];
    updateAnimationUI();
  }

  applyShadingMode();
  applyBackfaceMode();
  applyRetroTextureFilter();
  applyEmissiveBoost();
  rebuildVertexNormalsIfEnabled();

  rebuildHierarchyTree();
  refreshMaterialInspector();
  if (!preserveCamera) {
    frameAsset(true);
  }
  requestRender(800);
}

export async function loadAssetById(id, { preserveCamera = false } = {}) {
  const asset = state.assets.find((a) => a.id === id);
  if (!asset) return;

  state.activeAssetId = id;
  renderAssetList();
  dom.hierarchyAssetTitle.textContent = asset.name;

  setLoading(true, `Loading ${asset.name}...`);

  try {
    disposeCurrentAsset();

    if (asset.sourceType === 'demo') {
      const built = asset.builder();
      prepareLoadedModel(built.scene, built.animations || [], built.shaderUniforms || [], null, { preserveCamera });
      showToast(`Loaded "${asset.name}"`, 'success', 2000);
    } else if (asset.sourceType === 'js') {
      syncCodeStudioToAsset(asset);
      setJsError(null);
      const built = await evaluateProceduralJs(asset.code, asset.name);
      prepareLoadedModel(built.scene, built.animations || [], built.shaderUniforms || [], built.update || null, { preserveCamera });
      showToast(`Evaluated JS "${asset.name}"`, 'success', 2200);
    } else if (asset.sourceType === 'local') {
      await loadLocalAsset(asset, { preserveCamera });
      showToast(`Loaded "${asset.name}"`, 'success', 2200);
    }
  } catch (err) {
    console.error('Asset load error:', err);
    if (asset.sourceType === 'js') {
      setJsError(err.message || String(err));
      setCodeStudioOpen(true);
    }
    showToast(`Failed to load ${asset.name}: ${err.message || 'Unsupported structure'}`, 'error', 4500);
  } finally {
    setLoading(false);
  }
}

export async function loadLocalAsset(asset, { preserveCamera = false } = {}) {
  const manager = new THREE.LoadingManager();

  if (asset.fileMap) {
    manager.setURLModifier((url) => {
      if (url.startsWith('data:')) return url;
      let clean = decodeURIComponent(url).replace(/\\/g, '/');
      if (clean.startsWith('blob:')) {
        // Strip blob:<origin>/ prefix created by Three.js resolveURL on blob URLs
        const afterScheme = clean.slice(5);
        const slashIdx = afterScheme.indexOf('://');
        if (slashIdx !== -1) {
          const nextSlash = afterScheme.indexOf('/', slashIdx + 3);
          if (nextSlash !== -1) clean = afterScheme.slice(nextSlash + 1);
        } else {
          const nextSlash = afterScheme.indexOf('/');
          if (nextSlash !== -1) clean = afterScheme.slice(nextSlash + 1);
        }
      }
      clean = clean.replace(/^\.?\//, '').toLowerCase();
      if (asset.fileMap.has(clean)) return asset.fileMap.get(clean);
      const base = clean.includes('/') ? clean.split('/').pop() : clean;
      if (asset.fileMap.has(base)) return asset.fileMap.get(base);
      return url;
    });
  }

  const ext = asset.format.toLowerCase();

  if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader(manager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);

    const ktx2Loader = new KTX2Loader(manager)
      .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/basis/')
      .detectSupport(renderer);
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.setKTX2Loader(ktx2Loader);

    const gltf = await loader.loadAsync(asset.url);
    dracoLoader.dispose();
    ktx2Loader.dispose();
    prepareLoadedModel(gltf.scene, gltf.animations || [], [], null, { preserveCamera });
  } else if (ext === 'obj') {
    const objLoader = new OBJLoader(manager);
    if (asset.mtlUrl) {
      try {
        const mtlLoader = new MTLLoader(manager);
        const materials = await mtlLoader.loadAsync(asset.mtlUrl);
        materials.preload();
        objLoader.setMaterials(materials);
      } catch (mtlErr) {
        console.warn('MTL load fallback:', mtlErr);
      }
    }
    const obj = await objLoader.loadAsync(asset.url);
    obj.traverse((child) => {
      if (child.isMesh && !child.material) {
        child.material = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.55, metalness: 0.1 });
      }
    });
    prepareLoadedModel(obj, [], [], null, { preserveCamera });
  } else if (ext === 'fbx') {
    const loader = new FBXLoader(manager);
    const fbx = await loader.loadAsync(asset.url);
    prepareLoadedModel(fbx, fbx.animations || [], [], null, { preserveCamera });
  } else if (ext === 'stl') {
    const loader = new STLLoader(manager);
    const geo = await loader.loadAsync(asset.url);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.2 })
    );
    mesh.name = asset.name.replace(/\.[^/.]+$/, '');
    const grp = new THREE.Group();
    grp.name = mesh.name;
    grp.add(mesh);
    prepareLoadedModel(grp, [], [], null, { preserveCamera });
  } else if (ext === 'ply') {
    const loader = new PLYLoader(manager);
    const geo = await loader.loadAsync(asset.url);
    geo.computeVertexNormals();
    const hasVertexColors = Boolean(geo.attributes.color);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: hasVertexColors ? 0xffffff : 0xcbd5e1,
        vertexColors: hasVertexColors,
        roughness: 0.5,
        metalness: 0.12,
      })
    );
    mesh.name = asset.name.replace(/\.[^/.]+$/, '');
    const grp = new THREE.Group();
    grp.name = mesh.name;
    grp.add(mesh);
    prepareLoadedModel(grp, [], [], null, { preserveCamera });
  } else {
    throw new Error(`Unsupported file extension: .${ext}`);
  }
}

export async function loadCustomHdr(file) {
  setLoading(true, `Processing HDRI: ${file.name}...`);
  try {
    const url = URL.createObjectURL(file);
    const rgbeLoader = new RGBELoader();
    const tex = await rgbeLoader.loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const envRT = pmremGenerator.fromEquirectangular(tex);
    tex.dispose();
    URL.revokeObjectURL(url);

    if (customEnvRT) customEnvRT.dispose();
    setCustomEnvRT(envRT);
    scene.environment = envRT.texture;
    state.customHdrActive = true;
    applyEnvBackdrop();
    dom.envSourceBadge.textContent = file.name.slice(0, 14);
    dom.resetEnvBtn.classList.remove('hidden');
    requestRender(800);
    showToast(`Applied HDR Environment: ${file.name}`, 'success');
  } catch (err) {
    console.error(err);
    showToast(`Failed to load HDR: ${file.name}`, 'error');
  } finally {
    setLoading(false);
  }
}

export async function openProjectFileNode(fileNode, { preserveCamera = false, silent = false } = {}) {
  if (!fileNode?.handle) return;
  try {
    const file = await fileNode.handle.getFile();
    setWatchedProjectFile(fileNode, file.lastModified);
    const ext = fileNode.ext.toLowerCase();

    if (ext === 'hdr') {
      await loadCustomHdr(file);
      return;
    }

    const activeTag = state.workspace === 'brewingbad' ? 'brewingbad' : 'klasik3d';

    if (JS_EXTS.has(ext)) {
      const codeText = await file.text();
      const lineCount = codeText.split('\n').length;

      // Reuse existing asset entry if this exact project file was already opened
      let asset = state.assets.find((a) => a.projectRelPath === fileNode.relPath);
      if (asset) {
        asset.code = codeText;
        asset.fileHandle = fileNode.handle;
        asset.subtitle = `Project JS • ${lineCount} lines`;
      } else {
        asset = {
          id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: fileNode.name,
          subtitle: `Project JS • ${lineCount} lines`,
          format: 'JS',
          project: activeTag,
          sourceType: 'js',
          fromFile: true,
          projectRelPath: fileNode.relPath,
          fileHandle: fileNode.handle,
          code: codeText,
        };
        state.assets.unshift(asset);
      }

      renderAssetList();
      await loadAssetById(asset.id, { preserveCamera });
      return;
    }

    if (MODEL_EXTS.has(ext)) {
      if (!silent) setLoading(true, `Reading ${fileNode.name}...`);
      const blobUrl = URL.createObjectURL(file);
      let fileMap = null;
      let mtlUrl = null;

      if (ext === 'gltf' || ext === 'obj' || ext === 'fbx') {
        fileMap = await buildProjectFileMapFor(fileNode.relPath);
        if (ext === 'obj') {
          const mtlName = fileNode.name.toLowerCase().replace(/\.obj$/, '.mtl');
          mtlUrl = fileMap.get(mtlName) || null;
        }
      }

      let asset = state.assets.find((a) => a.projectRelPath === fileNode.relPath);
      if (asset) {
        revokeAssetBlobUrls(asset);
        asset.url = blobUrl;
        asset.mtlUrl = mtlUrl;
        asset.fileMap = fileMap;
        asset.subtitle = `Project • ${(file.size / 1024).toFixed(1)} KB`;
      } else {
        asset = {
          id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: fileNode.name,
          subtitle: `Project • ${(file.size / 1024).toFixed(1)} KB`,
          format: ext.toUpperCase(),
          project: activeTag,
          sourceType: 'local',
          projectRelPath: fileNode.relPath,
          fileHandle: fileNode.handle,
          url: blobUrl,
          mtlUrl,
          fileMap,
        };
        state.assets.unshift(asset);
      }

      renderAssetList();
      await loadAssetById(asset.id, { preserveCamera });
    }
  } catch (err) {
    console.error('openProjectFileNode error:', err);
    showToast(`Could not open ${fileNode.name}: ${err.message}`, 'error', 3500);
    setLoading(false);
  }
}

// =========================================================================
// 8. LOCAL FILE & FOLDER INGESTION (DRAG-AND-DROP + FILE PICKERS)
// =========================================================================
export async function handleIncomingFiles(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  const fileMap = new Map();
  const hdrFiles = [];
  const modelFiles = [];
  const jsFiles = [];
  const mtlMap = new Map();

  files.forEach((file) => {
    const relPath = (file.webkitRelativePath || file.name).replace(/\\/g, '/').toLowerCase();
    const baseName = file.name.toLowerCase();
    const ext = baseName.includes('.') ? baseName.split('.').pop() : '';

    if (ext === 'hdr') {
      hdrFiles.push(file);
    } else if (JS_EXTS.has(ext)) {
      jsFiles.push({ file, ext });
    } else {
      const blobUrl = URL.createObjectURL(file);
      fileMap.set(relPath, blobUrl);
      fileMap.set(baseName, blobUrl);

      if (ext === 'mtl') {
        const stem = baseName.replace(/\.mtl$/, '');
        mtlMap.set(stem, blobUrl);
      } else if (MODEL_EXTS.has(ext)) {
        modelFiles.push({ file, ext, blobUrl, baseName });
      }
    }
  });

  if (hdrFiles.length > 0) loadCustomHdr(hdrFiles[0]);

  if (modelFiles.length === 0 && jsFiles.length === 0) {
    if (hdrFiles.length === 0) {
      showToast('No supported 3D models, .js files, or .hdr found.', 'warn', 3500);
    }
    return;
  }

  const activeTag = state.workspace === 'brewingbad' ? 'brewingbad' : 'klasik3d';
  let firstAddedId = null;

  for (const { file } of jsFiles) {
    try {
      const codeText = await file.text();
      const lineCount = codeText.split('\n').length;
      const id = `js-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (!firstAddedId) firstAddedId = id;
      state.assets.unshift({
        id,
        name: file.name,
        subtitle: `Local JS • ${lineCount} lines • ${(file.size / 1024).toFixed(1)} KB`,
        format: 'JS',
        project: activeTag,
        sourceType: 'js',
        fromFile: true,
        code: codeText,
      });
    } catch {
      showToast(`Could not read ${file.name}`, 'error');
    }
  }

  modelFiles.forEach(({ file, ext, blobUrl, baseName }) => {
    const stem = baseName.replace(/\.[^/.]+$/, '');
    let mtlUrl = null;
    if (ext === 'obj') {
      mtlUrl = mtlMap.get(stem) || (mtlMap.size === 1 ? Array.from(mtlMap.values())[0] : null);
    }
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (!firstAddedId) firstAddedId = id;
    state.assets.unshift({
      id,
      name: file.name,
      subtitle: `Local • ${(file.size / 1024).toFixed(1)} KB`,
      format: ext.toUpperCase(),
      project: activeTag,
      sourceType: 'local',
      url: blobUrl,
      mtlUrl,
      fileMap,
    });
  });

  renderAssetList();
  if (firstAddedId) await loadAssetById(firstAddedId);
  const totalAdded = modelFiles.length + jsFiles.length;
  if (totalAdded > 1) showToast(`Queued ${totalAdded} local assets`, 'info');
}

export async function extractDroppedFiles(dataTransfer) {
  const items = dataTransfer.items;
  if (!items || !items.length) return Array.from(dataTransfer.files || []);

  const collected = [];
  async function traverseEntry(entry, pathPrefix = '') {
    if (!entry) return;
    if (entry.isFile) {
      await new Promise((resolve) => {
        entry.file((f) => {
          try {
            Object.defineProperty(f, 'webkitRelativePath', { value: pathPrefix + f.name });
          } catch { }
          collected.push(f);
          resolve();
        }, () => resolve());
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readAll = () => new Promise((resolve) => {
        const batch = [];
        const next = () => {
          reader.readEntries((entries) => {
            if (!entries.length) resolve(batch);
            else {
              batch.push(...entries);
              next();
            }
          }, () => resolve(batch));
        };
        next();
      });
      const entries = await readAll();
      for (const child of entries) {
        await traverseEntry(child, `${pathPrefix}${entry.name}/`);
      }
    }
  }

  const promises = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) promises.push(traverseEntry(entry));
    else if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f) collected.push(f);
    }
  }
  await Promise.all(promises);
  return collected;
}

export async function runCodeFromEditor() {
  const code = dom.jsCodeInput.value;
  let name = dom.jsAssetNameInput.value.trim() || 'Custom_Asset.js';
  if (!/\.(m?js)$/i.test(name)) name += '.js';
  dom.jsAssetNameInput.value = name;

  setJsError(null);
  setLoading(true, `Evaluating ${name}...`);

  try {
    const built = await evaluateProceduralJs(code, name);
    const existing = state.assets.find((a) => a.id === state.editingJsAssetId && a.sourceType === 'js');
    let targetAsset;

    if (existing) {
      existing.name = name;
      existing.code = code;
      const origin = existing.fileHandle ? 'Project JS' : existing.fromFile ? 'Local JS' : 'Pasted JS';
      existing.subtitle = `${origin} • ${code.split('\n').length} lines`;
      targetAsset = existing;
    } else {
      targetAsset = {
        id: `js-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        subtitle: `Pasted JS • ${code.split('\n').length} lines`,
        format: 'JS',
        project: state.workspace === 'brewingbad' ? 'brewingbad' : 'klasik3d',
        sourceType: 'js',
        fromFile: false,
        code,
      };
      state.assets.unshift(targetAsset);
      state.editingJsAssetId = targetAsset.id;
    }

    state.activeAssetId = targetAsset.id;
    dom.hierarchyAssetTitle.textContent = targetAsset.name;
    dom.jsSourceBadge.textContent = targetAsset.fileHandle
      ? 'PROJECT .JS'
      : targetAsset.fromFile
      ? 'LOCAL .JS'
      : 'PASTED JS';

    disposeCurrentAsset();
    prepareLoadedModel(built.scene, built.animations || [], built.shaderUniforms || [], built.update || null);
    renderAssetList();
    showToast(`Previewing "${targetAsset.name}"`, 'success', 2200);
  } catch (err) {
    console.error('JS Evaluation Error:', err);
    setJsError(err.message || String(err));
    showToast('JS execution error — check Code Studio', 'error', 3500);
  } finally {
    setLoading(false);
  }
}

export function exportCurrentModelAsGlb() {
  if (!currentModel) {
    showToast('No 3D model loaded to export.', 'warn');
    return;
  }
  dom.exportPopover?.classList.add('hidden');

  setLoading(true, 'Exporting binary .glb...');
  clearOverlayChildren(currentModel);

  let hasShaderMat = false;
  currentModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay) return;
    if (obj.userData.aseetOriginalMaterial) obj.material = obj.userData.aseetOriginalMaterial;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => { if (m?.isShaderMaterial) hasShaderMat = true; });
  });

  const exporter = new GLTFExporter();
  const asset = state.assets.find((a) => a.id === state.activeAssetId);
  const rawName = (asset ? asset.name : currentModel.name || 'aSEEt_model').replace(/\.[^/.]+$/, '');
  const safeName = rawName.replace(/[^a-z0-9_-]/gi, '_') || 'aSEEt_model';

  exporter.parse(
    currentModel,
    async (result) => {
      try {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        const res = await saveWithPicker({
          suggestedName: `${safeName}.glb`,
          description: 'GLTF Binary Model',
          mimeType: 'model/gltf-binary',
          extensions: ['.glb'],
          data: blob,
        });

        if (res.cancelled) return;

        const kb = (blob.size / 1024).toFixed(1);
        showToast(
          hasShaderMat
            ? `Exported ${res.fileName} (${kb} KB) — custom GLSL shaders exported with default material`
            : `Exported ${res.fileName} (${kb} KB)`,
          hasShaderMat ? 'warn' : 'success',
          3200
        );
        if (res.handle && projectRootHandle) {
          refreshProjectTree(false);
        }
      } catch (err) {
        console.error('Save GLB error:', err);
        showToast(`Save GLB error: ${err.message}`, 'error');
      } finally {
        applyShadingMode();
        setLoading(false);
      }
    },
    (err) => {
      console.error('GLB export error:', err);
      showToast(`GLB Export failed: ${err?.message || 'Unsupported geometry/material'}`, 'error', 4000);
      applyShadingMode();
      setLoading(false);
    },
    { binary: true, animations: state.clips || [], onlyVisible: false }
  );
}
