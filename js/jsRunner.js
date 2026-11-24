// =========================================================================
// PROCEDURAL JS EVALUATOR & CODE STUDIO UI HELPERS
// =========================================================================

import * as THREE from 'three';
import { dom } from './dom.js';
import { state } from './state.js';

// Expose THREE globally for plain non-module JS files and pasted snippets
window.THREE = THREE;

const THREE_CDN_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const THREE_ADDONS_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function normalizeProceduralResult(raw, fallbackName = 'Procedural_Asset') {
  if (!raw) return null;

  let obj = null;
  let animations = [];
  let update = null;
  let shaderUniforms = [];

  if (raw.isObject3D) {
    obj = raw;
  } else if (raw.isBufferGeometry) {
    obj = new THREE.Mesh(
      raw,
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.15 })
    );
    obj.name = fallbackName;
  } else if (typeof raw === 'object') {
    const candidate = raw.scene || raw.group || raw.model || raw.mesh || raw.object || raw.root || raw.asset;
    if (candidate?.isObject3D) {
      obj = candidate;
    } else if (candidate?.isBufferGeometry) {
      obj = new THREE.Mesh(
        candidate,
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.15 })
      );
      obj.name = fallbackName;
    }
    if (Array.isArray(raw.animations)) animations = raw.animations;
    if (typeof raw.update === 'function') update = raw.update;
    else if (typeof raw.tick === 'function') update = raw.tick;
    else if (typeof raw.animate === 'function') update = raw.animate;
    if (Array.isArray(raw.shaderUniforms)) shaderUniforms = raw.shaderUniforms;
  }

  if (!obj) return null;

  if (obj.isScene) {
    const wrapper = new THREE.Group();
    wrapper.name = obj.name || fallbackName;
    while (obj.children.length > 0) wrapper.add(obj.children[0]);
    obj = wrapper;
  }

  if (!obj.name) obj.name = fallbackName;
  return { scene: obj, animations, update, shaderUniforms };
}

async function invokeCandidate(candidate) {
  if (typeof candidate !== 'function') return candidate;
  try {
    return await candidate(THREE);
  } catch (err) {
    if (err instanceof TypeError && /class constructor|without 'new'/i.test(err.message)) {
      return new candidate(THREE);
    }
    throw err;
  }
}

export async function evaluateProceduralJs(code, assetName = 'Procedural_Asset') {
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    throw new Error('Code input is empty. Paste Three.js code or select a template first.');
  }

  const cleanName = assetName.replace(/\.[^/.]+$/, '') || 'Procedural_Asset';
  const looksLikeModule = /(^|\n)\s*(import\s+[\s\S]*?from\s+['"]|import\s+['"]|export\s+(default|const|let|var|function|async\s+function|class|\{))/m.test(trimmed);

  if (looksLikeModule) {
    const rewritten = trimmed
      .replace(/(from\s+['"])three(['"])/g, `$1${THREE_CDN_URL}$2`)
      .replace(/(from\s+['"])three\/addons\/([^'"]+)(['"])/g, `$1${THREE_ADDONS_URL}$2$3`)
      .replace(/(import\s+['"])three(['"])/g, `$1${THREE_CDN_URL}$2`);

    const blob = new Blob([rewritten], { type: 'text/javascript' });
    const modUrl = URL.createObjectURL(blob);
    try {
      const mod = await import(modUrl);
      const keys = Object.keys(mod);

      if ('default' in mod && mod.default !== undefined) {
        const res = normalizeProceduralResult(await invokeCandidate(mod.default), cleanName);
        if (res) return res;
      }

      for (const k of keys) {
        if (k === 'default' || typeof mod[k] === 'function') continue;
        const res = normalizeProceduralResult(mod[k], cleanName);
        if (res) return res;
      }

      const fnKeys = keys
        .filter((k) => k !== 'default' && typeof mod[k] === 'function')
        .sort((a, b) => (/^(create|build|make|generate|get|init)/i.test(a) ? 0 : 1) - (/^(create|build|make|generate|get|init)/i.test(b) ? 0 : 1));

      for (const k of fnKeys) {
        const res = normalizeProceduralResult(await invokeCandidate(mod[k]), cleanName);
        if (res) return res;
      }

      throw new Error('ES Module loaded, but no exported THREE.Object3D, { scene }, or builder function was found.');
    } finally {
      URL.revokeObjectURL(modUrl);
    }
  }

  const fnNames = [];
  const fnDeclRegex = /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const fnVarRegex = /(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g;
  let m;
  while ((m = fnDeclRegex.exec(trimmed)) !== null) fnNames.push(m[1]);
  while ((m = fnVarRegex.exec(trimmed)) !== null) fnNames.push(m[1]);

  const uniqueFns = Array.from(new Set(fnNames)).sort(
    (a, b) => (/^(create|build|make|generate|get|init)/i.test(a) ? 0 : 1) - (/^(create|build|make|generate|get|init)/i.test(b) ? 0 : 1)
  );

  const commonVars = ['group', 'model', 'mesh', 'asset', 'root', 'scene', 'character', 'npc', 'prop', 'rig', 'obj', 'object', 'result'];
  const varChecks = commonVars
    .map((v) => `if (typeof ${v} !== 'undefined' && ${v} && (${v}.isObject3D || ${v}.isBufferGeometry || ${v}.scene || ${v}.group || ${v}.mesh || ${v}.model)) return ${v};`)
    .join('\n');

  const fnChecks = uniqueFns
    .map((fn) => `if (typeof ${fn} === 'function') { try { const __r = await ${fn}(THREE); if (__r && (__r.isObject3D || __r.isBufferGeometry || __r.scene || __r.group || __r.mesh || __r.model)) return __r; } catch (__e) {} }`)
    .join('\n');

  const runner = new AsyncFunction('THREE', `${trimmed};\n${varChecks}\n${fnChecks}\nreturn null;`);
  const normalized = normalizeProceduralResult(await runner(THREE), cleanName);

  if (!normalized) {
    throw new Error('Script ran without errors, but did not return a THREE.Object3D or { scene, animations, update }.');
  }
  return normalized;
}

export function setCodeStudioOpen(open) {
  state.codeStudioOpen = Boolean(open);
  dom.codeStudioDrawer.classList.toggle('code-drawer-hidden', !state.codeStudioOpen);
  dom.codeStudioToggleBtn.classList.toggle('border-violet-400/60', state.codeStudioOpen);
  dom.codeStudioToggleBtn.classList.toggle('bg-violet-500/20', state.codeStudioOpen);
  dom.codeStudioToggleBtn.classList.toggle('text-violet-100', state.codeStudioOpen);
  if (state.codeStudioOpen) {
    updateCodeLineNumbers();
    dom.jsCodeInput.focus();
  }
}

export function setJsError(message) {
  if (!message) {
    dom.jsErrorBanner.classList.add('hidden');
    dom.jsErrorText.textContent = '';
  } else {
    dom.jsErrorText.textContent = message;
    dom.jsErrorBanner.classList.remove('hidden');
  }
}

export function updateEditorCursorStatus() {
  const pos = dom.jsCodeInput.selectionStart || 0;
  const split = dom.jsCodeInput.value.slice(0, pos).split('\n');
  const totalLines = (dom.jsCodeInput.value.match(/\n/g) || []).length + 1;
  dom.jsEditorStatus.textContent = `Ln ${split.length}, Col ${split[split.length - 1].length + 1} (${totalLines} lines) • Ctrl+Enter to preview`;
}

export function updateCodeLineNumbers() {
  const lines = dom.jsCodeInput.value ? dom.jsCodeInput.value.split('\n').length : 1;
  let gutter = '';
  for (let i = 1; i <= lines; i++) gutter += i === lines ? String(i) : `${i}\n`;
  dom.jsLineNumbers.textContent = gutter;
  updateEditorCursorStatus();
}

export function syncCodeStudioToAsset(asset) {
  if (!asset || asset.sourceType !== 'js') return;
  state.editingJsAssetId = asset.id;
  dom.jsAssetNameInput.value = asset.name;
  dom.jsCodeInput.value = asset.code || '';
  dom.jsSourceBadge.textContent = asset.fileHandle
    ? 'PROJECT .JS'
    : asset.fromFile
    ? 'LOCAL .JS'
    : 'PASTED JS';
  dom.jsDirtyDot?.classList.add('hidden');
  state.jsDirty = false;
  updateCodeLineNumbers();
}
