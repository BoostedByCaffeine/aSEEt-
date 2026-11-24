// =========================================================================
// CUSTOM STUDIO PROFILES (localStorage Persistence + JSON Import/Export)
// =========================================================================

import { dom, showToast } from './dom.js';
import { state, WORKSPACE_PRESETS } from './state.js';
import {
  keyLight,
  fillLight,
  rimLight,
  renderer,
  lightRig,
  requestRender,
  applyToneMapping,
  applyBackdropMode,
} from './scene.js';
import { applyLabFog, applyEmissiveBoost, applyEnvBackdrop } from './materials.js';
import { applyWorkspacePreset } from './ui.js';

const STORAGE_KEY = 'aSEEt_CustomStudioProfiles_v1';

function captureCurrentStudioSnapshot(name = 'Default Custom') {
  return {
    id: `prof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    keyColor: `#${keyLight.color.getHexString()}`,
    keyIntensity: Number(keyLight.intensity.toFixed(2)),
    fillColor: `#${fillLight.color.getHexString()}`,
    fillIntensity: Number(fillLight.intensity.toFixed(2)),
    rimColor: `#${rimLight.color.getHexString()}`,
    rimIntensity: Number(rimLight.intensity.toFixed(2)),
    rigAzimuthDeg: state.rigAzimuthDeg,
    envIntensity: state.envIntensity,
    envRotationDeg: state.envRotationDeg,
    toneMapping: dom.toneMappingSelect.value || 'AgX',
    exposure: Number(renderer.toneMappingExposure.toFixed(2)),
    labFog: state.labFog,
    emissiveBoost: state.emissiveBoost,
    backdropMode: state.backdropMode,
    customBgColor: state.customBgColor,
    showEnvBackdrop: state.showEnvBackdrop,
    envBackdropBlur: state.envBackdropBlur,
  };
}

function saveProfilesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeId: state.activeCustomProfileId,
      profiles: state.customProfiles,
    }));
  } catch (err) {
    console.warn('Could not persist custom studio profiles:', err);
  }
}

export function initCustomStudioProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        state.customProfiles = parsed.profiles;
        state.activeCustomProfileId = parsed.activeId || parsed.profiles[0].id;
      }
    }
  } catch (err) {
    console.warn('Corrupt custom profiles ignored:', err);
  }

  if (state.customProfiles.length === 0) {
    state.customProfiles = [
      {
        id: 'default-custom',
        name: 'Default Custom',
        ...WORKSPACE_PRESETS.custom,
        rigAzimuthDeg: 0,
        envRotationDeg: 0,
        backdropMode: 'preset',
        customBgColor: '#121622',
        showEnvBackdrop: false,
        envBackdropBlur: 0.08,
      },
    ];
    state.activeCustomProfileId = 'default-custom';
  }

  renderCustomProfilesSelect();
}

export function renderCustomProfilesSelect() {
  if (!dom.customProfileSelect) return;
  dom.customProfileSelect.innerHTML = '';
  state.customProfiles.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    opt.selected = p.id === state.activeCustomProfileId;
    dom.customProfileSelect.appendChild(opt);
  });
}

export function applyCustomProfileById(id, announce = true) {
  const profile = state.customProfiles.find((p) => p.id === id);
  if (!profile) return;

  state.activeCustomProfileId = profile.id;
  Object.assign(WORKSPACE_PRESETS.custom, {
    label: profile.name,
    keyColor: profile.keyColor,
    keyIntensity: profile.keyIntensity,
    fillColor: profile.fillColor,
    fillIntensity: profile.fillIntensity,
    rimColor: profile.rimColor,
    rimIntensity: profile.rimIntensity,
    envIntensity: profile.envIntensity,
    toneMapping: profile.toneMapping,
    exposure: profile.exposure,
    labFog: Boolean(profile.labFog),
    emissiveBoost: profile.emissiveBoost ?? 1.0,
  });

  applyWorkspacePreset('custom', false);

  state.rigAzimuthDeg = profile.rigAzimuthDeg || 0;
  lightRig.rotation.y = (state.rigAzimuthDeg * Math.PI) / 180;
  dom.rigAzimuthSlider.value = state.rigAzimuthDeg;
  dom.rigAzimuthVal.textContent = `${state.rigAzimuthDeg}°`;

  state.backdropMode = profile.backdropMode || 'preset';
  state.customBgColor = profile.customBgColor || '#121622';
  dom.customBgPicker.value = state.customBgColor;
  applyBackdropMode();

  if (profile.toneMapping) applyToneMapping(profile.toneMapping);
  applyLabFog();
  applyEmissiveBoost();

  state.showEnvBackdrop = Boolean(profile.showEnvBackdrop);
  state.envBackdropBlur = profile.envBackdropBlur ?? 0.08;
  applyEnvBackdrop();

  saveProfilesToStorage();
  renderCustomProfilesSelect();
  requestRender();
  if (announce) showToast(`Applied studio profile "${profile.name}"`, 'info', 2000);
}

export function saveCurrentAsCustomProfile() {
  const enteredName = dom.customProfileNameInput?.value.trim();
  const active = state.customProfiles.find((p) => p.id === state.activeCustomProfileId);
  const name = enteredName || (active ? active.name : 'My Studio');

  const snapshot = captureCurrentStudioSnapshot(name);

  const existingIdx = state.customProfiles.findIndex(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  if (existingIdx >= 0) {
    snapshot.id = state.customProfiles[existingIdx].id;
    state.customProfiles[existingIdx] = snapshot;
  } else {
    state.customProfiles.push(snapshot);
  }

  state.activeCustomProfileId = snapshot.id;
  if (dom.customProfileNameInput) dom.customProfileNameInput.value = '';
  saveProfilesToStorage();
  applyCustomProfileById(snapshot.id, false);
  showToast(`Saved Custom Studio profile "${snapshot.name}"`, 'success', 2200);
}

export function deleteSelectedCustomProfile() {
  if (state.customProfiles.length <= 1) {
    showToast('At least one Custom Studio profile must remain.', 'warn');
    return;
  }
  const target = state.customProfiles.find((p) => p.id === state.activeCustomProfileId);
  state.customProfiles = state.customProfiles.filter((p) => p.id !== state.activeCustomProfileId);
  state.activeCustomProfileId = state.customProfiles[0].id;
  saveProfilesToStorage();
  applyCustomProfileById(state.activeCustomProfileId, false);
  showToast(`Deleted profile "${target?.name || 'Custom'}"`, 'info', 2000);
}

export function exportCustomProfilesJson() {
  const payload = JSON.stringify({ version: 1, profiles: state.customProfiles }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aSEEt_studio_profiles.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Exported studio profiles JSON', 'success', 2000);
}

export async function importCustomProfilesJson(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.profiles;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('No valid profiles array found');
    }
    list.forEach((p) => {
      if (!p || !p.name) return;
      const idx = state.customProfiles.findIndex((x) => x.name.toLowerCase() === p.name.toLowerCase());
      const merged = { ...captureCurrentStudioSnapshot(p.name), ...p };
      if (idx >= 0) state.customProfiles[idx] = merged;
      else state.customProfiles.push(merged);
    });
    saveProfilesToStorage();
    renderCustomProfilesSelect();
    showToast(`Imported ${list.length} studio profile(s)`, 'success', 2400);
  } catch (err) {
    showToast(`Profile import failed: ${err.message}`, 'error', 3500);
  }
}
