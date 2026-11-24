import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArrowLeft, ArrowRight, RotateCcw, Zap } from 'lucide-react';
import { gameFx } from '../../lib/audioFx';

interface CarSpec {
  id: string;
  name: string;
  color: number;
  accent: number;
  maxSpeed: number;
  handling: number;
}

const CARS: CarSpec[] = [
  { id: 'apex', name: 'Apex Cyan GT', color: 0x0f172a, accent: 0x06b6d4, maxSpeed: 210, handling: 1.0 },
  { id: 'obsidian', name: 'Obsidian V12', color: 0x1e1b4b, accent: 0x818cf8, maxSpeed: 235, handling: 0.92 },
  { id: 'solar', name: 'Solar Pulse', color: 0x1f2937, accent: 0xf59e0b, maxSpeed: 220, handling: 1.08 },
];

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

function buildCompositeCar(bodyColor: number, accentColor: number): { group: THREE.Group; wheels: THREE.Mesh[] } {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.85, roughness: 0.22 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.7,
    metalness: 0.6,
    roughness: 0.25,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    metalness: 0.2,
    roughness: 0.08,
    clearcoat: 1,
    transparent: true,
    opacity: 0.78,
  });

  // 1. Main lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, 3.3), bodyMat);
  chassis.position.y = 0.38;
  group.add(chassis);

  // 2. Sculpted nose hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.2, 1.15), bodyMat);
  hood.position.set(0, 0.56, -0.95);
  hood.rotation.x = 0.08;
  group.add(hood);

  // 3. Canopy cabin
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.36, 1.45), glassMat);
  canopy.position.set(0, 0.7, 0.1);
  group.add(canopy);

  // 4. Side neon trim rails
  const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 2.9), accentMat);
  trimL.position.set(-0.77, 0.34, 0);
  const trimR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 2.9), accentMat);
  trimR.position.set(0.77, 0.34, 0);
  group.add(trimL, trimR);

  // 5. Rear aerodynamic wing
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.36), accentMat);
  wing.position.set(0, 0.85, 1.45);
  group.add(wing);

  // 6. Headlights & Taillights
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 2 });
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xef4444, emissiveIntensity: 2 });
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.08), hlMat);
  hlL.position.set(-0.46, 0.45, -1.65);
  const hlR = hlL.clone();
  hlR.position.x = 0.46;
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.08), tlMat);
  tlL.position.set(-0.46, 0.45, 1.65);
  const tlR = tlL.clone();
  tlR.position.x = 0.46;
  group.add(hlL, hlR, tlL, tlR);

  // 7. 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.75, metalness: 0.2 });
  const wheels: THREE.Mesh[] = [];
  const positions: [number, number, number][] = [
    [-0.78, 0.32, -1.0],
    [0.78, 0.32, -1.0],
    [-0.78, 0.32, 1.0],
    [0.78, 0.32, 1.0],
  ];
  for (const [wx, wy, wz] of positions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, wy, wz);
    group.add(w);
    wheels.push(w);
  }

  return { group, wheels };
}

export function MrasulRacingGame({ title }: { title: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);
  const [trackTheme, setTrackTheme] = useState<'midnight' | 'skyway'>('midnight');
  const [hud, setHud] = useState({ speed: 0, score: 0, distance: 0, boost: 100, shield: 3 });

  const inputRef = useRef({ left: false, right: false, boost: false });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const carIdxRef = useRef(selectedCarIdx);
  carIdxRef.current = selectedCarIdx;

  const trackRef = useRef(trackTheme);
  trackRef.current = trackTheme;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.boost = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.boost = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, powerPreference: 'high-performance' });
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 480;
    renderer.setSize(w, h);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const isMidnight = trackRef.current === 'midnight';
    const bgHex = isMidnight ? 0x040712 : 0x0b1636;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.015);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 180);
    camera.position.set(0, 3.6, 7.2);

    const hemi = new THREE.HemisphereLight(isMidnight ? 0x38bdf8 : 0x93c5fd, 0x0f172a, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(8, 14, 10);
    scene.add(hemi, key);

    // Road surface
    const roadGeo = new THREE.PlaneGeometry(14, 240);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.35, metalness: 0.3 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.z = -90;
    scene.add(road);

    // Ground shoulder
    const groundGeo = new THREE.PlaneGeometry(180, 240);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: isMidnight ? 0x03060f : 0x09132c, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -0.04, -90);
    scene.add(ground);

    // Dashed center lines + edge rails
    const stripes: THREE.Mesh[] = [];
    const stripeGeo = new THREE.BoxGeometry(0.22, 0.02, 3.2);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 0.9 });
    for (let i = 0; i < 18; i++) {
      const sL = new THREE.Mesh(stripeGeo, stripeMat);
      sL.position.set(-2.3, 0.02, -i * 12);
      const sR = new THREE.Mesh(stripeGeo, stripeMat);
      sR.position.set(2.3, 0.02, -i * 12);
      scene.add(sL, sR);
      stripes.push(sL, sR);
    }

    // Side pylons
    const pylons: THREE.Mesh[] = [];
    const pylonGeo = new THREE.BoxGeometry(0.28, 3.4, 0.28);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: isMidnight ? 0x22d3ee : 0x818cf8,
      emissive: isMidnight ? 0x0891b2 : 0x4f46e5,
      emissiveIntensity: 1.2,
    });
    for (let i = 0; i < 16; i++) {
      const pL = new THREE.Mesh(pylonGeo, pylonMat);
      pL.position.set(-7.6, 1.7, -i * 14);
      const pR = new THREE.Mesh(pylonGeo, pylonMat);
      pR.position.set(7.6, 1.7, -i * 14);
      scene.add(pL, pR);
      pylons.push(pL, pR);
    }

    const carSpec = CARS[carIdxRef.current] || CARS[0];
    const player = buildCompositeCar(carSpec.color, carSpec.accent);
    player.group.position.set(0, 0, 1.5);
    scene.add(player.group);

    // Rival traffic cars & boost orbs
    const rivals: { mesh: THREE.Group; speed: number; laneX: number }[] = [];
    const laneXs = [-4.5, 0, 4.5];
    for (let i = 0; i < 5; i++) {
      const rCar = buildCompositeCar(0x334155, 0xf43f5e);
      const laneX = laneXs[i % 3];
      rCar.group.position.set(laneX, 0, -28 - i * 34);
      scene.add(rCar.group);
      rivals.push({ mesh: rCar.group, speed: 18 + (i % 3) * 4, laneX });
    }

    const boostPads: THREE.Mesh[] = [];
    const padGeo = new THREE.OctahedronGeometry(0.65, 0);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.8,
      metalness: 0.7,
      roughness: 0.15,
    });
    for (let i = 0; i < 3; i++) {
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(laneXs[(i + 1) % 3], 0.9, -45 - i * 55);
      scene.add(pad);
      boostPads.push(pad);
    }

    let playerX = 0;
    let speed = 95;
    let distance = 0;
    let score = 0;
    let boost = 100;
    let shield = 3;
    let invuln = 0;
    let hudTimer = 0;

    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 800;
      const nh = container.clientHeight || 480;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

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
        if (state === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed || phaseRef.current !== 'playing') return;
      const dt = Math.min(clock.getDelta(), 0.08);
      if (invuln > 0) invuln -= dt;

      const boosting = inputRef.current.boost && boost > 2;
      if (boosting) {
        boost = Math.max(0, boost - dt * 28);
        if (Math.random() < 0.08) gameFx.boost();
      } else {
        boost = Math.min(100, boost + dt * 7);
      }

      const targetSpeed = boosting ? carSpec.maxSpeed * 1.32 : carSpec.maxSpeed;
      speed = THREE.MathUtils.damp(speed, targetSpeed, 2.2, dt);
      const worldScroll = (speed / 3.6) * dt;

      const steer = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
      playerX = THREE.MathUtils.clamp(playerX + steer * 11 * carSpec.handling * dt, -5.2, 5.2);
      player.group.position.x = THREE.MathUtils.damp(player.group.position.x, playerX, 12, dt);
      player.group.rotation.z = THREE.MathUtils.damp(player.group.rotation.z, -steer * 0.14, 10, dt);

      for (const wh of player.wheels) {
        wh.rotation.x -= worldScroll * 1.4;
      }

      // Dynamic FOV widening on boost
      camera.fov = THREE.MathUtils.damp(camera.fov, boosting ? 72 : 62, 5, dt);
      camera.updateProjectionMatrix();
      camera.position.x = THREE.MathUtils.damp(camera.position.x, player.group.position.x * 0.55, 6, dt);
      camera.lookAt(player.group.position.x * 0.35, 0.9, -12);

      for (const s of stripes) {
        s.position.z += worldScroll;
        if (s.position.z > 12) s.position.z -= 216;
      }
      for (const p of pylons) {
        p.position.z += worldScroll;
        if (p.position.z > 14) p.position.z -= 224;
      }

      for (const pad of boostPads) {
        pad.position.z += worldScroll;
        pad.rotation.y += dt * 3;
        if (Math.abs(pad.position.z - player.group.position.z) < 2.1 && Math.abs(pad.position.x - player.group.position.x) < 1.5) {
          boost = Math.min(100, boost + 35);
          score += 150;
          gameFx.success();
          pad.position.z = -150 - Math.random() * 50;
          pad.position.x = laneXs[Math.floor(Math.random() * laneXs.length)];
        }
        if (pad.position.z > 12) {
          pad.position.z = -150 - Math.random() * 40;
          pad.position.x = laneXs[Math.floor(Math.random() * laneXs.length)];
        }
      }

      for (const r of rivals) {
        r.mesh.position.z += worldScroll - r.speed * dt;
        if (
          invuln <= 0 &&
          Math.abs(r.mesh.position.z - player.group.position.z) < 2.8 &&
          Math.abs(r.mesh.position.x - player.group.position.x) < 1.35
        ) {
          shield -= 1;
          invuln = 1.4;
          speed *= 0.55;
          gameFx.fail();
          r.mesh.position.z = -165;
          if (shield <= 0) {
            setHud({ speed: 0, score: Math.round(score), distance: Math.round(distance), boost: Math.round(boost), shield: 0 });
            setPhase('gameover');
            return;
          }
        }
        if (r.mesh.position.z > 14) {
          r.mesh.position.z = -140 - Math.random() * 60;
          r.mesh.position.x = laneXs[Math.floor(Math.random() * laneXs.length)];
        }
      }

      player.group.visible = invuln <= 0 || Math.floor(invuln * 10) % 2 === 0;

      distance += worldScroll;
      score += worldScroll * 1.8;

      hudTimer += dt;
      if (hudTimer > 0.08) {
        hudTimer = 0;
        setHud({
          speed: Math.round(speed),
          score: Math.round(score),
          distance: Math.round(distance),
          boost: Math.round(boost),
          shield,
        });
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      envTex.dispose();
      renderer.dispose();
    };
  }, [phase]);

  const startRace = () => {
    gameFx.click();
    setHud({ speed: 0, score: 0, distance: 0, boost: 100, shield: 3 });
    setPhase('playing');
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden bg-[#050814] border border-white/10 select-none">
      <div ref={mountRef} className="w-full h-full" />

      {phase === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-white text-center">
          <h3 className="font-display text-2xl font-bold tracking-tight mb-1">{title}</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            Steer with A/D or Arrow Keys. Hold Space for Turbo Boost and dodge rival hypercars.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mb-5">
            {CARS.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCarIdx(idx)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  selectedCarIdx === idx
                    ? 'border-cyan-400 bg-cyan-500/15'
                    : 'border-white/10 bg-white/5 hover:border-white/25'
                }`}
              >
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-slate-400 mt-1 font-mono-tabular">
                  Top {c.maxSpeed} km/h · Handling {Math.round(c.handling * 100)}%
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setTrackTheme('midnight')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                trackTheme === 'midnight'
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'border-white/10 text-slate-300'
              }`}
            >
              Midnight Coastal Circuit
            </button>
            <button
              type="button"
              onClick={() => setTrackTheme('skyway')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                trackTheme === 'skyway'
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/10 text-slate-300'
              }`}
            >
              Neon Skyway
            </button>
          </div>

          <button
            type="button"
            onClick={startRace}
            className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors"
          >
            Start Race
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-3 pointer-events-none">
            <div className="px-3 py-2 rounded-lg bg-black/65 border border-white/15 text-white font-mono-tabular text-xs flex items-center gap-4">
              <span>Speed: <strong className="text-cyan-400">{hud.speed} km/h</strong></span>
              <span>Score: <strong>{hud.score}</strong></span>
              <span>Dist: <strong>{hud.distance} m</strong></span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-black/65 border border-white/15 text-white font-mono-tabular text-xs flex items-center gap-3">
              <span>Boost: <strong className="text-cyan-400">{hud.boost}%</strong></span>
              <span>Shield: <strong className="text-rose-400">{hud.shield}/3</strong></span>
            </div>
          </div>

          {/* Mobile / Touch controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={() => (inputRef.current.left = true)}
                onPointerUp={() => (inputRef.current.left = false)}
                onPointerLeave={() => (inputRef.current.left = false)}
                className="w-12 h-12 rounded-xl bg-black/70 border border-white/20 text-white flex items-center justify-center active:bg-cyan-500/40"
                aria-label="Steer Left"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onPointerDown={() => (inputRef.current.right = true)}
                onPointerUp={() => (inputRef.current.right = false)}
                onPointerLeave={() => (inputRef.current.right = false)}
                className="w-12 h-12 rounded-xl bg-black/70 border border-white/20 text-white flex items-center justify-center active:bg-cyan-500/40"
                aria-label="Steer Right"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onPointerDown={() => (inputRef.current.boost = true)}
              onPointerUp={() => (inputRef.current.boost = false)}
              onPointerLeave={() => (inputRef.current.boost = false)}
              className="px-4 h-12 rounded-xl bg-cyan-500/85 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Turbo
            </button>
          </div>
        </>
      )}

      {phase === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-white text-center">
          <h3 className="font-display text-2xl font-bold mb-2">Race Complete</h3>
          <p className="text-slate-300 text-sm mb-4 font-mono-tabular">
            Final Score: <strong className="text-cyan-400">{hud.score}</strong> · Distance: <strong>{hud.distance} m</strong>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startRace}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
            <button
              type="button"
              onClick={() => setPhase('menu')}
              className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium"
            >
              Change Car
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
