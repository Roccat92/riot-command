// Cac hang so can bang (co the ghi de khi chay mo phong de quet tham so, xem scripts/balance.ts).
export const TUNE = {
  pressure: 1.2, // toc do mat tinh than cua nguoi bieu tinh khi hang khien tien len
  embolden: 0.4, // dam dong hung han gan do lam giam suc ep tinh than
  punch: 6, // sat thuong dam cua nguoi bieu tinh
  projDmg: 1.6, // he so sat thuong da/chai
  throwCd: 0.45, // he so thoi gian cho nem (cang cao cang it nem)
  provoke: 0.12, // kich dong them khi bi tien len ma khong xoa diu
  escal: 1.5, // he so toc do leo thang cua 3 nhom dau
  burn: 8, // sat thuong lua moi giay
  moloHit: 20, // sat thuong molotov trung truc tiep
  autoDodge: 0, // xac suat tu ne molotov khi chua ra lenh Dodge (0 = phai ra lenh hoac co hang khien)
  molo: 1.0, // ti le nguoi nem co 1 molotov
  moloAmmo: 1, // so molotov moi nguoi nem co molotov
  moloRate: 0.6, // xac suat moi lan nem la molotov khi con molotov
  ammo: 12, // so da/chai trung binh moi nguoi nem (het thi phai xong vao can chien)
  advDrain: 2.4, // hao the luc moi giay khi ADVANCE
  eqCd: 10, // thoi gian cho chung cua dan hoi cay (luu dan = 60%)
  lradCd: 75, // thoi gian cho LRAD
  moloTruck: 46, // sat thuong molotov len xe voi rong
  flashStun: 2, // giay choang toi da cua luu dan
  flashMorale: 6, // tinh than mat khi bi luu dan
  gasCharges: 2, // so dan hoi cay moi squad
  flashCharges: 2, // so luu dan choang moi squad
  truckHp: 420, // do ben xe voi rong
  truckAggro: 0.35, // xac suat nguoi bieu tinh nham vao xe thay vi canh sat
  waterPush: 26, // luc day cua tia nuoc
  gasMorale: 2, // tinh than mat moi giay trong hoi cay
  lradMorale: 1.5, // tinh than mat moi giay trong chum LRAD
};
