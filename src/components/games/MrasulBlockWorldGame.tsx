import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Eraser, Hammer, RotateCcw } from 'lucide-react';
import { gameFx } from '../../lib/audioFx';

interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  matId: string;
}

const MATERIALS = [
  { id: 'grass', label: 'Emerald Grass', color: 0x10b981, emissive: 0x000000 },
  { id: 'stone', label: 'Basalt Stone', color: 0x475569, emissive: 0x000000 },
  { id: 'timber', label: 'Timber', color: 0x92400e, emissive: 0x000000 },
  { id: 'crystal', label: 'Cyan Crystal', color: 0x22d3ee, emissive: 0x0891b2 },
  { id: 'water', label: 'Sky Water', color: 0x38bdf8, emissive: 0x0284c7 },
  { id: 'sand', label: 'Sandstone', color: 0xfbbf24, emissive: 0x000000 },
  { id: 'gold', label: 'Solar Gold', color: 0xf59e0b, emissive: 0x78350f },
];

const STORAGE_KEY = 'mrasul_block_world_v1';

function getStarterIsland(): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      if (Math.abs(x) === 3 && Math.abs(z) === 3) continue;
      blocks.push({ x, y: 0, z, matId: 'grass' });
    }
  }
  // Small tower & crystal waterfall
  blocks.push({ x: -2, y: 1, z: -2, matId: 'stone' });
  blocks.push({ x: -2, y: 2, z: -2, matId: 'stone' });
  blocks.push({ x: -2, y: 3, z: -2, matId: 'timber' });
  blocks.push({ x: -2, y: 4, z: -2, matId: 'crystal' });
  blocks.push({ x: 1, y: 1, z: 1, matId: 'timber' });
  blocks.push({ x: 1, y: 2, z: 1, matId: 'grass' });
  blocks.push({ x: 0, y: 1, z: -1, matId: 'water' });
  blocks.push({ x: 0, y: 1, z: 0, matId: 'water' });
  return blocks;
}

export function MrasulBlockWorldGame({ title }: { title: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedMat, setSelectedMat] = useState('crystal');
  const [mode, setMode] = useState<'build' | 'erase'>('build');
  const [blockCount, setBlockCount] = useState(0);

  const selectedMatRef = useRef(selectedMat);
  selectedMatRef.current = selectedMat;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const rebuildWorldRef = useRef<((blocks: VoxelBlock[]) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 480;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1430);
    scene.fog = new THREE.FogExp2(0x0b1430, 0.024);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 120);
    camera.position.set(9, 8, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.9);
    const dir = new THREE.DirectionalLight(0xfffbeb, 1.8);
    dir.position.set(10, 16, 8);
    scene.add(hemi, dir);

    // Base grid platform
    const baseGeo = new THREE.PlaneGeometry(16, 16);
    baseGeo.rotateX(-Math.PI / 2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.1 });
    const basePlane = new THREE.Mesh(baseGeo, baseMat);
    basePlane.position.y = -0.5;
    scene.add(basePlane);

    const grid = new THREE.GridHelper(16, 16, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.49;
    scene.add(grid);

    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    for (const m of MATERIALS) {
      matCache.set(
        m.id,
        new THREE.MeshStandardMaterial({
          color: m.color,
          emissive: m.emissive,
          emissiveIntensity: m.id === 'crystal' ? 0.6 : 0.25,
          roughness: m.id === 'crystal' || m.id === 'water' ? 0.15 : 0.65,
          metalness: m.id === 'gold' ? 0.8 : 0.15,
        })
      );
    }

    const voxelsGroup = new THREE.Group();
    scene.add(voxelsGroup);

    const blockMap = new Map<string, { mesh: THREE.Mesh; data: VoxelBlock }>();
    const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;

    const saveBlocks = () => {
      try {
        const list = Array.from(blockMap.values()).map((v) => v.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
    };

    const addVoxel = (x: number, y: number, z: number, matId: string) => {
      if (x < -7 || x > 7 || z < -7 || z > 7 || y < 0 || y > 10) return;
      const k = keyOf(x, y, z);
      if (blockMap.has(k)) return;
      const mesh = new THREE.Mesh(blockGeo, matCache.get(matId) || matCache.get('grass')!);
      mesh.position.set(x, y, z);
      voxelsGroup.add(mesh);
      blockMap.set(k, { mesh, data: { x, y, z, matId } });
      setBlockCount(blockMap.size);
    };

    const removeVoxel = (x: number, y: number, z: number) => {
      const k = keyOf(x, y, z);
      const entry = blockMap.get(k);
      if (!entry) return;
      voxelsGroup.remove(entry.mesh);
      blockMap.delete(k);
      setBlockCount(blockMap.size);
    };

    const loadBlocks = (list: VoxelBlock[]) => {
      while (voxelsGroup.children.length > 0) {
        voxelsGroup.remove(voxelsGroup.children[0]);
      }
      blockMap.clear();
      for (const b of list) addVoxel(b.x, b.y, b.z, b.matId);
      setBlockCount(blockMap.size);
      saveBlocks();
    };

    rebuildWorldRef.current = loadBlocks;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) loadBlocks(parsed);
        else loadBlocks(getStarterIsland());
      } else {
        loadBlocks(getStarterIsland());
      }
    } catch {
      loadBlocks(getStarterIsland());
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (moved > 6) return; // user orbited camera

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const targets: THREE.Object3D[] = [...voxelsGroup.children, basePlane];
      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length === 0) return;

      const hit = hits[0];
      const isRightClick = e.button === 2;
      const shouldErase = modeRef.current === 'erase' || isRightClick;

      if (shouldErase) {
        if (hit.object !== basePlane) {
          const p = hit.object.position;
          removeVoxel(Math.round(p.x), Math.round(p.y), Math.round(p.z));
          gameFx.blockBreak();
          saveBlocks();
        }
      } else if (hit.face) {
        const pos = hit.point.clone().addScaledVector(hit.face.normal, 0.5);
        addVoxel(Math.round(pos.x), Math.max(0, Math.round(pos.y)), Math.round(pos.z), selectedMatRef.current);
        gameFx.blockPlace();
        saveBlocks();
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

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
    function tick() {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      controls.dispose();
      blockGeo.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      matCache.forEach((m) => m.dispose());
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden bg-[#0b1430] border border-white/10 select-none">
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-black/70 border border-white/15 text-xs text-white pointer-events-auto">
          <span className="font-semibold">{title}</span>
          <span className="text-slate-400 ml-2 font-mono-tabular">{blockCount} blocks · Drag to orbit · Click to place</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setMode('build')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              mode === 'build'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-black/70 text-slate-200 border-white/15'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            Build
          </button>
          <button
            type="button"
            onClick={() => setMode('erase')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              mode === 'erase'
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-black/70 text-slate-200 border-white/15'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Erase
          </button>
          <button
            type="button"
            onClick={() => {
              gameFx.click();
              rebuildWorldRef.current?.(getStarterIsland());
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-black/70 text-slate-200 border border-white/15 hover:bg-black/90"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Island
          </button>
        </div>
      </div>

      {/* Block palette bottom dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/75 border border-white/15 overflow-x-auto max-w-[92%]">
        {MATERIALS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setSelectedMat(m.id);
              setMode('build');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              selectedMat === m.id && mode === 'build'
                ? 'bg-white/20 text-white ring-1 ring-cyan-400'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <span
              className="w-3 h-3 rounded-xs border border-white/30"
              style={{ backgroundColor: `#${m.color.toString(16).padStart(6, '0')}` }}
            />
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
