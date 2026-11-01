// HUD: thanh tren, minimap, bang chon doi hinh, bang squad (chan dung + chi so + lenh), man hinh dau/cuoi.
import { useEffect } from 'react';
import { TUNE } from '../sim/tuning';
import { useGameStore, type HudSquad, type ToolKind } from '../state/GameState';
import { SQUAD_COLORS } from '../render/UnitRenderer';
import { cam } from '../render/cameraState';
import { perf } from '../render/SimDriver';
import type { FormationType, Order } from '../sim/types';
import { Minimap } from './Minimap';
import { SquadTags } from './SquadTags';

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

function Bar({ label, value, color, hint }: { label: string; value: number; color: string; hint?: string }) {
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <span>{hint ?? `${Math.round(value)}%`}</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
    </div>
  );
}

function PeopleIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
      <circle cx="9" cy="7" r="3.2" />
      <path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6z" />
      <circle cx="17.5" cy="8.5" r="2.5" opacity=".75" />
      <path d="M16 14.3c3 0 5 2 5 5.2h-4.6c0-2-.4-3.6-1.4-5z" opacity=".75" />
    </svg>
  );
}

function TopBar() {
  const hud = useGameStore((s) => s.hud);
  const paused = useGameStore((s) => s.paused);
  const speed = useGameStore((s) => s.speed);
  const togglePause = useGameStore((s) => s.togglePause);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const sfxOn = useGameStore((s) => s.sfxOn);
  const toggleSfx = useGameStore((s) => s.toggleSfx);
  const left = Math.max(0, hud.limit - hud.time);
  return (
    <div className="topbar">
      <div className="stat clock" title="Thời gian còn lại để ổn định quảng trường">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9fb4cf" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span className="lbl">Thời gian</span>
        <b className={left < 60 ? 'warn' : ''}>
          {fmtTime(hud.time)} / {fmtTime(hud.limit)}
        </b>
      </div>
      <div className="stat">
        <span className="chip blue">
          <PeopleIcon color="#6db1ff" />
        </span>
        <span className="lbl">Cảnh sát</span>
        <b id="n-police">{hud.police}</b>
      </div>
      <div className="stat">
        <span className="chip red">
          <PeopleIcon color="#ff7a6e" />
        </span>
        <span className="lbl">Bạo động</span>
        <b id="n-rioters">{hud.rioters}</b>
      </div>
      <div className="stat">
        <span className="chip gray">
          <PeopleIcon color="#cfd6df" />
        </span>
        <span className="lbl">Dân thường</span>
        <b id="n-civ">{hud.civilians}</b>
      </div>
      <div className="stat proj" title="Số vật bị ném (đá/chai/molotov) và số vùng lửa đang cháy">
        <span className="chip red proj-ico">☄</span>
        <span className="lbl">Ném</span>
        <b id="n-thrown">{hud.thrown}</b>
        <span className="lbl">Lửa</span>
        <b id="n-fires" className={hud.fires ? 'warn' : ''}>
          {hud.fires}
        </b>
        <span className="sub" id="n-blocked">
          chặn {hud.blocked} · né {hud.dodged}
        </span>
      </div>
      {hud.pending > 0 && (
        <div className="stat wave" title="Tiếp viện của người biểu tình sắp đến từ các con phố bên">
          <span className="lbl">Tiếp viện sau</span>
          <b id="n-wave">{fmtTime(hud.nextWave)}</b>
        </div>
      )}
      <div className="meters">
        <Bar label="Stability" value={hud.stability} color="linear-gradient(90deg,#39d98a,#8bf0b3)" />
        <Bar label="An toàn dân thường" value={hud.safety} color="linear-gradient(90deg,#2d9cff,#7cc4ff)" />
        <Bar
          label="Mức vũ lực"
          value={hud.force}
          color={hud.force > 66 ? 'linear-gradient(90deg,#ff8a2a,#ff3b30)' : hud.force > 33 ? 'linear-gradient(90deg,#ffd24a,#ff9f2a)' : 'linear-gradient(90deg,#8bd3a8,#d7e38a)'}
        />
      </div>
      <div className="ctrl">
        <button className="sq" onClick={togglePause} title="Space: tạm dừng / tiếp tục">
          {paused ? '▶' : '❚❚'}
        </button>
        <button className={'sq' + (speed === 1 ? ' on' : '')} onClick={() => setSpeed(1)}>
          1x
        </button>
        <button className={'sq' + (speed === 2 ? ' on' : '')} onClick={() => setSpeed(2)}>
          2x
        </button>
        <button className={'sq' + (speed === 4 ? ' on' : '')} onClick={() => setSpeed(4)}>
          4x
        </button>
        <button className={'sq' + (sfxOn ? ' on' : '')} onClick={toggleSfx} title="Bật / tắt âm thanh">
          {sfxOn ? '🔊' : '🔈'}
        </button>
      </div>
    </div>
  );
}

const FORMS: { type: FormationType; label: string; key: string; rows: number[] }[] = [
  { type: 'LINE', label: 'Line', key: '1', rows: [5] },
  { type: 'DOUBLE_LINE', label: 'Double', key: '2', rows: [4, 4] },
  { type: 'COMPACT', label: 'Compact', key: '3', rows: [3, 3, 3] },
];

function FormationIcon({ rows, active }: { rows: number[]; active: boolean }) {
  const c = active ? '#fff' : '#9fb4cf';
  return (
    <svg width="38" height="30" viewBox="0 0 38 30">
      {rows.map((n, r) =>
        Array.from({ length: n }, (_, i) => (
          <g key={`${r}-${i}`} fill={c}>
            <circle cx={19 + (i - (n - 1) / 2) * 6.5} cy={9 + r * 7.5 - (rows.length - 1) * 2} r="2" />
            <rect x={19 + (i - (n - 1) / 2) * 6.5 - 2} y={11 + r * 7.5 - (rows.length - 1) * 2} width="4" height="4.5" rx="1" />
          </g>
        )),
      )}
    </svg>
  );
}

function FormationPicker() {
  const hud = useGameStore((s) => s.hud);
  const selection = useGameStore((s) => s.selection);
  const apply = useGameStore((s) => s.applyFormation);
  const cur = selection.length ? hud.squads[selection[0]]?.formation : null;
  return (
    <div className="panel formation" id="formation-picker">
      <div className="panel-title">Formation</div>
      <div className="form-row">
        {FORMS.map((f) => (
          <button
            key={f.type}
            className={'form-btn' + (cur === f.type ? ' on' : '')}
            disabled={!selection.length}
            onClick={() => apply(f.type)}
            data-formation={f.type}
          >
            <FormationIcon rows={f.rows} active={cur === f.type} />
            <span>{f.label}</span>
            <kbd>{f.key}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}

const ORDERS: { order: Order; label: string; key: string; icon: string }[] = [
  { order: 'MOVE', label: 'Move', key: 'M', icon: '⚑' },
  { order: 'HOLD', label: 'Hold', key: 'H', icon: '⛨' },
  { order: 'ADVANCE', label: 'Advance', key: 'F', icon: '»' },
  { order: 'REGROUP', label: 'Regroup', key: 'R', icon: '⚇' },
  { order: 'DEESCALATE', label: 'De-escalate', key: 'X', icon: '☮' },
];

function Portrait({ hp, down, color }: { hp: number; down: boolean; color: string }) {
  return (
    <div className={'portrait' + (down ? ' down' : '')} style={{ borderColor: color }}>
      <svg viewBox="0 0 32 32" width="30" height="30">
        <path d="M5 28c0-6 5-9 11-9s11 3 11 9z" fill="#27407e" />
        <path d="M9 15a7 7 0 0114 0v3H9z" fill="#10193a" />
        <rect x="9" y="14" width="14" height="3.4" rx="1" fill="#05070f" />
        <rect x="10.5" y="17.4" width="11" height="5" rx="2" fill="#e0b794" />
        <rect x="24" y="17" width="6" height="11" rx="1" fill="#3a4f8f" stroke="#e8edf5" strokeWidth="1" />
      </svg>
      <div className="hp">
        <div style={{ width: `${hp * 100}%`, background: hp > 0.5 ? '#39d98a' : hp > 0.25 ? '#ffd24a' : '#ff5a4a' }} />
      </div>
      {down && <span className="x">✕</span>}
    </div>
  );
}

function SquadPanel() {
  const hud = useGameStore((s) => s.hud);
  const selection = useGameStore((s) => s.selection);
  const select = useGameStore((s) => s.select);
  const applyOrder = useGameStore((s) => s.applyOrder);
  const dodge = useGameStore((s) => s.dodge);
  const sel: HudSquad[] = selection.map((i) => hud.squads[i]).filter(Boolean);
  const n = sel.length;
  const agg = (k: 'health' | 'stamina' | 'morale' | 'cohesion') => (n ? (sel.reduce((a, s) => a + s[k], 0) / n) * 100 : 0);
  const alive = sel.reduce((a, s) => a + s.alive, 0);
  const total = sel.reduce((a, s) => a + s.total, 0);
  const curOrder = n ? sel[0].order : null;
  const alert = sel.find((s) => s.alert)?.alert;
  return (
    <div className="panel squad" id="squad-panel">
      <div className="squad-head">
        <div className="tabs">
          {hud.squads.map((s) => (
            <button
              key={s.id}
              className={'tab' + (selection.includes(s.id) ? ' on' : '')}
              style={{ borderColor: hex(SQUAD_COLORS[s.id]) }}
              onClick={(e) => select([s.id], e.shiftKey)}
              data-squad={s.id}
            >
              {s.name}
            </button>
          ))}
        </div>
        <span className="count">{n ? `${alive}/${total}` : ''}</span>
      </div>
      {n === 0 ? (
        <div className="empty">Chưa chọn squad. Click vào một squad, kéo chuột để chọn nhiều squad, hoặc bấm tab phía trên.</div>
      ) : (
        <>
          <div className={'portraits' + (total > 8 ? ' small' : '')}>
            {sel.map((s) => s.units.map((u, i) => <Portrait key={`${s.id}-${i}`} hp={u.hp} down={u.down} color={hex(SQUAD_COLORS[s.id])} />))}
          </div>
          <div className="bars">
            <Bar label="Health" value={agg('health')} color="#3fcf7a" />
            <Bar label="Stamina" value={agg('stamina')} color="#27b4e0" />
            <Bar label="Morale" value={agg('morale')} color="#f2c230" />
            <Bar label="Cohesion" value={agg('cohesion')} color="#a99cf5" />
          </div>
          {alert && <div className="alert">{alert}</div>}
        </>
      )}
      <div className="orders">
        {ORDERS.map((o) => (
          <button
            key={o.order}
            className={'order' + (curOrder === o.order ? ' on' : '')}
            disabled={n === 0}
            onClick={() => applyOrder(o.order)}
            data-order={o.order}
            title={`${o.label} (${o.key})`}
          >
            <span className="ico">{o.icon}</span>
            <span>{o.label}</span>
            <kbd>{o.key}</kbd>
          </button>
        ))}
        <button
          className={'order dodge' + (sel.some((s) => s.dodge) ? ' on' : '')}
          disabled={n === 0}
          onClick={() => dodge()}
          data-order="DODGE"
          title="Dodge (V): sẵn sàng né vật ném trong 8 giây, tốn thể lực"
        >
          <span className="ico">↯</span>
          <span>Dodge</span>
          <kbd>V</kbd>
        </button>
      </div>
    </div>
  );
}

function Cd({ v }: { v: number }) {
  return v > 0.05 ? <span className="cd">{Math.ceil(v)}s</span> : null;
}

function ToolsDock() {
  const hud = useGameStore((s) => s.hud);
  const truckSel = useGameStore((s) => s.truckSel);
  const targeting = useGameStore((s) => s.targeting);
  const toast = useGameStore((s) => s.toast);
  const selectTruck = useGameStore((s) => s.selectTruck);
  const spray = useGameStore((s) => s.truckSpray);
  const autoT = useGameStore((s) => s.truckAutoToggle);
  const refill = useGameStore((s) => s.truckRefill);
  const setTargeting = useGameStore((s) => s.setTargeting);
  useEffect(() => {
    document.body.classList.toggle('targeting', !!targeting);
    return () => document.body.classList.remove('targeting');
  }, [targeting]);
  const tk = hud.truck;
  const t = hud.tools;
  const tool = (k: ToolKind, label: string, key: string, icon: string, count: string, cd: number, ready: boolean, title: string) => (
    <button
      key={k}
      className={'tool' + (targeting === k ? ' on' : '') + (ready ? '' : ' off')}
      onClick={() => setTargeting(targeting === k ? null : k)}
      data-tool={k}
      title={title}
    >
      <span className="ico">{icon}</span>
      <span className="lbl2">{label}</span>
      <span className="cnt">{count}</span>
      <Cd v={cd} />
      <kbd>{key}</kbd>
    </button>
  );
  return (
    <div className="tools-dock" id="tools-dock">
      {tk.active && (
        <div className={'panel truck' + (truckSel ? ' sel' : '') + (tk.dead ? ' dead' : '')} id="truck-panel">
          <div className="panel-title">
            Xe vòi rồng {tk.dead ? '(hỏng)' : tk.auto ? '(tự động)' : truckSel ? '(đang điều khiển)' : ''}
          </div>
          <Bar label="Độ bền" value={tk.hp * 100} color={tk.hp > 0.5 ? '#3fcf7a' : tk.hp > 0.25 ? '#ffd24a' : '#ff5a4a'} />
          <Bar
            label={tk.pumpLock ? 'Bồn nước (bơm quá nhiệt)' : tk.refilling ? 'Bồn nước (đang nạp)' : 'Bồn nước'}
            value={tk.water * 100}
            color={tk.pumpLock ? '#ff8a4a' : 'linear-gradient(90deg,#2d9cff,#8fd6ff)'}
          />
          <div className="tool-row">
            <button className={'tool' + (truckSel ? ' on' : '')} disabled={tk.dead} onClick={() => selectTruck()} data-tool="truck" title="T: chọn xe. Chuột phải = lái, giữ chuột trái = phun">
              <span className="ico">🚒</span>
              <span className="lbl2">Điều khiển</span>
              <kbd>T</kbd>
            </button>
            <button className={'tool' + (tk.firing ? ' on' : '')} disabled={tk.dead} onClick={() => spray()} data-tool="spray" title="G: bật/tắt phun về phía con trỏ">
              <span className="ico">💧</span>
              <span className="lbl2">Phun</span>
              <kbd>G</kbd>
            </button>
            <button className={'tool' + (tk.auto ? ' on' : '')} disabled={tk.dead} onClick={autoT} data-tool="auto" title="Y: xe tự ngắm kẻ hung hăng và đám cháy">
              <span className="ico">⟳</span>
              <span className="lbl2">Tự động</span>
              <kbd>Y</kbd>
            </button>
            <button className={'tool' + (tk.refilling ? ' on' : '')} disabled={tk.dead} onClick={refill} data-tool="refill" title="U: lái xe về trụ nước để nạp lại bồn">
              <span className="ico">⛽</span>
              <span className="lbl2">Nạp nước</span>
              <kbd>U</kbd>
            </button>
          </div>
        </div>
      )}
      <div className="panel equip" id="equip-panel">
        <div className="panel-title">Trang bị (squad chọn, hoặc tất cả)</div>
        <div className="tool-row">
          {tool('gas', 'Hơi cay', 'C', '☁', `${t.gas}/${t.gasMax}`, t.gasCd, t.gas > 0 && t.gasCd <= 0.05, 'C: bắn lựu đạn hơi cay vào con trỏ. Đám khói làm người biểu tình ho, mất tinh thần và giải tán')}
          {tool('flash', 'Choáng', 'B', '✸', `${t.flash}/${t.flashMax}`, t.flashCd, t.flash > 0 && t.flashCd <= 0.05, 'B: lựu đạn choáng: làm choáng người trong bán kính 6,5 m vài giây')}
          {tool('lrad', 'LRAD', 'L', '))', t.lradOn ? 'ON' : t.lradCd > 0.05 ? '' : 'sẵn sàng', t.lradCd, t.lradCd <= 0.05 && !t.lradOn, `L: loa LRAD, chùm âm thanh hình nón ~30 m làm đám đông mất tinh thần (chờ ${TUNE.lradCd}s)`)}
        </div>
        {targeting && <div className="hint">Click trái để phát, chuột phải / Esc để hủy</div>}
        {toast && performance.now() - toast.t < 2500 && <div className="hint warn">{toast.text}</div>}
      </div>
    </div>
  );
}

function WaveBanner() {
  const t = useGameStore((s) => s.hud.waveAlert);
  if (!t) return null;
  return (
    <div className="wave-banner" id="wave-banner">
      ⚠ {t}
    </div>
  );
}

function Help() {
  return (
    <div className="help">
      <div>
        <kbd>Chuột trái</kbd> chọn / kéo chọn nhiều
      </div>
      <div>
        <kbd>Chuột phải</kbd> di chuyển
      </div>
      <div>
        <kbd>WASD</kbd> pan <kbd>Q</kbd>/<kbd>E</kbd> xoay <kbd>Cuộn</kbd> zoom
      </div>
      <div>
        <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> đội hình <kbd>V</kbd> né <kbd>Space</kbd> tạm dừng
      </div>
      <div>
        <kbd>T</kbd> xe vòi rồng <kbd>G</kbd> phun <kbd>Y</kbd> tự động <kbd>U</kbd> nạp
      </div>
      <div>
        <kbd>C</kbd> hơi cay <kbd>B</kbd> choáng <kbd>L</kbd> LRAD (nhắm bằng chuột)
      </div>
    </div>
  );
}

function Briefing() {
  const start = useGameStore((s) => s.start);
  return (
    <div className="overlay">
      <div className="card briefing">
        <div className="eyebrow">NHIỆM VỤ 01</div>
        <h1>RIOT COMMAND</h1>
        <p>
          Quảng trường Place Fictive (Paris giả tưởng) đang bất ổn. Bạn chỉ huy <b>3 squad cảnh sát chống bạo động (24 người)</b> đối đầu với <b>5 nhóm bạo
          động (73 người)</b>, xen lẫn khoảng 10 dân thường. Hai nhóm sẽ kéo đến như đợt tiếp viện từ các con phố bên trong 5 phút.
        </p>
        <ul>
          <li>
            <b>Mục tiêu:</b> ổn định quảng trường trong <b>5 phút</b>. Thắng khi các nhóm bạo động đã giải tán hoặc rút lui và An toàn dân thường đạt yêu cầu.
          </li>
          <li>
            <b>Thua</b> khi cảnh sát mất khả năng chiến đấu, Stability sụp đổ, thương vong dân thường vượt giới hạn, hoặc hết giờ.
          </li>
          <li>
            <b>Bạo động biết ném:</b> đá, chai thủy tinh và <b>molotov</b>. Vòng cảnh báo trên mặt đất cho thấy điểm rơi. Khiên hướng đúng về phía người ném chặn gần hết sát thương
            (Compact chắn tốt nhất). Molotov tạo vùng lửa cháy 6-8 giây: lính tự tránh lửa, và có thể ra lệnh <kbd>V</kbd> Dodge để né kịp. Xoa dịu (De-escalate) làm họ bớt ném.
          </li>
          <li>
            <b>Xe vòi rồng:</b> <kbd>T</kbd> chọn xe, chuột phải để lái, giữ chuột trái (hoặc <kbd>G</kbd>) để phun về phía con trỏ, <kbd>Y</kbd> để xe tự ngắm, <kbd>U</kbd> lái về trụ nước nạp bồn
            (100 nước, tia hao 10/giây). Tia nước đẩy lùi, làm ngã người biểu tình và dập tắt molotov, rào chắn, xe đang cháy. Người biểu tình sẽ nhắm ném đá, chai, molotov vào xe!
          </li>
          <li>
            <b>Trang bị:</b> <kbd>C</kbd> lựu đạn hơi cay (khói làm họ ho, tản ra), <kbd>B</kbd> lựu đạn choáng, <kbd>L</kbd> loa LRAD. Nhắm bằng con trỏ chuột; bấm nút trên HUD rồi click để nhắm.
            Số đạn có hạn cho mỗi squad.
          </li>
          <li>Cảnh sát không bao giờ tự động tấn công dân thường. Dùng vũ lực càng ít càng tốt: mức vũ lực cao làm đám đông giận dữ hơn.</li>
          <li>
            <b>Điều khiển:</b> chuột trái chọn squad (kéo để chọn nhiều), chuột phải di chuyển, <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> Line / Double / Compact,
            <kbd>H</kbd> Hold, <kbd>F</kbd> Advance, <kbd>R</kbd> Regroup, <kbd>X</kbd> De-escalate, <kbd>V</kbd> Dodge, <kbd>WASD</kbd> pan, <kbd>Q</kbd>/<kbd>E</kbd> xoay, cuộn để zoom,
            <kbd>Space</kbd> tạm dừng.
          </li>
        </ul>
        <button className="primary" id="btn-start" onClick={start}>
          Bắt đầu nhiệm vụ
        </button>
      </div>
    </div>
  );
}

function Results() {
  const result = useGameStore((s) => s.result);
  const restart = useGameStore((s) => s.restart);
  if (!result) return null;
  const won = result.outcome === 'won';
  const st = result.stats;
  const rows: [string, string | number][] = [
    ['Thời gian', fmtTime(result.time)],
    ['Cảnh sát còn chiến đấu', `${result.policeActive}/${result.policeTotal}`],
    ['Cảnh sát ngã xuống', st.policeDown],
    ['Bạo động đã giải tán', st.rioterDispersed],
    ['Bạo động bị vô hiệu', st.rioterDown],
    ['Dân thường sơ tán', st.civiliansEvacuated],
    ['An toàn dân thường', `${Math.round(result.safety)}%`],
    ['Thiệt hại phụ (va chạm)', st.collateral],
    ['Vật bị ném (molotov)', `${st.thrown} (${st.molotovs})`],
    ['Khiên chặn / trúng người / né', `${st.blocked} / ${st.projHits} / ${st.dodged}`],
    ['Vùng lửa / giây lính bị cháy', `${st.fireZones} / ${Math.round(st.burnSeconds)}`],
    ['Xe vòi rồng: nước dùng / người ngã / đám cháy dập', `${Math.round(st.waterUsed)} / ${st.knockdowns} / ${st.extinguished}`],
    ['Hơi cay / choáng / LRAD dùng', `${st.gasUsed} / ${st.flashUsed} / ${st.lradUsed}`],
    ['Người ho vì hơi cay / bị choáng', `${st.gassed} / ${st.stunned}`],
    ['Sát thương xe vòi rồng', Math.round(st.truckDamage)],
    ['Dùng dùi cui / đẩy khiên', `${st.batons} / ${st.pushes}`],
    ['Mức vũ lực trung bình / đỉnh', `${Math.round(result.avgForce)}% / ${Math.round(st.peakForce)}%`],
    ['Stability cuối', `${Math.round(result.stability)}%`],
  ];
  return (
    <div className="overlay">
      <div className={'card results ' + (won ? 'won' : 'lost')} id="results">
        <div className="eyebrow">{won ? 'NHIỆM VỤ HOÀN THÀNH' : 'NHIỆM VỤ THẤT BẠI'}</div>
        <h1>{won ? 'Quảng trường đã ổn định' : 'Không giữ được quảng trường'}</h1>
        <p className="reason">{result.reason}</p>
        {won && (
          <div className="rating">
            Xếp hạng <b>{result.rating}</b>
          </div>
        )}
        <table>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="primary" id="btn-restart" onClick={restart}>
          Restart
        </button>
      </div>
    </div>
  );
}

export function HUD() {
  const phase = useGameStore((s) => s.phase);
  const paused = useGameStore((s) => s.paused);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGameStore.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        if (st.phase === 'playing') st.togglePause();
        return;
      }
      if (st.phase !== 'playing') return;
      switch (e.code) {
        case 'Digit1':
          st.applyFormation('LINE');
          break;
        case 'Digit2':
          st.applyFormation('DOUBLE_LINE');
          break;
        case 'Digit3':
          st.applyFormation('COMPACT');
          break;
        case 'KeyH':
          st.applyOrder('HOLD');
          break;
        case 'KeyF':
          st.applyOrder('ADVANCE');
          break;
        case 'KeyR':
          st.applyOrder('REGROUP');
          break;
        case 'KeyX':
          st.applyOrder('DEESCALATE');
          break;
        case 'KeyV':
          st.dodge();
          break;
        case 'KeyM':
          st.applyOrder('MOVE');
          break;
        case 'KeyT':
          st.selectTruck();
          break;
        case 'KeyG':
          st.truckSpray();
          break;
        case 'KeyY':
          st.truckAutoToggle();
          break;
        case 'KeyU':
          st.truckRefill();
          break;
        case 'KeyC':
          st.fireTool('gas');
          break;
        case 'KeyB':
          st.fireTool('flash');
          break;
        case 'KeyL':
          st.fireTool('lrad');
          break;
        case 'Escape':
          if (st.targeting) st.setTargeting(null);
          else if (st.truckSel) st.selectTruck(false);
          else st.select([]);
          break;
        case 'Tab': {
          e.preventDefault();
          const n = st.hud.squads.length;
          const cur = st.selection.length ? st.selection[0] : -1;
          st.select([(cur + 1) % n]);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  void cam;
  void perf;
  return (
    <div className="hud">
      <div id="select-box" />
      <div id="flash-overlay" />
      {phase !== 'briefing' && (
        <>
          <SquadTags />
          <TopBar />
          <div className="minimap-wrap">
            <Minimap />
          </div>
          <ToolsDock />
          <div className="bottom">
            <FormationPicker />
            <SquadPanel />
            <Help />
          </div>
          <WaveBanner />
          {paused && <div className="paused">TẠM DỪNG - nhấn Space để tiếp tục</div>}
        </>
      )}
      {phase === 'briefing' && <Briefing />}
      {phase === 'ended' && <Results />}
    </div>
  );
}
