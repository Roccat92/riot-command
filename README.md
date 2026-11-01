# Riot Command

Prototype chơi được chạy trên trình duyệt: mô phỏng chiến thuật 3D low-poly, bạn chỉ huy các đơn vị cảnh sát chống bạo động trong một tình huống bất ổn dân sự giả tưởng tại một quảng trường Paris hư cấu.

- Chơi thử: https://roccat92.github.io/riot-command/
- Bản lát cắt nhỏ (2 squad, 1 nhóm, không dân thường): https://roccat92.github.io/riot-command/?slice=1
- Mã nguồn: https://github.com/Roccat92/riot-command

Mọi nhân vật và môi trường đều được dựng bằng code (hình hộp, cầu, trụ, nón), không dùng asset trả phí, API AI hay backend. Không có máu me: người mất khả năng chiến đấu chỉ nằm im.

## Mục tiêu và điều kiện thắng thua

Ổn định quảng trường trong **5 phút**.

- **Thắng**: tất cả người biểu tình đã giải tán hoặc rút lui (không còn ai ở trạng thái GATHER, AGITATED, APPROACH, ENGAGE trong 8 giây liên tục), quảng trường ổn định và **An toàn dân thường >= 50%**.
- **Thua** khi một trong các điều kiện sau xảy ra:
  - cảnh sát mất khả năng chiến đấu (hiệu lực lực lượng dưới 20% hoặc còn 3 người trở xuống);
  - Stability dưới 12% liên tục hơn 5 giây (mất kiểm soát);
  - thương vong dân thường vượt giới hạn (An toàn dân thường về 0%);
  - quảng trường yên nhưng An toàn dân thường dưới 50%;
  - hết 5 phút mà chưa ổn định.
- Màn hình kết quả hiện thống kê và nút **Restart**.

### Các thước đo

| Thước đo | Ý nghĩa |
| --- | --- |
| Stability | Mức ổn định chung, tính từ trạng thái của đám đông (ENGAGE nặng nhất, DISPERSE nhẹ nhất), trừ đi khi vũ lực quá cao, dân thường bị thương, hoặc cảnh sát suy yếu. |
| An toàn dân thường | 100% trừ đi tổng mức thương tổn của dân thường (2 dân thường bị hạ hoàn toàn là về 0%). |
| Mức vũ lực | Tăng theo từng cú đẩy khiên (nhẹ) và vung dùi cui (nặng), tăng chậm khi Advance, giảm dần theo thời gian. Trên khoảng 55% sẽ làm đám đông giận hơn và kéo Stability xuống. Xếp hạng cuối ván (S/A/B/C) phụ thuộc vào vũ lực trung bình, an toàn dân thường, quân số và thời gian. |

Cảnh sát **không bao giờ** tự động tấn công dân thường, và chỉ đánh người biểu tình còn hung hãn (có kiểm thử cho quy tắc này). Dân thường vẫn có thể bị thương gián tiếp: đứng gần trận giao tranh, hoặc ở sát điểm một cú đánh. Vì vậy hãy tránh đẩy giao tranh vào chỗ có dân thường.

## Vật bị ném, molotov và tiếp viện (cập nhật độ khó)

Phản hồi từ người chơi thử: ít người biểu tình, quá thụ động nên quá dễ. Bản này có **5 nhóm, 65 người** (3 nhóm đầu 39 người có mặt từ đầu, 2 nhóm tiếp viện 26 người kéo đến từ phố phía Đông sau khoảng 55 giây và phố phía Tây sau khoảng 120 giây, có biểu ngữ cảnh báo và đồng hồ đếm ngược trên thanh trên).

- **Vai trò**: người ném (giữ khoảng cách 9-15 m, vừa lùi vừa ném, đi vòng sang bên), người vòng hông (đi sang sườn đội hình rồi mới xông vào), người cận chiến. Nhóm đang hung hăng kéo theo người xung quanh.
- **Vật bị ném**: đá, chai thủy tinh và molotov bay theo đường parabol, có **vòng cảnh báo trên mặt đất** ở điểm rơi (vòng thu hẹp khi sắp chạm đất). Đá và chai gây ít sát thương, thể lực và tinh thần. **Khiên hướng về phía người ném chặn gần hết sát thương** (Compact chắn góc rộng nhất, rồi Double, rồi Line), quay lưng thì không chắn được. Mỗi người ném có số đá/chai giới hạn; hết thì lao vào cận chiến.
- **Molotov**: rơi xuống tạo **vùng lửa cháy 6-8 giây** (hạt lửa low-poly, ánh cam trên nền). Đứng trong lửa mất máu và tinh thần, đơn vị tự tìm đường tránh và chạy ra khỏi lửa. Trúng trực tiếp gây sát thương lớn.
- **Né (Dodge)**: lệnh `V` cho squad được chọn vào tư thế sẵn sàng 8 giây: mọi người còn đủ thể lực sẽ lao sang bên khỏi điểm rơi (tốn thể lực). Không có lệnh thì lính không tự né molotov (chỉ khiên mới giúp). Có hoạt ảnh ném và né.
- **Tốc độ ném** tăng theo mức kích động của từng người. De-escalate làm họ bớt ném; bị đánh gục, rút lui hay giải tán thì ngừng ném.
- **Phản hồi**: thanh trên hiện số vật đã ném, số vùng lửa đang cháy, số lần khiên chặn và né; màn hình kết quả có thêm thống kê. Nút loa bật âm thanh tổng hợp (mặc định tắt).
- **Hiệu năng**: vật bị ném, hạt lửa, vòng và hiệu ứng va chạm là `InstancedMesh` dùng pool cố định (64 vật bị ném, 12 vùng lửa x 14 hạt, 48 hiệu ứng va chạm), không cấp phát mới mỗi khung hình.

### Cân bằng đo được

`scripts/balance.ts` chạy mô phỏng không giao diện (30 seed mỗi chiến thuật, bản đồ MVP, hằng số trong `src/sim/tuning.ts`):

| Chiến thuật bot | Thắng | Thời gian thắng TB | Xếp hạng khi thắng | Cảnh sát ngã TB |
| --- | --- | --- | --- | --- |
| Chỉ giữ vị trí (Hold) | 4/30 (13%) | 241 s | C | 13,2 |
| Tiến thẳng (Advance cả 3 squad) | 22/30 (73%) | 223 s | 20 C, 1 B, 1 D | 8,7 |
| Tiến thẳng + né molotov | 20/30 (67%) | 221 s | 16 C, 3 B, 1 D | 8,4 |
| Hỗn hợp (né, xoa dịu nhóm còn bình tĩnh, tiến khi có địch) | 19/30 (63%) | 222 s | 12 C, 5 B, 2 D | 8,1 |

Nhận xét trung thực: tiến thẳng hết sức không còn thắng dễ như trước (trước đây thắng sau 55-98 s, nay chỉ thắng muộn, sau khoảng 220 s, hầu hết xếp hạng C, mất khoảng 9 trong 24 cảnh sát) và chỉ phòng thủ thì gần như luôn thua. Tuy nhiên ba chiến thuật tiến lên khác nhau **chưa tách biệt được về tỉ lệ thắng** (sai số mẫu 30 ván khoảng 8-9 điểm phần trăm); chiến thuật hỗn hợp hiện không thắng nhiều hơn tiến thẳng. Né molotov giúp rõ rệt về số lần né (khoảng 85 so với 22) nhưng chưa chuyển thành tỉ lệ thắng. Đây là điểm cần cân bằng tiếp.

## Điều khiển

| Phím / chuột | Chức năng |
| --- | --- |
| Chuột trái | Chọn squad (nhấp gần một cảnh sát). Giữ Shift để thêm vào lựa chọn |
| Kéo chuột trái | Chọn nhiều squad bằng khung chọn |
| Chuột phải | Ra lệnh di chuyển tới điểm chỉ, giữ nguyên đội hình |
| `1` / `2` / `3` | Đội hình LINE / DOUBLE_LINE / COMPACT |
| `H` | Hold: giữ vị trí, dựng khiên, chỉ phòng vệ |
| `F` | Advance: tiến chậm tới nhóm gần nhất, đẩy khiên ép đám đông |
| `R` | Regroup: thu quân về đội hình, hồi cohesion và morale, không tấn công |
| `X` | De-escalate: hạ dùi cui, không tấn công, làm dịu người biểu tình quanh đó |
| `V` | Dodge: squad sẵn sàng né vật ném trong 8 giây (tốn thể lực, tránh vòng cảnh báo) |
| `M` | Move: lệnh di chuyển thông thường |
| `W A S D` | Dịch camera |
| Cuộn chuột | Zoom (chụm 2 ngón không hỗ trợ, dùng cuộn) |
| `Q` / `E` | Xoay camera |
| Chuột giữa kéo | Dịch camera |
| `Space` | Tạm dừng / tiếp tục |
| `Tab` / `Esc` | Chọn squad kế tiếp / bỏ chọn |

Giao diện giống ảnh tham chiếu: thanh trên (thời gian, quân số các bên, Stability, An toàn dân thường, mức vũ lực), minimap ở góc trên phải (nhấp để dịch camera), chọn đội hình ở góc dưới trái, bảng squad ở giữa phía dưới (chân dung, Health/Stamina/Morale/Cohesion, các nút Move/Hold/Advance/Regroup/De-escalate). Có nút tốc độ 1x/2x/4x.

## Luật chơi chi tiết

- **Đội hình**: khi đổi đội hình từng người tự chạy về ô của mình (không dịch chuyển tức thời). Khi đi, điểm neo của đội chờ những người bị tụt lại, nên cấu trúc tương đối được giữ. Đường đi dùng A* trên lưới 1 m để vòng qua xe van, hàng rào, tượng đài.
- **Chỉ số mỗi đơn vị**: Health, Stamina, Morale, Cohesion (0-100).
  - Stamina cạn thì chạy chậm và đánh yếu.
  - Cohesion của cảnh sát là độ bám đội hình; càng cao càng giảm sát thương nhận vào.
  - Morale là tinh thần; ở người biểu tình, Morale thấp dẫn tới rút lui.
- **Chiến đấu (trừu tượng)**: đẩy khiên (đẩy lùi, sát thương rất nhỏ, ít tăng vũ lực) và vung dùi cui (sát thương lớn hơn, chỉ khi bị tấn công). Mọi đòn đều có hoạt ảnh và phản ứng trúng đòn. Hết Health thì nhân vật nằm im.
- **Tâm lý đám đông**: mỗi nhóm có tốc độ leo thang riêng. Một cú dùi cui làm người biểu tình quanh đó thêm giận. Cảnh sát tiến lên làm Morale của họ giảm nhanh hơn.

## Kiến trúc

Phần mô phỏng (`src/sim`) hoàn toàn tách khỏi phần dựng hình (`src/render`) và giao diện (`src/ui`). Mô phỏng chạy với bước cố định 1/30 giây và di chuyển 2D trên mặt phẳng XZ. Không có engine vật lý.

| Module | Vai trò |
| --- | --- |
| `sim/GameWorld.ts` | Dữ liệu bản đồ (tượng đài, phố, vỉa hè, tòa nhà kiểu Pháp, quán cà phê, rào chắn, xe van, thùng rác, cây, đèn) và khởi tạo thế giới. |
| `sim/FormationSystem.ts` | Ô đội hình LINE / DOUBLE_LINE / COMPACT, đổi sang toạ độ thế giới, gán người vào ô. |
| `sim/MovementSystem.ts` | Tích phân chuyển động, tách nhau bằng lưới băm không gian, va chạm vật cản, lối thoát, né vật cản. |
| `sim/NavGrid.ts` | Lưới dẫn đường A* có làm mượt đường đi. |
| `sim/SpatialHash.ts` | Lưới băm không gian. |
| `sim/CrowdAI.ts` | FSM cho người biểu tình và dân thường. |
| `sim/ProjectileSystem.ts` | Ném đá/chai/molotov (parabol, vòng cảnh báo), khiên chặn theo hướng, vùng lửa, lệnh né. |
| `sim/tuning.ts` | Hằng số cân bằng (có thể ghi đè khi quét tham số). |
| `sim/bots.ts` | Bot chiến thuật dùng để cân bằng và kiểm thử. |
| `sim/CombatSystem.ts` | Đẩy khiên, vung dùi cui, phản ứng trúng đòn, thiệt hại phụ, quy tắc chọn mục tiêu. |
| `sim/SquadController.ts` | Lệnh squad: di chuyển, đổi hình, Hold/Advance/Regroup/De-escalate, ý định từng cảnh sát. |
| `sim/Objectives.ts` | Stability, An toàn dân thường, mức vũ lực, điều kiện thắng thua, xếp hạng. |
| `sim/SimulationLoop.ts` | Bước cố định (fixed timestep), tích luỹ thời gian, nội suy hiển thị. |
| `state/GameState.ts` | Kho zustand cho trạng thái UI và ảnh chụp HUD. |
| `render/UnitRenderer.tsx` | Vẽ nhân vật bằng `InstancedMesh` (geometry dùng chung, màu theo instance), hoạt ảnh đi, đẩy khiên, vung dùi cui, trúng đòn, nằm xuống. |
| `render/EffectsRenderer.tsx` | Vật bị ném, vòng cảnh báo, vùng lửa, hiệu ứng va chạm (instanced, pool cố định). |
| `render/CameraController.tsx` | Camera trực giao nghiêng 45 độ: WASD, cuộn, Q/E. |
| `render/WorldScene.tsx` | Dựng môi trường, gộp hình học tĩnh theo màu đỉnh để giảm draw call; tòa nhà gần camera tự hạ thấp để không che. |
| `ui/HUD.tsx` | Giao diện: thanh trên, minimap, đội hình, bảng squad, màn hình đầu và cuối. |

HUD không bao giờ nhận cập nhật theo từng nhân vật ở mỗi khung hình: `SimDriver` chỉ đẩy ảnh chụp tổng hợp vào store khoảng 4 lần mỗi giây. Minimap, nhãn squad và khung chọn được cập nhật trực tiếp trên DOM/canvas, không qua React state. Chất lượng đồ hoạ tự giảm (độ phân giải, rồi bóng đổ) nếu máy yếu.

### FSM của đám đông

`IDLE`, `GATHER`, `AGITATED`, `APPROACH`, `ENGAGE`, `RETREAT`, `PANIC`, `DISPERSE` (cộng `DOWN` khi mất khả năng chiến đấu).

```
IDLE -> GATHER -> AGITATED -> APPROACH -> ENGAGE
                                 ^           |
Morale thấp (từ mọi trạng thái hung hãn) -> RETREAT -> PANIC -> DISPERSE (rời bản đồ)
RETREAT -> GATHER nếu Morale hồi lại và đã xa cảnh sát
De-escalate: ENGAGE -> AGITATED -> GATHER -> IDLE
```

- **Lan truyền nhóm**: mức kích động của mỗi người bị kéo về mức trung bình của nhóm (mạnh hơn khi nhóm đang sát nhau), nhưng mỗi người có tính nóng (temper), độ trễ phản ứng ngẫu nhiên và quỹ đạo riêng nên cả nhóm không di chuyển như một khối cứng.
- **Tinh thần**: bị cảnh sát ép, bị đẩy khiên hoặc đánh, đồng bọn ngã, nhóm yếu thế thì Morale giảm. Dưới ngưỡng thì rút lui, hoảng loạn rồi giải tán ra các con phố.
- **Dân thường**: nhóm riêng (IDLE, RETREAT, PANIC, DISPERSE), tính độ nguy hiểm từ đám đông hung hãn và trận giao tranh quanh họ, rồi tránh đi và chạy ra các con phố. Một số người "to gan" chỉ bỏ chạy khi nguy hiểm rất gần.

## Chạy cục bộ

```bash
npm install
npm run dev        # http://localhost:5173/riot-command/
npm test           # kiểm thử đơn vị (vitest)
npm run build      # kiểm tra kiểu + build sản xuất (base /riot-command/)
```

Triển khai: workflow `.github/workflows/deploy.yml` chạy kiểm thử, build rồi đưa lên GitHub Pages.

Tham số URL: `?slice=1` (bản lát cắt nhỏ), `?q=high` (cố định chất lượng cao, tắt tự giảm).

## Kiểm thử và xác minh

- `npm test`: 58 kiểm thử (gồm `tests/projectile.test.ts`: khiên chặn theo hướng, quỹ đạo, tốc độ ném, vùng lửa, né, tiếp viện, mô phỏng cân bằng bằng bot) và các kiểm thử cũ (formation, FSM người biểu tình và dân thường, quy tắc "cảnh sát không đánh dân thường", mô phỏng 120 giây không NaN và không rời bản đồ, tính xác định theo seed, đổi đội hình mượt, thắng thua).
- `scripts/verify.cjs` và `scripts/play.cjs`: điều khiển Chrome headless (playwright-core) để kiểm tra chọn bằng click, kéo chọn, đổi đội hình bằng phím, chuột phải di chuyển, camera, tạm dừng, chơi tự động đến khi có kết quả, đo hiệu năng. Ảnh chụp nằm trong `shots/`.
- `scripts/balance.ts`: cân bằng bằng bot (`TUNE='{"pressure":1.2}' ONLY=mixed npx vite-node scripts/balance.ts 30`). `scripts/fx.cjs`: chụp ảnh ném/vòng cảnh báo/lửa/né bằng Chrome headless và đếm lỗi console.
- `scripts/simrun.ts`: chạy mô phỏng không giao diện theo các chiến thuật khác nhau để cân bằng.

## Hạn chế đã biết

- Hiệu năng đo trên Chrome headless với **SwiftShader (render bằng CPU)**, không có GPU thật: khoảng 12-20 fps ở 960x540 đến 1440x810. Phần mô phỏng chỉ tốn khoảng 0.2-0.4 ms mỗi khung hình. Chưa đo trên GPU thật hay thiết bị di động.
- Chưa thử trên cảm ứng. Âm thanh chỉ là tiếng tổng hợp đơn giản (mặc định tắt).
- Cân bằng chỉ được tinh chỉnh qua các bot kịch bản đơn giản, chưa có người chơi thật thử; chiến thuật hỗn hợp chưa vượt rõ rệt tiến thẳng (xem bảng cân bằng).
- Hàng rào dài hoặc vật cản dày có thể làm một số đơn vị đi vòng chậm; đội hình rộng (LINE) kẹt trong lối hẹp sẽ tạm xô lệch.
- Cảnh sát tụt lại sau khi đi có thể đứng lệch ô vài giây khi đội đổi hướng gấp.
