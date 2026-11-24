// =========================================================================
// JS CODE SAVING & MODEL / GLB -> THREE.JS CODE CONVERTER
// =========================================================================

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { dom, showToast, setLoading } from './dom.js';
import { state } from './state.js';
import { currentModel } from './scene.js';
import { applyShadingMode } from './materials.js';
import { setCodeStudioOpen, setJsError, updateCodeLineNumbers } from './jsRunner.js';
import { renderAssetList } from './inspector.js';
import {
  projectRootHandle,
  saveTextToFileHandle,
  saveWithPicker,
  refreshProjectTree,
} from './projectFs.js';

export function setJsDirty(dirty) {
  state.jsDirty = Boolean(dirty);
  dom.jsDirtyDot?.classList.toggle('hidden', !state.jsDirty);
}

// =========================================================================
// 1. EXPORT / DIRECT SAVE PASTED OR EDITED JS CODE
// =========================================================================
export async function saveJsFromEditor({ saveAs = false } = {}) {
  const code = dom.jsCodeInput.value;
  if (!code.trim()) {
    showToast('JS editor is empty — nothing to save.', 'warn');
    return;
  }

  let fileName = dom.jsAssetNameInput.value.trim() || 'Custom_Asset.js';
  if (!/\.(m?js)$/i.test(fileName)) fileName += '.js';
  dom.jsAssetNameInput.value = fileName;

  const activeJsAsset = state.assets.find(
    (a) => a.id === state.editingJsAssetId && a.sourceType === 'js'
  );

  // Direct overwrite when saving an existing project file handle
  if (!saveAs && activeJsAsset?.fileHandle) {
    try {
      await saveTextToFileHandle(activeJsAsset.fileHandle, code);
      activeJsAsset.code = code;
      activeJsAsset.subtitle = `Project JS • ${code.split('\n').length} lines`;
      setJsDirty(false);
      showToast(`Saved "${activeJsAsset.fileHandle.name}" to disk`, 'success', 2200);
      return;
    } catch (err) {
      console.error('Direct JS save failed:', err);
      showToast(`Direct save failed: ${err.message}`, 'error', 3800);
      return;
    }
  }

  // Otherwise open Save As picker (starts in project folder if open) or download .js
  const result = await saveWithPicker({
    suggestedName: fileName,
    description: 'JavaScript 3D Module',
    mimeType: 'text/javascript',
    extensions: ['.js', '.mjs'],
    data: code,
  });

  if (result.cancelled) return;

  if (result.saved) {
    dom.jsAssetNameInput.value = result.fileName;
    if (activeJsAsset) {
      activeJsAsset.name = result.fileName;
      activeJsAsset.code = code;
      activeJsAsset.subtitle = `${result.handle ? 'Project JS' : 'Saved JS'} • ${code.split('\n').length} lines`;
      if (result.handle) {
        activeJsAsset.fileHandle = result.handle;
        activeJsAsset.projectRelPath = result.handle.name;
        activeJsAsset.fromFile = true;
        dom.jsSourceBadge.textContent = 'PROJECT .JS';
      }
    } else {
      const activeTag = state.workspace === 'brewingbad' ? 'brewingbad' : 'klasik3d';
      const newAsset = {
        id: `js-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: result.fileName,
        subtitle: `${result.handle ? 'Project JS' : 'Saved JS'} • ${code.split('\n').length} lines`,
        format: 'JS',
        project: activeTag,
        sourceType: 'js',
        fromFile: Boolean(result.handle),
        projectRelPath: result.handle ? result.handle.name : null,
        fileHandle: result.handle || null,
        code,
      };
      state.assets.unshift(newAsset);
      state.editingJsAssetId = newAsset.id;
      dom.jsSourceBadge.textContent = result.handle ? 'PROJECT .JS' : 'LOCAL .JS';
    }
    renderAssetList();
    setJsDirty(false);
    showToast(`Saved "${result.fileName}"`, 'success', 2400);
    if (result.handle && projectRootHandle) {
      refreshProjectTree(false);
    }
  }
}

// =========================================================================
// 2. MODEL / GLB -> EDITABLE BUFFERGEOMETRY JS MODULE
// =========================================================================
function roundNum(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.abs(v) < 1e-5 ? 0 : Math.round(v * 10000) / 10000;
}

function arrayToRoundedList(typedArr) {
  const out = new Array(typedArr.length);
  for (let i = 0; i < typedArr.length; i++) {
    out[i] = roundNum(typedArr[i]);
  }
  return out;
}

function textureToDataUrl(tex) {
  if (!tex || !tex.image) return null;
  try {
    const img = tex.image;
    if (img instanceof HTMLImageElement && !img.complete) return null;
    const w = img.width || img.naturalWidth;
    const h = img.height || img.naturalHeight;
    if (!w || !h) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (tex.isDataTexture || (img.data && !(img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)))) {
      const imgData = ctx.createImageData(w, h);
      imgData.data.set(img.data);
      ctx.putImageData(imgData, 0, 0);
      return c.toDataURL('image/png');
    }
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

function toSafeIdentifier(name) {
  const clean = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const pascal = clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return /^[a-zA-Z_]/.test(pascal) ? pascal : `Asset${pascal || 'Model'}`;
}

function generateEditableGeometryJs(rootModel, baseName) {
  const fnName = `create${toSafeIdentifier(baseName)}`;
  const materialIndexMap = new Map();
  const serializedMaterials = [];
  const meshEntries = [];
  let totalTris = 0;

  function registerMaterial(mat) {
    if (!mat) {
      if (serializedMaterials.length === 0) {
        serializedMaterials.push({
          name: 'DefaultMaterial',
          color: '#cbd5e1',
          roughness: 0.5,
          metalness: 0.1,
          emissive: '#000000',
          emissiveIntensity: 0,
          opacity: 1,
          transparent: false,
          flatShading: false,
          side: THREE.FrontSide,
          mapUrl: null,
        });
      }
      return 0;
    }
    if (materialIndexMap.has(mat)) return materialIndexMap.get(mat);

    const idx = serializedMaterials.length;
    materialIndexMap.set(mat, idx);

    const entry = {
      name: mat.name || `Material_${idx + 1}`,
      color: mat.color ? `#${mat.color.getHexString()}` : '#cbd5e1',
      roughness: roundNum(mat.roughness ?? 0.5),
      metalness: roundNum(mat.metalness ?? 0.1),
      emissive: mat.emissive ? `#${mat.emissive.getHexString()}` : '#000000',
      emissiveIntensity: roundNum(mat.emissiveIntensity ?? 0),
      opacity: roundNum(mat.opacity ?? 1),
      transparent: Boolean(mat.transparent),
      flatShading: Boolean(mat.flatShading),
      side: mat.side ?? THREE.FrontSide,
      mapUrl: textureToDataUrl(mat.map),
    };
    serializedMaterials.push(entry);
    return idx;
  }

  rootModel.updateMatrixWorld(true);
  const invRootMatrix = new THREE.Matrix4().copy(rootModel.matrixWorld).invert();

  rootModel.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.isAseetOverlay || !obj.geometry) return;

    const geo = obj.geometry;
    const posAttr = geo.attributes.position;
    if (!posAttr) return;

    const normAttr = geo.attributes.normal;
    const uvAttr = geo.attributes.uv;
    const indexAttr = geo.index;

    totalTris += indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

    // Bake local transform relative to root so hierarchy stays flat & easy to read
    const relMatrix = new THREE.Matrix4().multiplyMatrices(invRootMatrix, obj.matrixWorld);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    relMatrix.decompose(pos, quat, scale);
    const euler = new THREE.Euler().setFromQuaternion(quat);

    const origMat = obj.userData.aseetOriginalMaterial || obj.material;
    const primaryMat = Array.isArray(origMat) ? origMat[0] : origMat;
    const matIdx = registerMaterial(primaryMat);

    meshEntries.push({
      name: obj.name || `Mesh_${meshEntries.length + 1}`,
      matIdx,
      pos: [roundNum(pos.x), roundNum(pos.y), roundNum(pos.z)],
      rot: [roundNum(euler.x), roundNum(euler.y), roundNum(euler.z)],
      scl: [roundNum(scale.x), roundNum(scale.y), roundNum(scale.z)],
      positions: arrayToRoundedList(posAttr.array),
      normals: normAttr ? arrayToRoundedList(normAttr.array) : null,
      uvs: uvAttr ? arrayToRoundedList(uvAttr.array) : null,
      indices: indexAttr ? Array.from(indexAttr.array) : null,
    });
  });

  if (meshEntries.length === 0) {
    throw new Error('No exportable meshes found in the current model.');
  }

  const lines = [
    `// Generated by aSEEt — Editable BufferGeometry JS Module (${Math.round(totalTris).toLocaleString()} tris)`,
    `import * as THREE from 'three';`,
    ``,
    `export default function ${fnName}(THREE_REF = THREE) {`,
    `  const group = new THREE_REF.Group();`,
    `  group.name = ${JSON.stringify(baseName)};`,
    `  const texLoader = new THREE_REF.TextureLoader();`,
    ``,
    `  // Editable PBR Materials`,
    `  const materials = [`,
  ];

  serializedMaterials.forEach((m, idx) => {
    lines.push(`    // [${idx}] ${m.name}`);
    lines.push(`    (() => {`);
    lines.push(`      const mat = new THREE_REF.MeshStandardMaterial({`);
    lines.push(`        name: ${JSON.stringify(m.name)},`);
    lines.push(`        color: ${JSON.stringify(m.color)},`);
    lines.push(`        roughness: ${m.roughness},`);
    lines.push(`        metalness: ${m.metalness},`);
    lines.push(`        emissive: ${JSON.stringify(m.emissive)},`);
    lines.push(`        emissiveIntensity: ${m.emissiveIntensity},`);
    lines.push(`        opacity: ${m.opacity},`);
    lines.push(`        transparent: ${m.transparent},`);
    lines.push(`        flatShading: ${m.flatShading},`);
    lines.push(`        side: ${m.side},`);
    lines.push(`      });`);
    if (m.mapUrl) {
      lines.push(`      const tex = texLoader.load(${JSON.stringify(m.mapUrl)});`);
      lines.push(`      tex.colorSpace = THREE_REF.SRGBColorSpace;`);
      lines.push(`      mat.map = tex;`);
    }
    lines.push(`      return mat;`);
    lines.push(`    })(),`);
  });

  lines.push(`  ];`);
  lines.push(``);
  lines.push(`  function addMesh(name, matIdx, pos, rot, scl, positions, normals, uvs, indices) {`);
  lines.push(`    const geo = new THREE_REF.BufferGeometry();`);
  lines.push(`    geo.setAttribute('position', new THREE_REF.Float32BufferAttribute(positions, 3));`);
  lines.push(`    if (normals) geo.setAttribute('normal', new THREE_REF.Float32BufferAttribute(normals, 3));`);
  lines.push(`    else geo.computeVertexNormals();`);
  lines.push(`    if (uvs) geo.setAttribute('uv', new THREE_REF.Float32BufferAttribute(uvs, 2));`);
  lines.push(`    if (indices) geo.setIndex(indices);`);
  lines.push(`    const mesh = new THREE_REF.Mesh(geo, materials[matIdx]);`);
  lines.push(`    mesh.name = name;`);
  lines.push(`    mesh.position.set(pos[0], pos[1], pos[2]);`);
  lines.push(`    mesh.rotation.set(rot[0], rot[1], rot[2]);`);
  lines.push(`    mesh.scale.set(scl[0], scl[1], scl[2]);`);
  lines.push(`    group.add(mesh);`);
  lines.push(`    return mesh;`);
  lines.push(`  }`);
  lines.push(``);

  meshEntries.forEach((m) => {
    lines.push(
      `  addMesh(${JSON.stringify(m.name)}, ${m.matIdx}, ${JSON.stringify(m.pos)}, ${JSON.stringify(m.rot)}, ${JSON.stringify(m.scl)}, ${JSON.stringify(m.positions)}, ${JSON.stringify(m.normals)}, ${JSON.stringify(m.uvs)}, ${JSON.stringify(m.indices)});`
    );
  });

  lines.push(``);
  lines.push(`  return group;`);
  lines.push(`}`);

  return { code: lines.join('\n'), totalTris: Math.round(totalTris) };
}

// =========================================================================
// 3. MODEL / GLB -> SELF-CONTAINED BASE64 GLB JS MODULE
// =========================================================================
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(''));
}

function generateBase64GlbModuleJs(rootModel, baseName, animations = []) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      rootModel,
      (result) => {
        try {
          const base64 = arrayBufferToBase64(result);
          const fnName = `load${toSafeIdentifier(baseName)}`;
          const kb = (result.byteLength / 1024).toFixed(1);

          const code = [
            `// Generated by aSEEt — Self-Contained Base64 GLB Module (${kb} KB binary)`,
            `import * as THREE from 'three';`,
            `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';`,
            ``,
            `const GLB_BASE64 = ${JSON.stringify(base64)};`,
            ``,
            `export default async function ${fnName}() {`,
            `  const binStr = atob(GLB_BASE64);`,
            `  const bytes = new Uint8Array(binStr.length);`,
            `  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);`,
            ``,
            `  const loader = new GLTFLoader();`,
            `  return new Promise((resolve, reject) => {`,
            `    loader.parse(bytes.buffer, '', (gltf) => {`,
            `      resolve({ scene: gltf.scene, animations: gltf.animations || [] });`,
            `    }, reject);`,
            `  });`,
            `}`,
          ].join('\n');

          resolve({ code, sizeKb: kb });
        } catch (err) {
          reject(err);
        }
      },
      (err) => reject(err),
      { binary: true, animations, onlyVisible: false }
    );
  });
}

// =========================================================================
// 4. PUBLIC CONVERSION ACTION (LOADS OUTPUT INTO JS CODE STUDIO)
// =========================================================================
export async function convertCurrentModelToJs(mode = 'geometry') {
  dom.exportPopover?.classList.add('hidden');
  if (!currentModel) {
    showToast('No 3D model loaded to convert.', 'warn');
    return;
  }

  setLoading(true, mode === 'geometry' ? 'Generating editable JS geometry...' : 'Packaging Base64 GLB JS module...');

  // Strip temporary debug overlays & restore original materials before reading/exporting
  const overlays = [];
  currentModel.traverse((obj) => {
    if (obj.userData?.isAseetOverlay) overlays.push(obj);
  });
  overlays.forEach((o) => o.parent?.remove(o));

  currentModel.traverse((obj) => {
    if (obj.isMesh && !obj.userData?.isAseetOverlay && obj.userData.aseetOriginalMaterial) {
      obj.material = obj.userData.aseetOriginalMaterial;
    }
  });

  const asset = state.assets.find((a) => a.id === state.activeAssetId);
  const rawName = (asset ? asset.name : currentModel.name || 'Model').replace(/\.[^/.]+$/, '');
  const safeBase = rawName.replace(/[^a-z0-9_-]/gi, '_') || 'Model';

  try {
    let generatedCode = '';
    let suffix = '';

    if (mode === 'geometry') {
      const res = generateEditableGeometryJs(currentModel, safeBase);
      generatedCode = res.code;
      suffix = '_geo.js';
      if (res.totalTris > 15000) {
        showToast(`Generated JS (${res.totalTris.toLocaleString()} tris) — high poly; Base64 GLB Module is lighter.`, 'warn', 4200);
      } else {
        showToast(`Converted "${safeBase}" to Editable JS (${res.totalTris.toLocaleString()} tris)`, 'success', 2800);
      }
    } else {
      const res = await generateBase64GlbModuleJs(currentModel, safeBase, state.clips || []);
      generatedCode = res.code;
      suffix = '_glb.js';
      showToast(`Converted "${safeBase}" to Base64 GLB JS (${res.sizeKb} KB)`, 'success', 2800);
    }

    // Load generated code straight into JS Code Studio as a new unsaved script
    state.editingJsAssetId = null;
    dom.jsAssetNameInput.value = `${safeBase}${suffix}`;
    dom.jsCodeInput.value = generatedCode;
    dom.jsSourceBadge.textContent = mode === 'geometry' ? 'GLB -> GEO JS' : 'GLB -> B64 JS';
    setJsError(null);
    setJsDirty(true);
    updateCodeLineNumbers();
    setCodeStudioOpen(true);
  } catch (err) {
    console.error('Model to JS conversion error:', err);
    showToast(`Conversion failed: ${err.message || err}`, 'error', 4000);
  } finally {
    applyShadingMode();
    setLoading(false);
  }
}
