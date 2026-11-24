// =========================================================================
// 6. PROCEDURAL DEMO ASSETS (klasik3d, Brewing Bad, PBR + WebGL2 GLSL3)
// =========================================================================

import * as THREE from 'three';
import { isWebGL2 } from './scene.js';

export function createKlasikScreenTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c1626';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#182b49';
  for (let y = 36; y < 64; y += 4) ctx.fillRect(0, y, 64, 1);
  for (let x = 0; x < 64; x += 8) ctx.fillRect(x, 36, 1, 28);

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(24, 12, 16, 16);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(24, 22, 16, 6);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(6, 6, 52, 2);
  ctx.fillRect(6, 56, 52, 2);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('K3D', 20, 49);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  return tex;
}

export function buildKlasik3dDemo() {
  const group = new THREE.Group();
  group.name = 'Klasik3D_ArcadeRelic';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x262d3d,
    roughness: 0.72,
    metalness: 0.18,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.88,
    flatShading: true,
  });
  const cyanTrimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.5,
  });

  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.65, 0.24, 8), stoneMat);
  base1.name = 'Pedestal_BaseLower';
  base1.position.y = 0.12;
  group.add(base1);

  const baseTrim = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.38, 0.08, 8), goldMat);
  baseTrim.name = 'Pedestal_GoldTrim';
  baseTrim.position.y = 0.28;
  group.add(baseTrim);

  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.22, 8), stoneMat);
  base2.name = 'Pedestal_BaseUpper';
  base2.position.y = 0.43;
  group.add(base2);

  const consoleGroup = new THREE.Group();
  consoleGroup.name = 'Retro_TerminalUnit';
  consoleGroup.position.set(0, 0.54, 0.48);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.55,
    metalness: 0.25,
    flatShading: true,
  });
  const consoleBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.52), bodyMat);
  consoleBody.name = 'Terminal_Chassis';
  consoleBody.position.y = 0.31;
  consoleGroup.add(consoleBody);

  const screenTex = createKlasikScreenTexture();
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissiveMap: screenTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.65,
    roughness: 0.22,
    metalness: 0.1,
  });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.44), screenMat);
  screenMesh.name = 'Terminal_CRTScreen';
  screenMesh.position.set(0, 0.34, 0.265);
  consoleGroup.add(screenMesh);

  const btnColors = [0xef4444, 0xf59e0b, 0x22c55e];
  btnColors.forEach((col, i) => {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.06, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.3 })
    );
    b.name = `Arcade_Button_${i + 1}`;
    b.position.set(-0.2 + i * 0.2, 0.64, 0.12);
    consoleGroup.add(b);
  });
  group.add(consoleGroup);

  const pillarsGroup = new THREE.Group();
  pillarsGroup.name = 'Faceted_Pillars';
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const r = 1.05;
    const pGroup = new THREE.Group();
    pGroup.name = `Pillar_${i + 1}`;
    pGroup.position.set(Math.cos(ang) * r, 0.54, Math.sin(ang) * r);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.35, 6), stoneMat);
    shaft.name = `PillarShaft_${i + 1}`;
    shaft.position.y = 0.675;
    pGroup.add(shaft);

    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), cyanTrimMat);
    cap.name = `PillarGem_${i + 1}`;
    cap.position.y = 1.48;
    pGroup.add(cap);

    pillarsGroup.add(pGroup);
  }
  group.add(pillarsGroup);

  const crystalPivot = new THREE.Group();
  crystalPivot.name = 'Relic_CrystalPivot';
  crystalPivot.position.set(0, 1.85, -0.15);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.75,
    roughness: 0.15,
    metalness: 0.65,
    flatShading: true,
  });
  const crystalCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), crystalMat);
  crystalCore.name = 'Relic_CrystalCore';
  crystalCore.scale.set(0.85, 1.35, 0.85);
  crystalPivot.add(crystalCore);

  const gyroRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 6, 16), goldMat);
  gyroRing.name = 'Relic_GyroRing';
  gyroRing.rotation.x = Math.PI / 3;
  crystalPivot.add(gyroRing);
  group.add(crystalPivot);

  const times = [0, 1.5, 3.0, 4.5, 6.0];
  const posTrack = new THREE.VectorKeyframeTrack(
    'Relic_CrystalPivot.position',
    times,
    [0, 1.85, -0.15, 0, 2.08, -0.15, 0, 1.85, -0.15, 0, 1.68, -0.15, 0, 1.85, -0.15]
  );
  const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
  const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0));
  const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
  const q3 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 1.5, 0));
  const rotTrack = new THREE.QuaternionKeyframeTrack(
    'Relic_CrystalCore.quaternion',
    times,
    [...q0.toArray(), ...q1.toArray(), ...q2.toArray(), ...q3.toArray(), ...q0.toArray()]
  );

  const r0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 3, 0, 0));
  const r1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 3, Math.PI, Math.PI / 2));
  const r2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 3, Math.PI * 2, Math.PI));
  const ringTrack = new THREE.QuaternionKeyframeTrack(
    'Relic_GyroRing.quaternion',
    [0, 3.0, 6.0],
    [...r0.toArray(), ...r1.toArray(), ...r2.toArray()]
  );

  const idleClip = new THREE.AnimationClip('Idle_Float_Spin', 6.0, [posTrack, rotTrack, ringTrack]);
  const pulseScale = new THREE.VectorKeyframeTrack(
    'Relic_CrystalCore.scale',
    [0, 0.75, 1.5],
    [0.85, 1.35, 0.85, 1.05, 1.58, 1.05, 0.85, 1.35, 0.85]
  );
  const pulseClip = new THREE.AnimationClip('Crystal_Overcharge', 1.5, [pulseScale]);

  return { scene: group, animations: [idleClip, pulseClip] };
}

export function buildBrewingBadDemo() {
  const group = new THREE.Group();
  group.name = 'BrewingBad_AlchemyRig';

  const castIronMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.68, metalness: 0.82 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd49b3b, roughness: 0.28, metalness: 0.92 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc26d3a, roughness: 0.32, metalness: 0.88 });
  const potionMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x05e68c,
    emissiveIntensity: 1.5,
    roughness: 0.14,
    metalness: 0.1,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd1fae5,
    roughness: 0.08,
    metalness: 0.0,
    transmission: 0.78,
    ior: 1.48,
    thickness: 0.35,
    transparent: true,
    opacity: 0.45,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const amberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xff8c00,
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0.2,
  });

  const burnerBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.42, 0.22, 6), castIronMat);
  burnerBase.name = 'Burner_HexBase';
  burnerBase.position.y = 0.11;
  group.add(burnerBase);

  const burnerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.14, 16), amberGlowMat);
  burnerCore.name = 'Burner_ThermalCore';
  burnerCore.position.y = 0.26;
  group.add(burnerCore);

  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.95, 8), castIronMat);
    leg.name = `Tripod_Leg_${i + 1}`;
    leg.position.set(Math.cos(ang) * 0.82, 0.62, Math.sin(ang) * 0.82);
    leg.rotation.z = Math.cos(ang) * 0.22;
    leg.rotation.x = -Math.sin(ang) * 0.22;
    group.add(leg);
  }

  const cradleRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.055, 12, 28), brassMat);
  cradleRing.name = 'Cradle_BrassRing';
  cradleRing.rotation.x = Math.PI / 2;
  cradleRing.position.y = 1.04;
  group.add(cradleRing);

  const flaskGroup = new THREE.Group();
  flaskGroup.name = 'Alchemist_FlaskAssembly';
  flaskGroup.position.y = 1.45;

  const liquidMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.71, 28, 22, 0, Math.PI * 2, Math.PI * 0.34, Math.PI * 0.66),
    potionMat
  );
  liquidMesh.name = 'Potion_LiquidVolume';
  flaskGroup.add(liquidMesh);

  const liquidTop = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), potionMat);
  liquidTop.name = 'Potion_SurfaceMeniscus';
  liquidTop.rotation.x = -Math.PI / 2;
  liquidTop.position.y = 0.34;
  flaskGroup.add(liquidTop);

  const glassBulb = new THREE.Mesh(new THREE.SphereGeometry(0.79, 32, 24), glassMat);
  glassBulb.name = 'Flask_GlassBulb';
  flaskGroup.add(glassBulb);

  const glassNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.62, 20, 1, true), glassMat);
  glassNeck.name = 'Flask_GlassNeck';
  glassNeck.position.y = 0.94;
  flaskGroup.add(glassNeck);

  const neckCollar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 10, 24), brassMat);
  neckCollar.name = 'Valve_BrassCollar';
  neckCollar.rotation.x = Math.PI / 2;
  neckCollar.position.y = 1.24;
  flaskGroup.add(neckCollar);

  const valveWheel = new THREE.Group();
  valveWheel.name = 'Valve_PressureWheel';
  valveWheel.position.set(0, 1.46, 0);

  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.032, 10, 20), copperMat);
  wheelRing.rotation.x = Math.PI / 2;
  valveWheel.add(wheelRing);

  const spoke1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), brassMat);
  spoke1.rotation.z = Math.PI / 2;
  valveWheel.add(spoke1);

  const spoke2 = spoke1.clone();
  spoke2.rotation.y = Math.PI / 2;
  valveWheel.add(spoke2);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.24, 12), brassMat);
  stem.position.y = -0.12;
  valveWheel.add(stem);
  flaskGroup.add(valveWheel);

  const bubblesGroup = new THREE.Group();
  bubblesGroup.name = 'Potion_Bubbles';
  const bubbleConfigs = [
    { x: -0.2, y: -0.1, z: 0.18, r: 0.08 },
    { x: 0.22, y: 0.05, z: -0.12, r: 0.065 },
    { x: 0.02, y: -0.25, z: -0.24, r: 0.09 },
    { x: -0.12, y: 0.16, z: -0.16, r: 0.055 },
  ];
  bubbleConfigs.forEach((b, idx) => {
    const bm = new THREE.Mesh(new THREE.SphereGeometry(b.r, 12, 12), potionMat);
    bm.name = `Bubble_${idx + 1}`;
    bm.position.set(b.x, b.y, b.z);
    bubblesGroup.add(bm);
  });
  flaskGroup.add(bubblesGroup);
  group.add(flaskGroup);

  const coilPts = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const angle = t * Math.PI * 6;
    const radius = 0.22;
    coilPts.push(new THREE.Vector3(1.12 + Math.cos(angle) * radius, 0.45 + t * 1.45, Math.sin(angle) * radius));
  }
  const coilCurve = new THREE.CatmullRomCurve3(coilPts);
  const coilMesh = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 80, 0.042, 10, false), copperMat);
  coilMesh.name = 'Condenser_CopperCoil';
  group.add(coilMesh);

  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.24, 2.66, 0),
    new THREE.Vector3(0.75, 2.75, 0),
    new THREE.Vector3(1.18, 2.45, 0),
    new THREE.Vector3(1.34, 1.9, 0),
  ]);
  const pipeMesh = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 28, 0.045, 10, false), brassMat);
  pipeMesh.name = 'Condenser_FeedPipe';
  group.add(pipeMesh);

  const sigilRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.018, 8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    })
  );
  sigilRing.name = 'Alchemy_SigilRing';
  sigilRing.position.set(0, 1.45, 0);
  sigilRing.rotation.x = Math.PI / 2.25;
  group.add(sigilRing);

  const bubTrack = new THREE.VectorKeyframeTrack(
    'Potion_Bubbles.position',
    [0, 1.2, 2.4],
    [0, -0.08, 0, 0, 0.16, 0, 0, -0.08, 0]
  );
  const s0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2.25, 0, 0));
  const s1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2.25, 0, Math.PI));
  const s2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2.25, 0, Math.PI * 2));
  const sigilTrack = new THREE.QuaternionKeyframeTrack(
    'Alchemy_SigilRing.quaternion',
    [0, 2.4, 4.8],
    [...s0.toArray(), ...s1.toArray(), ...s2.toArray()]
  );
  const simmerClip = new THREE.AnimationClip('Brewing_Simmer', 4.8, [bubTrack, sigilTrack]);

  const v0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
  const v1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
  const v2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 2, 0));
  const valveTrack = new THREE.QuaternionKeyframeTrack(
    'Valve_PressureWheel.quaternion',
    [0, 1.0, 2.0],
    [...v0.toArray(), ...v1.toArray(), ...v2.toArray()]
  );
  const pressureClip = new THREE.AnimationClip('Valve_Overpressure', 2.0, [valveTrack, bubTrack]);

  return { scene: group, animations: [simmerClip, pressureClip] };
}

export function buildCalibrationDemo() {
  const group = new THREE.Group();
  group.name = 'PBR_WebGL2_CalibrationRig';

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, roughness: 0.4, metalness: 0.65 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.16, 48), plinthMat);
  plinth.name = 'Calibration_Plinth';
  plinth.position.y = 0.08;
  group.add(plinth);

  const sphereGroup = new THREE.Group();
  sphereGroup.name = 'PBR_RoughnessArc';
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const angle = -Math.PI * 0.36 + t * Math.PI * 0.72;
    const mat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0xe2e8f0 : 0x38bdf8,
      metalness: 1.0 - t * 0.85,
      roughness: 0.06 + t * 0.88,
    });
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), mat);
    sp.name = `CalibSphere_M${(1 - t * 0.85).toFixed(1)}_R${(0.06 + t * 0.88).toFixed(1)}`;
    sp.position.set(Math.sin(angle) * 1.22, 0.42, Math.cos(angle) * 1.22);
    sphereGroup.add(sp);
  }
  group.add(sphereGroup);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.32, 0.09, 100, 18),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.95, roughness: 0.18 })
  );
  knot.name = 'Gold_TorusKnot_Ref';
  knot.position.set(-0.95, 0.82, -0.65);
  group.add(knot);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.54, 0.54),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.0, roughness: 0.85 })
  );
  cube.name = 'Matte_AlbedoCube_Ref';
  cube.position.set(0.95, 0.45, -0.65);
  cube.rotation.y = Math.PI / 5;
  group.add(cube);

  const shaderUniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0x0ea5e9) },
    uColorB: { value: new THREE.Color(0x10b981) },
  };

  let coreMat;
  if (isWebGL2) {
    coreMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: shaderUniforms,
      vertexShader: /* glsl */ `
        out vec3 vNormalW;
        out vec3 vViewPos;
        out vec3 vLocalPos;
        uniform float uTime;
        void main() {
          vLocalPos = position;
          float ripple = sin(position.y * 8.0 + uTime * 2.6) * 0.032 + cos(position.x * 7.0 - uTime * 2.1) * 0.025;
          vec3 displaced = position + normal * ripple;
          vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
          vViewPos = -mvPosition.xyz;
          vNormalW = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        in vec3 vNormalW;
        in vec3 vViewPos;
        in vec3 vLocalPos;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        out vec4 fragColor;
        void main() {
          vec3 N = normalize(vNormalW);
          vec3 V = normalize(vViewPos);
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.4);
          float band = 0.5 + 0.5 * sin(vLocalPos.y * 12.0 - uTime * 3.2);
          vec3 base = mix(uColorA, uColorB, band);
          vec3 col = base * (0.35 + 0.65 * max(N.y * 0.5 + 0.5, 0.0)) + vec3(0.75, 0.96, 1.0) * fresnel * 1.15;
          fragColor = vec4(col, 1.0);
        }
      `,
    });
  } else {
    coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.5,
    });
  }

  const shaderCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 5), coreMat);
  shaderCore.name = 'WebGL2_GLSL3_ShaderCore';
  shaderCore.position.set(0, 1.15, 0);
  shaderCore.userData.shaderUniforms = shaderUniforms;
  group.add(shaderCore);

  const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
  const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
  const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 2, 0));
  const knotTrack = new THREE.QuaternionKeyframeTrack(
    'Gold_TorusKnot_Ref.quaternion',
    [0, 3.0, 6.0],
    [...q0.toArray(), ...q1.toArray(), ...q2.toArray()]
  );
  const sweepClip = new THREE.AnimationClip('Calibration_Sweep', 6.0, [knotTrack]);

  return { scene: group, animations: [sweepClip], shaderUniforms: [shaderUniforms] };
}

export const DEMO_ASSETS = [
  {
    id: 'demo-klasik3d',
    name: 'Retro Arcade Relic',
    subtitle: 'Built-in Demo • Faceted + CRT Texture',
    format: 'PROC',
    project: 'klasik3d',
    sourceType: 'demo',
    builder: buildKlasik3dDemo,
  },
  {
    id: 'demo-brewingbad',
    name: 'Alchemist Flask Rig',
    subtitle: 'Built-in Demo • Glass + Emissive Brew',
    format: 'PROC',
    project: 'brewingbad',
    sourceType: 'demo',
    builder: buildBrewingBadDemo,
  },
  {
    id: 'demo-calibration',
    name: 'PBR & WebGL2 Shader Rig',
    subtitle: 'Built-in Demo • GLSL3 + Roughness Arc',
    format: 'GLSL3',
    project: 'all',
    sourceType: 'demo',
    builder: buildCalibrationDemo,
  },
];
