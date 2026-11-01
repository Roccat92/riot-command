// Luoi bam khong gian don gian: chi so don vi theo o luoi, dung de tim hang xom nhanh.
export class SpatialHash {
  private cells: number[][];
  private readonly w: number;
  private readonly h: number;
  constructor(
    private readonly minX: number,
    private readonly minZ: number,
    width: number,
    height: number,
    private readonly cs = 2.5,
  ) {
    this.w = Math.ceil(width / cs) + 1;
    this.h = Math.ceil(height / cs) + 1;
    this.cells = Array.from({ length: this.w * this.h }, () => []);
  }
  clear(): void {
    for (const c of this.cells) c.length = 0;
  }
  private cx(x: number): number {
    return Math.min(this.w - 1, Math.max(0, Math.floor((x - this.minX) / this.cs)));
  }
  private cz(z: number): number {
    return Math.min(this.h - 1, Math.max(0, Math.floor((z - this.minZ) / this.cs)));
  }
  insert(i: number, x: number, z: number): void {
    this.cells[this.cz(z) * this.w + this.cx(x)].push(i);
  }
  /** Day vao `out` cac chi so nam trong cac o chua hinh vuong ban kinh r (can kiem tra khoang cach them). */
  query(x: number, z: number, r: number, out: number[]): number[] {
    out.length = 0;
    const x0 = this.cx(x - r);
    const x1 = this.cx(x + r);
    const z0 = this.cz(z - r);
    const z1 = this.cz(z + r);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = this.cells[cz * this.w + cx];
        for (let k = 0; k < c.length; k++) out.push(c[k]);
      }
    }
    return out;
  }
}
