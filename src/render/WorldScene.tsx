// WorldScene: quang truong Paris gia tuong dung bang code (low-poly, flat shading, khong asset ngoai).
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BoxGeometry, Color, CylinderGeometry, DoubleSide, type BufferGeometry, type Group } from 'three';
import { cam } from './cameraState';
import { simLoop } from '../sim/SimulationLoop';
import { mulberry32, type Building } from '../sim/types';
import { Batch } from './Batch';

const SOLID_WALL_DARK = 0x2a3a4d;

function buildFacade(solid: Batch, lit: Batch, b: Building, rng: () => number): void {
  const floorH = 3.2;
  const floors = Math.max(1, Math.floor((b.h - 0.5) / floorH));
  const horizontal = b.facing === 'N' || b.facing === 'S'; // facade chay doc theo truc X
  const len = horizontal ? b.w : b.d;
  const sgn = b.facing === 'S' || b.facing === 'E' ? 1 : -1;
  const cols = Math.max(2, Math.floor(len / 2.8));
  const step = len / cols;
  for (let f = 0; f < floors; f++) {
    const y = f === 0 ? 0.4 : f * floorH + 0.6;
    const wh = f === 0 ? 2.4 : 1.9;
    for (let c = 0; c < cols; c++) {
      const off = -len / 2 + step * (c + 0.5);
      const isLit = rng() < 0.38;
      const target = isLit ? lit : solid;
      const color = isLit ? 0xffd88a : SOLID_WALL_DARK;
      if (horizontal) {
        const z = b.z + sgn * (b.d / 2 + 0.05);
        target.box(b.x + off, y, z, 1.0, wh, 0.12, color);
        if (f > 0) solid.box(b.x + off, y - 0.12, z + sgn * 0.2, 1.5, 0.12, 0.45, 0x1a1d22); // ban cong
        if (f > 0) solid.box(b.x + off, y + wh + 0.05, z, 1.25, 0.12, 0.2, 0xb8ab90); // dau cua so
      } else {
        const x = b.x + sgn * (b.w / 2 + 0.05);
        target.box(x, y, b.z + off, 0.12, wh, 1.0, color);
        if (f > 0) solid.box(x + sgn * 0.2, y - 0.12, b.z + off, 0.45, 0.12, 1.5, 0x1a1d22);
        if (f > 0) solid.box(x, y + wh + 0.05, b.z + off, 0.2, 0.12, 1.25, 0xb8ab90);
      }
    }
  }
}

function buildBuilding(solid: Batch, lit: Batch, b: Building, rng: () => number, detail: boolean): void {
  solid.box(b.x, 0, b.z, b.w, b.h, b.d, b.wall);
  solid.box(b.x, 0, b.z, b.w + 0.3, 0.9, b.d + 0.3, 0x8c8577); // chan toa nha
  solid.box(b.x, b.h - 0.35, b.z, b.w + 0.5, 0.45, b.d + 0.5, 0xf0e8d6); // phao
  // mai mansard + ong khoi
  const roofH = b.h > 5 ? 2.6 : 1.4;
  solid.add(MANSARD, b.roof, b.x, b.h + roofH / 2, b.z, 0, b.w + 0.2, roofH, b.d + 0.2);
  if (b.h > 5) {
    const n = 2 + ((rng() * 3) | 0);
    for (let i = 0; i < n; i++) {
      solid.box(b.x + (rng() - 0.5) * b.w * 0.6, b.h + roofH * 0.5, b.z + (rng() - 0.5) * b.d * 0.5, 0.9, roofH * 0.9 + 1, 0.9, 0x9b4a3a);
    }
  }
  if (detail) buildFacade(solid, lit, b, rng);
}

const MANSARD = new CylinderGeometry(0.707 * 0.62, 0.707, 1, 4).rotateY(Math.PI / 4);

function buildStatic() {
  const map = simLoop.world.map;
  const rng = mulberry32(99);
  const solid = new Batch();
  const lit = new Batch();
  const ground = new Batch();
  const sky = new Batch();

  // mat dat: via he + quang truong lat da
  const B = map;
  ground.box(0, -0.02, 0, 140, 0.02, 120, 0x3c4149); // nhua duong
  // via he
  ground.box(0, 0, 0, 48.4, 0.12, 36.4, 0xaaa59a);
  // quang truong lat gach caro
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 7; j++) {
      ground.box(-18 + i * 4, 0.12, -12 + j * 4, 4, 0.04, 4, (i + j) % 2 ? 0xd2c6ac : 0xc6b99d);
    }
  }
  // vach ke duong (net dut) quanh vong xuyen
  for (let x = -27; x <= 27; x += 3) {
    if (Math.abs(x) < 7) continue;
    ground.box(x, 0.0, -21, 1.4, 0.03, 0.18, 0xe8e8e0);
    ground.box(x, 0.0, 21, 1.4, 0.03, 0.18, 0xe8e8e0);
  }
  for (let z = -21; z <= 21; z += 3) {
    if (Math.abs(z) < 7) continue;
    ground.box(-27, 0.0, z, 0.18, 0.03, 1.4, 0xe8e8e0);
    ground.box(27, 0.0, z, 0.18, 0.03, 1.4, 0xe8e8e0);
  }
  // vach qua duong tai 4 con pho
  for (let i = -5; i <= 5; i++) {
    ground.box(i * 1.0, 0.0, -19.5, 0.55, 0.03, 3.2, 0xe8e8e0);
    ground.box(i * 1.0, 0.0, 19.5, 0.55, 0.03, 3.2, 0xe8e8e0);
    ground.box(-28.5, 0.0, i * 0.9, 3.2, 0.03, 0.5, 0xe8e8e0);
    ground.box(28.5, 0.0, i * 0.9, 3.2, 0.03, 0.5, 0xe8e8e0);
  }
  // duong tiep tuc ra ngoai ban do
  ground.box(0, 0, -34, 12, 0.01, 20, 0x3c4149);
  ground.box(0, 0, 34, 12, 0.01, 20, 0x3c4149);

  // toa nha: moi toa mot mesh rieng de co the ha thap (cutaway) khi che camera
  const buildingGeos = map.buildings.map((b) => {
    const bs = new Batch();
    const bl = new Batch();
    buildBuilding(bs, bl, b, rng, true);
    return { b, solid: bs.build(), lit: bl.build() };
  });
  // ben ngoai xa: tao duong chan troi
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const r = 62 + rng() * 14;
    const h = 10 + rng() * 24;
    const x = Math.cos(a) * r * 1.25;
    const z = Math.sin(a) * r;
    const w = 8 + rng() * 10;
    const walls = [0xd8cdb4, 0xc9bda3, 0xb9b1a2, 0xd2c8b1];
    sky.box(x, 0, z, w, h, w * (0.8 + rng() * 0.6), walls[(rng() * 4) | 0]);
    sky.box(x, h, z, w * 0.8, 1.6, w * 0.7, 0x4a5766);
  }

  // tuong dai (statue)
  const sb = [0xbdb6a6, 0xc9c1b0, 0xd4cdbd];
  solid.box(0, 0.12, 0, 7.2, 0.3, 7.2, sb[0]);
  solid.box(0, 0.42, 0, 5.8, 0.3, 5.8, sb[1]);
  solid.box(0, 0.72, 0, 4.4, 0.3, 4.4, sb[2]);
  solid.box(0, 1.02, 0, 3.2, 3.0, 3.2, 0xd2cab8);
  solid.box(0, 1.9, 0, 3.4, 0.35, 3.4, 0xa89f8c);
  solid.box(0, 4.0, 0, 3.5, 0.4, 3.5, 0xb9b09c);
  const bronze = 0x4c6b5c;
  solid.cyl(0, 4.4, 0, 0.55, 1.5, bronze, 8, 0.4);
  solid.box(-0.28, 4.4, 0, 0.35, 1.0, 0.45, bronze);
  solid.box(0.28, 4.4, 0, 0.35, 1.0, 0.45, bronze);
  solid.sphere(0, 6.2, 0, 0.36, bronze);
  solid.box(0.55, 5.75, 0, 0.22, 1.4, 0.22, bronze); // canh tay gio cao
  solid.cone(0.55, 7.1, 0, 0.3, 0.55, 0xc9b34a); // ngon duoc
  solid.box(-0.8, 4.3, 0, 0.1, 1.7, 0.1, 0x6b5a3a);

  // vat can + dao cu
  for (const o of map.obstacles) {
    if (o.kind === 'circle') {
      if (o.type === 'tree') {
        solid.cyl(o.x, 0.12, o.z, 0.18, 1.7, 0x6b4a2f, 6, 0.12);
        solid.ico(o.x, 2.9, o.z, 1.7, 0x3d7a3a, 0.85);
        solid.ico(o.x + 0.4, 3.9, o.z - 0.2, 1.2, 0x4a8f42, 0.9);
        solid.box(o.x, 0.12, o.z, 1.3, 0.08, 1.3, 0x7a6a56);
      } else if (o.type === 'bin') {
        solid.cyl(o.x, 0.12, o.z, 0.42, 1.0, 0x2f6b46, 8);
        solid.cyl(o.x, 1.12, o.z, 0.46, 0.12, 0x24523a, 8);
      } else if (o.type === 'lamp') {
        solid.cyl(o.x, 0.12, o.z, 0.1, 4.6, 0x23282f, 6);
        solid.box(o.x, 4.5, o.z, 0.9, 0.12, 0.12, 0x23282f);
        lit.sphere(o.x, 4.35, o.z, 0.28, 0xffe4a0);
      } else if (o.type === 'table') {
        solid.cyl(o.x, 0.12, o.z, 0.08, 0.8, 0x333333, 6);
        solid.cyl(o.x, 0.9, o.z, 0.55, 0.06, 0xf2e8d5, 8);
        solid.box(o.x - 0.8, 0.12, o.z, 0.4, 0.5, 0.4, 0x7a5a3a);
        solid.box(o.x + 0.8, 0.12, o.z, 0.4, 0.5, 0.4, 0x7a5a3a);
        solid.cone(o.x, 2.2, o.z, 1.3, 0.55, (Math.round(o.z) % 2 ? 0xb83b3b : 0xefe7d6), 8);
        solid.cyl(o.x, 0.12, o.z, 0.04, 2.2, 0x444444, 5);
      }
    } else if (o.type === 'barrier') {
      const w = o.hw * 2;
      solid.box(o.x, 0.12, o.z, w, 0.06, 0.08, 0x9aa4ad);
      solid.box(o.x, 0.55, o.z, w, 0.06, 0.08, 0x9aa4ad);
      solid.box(o.x, 0.95, o.z, w, 0.06, 0.08, 0x9aa4ad);
      for (const k of [-0.45, -0.15, 0.15, 0.45]) solid.box(o.x + w * k, 0.12, o.z, 0.05, 0.9, 0.05, 0x8c96a0);
      solid.box(o.x - o.hw + 0.1, 0.12, o.z, 0.08, 0.06, 0.7, 0x7d8791);
      solid.box(o.x + o.hw - 0.1, 0.12, o.z, 0.08, 0.06, 0.7, 0x7d8791);
    } else if (o.type === 'bench') {
      solid.box(o.x, 0.55, o.z, o.hw * 2, 0.1, o.hd * 1.5, 0x7a5a3a);
      solid.box(o.x, 0.9, o.z + o.hd * 0.7, o.hw * 2, 0.4, 0.08, 0x7a5a3a);
      solid.box(o.x - o.hw + 0.2, 0.12, o.z, 0.1, 0.45, o.hd * 1.3, 0x2b2b2b);
      solid.box(o.x + o.hw - 0.2, 0.12, o.z, 0.1, 0.45, o.hd * 1.3, 0x2b2b2b);
    } else if (o.type === 'van') {
      const alongX = o.hw > o.hd;
      const L = Math.max(o.hw, o.hd) * 2;
      const Wd = Math.min(o.hw, o.hd) * 2;
      const ry = alongX ? 0 : Math.PI / 2;
      // do bang cach dat tu local roi xoay quanh tam: tinh vi tri thanh phan
      const put = (lx: number, ly: number, lz: number, w: number, h: number, d: number, color: number, target = solid) => {
        // local x doc theo xe
        const c = Math.cos(ry);
        const s = Math.sin(ry);
        target.box(o.x + lx * c + lz * s, ly, o.z - lx * s + lz * c, w, h, d, color, ry);
      };
      put(0, 0.45, 0, L, 1.55, Wd, 0x1e2d52);
      put(-0.2, 1.7, 0, L * 0.7, 0.55, Wd * 0.92, 0x1e2d52);
      put(0, 1.0, 0, L * 1.01, 0.28, Wd * 1.01, 0xeeeeee); // soc trang
      put(L * 0.2, 1.72, 0, 0.1, 0.45, Wd * 0.94, 0x30465c); // kinh truoc
      put(-L * 0.15, 2.28, 0, 0.5, 0.14, Wd * 0.6, 0x3a7bff, lit); // den bao
      for (const wx of [-L * 0.32, L * 0.32]) for (const wz of [-Wd / 2, Wd / 2]) put(wx, 0.05, wz, 0.8, 0.8, 0.28, 0x111111);
    }
  }

  // quan cafe: mai hien + bang hieu (tren via he phia tay)
  const cafeZ = -11;
  const stripes = [0xb83b3b, 0xf0e8d8];
  for (let i = 0; i < 12; i++) {
    solid.add(BOXG, stripes[i % 2], -28.9, 3.1, cafeZ - 5 + 0.42 + i * 0.83, 0, 2.6, 0.08, 0.83, 0, -0.32);
  }
  solid.box(-29.9, 3.7, cafeZ, 0.3, 0.9, 8.8, 0x7a2b2b);
  lit.box(-29.7, 3.85, cafeZ, 0.1, 0.55, 6.5, 0xf5e6b8);
  solid.box(-29.9, 0.4, cafeZ, 0.2, 2.5, 8.4, 0x22323f);

  // 4 con pho: den duong + cay xanh nho tai goc
  return { solidGeo: solid.build(), litGeo: lit.build(), groundGeo: ground.build(), skyGeo: sky.build(), buildingGeos };
}

const BOXG = new BoxGeometry(1, 1, 1);

const CUT_SCALE = 0.27;

function BuildingMesh({ b, solid, lit }: { b: Building; solid: BufferGeometry | null; lit: BufferGeometry | null }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    // building nam phia camera (giua camera va khu choi) -> ha thap de khong che
    const toCamX = Math.sin(cam.yaw);
    const toCamZ = Math.cos(cam.yaw);
    const proj = (b.x - cam.x) * toCamX + (b.z - cam.z) * toCamZ;
    const edge = Math.abs(b.x) < 26 || Math.abs(b.z) < 20 ? 1 : 0;
    const near = proj > 8 && edge ? 1 : 0;
    const target = near ? CUT_SCALE : 1;
    g.scale.y += (target - g.scale.y) * (1 - Math.exp(-8 * dt));
  });
  return (
    <group ref={ref} position={[0, 0, 0]}>
      {solid && (
        <mesh geometry={solid} receiveShadow>
          <meshLambertMaterial vertexColors flatShading />
        </mesh>
      )}
      {lit && (
        <mesh geometry={lit}>
          <meshBasicMaterial vertexColors side={DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function WorldScene() {
  const { solidGeo, litGeo, groundGeo, skyGeo, buildingGeos } = useMemo(buildStatic, []);
  return (
    <>
      <color attach="background" args={['#9db6cf']} />
      <hemisphereLight args={[new Color('#d6e6f7'), new Color('#7a6e5e'), 1.25]} />
      <directionalLight
        position={[-34, 52, 26]}
        intensity={2.3}
        color="#fff0d2"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
      {groundGeo && (
        <mesh geometry={groundGeo} receiveShadow>
          <meshLambertMaterial vertexColors flatShading />
        </mesh>
      )}
      {skyGeo && (
        <mesh geometry={skyGeo}>
          <meshLambertMaterial vertexColors flatShading />
        </mesh>
      )}
      {solidGeo && (
        <mesh geometry={solidGeo} castShadow receiveShadow>
          <meshLambertMaterial vertexColors flatShading />
        </mesh>
      )}
      {litGeo && (
        <mesh geometry={litGeo}>
          <meshBasicMaterial vertexColors side={DoubleSide} />
        </mesh>
      )}
      {buildingGeos.map((bg, i) => (
        <BuildingMesh key={i} b={bg.b} solid={bg.solid} lit={bg.lit} />
      ))}
    </>
  );
}
