// =========================================================================
// 12. INTERACTIVE 3D ORIENTATION AXES GIZMO
// =========================================================================

import * as THREE from 'three';
import { dom } from './dom.js';
import { activeCamera, snapCameraPreset } from './scene.js';

const gizmoCtx = dom.gizmoCanvas.getContext('2d');
const gizmoAxes = [
  { label: 'X', vec: new THREE.Vector3(1, 0, 0), color: '#f43f5e', view: 'right' },
  { label: '-X', vec: new THREE.Vector3(-1, 0, 0), color: '#881337', view: 'left', minor: true },
  { label: 'Y', vec: new THREE.Vector3(0, 1, 0), color: '#10b981', view: 'top' },
  { label: '-Y', vec: new THREE.Vector3(0, -1, 0), color: '#064e3b', view: 'bottom', minor: true },
  { label: 'Z', vec: new THREE.Vector3(0, 0, 1), color: '#38bdf8', view: 'front' },
  { label: '-Z', vec: new THREE.Vector3(0, 0, -1), color: '#0c4a6e', view: 'back', minor: true },
];
let gizmoHitTargets = [];

export function renderAxesGizmo() {
  const w = dom.gizmoCanvas.width;
  const h = dom.gizmoCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = 54;

  gizmoCtx.clearRect(0, 0, w, h);

  const invQ = activeCamera.quaternion.clone().invert();
  const projected = gizmoAxes.map((ax) => {
    const v = ax.vec.clone().applyQuaternion(invQ);
    return { ...ax, x: cx + v.x * radius, y: cy - v.y * radius, z: v.z };
  });

  projected.sort((a, b) => a.z - b.z);
  gizmoHitTargets = projected;

  projected.forEach((p) => {
    if (!p.minor) {
      gizmoCtx.beginPath();
      gizmoCtx.moveTo(cx, cy);
      gizmoCtx.lineTo(p.x, p.y);
      gizmoCtx.strokeStyle = p.color;
      gizmoCtx.lineWidth = 3.5;
      gizmoCtx.lineCap = 'round';
      gizmoCtx.stroke();
    }

    const r = p.minor ? 10 : 14;
    gizmoCtx.beginPath();
    gizmoCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
    gizmoCtx.fillStyle = p.color;
    gizmoCtx.fill();

    if (!p.minor) {
      gizmoCtx.fillStyle = '#07090d';
      gizmoCtx.font = 'bold 14px JetBrains Mono, monospace';
      gizmoCtx.textAlign = 'center';
      gizmoCtx.textBaseline = 'middle';
      gizmoCtx.fillText(p.label, p.x, p.y + 0.5);
    }
  });
}

export function initGizmo() {
  dom.gizmoCanvas.addEventListener('click', (e) => {
    const rect = dom.gizmoCanvas.getBoundingClientRect();
    const scaleX = dom.gizmoCanvas.width / rect.width;
    const scaleY = dom.gizmoCanvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (let i = gizmoHitTargets.length - 1; i >= 0; i--) {
      const p = gizmoHitTargets[i];
      const dist = Math.hypot(mx - p.x, my - p.y);
      if (dist <= 18) {
        snapCameraPreset(p.view);
        return;
      }
    }
    snapCameraPreset('iso');
  });
}
