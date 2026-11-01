// Chat luong do hoa: ?quality=low giam hat, tat bong do, dpr = 1 (chay muot tren may yeu / SwiftShader).
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const QUALITY_LOW = params.get('quality') === 'low';
export const QUALITY = {
  low: QUALITY_LOW,
  jet: QUALITY_LOW ? 48 : 130, // so hat nuoc cua tia
  splash: QUALITY_LOW ? 8 : 18,
  smoke: QUALITY_LOW ? 28 : 84, // hat khoi
  debris: QUALITY_LOW ? 40 : 110, // manh vun
  gasPuffs: QUALITY_LOW ? 4 : 9, // so cum khoi hoi cay moi dam
  flames: QUALITY_LOW ? 3 : 6, // ngon lua tren vat can chay
  shake: QUALITY_LOW ? 0.6 : 1,
  shadows: !QUALITY_LOW,
  dpr: QUALITY_LOW ? 1 : 1.75,
};
