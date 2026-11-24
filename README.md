# aSEEt — WebGL2 & Three.js 3D Asset Studio

[![Three.js](https://img.shields.io/badge/Three.js-0.170.0-black?logo=three.js)](https://threejs.org/)
[![WebGL2](https://img.shields.io/badge/WebGL2-Supported-555555?logo=webgl)](https://www.khronos.org/webgl/)
[![Zero Build Step](https://img.shields.io/badge/Build-Zero%20Build%20Step-10b981)](#getting-started--usage-instructions)
[![100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Client--Side-0284c7)](#100-client-side-privacy)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages%20Ready-6366f1?logo=github)](#option-a--use-live-on-github-pages)

**aSEEt** is a lightweight, zero-build, purely static browser-based 3D asset studio and pre-flight optimizer built with WebGL2 and Three.js (r170). It delivers an instant, local desktop-grade environment for previewing, inspecting, editing, optimizing, and exporting 3D models and procedural JavaScript assets without bundlers, compilation steps, or backend dependencies.

<!-- ![aSEEt Viewport Screenshot](./docs/preview.png) -->

---

## Background & History

**aSEEt** started inside **BoostedByCaffeine Studios** as a specialized internal iteration utility. During the development of two distinct indie game titles, standard DCC tools and heavyweight game engines created unnecessary friction for fast asset review:

- ***Klasik 3D:*** Required high-contrast faceted geometry evaluation, retro low-poly pixelation scaling, flat shading, unlit checks, and wireframe verification for stylized nostalgic rendering.
- ***Brewing Bad:*** Required fine-grained evaluation of emissive props, translucent flasks, atmospheric volumetric lab fog, real-time animation playback, and procedural Three.js asset generation.

What started as a single-file prototype quickly evolved into a modular, ES-module 3D asset workstation. By combining native browser capabilities—such as the **File System Access API** for direct-to-disk directory editing, **IndexedDB** for workspace persistence, and WebGL2 hardware telemetry—`aSEEt` transformed into an open, universal studio. Today, any game developer, technical artist, or 3D creator can inspect, optimize, and author web- and game-ready assets directly in their browser.

---

## Core Features

### 1. Multi-Format 3D & Procedural Asset Loading
- **Universal Formats:** Drag and drop or browse `.glb`, `.gltf` (with sibling `.bin` buffers and textures), `.obj` (+ `.mtl`), `.fbx` (with skeletal animations), `.stl`, `.ply` (including per-vertex color channels), and `.hdr` equirectangular environment maps.
- **Hardware-Accelerated Decoders:** Integrated `DRACOLoader` (Draco 1.5.7), `MeshoptDecoder` for ultra-compressed meshes, and `KTX2Loader` with Basis Universal transcoder detection.
- **Procedural JS Assets:** Direct execution of `.js` and `.mjs` scripts declaring Three.js scenes, geometry builders, and real-time animation loops.
- **Built-in Calibration Demos:** Ships with pre-loaded demo assets including the *Retro Arcade Relic* (`klasik3d`), *Alchemist Flask Rig* (`Brewing Bad`), and *PBR & WebGL2 Shader Rig*.

### 2. Viewport Shading & Diagnostics
- **7 Render Modes:** Physical PBR, Lit + Wireframe, Pure Wireframe, Clay Studio, Surface Normals, UV Checkerboard, and Raw Unlit.
- **Backface Visualization:** Instant toggling of two-sided rendering, backface culling, or high-visibility magenta backface highlighting to detect inverted winding orders.
- **Camera & Projection Controls:** Isometric preset snaps (Front, Back, Top, Bottom, Left, Right, 3/4 Perspective), smooth framing (`F`), and instant synchronization between Perspective and Orthographic projections (`O`).
- **3D Navigation:** Smooth OrbitControls with damping, interactive viewport orientation axes gizmo, and auto-rotating turntable mode (`T`).
- **Live Diagnostics HUD:** Real-time WebGL2 telemetry showing FPS, GPU renderer string, draw call counter, triangle/vertex budgets, physical bounding dimensions, and estimated GPU Texture VRAM footprint.

### 3. Pre-Flight Game Optimizer & Transform Baker
- **Draw Call Reducer:** Merges static meshes sharing the same material into consolidated geometries using `BufferGeometryUtils.mergeGeometries()`. Automatically ignores `SkinnedMesh` to keep rigged character skeletons intact.
- **Transform & Origin Baker:**
  - Quick Y-axis forward rotation (`-90°`, `+90°`, `180°`).
  - Target height scaling in true metric units (e.g., standardizing human characters to `1.75m`).
  - Grounding and centering pivot point directly to bottom-center (`Y = 0`) for game-engine placement.
- **1.75m Human Scale Silhouette:** Toggleable translucent human reference figure dynamically positioned beside models to verify game proportions.
- **Budget Audit:** WebGL2 mobile and web performance indicators (`GAME READY`, `MODERATE`, `HEAVY`).

### 4. JS Code Studio
- **Integrated Code Drawer:** Slide-over JavaScript editor (`C`) equipped with line numbers, code word-wrapping, template insertion, and syntax error alerts.
- **Starter Templates:** Pre-configured templates for plain Three.js snippets, animated props with `update()` hooks, and standard ES Module components.
- **Live Compilation:** Hit `Ctrl+Enter` to compile and preview changes in the viewport with live error boundaries.
- **Live Updating:** Supports per-frame `update(delta, elapsed)` callbacks and custom shader uniforms.

### 5. Export & Conversion Pipeline
- **Binary `.glb` Export:** One-click packaging and download (`Shift+E`) using Three.js `GLTFExporter`.
- **GLB-to-JS Converters:**
  - *Editable Geometry JS:* Converts static models into human-readable JavaScript code reconstructing `THREE.BufferGeometry` programmatically.
  - *Base64 GLB Module:* Packages models and animation clips into an autonomous, self-contained ES Module with inline binary payloads.
- **High-Resolution Snapshots:** Capture standard studio viewport renders or transparent alpha PNG cutouts with grids and backdrops automatically excluded.

### 6. Local Project Explorer & Auto-Reload Watcher
- **Native Folder Access:** Mount local game asset folders directly in the browser using the File System Access API.
- **Direct Disk Saving:** Edit procedural JavaScript assets in the built-in code editor and save directly back to the physical disk with `Ctrl+S`.
- **Auto-Reload File Watcher:** Toggle the **Watch** button to poll active asset timestamps and hot-reload changes instantly while preserving the user's camera position.
- **Session Reconnect:** Uses IndexedDB to store directory permissions and reconnect past workspaces across reloads.
- **Browser Fallback:** Graceful fallback to read-only folder uploads when File System Access API is unavailable.

### 7. Universal Studio Presets & Custom Profiles
- **Curated Workspaces:** Instant switching between `klasik3d`, `Brewing Bad`, and `Neutral Studio` lighting setups.
- **Custom Studio Profile Manager:** Save named studio environments to `localStorage`, fine-tune 3-point light rigs (Key, Fill, Rim), adjust rig azimuth, calibrate exposure and tone mapping (AgX, ACESFilmic, Neutral, Cineon, Reinhard, Linear), and export/import profiles as `.json`.
- **HDRI Backdrop:** Toggle environment reflections directly onto the viewport background with real-time blurriness adjustments.
- **Smart Idle Throttling:** Conserves GPU and laptop battery by putting rendering to sleep (`IDLE`) after 650ms of inactivity, waking instantly upon user interaction or active animation.

---

## Getting Started & Usage Instructions

### Option A — Use Live on GitHub Pages
`aSEEt` is a 100% client-side application. You can host it on any static web server or open a deployed GitHub Pages branch directly in your browser.

#### 100% Client-Side Privacy
All 3D models (`.glb`, `.fbx`, `.obj`), texture buffers, HDR environment files, and local folder directories remain strictly on your local machine. No asset data, geometry, or telemetry is ever transmitted to an external server or cloud service.

---

### Option B — Run Locally

> [!IMPORTANT]
> **Why `file://` does not work:** Modern web browsers enforce Cross-Origin Resource Sharing (CORS) security policies that block JavaScript ES Modules (`<script type="module">`) and web workers from executing over the `file://` protocol. Running `aSEEt` locally requires serving the directory over a local HTTP server.

Choose any of the following lightweight commands to run `aSEEt` from your project directory:

#### 1. VS Code Live Server
- Install the **Live Server** extension (by Ritwick Dey).
- Right-click `index.html` in the file explorer and select **Open with Live Server**.

#### 2. Node.js (npx)
```bash
npx serve .
# Or: npx http-server . -p 8080
```
Open [http://localhost:3000](http://localhost:3000) (or the port displayed in your terminal).

#### 3. Python 3
```bash
python -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

#### 4. XAMPP / Laragon (Apache)
- Place or clone the `aSEEt` directory into your server's web root:
  - **XAMPP:** `C:\xampp\htdocs\aSEEt`
  - **Laragon:** `C:\laragon\www\aSEEt`
- Start the **Apache** module (database services like MySQL are not required).
- Navigate to:
  ```text
  http://localhost/aSEEt/
  ```

---

### Deploying Your Own Copy to GitHub Pages

You can deploy your personal fork of `aSEEt` to GitHub Pages in four steps:

1. Push your repository to GitHub (`main` branch).
2. Go to your repository **Settings** on GitHub.
3. In the left navigation, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment**:
   - Source: `Deploy from a branch`
   - Branch: `main` / `(root)`
   - Click **Save**.

Your studio will be live at `https://<username>.github.io/<repo-name>/` within seconds.

---

### Browser Compatibility Note

| Browser | Compatibility | Notes |
|---|---|---|
| **Google Chrome** | Full Support | Complete File System Access API read/write and direct disk save out of the box. |
| **Microsoft Edge** | Full Support | Complete File System Access API read/write and direct disk save out of the box. |
| **Brave Browser** | Supported (Flag Required) | By default, Brave restricts the File System Access API. To unlock full read/write folder access and `Ctrl+S` disk saving, navigate to `brave://flags/#file-system-access-api`, set it to **Enabled**, and relaunch Brave. Without this flag, drag-and-drop and the read-only directory fallback remain fully functional. |
| **Firefox & Safari** | Partial Support | Full drag-and-drop asset loading, WebGL2 diagnostics, and read-only folder fallback. Direct disk write via File System Access API is not implemented by these browsers. |

---

## Procedural JS Asset Format Guide

`aSEEt` allows you to author, test, and render procedural Three.js assets written in JavaScript. You can paste snippets or standard modules directly into **JS Code Studio** (`C`) or load `.js`/`.mjs` files from your project explorer.

### Example 1: Plain Three.js Snippet
Return a `THREE.Group` or `THREE.Mesh` directly. The global `THREE` namespace is pre-injected into the scope:

```javascript
// Plain Three.js snippet — returns a THREE.Group directly
const group = new THREE.Group();
group.name = 'Procedural_CoffeeCup';

const ceramicMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.25,
  metalness: 0.05,
});

const cup = new THREE.Mesh(
  new THREE.CylinderGeometry(0.42, 0.34, 0.72, 28),
  ceramicMat
);
cup.name = 'Cup_Body';
cup.position.y = 0.36;
group.add(cup);

const handle = new THREE.Mesh(
  new THREE.TorusGeometry(0.18, 0.045, 12, 24, Math.PI),
  ceramicMat
);
handle.name = 'Cup_Handle';
handle.rotation.z = -Math.PI / 2;
handle.position.set(0.39, 0.38, 0);
group.add(handle);

return group;
```

---

### Example 2: Standard ES Module with Animation Loop
Export a default factory function returning `{ scene, update }`:

```javascript
// Standard ES Module with real-time update callback
import * as THREE from 'three';

export default function createAsset() {
  const group = new THREE.Group();
  group.name = 'Animated_CrystalBeacon';

  const crystalGeo = new THREE.OctahedronGeometry(0.7, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
  });

  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.y = 1.1;
  group.add(crystal);

  // Return scene object alongside optional frame update hook
  return {
    scene: group,
    update: (delta, elapsed) => {
      crystal.rotation.y += delta * 1.5;
      crystal.position.y = 1.1 + Math.sin(elapsed * 2.5) * 0.12;
    },
  };
}
```

---

## Keyboard Shortcuts

Press `?` in the studio at any time to open the quick reference dialog.

| Key | Action | Scope / Context |
|---|---|---|
| `1` – `7` | Switch Shading Modes (1: PBR, 2: Lit+Wire, 3: Wire, 4: Clay, 5: Normals, 6: UV Checker, 7: Unlit) | Viewport |
| `W` | Toggle Lit + Wireframe overlay on/off | Viewport |
| `F` | Frame Asset (center & focus camera on model bounds) | Viewport |
| `R` | Reset camera to default isometric viewing angle | Viewport |
| `O` | Toggle Perspective / Orthographic camera projection | Viewport |
| `T` | Toggle Turntable auto-rotation on/off | Viewport |
| `G` | Toggle Floor Grid visibility | Viewport |
| `H` | Toggle Zen / Clean View (hide/show all floating side panels) | Studio UI |
| `Space` | Play / Pause active animation clip | Animation Bar |
| `C` | Open / Close JS Code Studio drawer | Code Studio |
| `Ctrl + Enter` / `Cmd + Enter` | Run & compile code from editor into viewport | Code Editor |
| `Ctrl + S` / `Cmd + S` | Save active JS code / Save active project file directly to disk | Code Editor / Project FS |
| `Shift + E` | Export current 3D model as binary `.glb` | Global |
| `Esc` | Clear node selection / Close Code Studio / Dismiss modal dialogs | Global |
| `?` | Toggle Keyboard Shortcuts reference modal | Global |
| `Tab` | Insert 2 soft spaces (indentation) | Code Editor |

---

## Project Structure & Tech Stack

```text
aSEEt/
├── index.html              # Main single-page application shell, HUD layout, and modal dialogs
├── css/
│   └── style.css           # Obsidian dark studio theme, layout variables, and custom styling
├── js/
│   ├── demos.js            # Built-in procedural demo assets (Retro Arcade, Alchemist Flask, PBR Rig)
│   ├── dom.js              # Centralized DOM cache references and notification toast system
│   ├── gizmo.js            # Interactive 3D orientation axes cube synchronized with main camera
│   ├── inspector.js        # Searchable scene hierarchy tree view and material properties inspector
│   ├── jsExporter.js       # Binary GLB exporter, Editable JS geometry builder, and Base64 module generator
│   ├── jsRunner.js         # Safe procedural JavaScript execution engine and Code Studio sync
│   ├── loaders.js          # Multi-format loaders (GLB, OBJ/MTL, FBX, STL, PLY, HDR) with memory cleanup
│   ├── main.js             # Studio lifecycle coordinator and smart idle render loop
│   ├── materials.js        # Shading mode overrides, tone mapping, retro pixelation, and backdrop sync
│   ├── optimizer.js        # Pre-flight mesh merge by material, transform baker, and budget auditor
│   ├── projectFs.js        # File System Access API integration, direct disk save, and auto-reload watcher
│   ├── scene.js            # Three.js scene graph, OrbitControls, 3-point light rig, and 1.75m scale ref
│   ├── state.js            # Global reactive application state, workspace presets, and starter templates
│   ├── studioProfiles.js   # User custom studio profiles manager with localStorage and JSON import/export
│   └── ui.js               # Event binding, toolbar actions, snapshots, and keyboard shortcut dispatcher
└── README.md               # Studio documentation and developer reference
```

### Core Technologies
- **WebGL2 & Three.js (`0.170.0`):** Core rendering engine utilizing modern WebGL2 features and official Three.js add-ons (`BufferGeometryUtils`, `GLTFExporter`, `DRACOLoader`, `MeshoptDecoder`, `KTX2Loader`).
- **Tailwind CSS (CDN):** Responsive obsidian studio UI framework with custom color tokens.
- **File System Access API:** Chromium-native local folder streaming and direct disk write capabilities.
- **IndexedDB:** Persistent storage for user project directory permissions across sessions.
- **Vanilla ES Modules:** Modular architecture with zero build steps, zero node dependencies, and instant browser reloading.

---

## License

Created by **BoostedByCaffeine Studios**. Released for indie game developers, 3D artists, and creative technologists.
