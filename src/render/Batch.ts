// Gop nhieu hinh hoc tinh thanh mot mesh (mau theo dinh) de giam draw call. Phong cach low-poly flat.
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpV = new Vector3();
const tmpS = new Vector3();
const col = new Color();

export class Batch {
  private geos: BufferGeometry[] = [];

  add(geo: BufferGeometry, color: number, x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    tmpE.set(rx, ry, rz, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    tmpV.set(x, y, z);
    tmpS.set(sx, sy, sz);
    tmpM.compose(tmpV, tmpQ, tmpS);
    g.applyMatrix4(tmpM);
    const n = g.getAttribute('position').count;
    col.set(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new Float32BufferAttribute(arr, 3));
    this.geos.push(g);
    return this;
  }

  /** Hop co goc duoi nam o y (tam o y + h/2). */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, ry = 0): this {
    return this.add(BOX, color, x, y + h / 2, z, ry, w, h, d);
  }
  cyl(x: number, y: number, z: number, r: number, h: number, color: number, seg = 8, rTop = r): this {
    const g = seg === 8 && rTop === r ? CYL8 : new CylinderGeometry(rTop, r, 1, seg);
    if (g === CYL8) return this.add(g, color, x, y + h / 2, z, 0, r, h, r);
    return this.add(g, color, x, y + h / 2, z, 0, 1, h, 1);
  }
  ico(x: number, y: number, z: number, r: number, color: number, sy = 1): this {
    return this.add(ICO, color, x, y, z, 0, r, r * sy, r);
  }
  sphere(x: number, y: number, z: number, r: number, color: number): this {
    return this.add(SPH, color, x, y, z, 0, r, r, r);
  }
  cone(x: number, y: number, z: number, r: number, h: number, color: number, seg = 8): this {
    return this.add(new ConeGeometry(1, 1, seg), color, x, y + h / 2, z, 0, r, h, r);
  }

  build(): BufferGeometry | null {
    if (!this.geos.length) return null;
    const m = mergeGeometries(this.geos, false);
    for (const g of this.geos) g.dispose();
    this.geos = [];
    return m;
  }
}

const BOX = new BoxGeometry(1, 1, 1);
const CYL8 = new CylinderGeometry(1, 1, 1, 8);
const ICO = new IcosahedronGeometry(1, 0);
const SPH = new SphereGeometry(1, 8, 6);
