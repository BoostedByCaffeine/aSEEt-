// =========================================================================
// LOCAL PROJECT EXPLORER & DIRECT DISK SAVE (FILE SYSTEM ACCESS API)
// =========================================================================

import { dom, escapeHtml, showToast } from './dom.js';
import { state, MODEL_EXTS, JS_EXTS } from './state.js';

const IDB_NAME = 'aSEEt_ProjectFS';
const IDB_STORE = 'handles';
const IDB_KEY = 'lastProjectRoot';

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', '.vscode', '.idea', '.next',
  'dist', 'build', 'coverage', '__pycache__', '.venv', 'venv',
]);

const PREVIEWABLE_EXTS = new Set([...MODEL_EXTS, ...JS_EXTS, 'hdr']);
const AUX_EXTS = new Set(['bin', 'mtl', 'png', 'jpg', 'jpeg', 'webp', 'tga', 'bmp', 'gif', 'ktx2']);

export let projectRootHandle = null;
const allFileHandles = new Map(); // lowercase relPath -> FileSystemFileHandle
const collapsedDirs = new Set();
let savedHandleCandidate = null;
let onOpenProjectFileCallback = null;

export function isFsAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function setProjectFileOpenHandler(cb) {
  onOpenProjectFileCallback = cb;
}

// =========================================================================
// AUTO-RELOAD FILE WATCHER
// =========================================================================
let watchTimer = null;
let watchedHandle = null;
let watchedRelPath = null;
let watchedLastModified = 0;

export function setWatchedProjectFile(fileNode, lastModified) {
  watchedHandle = fileNode?.handle || null;
  watchedRelPath = fileNode?.relPath || null;
  watchedLastModified = lastModified || 0;
  dom.watchProjectFileBtn?.classList.toggle('hidden', !watchedHandle);
}

export function setProjectFileWatchEnabled(enabled) {
  state.watchActiveFile = Boolean(enabled);
  dom.watchDot?.classList.toggle('bg-emerald-400', state.watchActiveFile);
  dom.watchDot?.classList.toggle('bg-slate-500', !state.watchActiveFile);
  dom.watchProjectFileBtn?.classList.toggle('border-emerald-400/50', state.watchActiveFile);
  dom.watchProjectFileBtn?.classList.toggle('text-emerald-200', state.watchActiveFile);

  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
  }

  if (!state.watchActiveFile) return;

  watchTimer = setInterval(async () => {
    if (document.hidden || !watchedHandle || !onOpenProjectFileCallback) return;
    try {
      const file = await watchedHandle.getFile();
      if (file.lastModified > watchedLastModified) {
        watchedLastModified = file.lastModified;
        const name = watchedHandle.name;
        const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
        await onOpenProjectFileCallback(
          { kind: 'file', name, ext, relPath: watchedRelPath, handle: watchedHandle },
          { preserveCamera: true, silent: true }
        );
        showToast(`Hot-reloaded "${name}" from disk`, 'info', 1800);
      }
    } catch {}
  }, 1000);
}

// =========================================================================
// INDEXEDDB PERSISTENCE FOR LAST PROJECT DIRECTORY HANDLE
// =========================================================================
function openHandleDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function persistRootHandle(handle) {
  try {
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Could not persist project handle:', err);
  }
}

async function loadPersistedRootHandle() {
  try {
    const db = await openHandleDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

export async function initProjectFs() {
  dom.folderInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      loadProjectFromFileList(e.target.files);
    }
  });

  if (!isFsAccessSupported()) return;
  const saved = await loadPersistedRootHandle();
  if (!saved) return;

  savedHandleCandidate = saved;
  state.hasSavedProjectHandle = true;

  // Auto-open silently if permission is already granted; otherwise show Reconnect button
  try {
    const perm = await saved.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      projectRootHandle = saved;
      await refreshProjectTree(false);
      return;
    }
  } catch {}

  if (dom.reconnectProjectName && dom.reconnectProjectBtn) {
    dom.reconnectProjectName.textContent = saved.name;
    dom.reconnectProjectBtn.classList.remove('hidden');
  }
}

export function loadProjectFromFileList(files) {
  if (!files || files.length === 0) return;
  allFileHandles.clear();
  collapsedDirs.clear();

  const firstPath = files[0].webkitRelativePath || files[0].name;
  const rootName = firstPath.includes('/') ? firstPath.split('/')[0] : 'Project';

  const rootNode = {
    kind: 'directory',
    name: rootName,
    relPath: '',
    handle: null,
    dirs: [],
    files: [],
    totalPreviewable: 0,
    readOnly: true,
  };

  const dirMap = new Map();
  dirMap.set('', rootNode);

  const getOrCreateDir = (dirPath) => {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath);
    const parentPath = dirPath.includes('/') ? dirPath.slice(0, dirPath.lastIndexOf('/')) : '';
    const parentDir = getOrCreateDir(parentPath);
    const dirName = dirPath.includes('/') ? dirPath.split('/').pop() : dirPath;
    const newDir = {
      kind: 'directory',
      name: dirName,
      relPath: dirPath,
      handle: null,
      dirs: [],
      files: [],
      totalPreviewable: 0,
      readOnly: true,
    };
    parentDir.dirs.push(newDir);
    dirMap.set(dirPath, newDir);
    return newDir;
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = file.webkitRelativePath || file.name;
    const parts = fullPath.split('/');
    if (parts.length > 1) parts.shift(); // remove root dir name

    // Check if any directory in path is ignored
    const inIgnored = parts.slice(0, -1).some((p) => IGNORED_DIRS.has(p) || p.startsWith('.'));
    if (inIgnored) continue;

    const fileName = parts[parts.length - 1];
    const relDir = parts.slice(0, -1).join('/');
    const relPath = parts.join('/');
    const lowerName = fileName.toLowerCase();
    const ext = lowerName.includes('.') ? lowerName.split('.').pop() : '';

    const fakeHandle = {
      kind: 'file',
      name: fileName,
      lastModified: file.lastModified,
      getFile: async () => file,
    };

    if (PREVIEWABLE_EXTS.has(ext) || AUX_EXTS.has(ext)) {
      allFileHandles.set(relPath.toLowerCase(), fakeHandle);
    }

    if (PREVIEWABLE_EXTS.has(ext)) {
      const parentDir = getOrCreateDir(relDir);
      parentDir.files.push({
        kind: 'file',
        name: fileName,
        ext,
        relPath,
        handle: fakeHandle,
      });
    }
  }

  const finalizeTree = (dir) => {
    dir.dirs.sort((a, b) => a.name.localeCompare(b.name));
    dir.files.sort((a, b) => a.name.localeCompare(b.name));
    dir.dirs.forEach(finalizeTree);
    dir.totalPreviewable = dir.files.length + dir.dirs.reduce((sum, d) => sum + d.totalPreviewable, 0);
  };
  finalizeTree(rootNode);

  state.projectName = rootName;
  state.projectTree = rootNode;
  if (dom.projectRootLabel) {
    dom.projectRootLabel.textContent = `${rootName} (Read-Only)`;
    dom.projectRootLabel.title = `${rootName} (Read-Only)`;
  }
  dom.refreshProjectBtn?.classList.add('hidden');
  renderProjectTree();
  showToast(
    'Read-only Project Tree loaded. For direct disk Save (Ctrl+S) in Brave, enable brave://flags/#file-system-access-api.',
    'info',
    5000
  );
}

export async function reconnectLastProject() {
  if (!savedHandleCandidate) return openProjectFolder();
  try {
    const perm = await savedHandleCandidate.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      showToast('Folder permission was not granted', 'warn');
      return;
    }
    projectRootHandle = savedHandleCandidate;
    dom.reconnectProjectBtn?.classList.add('hidden');
    await refreshProjectTree(true);
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast(`Reconnect failed: ${err.message}`, 'error');
    }
  }
}

export async function openProjectFolder() {
  if (!isFsAccessSupported()) {
    if (dom.folderInput) {
      dom.folderInput.click();
    } else {
      showToast('For direct disk Save (Ctrl+S) in Brave, enable brave://flags/#file-system-access-api.', 'warn', 4500);
    }
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    projectRootHandle = handle;
    savedHandleCandidate = handle;
    collapsedDirs.clear();
    dom.reconnectProjectBtn?.classList.add('hidden');
    await persistRootHandle(handle);
    await refreshProjectTree(true);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('openProjectFolder error:', err);
      showToast(`Could not open folder: ${err.message}`, 'error');
    }
  }
}

// =========================================================================
// RECURSIVE DIRECTORY SCANNER & SIBLING FILE RESOLVER
// =========================================================================
async function scanDirectory(dirHandle, prefix = '') {
  const dirs = [];
  const files = [];

  for await (const [name, entry] of dirHandle.entries()) {
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === 'directory') {
      if (IGNORED_DIRS.has(name) || name.startsWith('.')) continue;
      const childNode = await scanDirectory(entry, relPath);
      if (childNode.totalPreviewable > 0) {
        dirs.push(childNode);
      }
    } else if (entry.kind === 'file') {
      const lower = name.toLowerCase();
      const ext = lower.includes('.') ? lower.split('.').pop() : '';
      if (PREVIEWABLE_EXTS.has(ext) || AUX_EXTS.has(ext)) {
        allFileHandles.set(relPath.toLowerCase(), entry);
      }
      if (PREVIEWABLE_EXTS.has(ext)) {
        files.push({
          kind: 'file',
          name,
          ext,
          relPath,
          handle: entry,
        });
      }
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  const totalPreviewable = files.length + dirs.reduce((sum, d) => sum + d.totalPreviewable, 0);
  return {
    kind: 'directory',
    name: dirHandle.name,
    relPath: prefix,
    handle: dirHandle,
    dirs,
    files,
    totalPreviewable,
  };
}

export async function refreshProjectTree(announce = false) {
  if (!projectRootHandle) return;
  allFileHandles.clear();
  try {
    const tree = await scanDirectory(projectRootHandle, '');
    state.projectName = projectRootHandle.name;
    state.projectTree = tree;

    if (dom.projectRootLabel) {
      dom.projectRootLabel.textContent = projectRootHandle.name;
      dom.projectRootLabel.title = projectRootHandle.name;
    }
    dom.refreshProjectBtn?.classList.remove('hidden');
    renderProjectTree();

    if (announce) {
      showToast(`Project "${projectRootHandle.name}" loaded (${tree.totalPreviewable} assets)`, 'success', 2400);
    }
  } catch (err) {
    console.error('refreshProjectTree error:', err);
    showToast(`Failed to scan project: ${err.message}`, 'error');
  }
}

// Builds a blob URL map for sibling/referenced textures, .bin, and .mtl files inside the project
export async function buildProjectFileMapFor(targetRelPath) {
  const fileMap = new Map();
  const folderPrefix = targetRelPath.includes('/')
    ? targetRelPath.slice(0, targetRelPath.lastIndexOf('/') + 1).toLowerCase()
    : '';

  const candidateEntries = [];

  for (const [key, handle] of allFileHandles.entries()) {
    const ext = key.includes('.') ? key.split('.').pop() : '';
    if (!AUX_EXTS.has(ext)) continue;
    // Include everything in the same folder or subfolders, plus all aux files if project is modest
    if (!folderPrefix || key.startsWith(folderPrefix) || allFileHandles.size < 400) {
      candidateEntries.push({ relKey: key, handle });
    }
  }

  // Sort so files inside folderPrefix are registered last, winning any baseName alias
  if (folderPrefix) {
    candidateEntries.sort(
      (a, b) => (a.relKey.startsWith(folderPrefix) ? 1 : 0) - (b.relKey.startsWith(folderPrefix) ? 1 : 0)
    );
  }

  for (const { relKey, handle } of candidateEntries) {
    try {
      const file = await handle.getFile();
      const blobUrl = URL.createObjectURL(file);
      const baseName = relKey.includes('/') ? relKey.split('/').pop() : relKey;
      fileMap.set(relKey, blobUrl);
      fileMap.set(baseName, blobUrl);
      if (folderPrefix && relKey.startsWith(folderPrefix)) {
        fileMap.set(relKey.slice(folderPrefix.length), blobUrl);
      }
    } catch {}
  }

  return fileMap;
}

// =========================================================================
// FILE TREE RENDERER
// =========================================================================
function getExtBadgeStyle(ext) {
  if (JS_EXTS.has(ext)) return 'bg-violet-500/20 text-violet-300 border-violet-400/35';
  if (ext === 'hdr') return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35';
  return 'bg-sky-500/15 text-sky-300 border-sky-400/30';
}

export function renderProjectTree() {
  if (!dom.projectTreeContainer) return;
  dom.projectTreeContainer.innerHTML = '';

  if (!state.projectTree) {
    dom.projectTreeContainer.innerHTML = `
      <div class="text-center py-8 px-3 text-xs text-slate-500 leading-relaxed">
        Open a local project directory to browse <span class="font-mono text-slate-300">.js</span>,
        <span class="font-mono text-slate-300">.glb</span>, <span class="font-mono text-slate-300">.gltf</span>,
        <span class="font-mono text-slate-300">.obj</span> &amp; <span class="font-mono text-slate-300">.hdr</span>
        files and save edits directly to disk.
      </div>`;
    return;
  }

  if (state.projectTree.totalPreviewable === 0) {
    dom.projectTreeContainer.innerHTML = `
      <div class="text-center py-8 px-3 text-xs text-slate-500">
        No supported 3D, JS, or HDR files found in <span class="font-mono text-slate-300">${escapeHtml(state.projectName)}</span>.
      </div>`;
    return;
  }

  const query = (state.projectSearch || '').trim().toLowerCase();

  function matchesQuery(node) {
    if (!query) return true;
    if (node.kind === 'file') {
      return node.name.toLowerCase().includes(query) || node.relPath.toLowerCase().includes(query);
    }
    return node.files.some(matchesQuery) || node.dirs.some(matchesQuery);
  }

  function renderDirChildren(dirNode, depth) {
    // Subdirectories first
    for (const sub of dirNode.dirs) {
      if (!matchesQuery(sub)) continue;
      const isCollapsed = !query && collapsedDirs.has(sub.relPath);

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-1 py-1 px-1.5 rounded-lg hover:bg-obsidian-750 cursor-pointer transition text-slate-300';
      row.style.paddingLeft = `${Math.min(depth * 12 + 6, 72)}px`;
      row.innerHTML = `
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <svg class="w-3 h-3 text-slate-500 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <svg class="w-3.5 h-3.5 text-amber-400/80 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span class="truncate text-[11px] font-medium">${escapeHtml(sub.name)}</span>
        </div>
        <span class="text-[9px] font-mono text-slate-500 shrink-0">${sub.totalPreviewable}</span>
      `;
      row.addEventListener('click', () => {
        if (collapsedDirs.has(sub.relPath)) collapsedDirs.delete(sub.relPath);
        else collapsedDirs.add(sub.relPath);
        renderProjectTree();
      });
      dom.projectTreeContainer.appendChild(row);

      if (!isCollapsed) {
        renderDirChildren(sub, depth + 1);
      }
    }

    // Files
    for (const fileNode of dirNode.files) {
      if (!matchesQuery(fileNode)) continue;
      const isActive = state.activeProjectRelPath === fileNode.relPath;
      const row = document.createElement('div');
      row.className = `flex items-center justify-between gap-1.5 py-1 px-1.5 rounded-lg cursor-pointer transition ${
        isActive
          ? 'bg-sky-500/20 border border-sky-400/40 text-white'
          : 'hover:bg-obsidian-750 border border-transparent text-slate-300'
      }`;
      row.style.paddingLeft = `${Math.min(depth * 12 + 16, 82)}px`;
      row.title = fileNode.relPath;
      row.innerHTML = `
        <span class="truncate text-[11px] flex-1">${escapeHtml(fileNode.name)}</span>
        <span class="px-1 py-0.2 rounded border text-[9px] font-mono shrink-0 ${getExtBadgeStyle(fileNode.ext)}">${escapeHtml(fileNode.ext.toUpperCase())}</span>
      `;
      row.addEventListener('click', () => {
        state.activeProjectRelPath = fileNode.relPath;
        renderProjectTree();
        if (onOpenProjectFileCallback) {
          onOpenProjectFileCallback(fileNode);
        }
      });
      dom.projectTreeContainer.appendChild(row);
    }
  }

  renderDirChildren(state.projectTree, 0);
}

// =========================================================================
// DIRECT SAVE & SAVE-AS HELPERS
// =========================================================================
async function ensureWritePermission(handle) {
  try {
    const q = await handle.queryPermission({ mode: 'readwrite' });
    if (q === 'granted') return true;
  } catch {}
  try {
    const r = await handle.requestPermission({ mode: 'readwrite' });
    return r === 'granted';
  } catch (err) {
    if (err.name === 'AbortError') return false;
    throw err;
  }
}

export async function saveTextToFileHandle(fileHandle, text) {
  const granted = await ensureWritePermission(fileHandle);
  if (!granted) throw new Error('Write permission denied');
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function saveBlobToFileHandle(fileHandle, blob) {
  const granted = await ensureWritePermission(fileHandle);
  if (!granted) throw new Error('Write permission denied');
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function triggerBrowserDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Opens native Save File Picker (defaulting inside the open project folder when available),
 * or falls back cleanly to a browser download.
 * Returns { saved: boolean, cancelled: boolean, handle: FileSystemFileHandle|null, fileName: string }.
 */
export async function saveWithPicker({ suggestedName, description, mimeType, extensions, data }) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });

  if ('showSaveFilePicker' in window) {
    try {
      const options = {
        suggestedName,
        types: [
          {
            description,
            accept: { [mimeType]: extensions },
          },
        ],
      };
      if (projectRootHandle) {
        options.startIn = projectRootHandle;
      }
      let handle;
      try {
        handle = await window.showSaveFilePicker(options);
      } catch (pickerErr) {
        if (pickerErr.name === 'AbortError') throw pickerErr;
        // If startIn failed due to invalid handle/permissions, retry without startIn
        if (options.startIn) {
          delete options.startIn;
          handle = await window.showSaveFilePicker(options);
        } else {
          throw pickerErr;
        }
      }
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { saved: true, cancelled: false, handle, fileName: handle.name };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { saved: false, cancelled: true, handle: null, fileName: suggestedName };
      }
      console.warn('showSaveFilePicker fallback:', err);
    }
  }

  triggerBrowserDownload(blob, suggestedName);
  return { saved: true, cancelled: false, handle: null, fileName: suggestedName };
}
