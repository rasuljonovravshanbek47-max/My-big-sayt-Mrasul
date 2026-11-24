import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useUniverse } from '../context/UniverseContext';

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createPlanetTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#071029');
  grad.addColorStop(0.5, '#0c1c47');
  grad.addColorStop(1, '#08122d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle orbital latitude/longitude lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Luminous digital continents / nodes
  for (let i = 0; i < 42; i++) {
    const cx = ((i * 197) % 940) + 40;
    const cy = ((i * 113) % 390) + 60;
    const r = 18 + (i % 5) * 14;
    const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    radGrad.addColorStop(0, i % 3 === 0 ? 'rgba(34, 211, 238, 0.72)' : 'rgba(99, 102, 241, 0.52)');
    radGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp glowing data dots
  for (let i = 0; i < 160; i++) {
    const x = (i * 269) % 1024;
    const y = (i * 157) % 512;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(103, 232, 249, 0.9)' : 'rgba(129, 140, 248, 0.65)';
    ctx.fillRect(x, y, 2.5, 2.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

const _dummy = new THREE.Object3D();

export function UniverseHero3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { reducedMotion } = useUniverse();
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 8.2);

    // 3-point studio lighting
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    keyLight.position.set(6, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 1.8);
    rimLight.position.set(-6, -3, -5);
    scene.add(rimLight);

    // Composite Digital Planet Group
    const universeGroup = new THREE.Group();
    scene.add(universeGroup);

    const planetTex = createPlanetTexture(renderer.capabilities.getMaxAnisotropy());
    const planetGeo = new THREE.SphereGeometry(1.75, 48, 48);
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      roughness: 0.35,
      metalness: 0.45,
      emissive: new THREE.Color(0x0b2545),
      emissiveIntensity: 0.45,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    universeGroup.add(planetMesh);

    // Atmosphere outer rim shell
    const atmoGeo = new THREE.SphereGeometry(1.9, 40, 40);
    const atmoMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.renderOrder = 2;
    universeGroup.add(atmoMesh);

    // 3 Rotating Glowing Orbital Rings
    const ring1Geo = new THREE.TorusGeometry(2.65, 0.032, 16, 120);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      metalness: 0.85,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.set(Math.PI * 0.38, Math.PI * 0.12, 0);
    universeGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(3.15, 0.02, 12, 120);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      emissive: 0x4f46e5,
      emissiveIntensity: 1.1,
      metalness: 0.9,
      roughness: 0.18,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.set(-Math.PI * 0.28, Math.PI * 0.25, 0);
    universeGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(3.65, 0.015, 12, 120);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.85,
      metalness: 0.7,
      roughness: 0.3,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.set(Math.PI * 0.14, -Math.PI * 0.35, 0);
    universeGroup.add(ring3);

    // Composite Satellite Nodes (3-part groups)
    const satellites: { pivot: THREE.Group; speed: number }[] = [];
    const satConfigs = [
      { radius: 2.65, tiltX: Math.PI * 0.38, color: 0x22d3ee, speed: 0.65 },
      { radius: 3.15, tiltX: -Math.PI * 0.28, color: 0x818cf8, speed: -0.45 },
      { radius: 3.65, tiltX: Math.PI * 0.14, color: 0x38bdf8, speed: 0.32 },
    ];

    satConfigs.forEach((cfg) => {
      const pivot = new THREE.Group();
      pivot.rotation.x = cfg.tiltX;
      const satGroup = new THREE.Group();
      satGroup.position.set(cfg.radius, 0, 0);

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshStandardMaterial({
          color: cfg.color,
          emissive: cfg.color,
          emissiveIntensity: 1.2,
          metalness: 0.8,
          roughness: 0.15,
        })
      );
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.016, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
      );
      collar.rotation.x = Math.PI / 2;
      satGroup.add(core, collar);
      pivot.add(satGroup);
      universeGroup.add(pivot);
      satellites.push({ pivot, speed: cfg.speed });
    });

    // Instanced Floating Particle Field (220 particles)
    const particleCount = 220;
    const pGeo = new THREE.OctahedronGeometry(0.032, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.3,
      roughness: 0.25,
      metalness: 0.5,
    });
    const particles = new THREE.InstancedMesh(pGeo, pMat, particleCount);
    particles.frustumCulled = false;

    const pData: { angle: number; radius: number; y: number; speed: number; scale: number }[] = [];
    const tmpColor = new THREE.Color();
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (i % 7) * 0.3;
      const radius = 3.2 + (i % 19) * 0.24;
      const y = ((i % 23) - 11) * 0.26;
      const speed = 0.08 + (i % 5) * 0.025;
      const scale = 0.65 + (i % 4) * 0.25;
      pData.push({ angle, radius, y, speed, scale });

      _dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      particles.setMatrixAt(i, _dummy.matrix);
      tmpColor.setHex(i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0x818cf8 : 0x38bdf8);
      particles.setColorAt(i, tmpColor);
    }
    particles.instanceMatrix.needsUpdate = true;
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
    particles.computeBoundingSphere();
    scene.add(particles);

    // Pointer interaction
    let targetPtrX = 0;
    let targetPtrY = 0;
    let smoothPtrX = 0;
    let smoothPtrY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetPtrX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetPtrY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const motionMult = reducedRef.current ? 0.1 : 1;

      smoothPtrX = THREE.MathUtils.damp(smoothPtrX, targetPtrX, 4, delta);
      smoothPtrY = THREE.MathUtils.damp(smoothPtrY, targetPtrY, 4, delta);

      planetMesh.rotation.y += delta * 0.18 * motionMult;
      ring1.rotation.z += delta * 0.25 * motionMult;
      ring2.rotation.z -= delta * 0.18 * motionMult;
      ring3.rotation.z += delta * 0.12 * motionMult;

      for (const sat of satellites) {
        sat.pivot.rotation.y += delta * sat.speed * motionMult;
      }

      if (!reducedRef.current) {
        for (let i = 0; i < particleCount; i++) {
          const p = pData[i];
          p.angle += delta * p.speed;
          _dummy.position.set(Math.cos(p.angle) * p.radius, p.y, Math.sin(p.angle) * p.radius);
          _dummy.rotation.set(p.angle, p.angle * 0.7, 0);
          _dummy.scale.setScalar(p.scale);
          _dummy.updateMatrix();
          particles.setMatrixAt(i, _dummy.matrix);
        }
        particles.instanceMatrix.needsUpdate = true;
      }

      universeGroup.rotation.y = smoothPtrX * 0.28;
      universeGroup.rotation.x = smoothPtrY * 0.18;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, smoothPtrX * 0.45, 3, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.5 - smoothPtrY * 0.3, 3, delta);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      planetGeo.dispose();
      planetMat.dispose();
      planetTex.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      pGeo.dispose();
      pMat.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  if (webglUnavailable) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0b1736] to-slate-950 rounded-2xl border border-white/10">
        <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-cyan-500/30 via-indigo-500/40 to-sky-300/30 border border-cyan-400/30 shadow-[0_0_80px_rgba(6,182,212,0.25)]" />
      </div>
    );
  }

  return <div ref={mountRef} className="w-full h-full min-h-[340px]" aria-label="Interactive 3D MRASUL UNIVERSE planet" />;
}
