// Cac hang so can bang (co the ghi de khi chay mo phong de quet tham so, xem scripts/balance.ts).
export const TUNE = {
  pressure: 1.2, // toc do mat tinh than cua nguoi bieu tinh khi hang khien tien len
  embolden: 0.4, // dam dong hung han gan do lam giam suc ep tinh than
  punch: 6, // sat thuong dam cua nguoi bieu tinh
  projDmg: 1.6, // he so sat thuong da/chai
  throwCd: 0.6, // he so thoi gian cho nem (cang cao cang it nem)
  provoke: 0.12, // kich dong them khi bi tien len ma khong xoa diu
  escal: 1.5, // he so toc do leo thang cua 3 nhom dau
  burn: 8, // sat thuong lua moi giay
  moloHit: 20, // sat thuong molotov trung truc tiep
  autoDodge: 0, // xac suat tu ne molotov khi chua ra lenh Dodge (0 = phai ra lenh hoac co hang khien)
  molo: 1.0, // ti le nguoi nem co 1 molotov
  moloAmmo: 1, // so molotov moi nguoi nem co molotov
  moloRate: 0.4, // xac suat moi lan nem la molotov khi con molotov
  ammo: 12, // so da/chai trung binh moi nguoi nem (het thi phai xong vao can chien)
  advDrain: 2.4, // hao the luc moi giay khi ADVANCE
};
