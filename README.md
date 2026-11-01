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

Phản hồi từ người chơi thử: ít người biểu tình, quá thụ động nên quá dễ. Bản này có **5 nhóm, 73 người** (3 nhóm đầu 39 người có mặt từ đầu, 2 nhóm tiếp viện 34 người kéo đến từ phố phía Đông sau khoảng 55 giây và phố phía Tây sau khoảng 120 giây, có biểu ngữ cảnh báo và đồng hồ đếm ngược trên thanh trên).

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

## Xe vòi rồng, trang bị mới và hỗn loạn (cập nhật gần nhất)

Phản hồi: muốn nhiều hành động, chân thực và hỗn loạn hơn. Bản này thêm:

### Xe vòi rồng (low-poly, dáng xe cứu hỏa)

- Xe xuất hiện ở đầu phố phía Nam, có đèn nhấp nháy xanh/đỏ, tháp phun quay theo điểm ngắm. Bạn **lái** (chuột phải, đường đi A*) hoặc để **tự động** (`Y`).
- **Tia nước**: tầm khoảng 22 m, hạt nước bay theo đường cong (130 hạt, `?quality=low` giảm còn 48) và bắn tóe ở điểm chạm, để lại **vũng nước** trên nền. Tia **đẩy lùi** người biểu tình theo hướng tia, làm giảm tinh thần và thể lực, và **làm ngã** sau khoảng 0,4 giây bị phun liên tục: nhân vật nảy lên, lăn tròn, tay chân quơ quào rồi tự đứng dậy sau 2-3 giây. Người ngã không đánh được cảnh sát.
- **Dập lửa**: tia nước dập tắt vùng lửa molotov, rào chắn và xe đang cháy dọc đường tia.
- **Bồn nước hữu hạn**: 100 nước, tia hao 10 nước mỗi giây (khoảng 10 giây phun liên tục). Cạn nước thì bơm khóa 2,5 giây; lái xe tới **trụ nước** (đầu phố phía Nam, nạp khoảng 22 nước mỗi giây) để đầy lại.
- **Xe cũng là mục tiêu**: người biểu tình nhắm ném đá (3 sát thương), chai (5) và molotov (khoảng 46, kèm cháy khoảng 7 mỗi giây tới khi tự dập hoặc phun nước lên chính mình). Xe có 330 độ bền, về 0 thì hỏng, bốc khói và ngừng phun. Phun nước làm họ nhắm vào xe nhiều hơn.

### Trang bị cảnh sát (mỗi squad có số lượng hữu hạn)

| Trang bị | Phím | Số lượng / hồi | Hiệu ứng |
| --- | --- | --- | --- |
| Lựu đạn hơi cay | `C` | 2 quả mỗi squad, nạp 10 giây | Rơi xuống tạo **đám khói** bán kính 5,2 m kéo dài khoảng 13-16 giây. Người biểu tình bên trong **ho** (khom người, bịt mặt, đi chậm 40%), mất tinh thần và kích động liên tục nên tản ra. Cảnh sát không bị ảnh hưởng. |
| Lựu đạn choáng | `B` | 2 quả mỗi squad, nạp 6 giây | Chớp sáng trắng và rung camera; mọi người trong bán kính 6,5 m **choáng** tới khoảng 2 giây (gần như đứng yên, không ném, không đánh) và mất tinh thần. |
| LRAD (loa âm thanh) | `L` | 1 lần mỗi squad, hồi 120 giây | Chùm hình nón dài 30 m, rộng khoảng 57 độ, kéo dài 5 giây (sóng âm hình cung trên nền). Người trong chùm bị đau tai: chậm 50%, mất tinh thần và kích động dần. Không ảnh hưởng người ngoài chùm hay phía sau. |

HUD: bên trái có bảng **Xe vòi rồng** (độ bền, bồn nước, nút Điều khiển / Phun / Tự động / Nạp nước) và bảng **Trang bị** (số quả còn lại, đếm ngược hồi chiêu, trạng thái LRAD), minimap hiện xe, đám khói, vũng nước và vật cản đang cháy. Màn hình kết quả thêm thống kê nước đã dùng, số người bị ngã, đám cháy đã dập, số quả đã dùng, số người ho / choáng, sát thương lên xe.

### Hỗn loạn về hình ảnh

- **Khói** bốc lên từ vùng lửa molotov, xe và rào chắn đang cháy; **rào chắn, xe van bị molotov sẽ cháy** (ngọn lửa trên vật cản, vật cản sạm đen và giữ vết cháy). Xe van phía Tây đã cháy sẵn từ đầu ván. Cháy 25-60 giây nếu không ai dập.
- **Mảnh vụn** (đá, thủy tinh xanh, tia lửa, giọt nước) bắn ra mỗi khi va chạm, chai vỡ, molotov nổ, lựu đạn nổ; **vết cháy đen** trên nền sau khi lửa tắt; **vũng nước** khi phun.
- **Rung camera** khi lựu đạn nổ, molotov rơi hoặc xe bị trúng; **chớp trắng** toàn màn hình khi lựu đạn choáng nổ.
- **Ngã kiểu ragdoll** (nảy lên, lăn, quơ tay chân), tư thế ho và choáng cho từng nhân vật.
- **Hiệu năng**: tất cả là `InstancedMesh` với pool cố định, chỉ vẽ số instance đang dùng (`mesh.count`), nên ngân sách tam giác không tăng so với bản trước (khoảng 42 nghìn tam giác trên khung hình cảnh nặng). Thêm `?quality=low`: tắt bóng đổ, dpr = 1, giảm hạt (tia nước 48, khói 28, mảnh vụn 40, đám khói 4 cụm), rung camera nhẹ hơn.

### Cân bằng (cập nhật khi thêm công cụ mới)

Thêm công cụ khiến ván dễ hơn nên độ khó cơ bản được tăng: 73 người biểu tình (nhóm tiếp viện 16 và 18), người ném nhanh hơn (`throwCd` 0,45) và dùng molotov nhiều hơn (`moloRate` 0,6). Hằng số mới trong `src/sim/tuning.ts` (gasCharges, flashCharges, lradCd, truckHp, truckAggro, waterPush, gasMorale, lradMorale, flashStun, flashMorale, moloTruck, eqCd). Kết quả `scripts/balance.ts` (30 seed, bản MVP; `MODE=old` khi không có công cụ, `MODE=tools` với bot dùng đủ xe tự động + hơi cay + choáng + LRAD):

| Chiến thuật bot | Không dùng công cụ mới | Dùng đủ công cụ (xe tự động, hơi cay, choáng, LRAD) | Cảnh sát ngã TB (không / có) |
| --- | --- | --- | --- |
| Chỉ giữ vị trí (Hold) | 0/30 (0%) | 0/30 (0%) | 12,8 / 8,1 |
| Tiến thẳng (Advance cả 3 squad) | 8/30 (27%), toàn hạng C | 30/30 (100%), 14 B, 12 A, 3 C, 1 S, thắng sau 198 s | 9,9 / 0,9 |
| Tiến thẳng + né molotov | 6/30 (20%), toàn hạng C | 30/30 (100%), 14 B, 11 A, 3 C, 2 S, 202 s | 10,4 / 1,0 |
| Tiến theo nhịp (pulse: tiến, nghỉ hồi sức, Compact) | 9/30 (30%) | 27/30 (90%), 12 A, 11 B, 4 C, 219 s | 10,3 / 2,1 |
| Hỗn hợp (né, xoa dịu, tiến khi có địch) | 10/30 (33%) | 30/30 (100%), 17 A, 9 B, 2 S, 2 C, 194 s | 10,4 / 0,8 |

(Số cũ trước khi thêm công cụ và tăng độ khó: tiến thẳng 73%, hỗn hợp 63%, Hold 13%.)

Nhận xét trung thực:

- Công cụ mới **có giá trị rõ rệt**: cùng một chiến thuật, tỉ lệ thắng nhảy từ 20-33% lên 90-100% và cảnh sát ngã từ khoảng 10 xuống 1-2 người. Ba thứ đều đóng góp (khi thử tắt từng thứ, ván vẫn thắng, nhưng thắng muộn hơn và hạng thấp hơn).
- Bot dùng công cụ **gần như hoàn hảo** (nhắm vào chỗ đông nhất, không bao giờ quên LRAD), nên 100% là cận trên. Người chơi thật phải tự nhắm, quản lý số quả có hạn, bảo vệ xe (xe trung bình nhận khoảng 270-340 sát thương trên 330 độ bền, tức thường bị phá hủy hoặc gần hỏng trước cuối ván) và vẫn phải dùng đội hình, nên khó hơn nhiều. Chưa có người chơi thật đo lại.
- Ván không tầm thường vì **chỉ phòng thủ vẫn thua 100%** (cả khi có công cụ): phải chủ động tiến lên và dùng công cụ để giải tán đám đông, vì số người (73) và tốc độ ném đủ để hạ lực lượng cảnh sát nếu cứ đứng yên.

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
| `T` | Chọn / bỏ chọn **xe vòi rồng**. Khi chọn xe: chuột phải = lái xe tới điểm chỉ, giữ chuột trái = phun về phía con trỏ (click vào một squad để quay lại điều khiển squad) |
| `G` | Bật / tắt phun liên tục về phía con trỏ chuột |
| `Y` | Xe **tự động**: tự ngắm kẻ hung hăng gần phòng tuyến và các đám cháy, hết nước tự về trụ nạp rồi quay lại |
| `U` | Lái xe về **trụ nước** (đầu phố phía Nam) để nạp lại bồn |
| `C` | **Lựu đạn hơi cay** tại con trỏ (squad được chọn gần điểm nhắm nhất, nếu không chọn squad nào thì squad gần nhất còn đạn) |
| `B` | **Lựu đạn choáng** tại con trỏ |
| `L` | **LRAD** hướng về con trỏ (chùm âm thanh hình nón) |
| Nút trên HUD | Bấm nút Hơi cay / Choáng / LRAD rồi click trái lên bản đồ để phát (chuột phải hoặc `Esc` để hủy) |
| `W A S D` | Dịch camera |
| Cuộn chuột | Zoom (chụm 2 ngón không hỗ trợ, dùng cuộn) |
| `Q` / `E` | Xoay camera |
| Chuột giữa kéo | Dịch camera |
| `Space` | Tạm dừng / tiếp tục |
| `Tab` / `Esc` | Chọn squad kế tiếp / bỏ chọn (`Esc` cũng hủy chế độ nhắm và thôi chọn xe) |

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

Tham số URL: `?slice=1` (bản lát cắt nhỏ), `?q=high` (cố định chất lượng cao, tắt tự giảm), `?quality=low` (tắt bóng đổ, dpr 1, giảm hạt).

## Kiểm thử và xác minh

- `npm test`: 82 kiểm thử (mới: `tests/tools.test.ts` cho xe vòi rồng, tia nước, ngã, dập lửa, bồn nước, bị trúng đạn, hơi cay, choáng, LRAD, vật cản cháy; `tests/toolsui.test.ts` cho HUD snapshot, store và bot dùng công cụ; cũ gồm `tests/projectile.test.ts`: khiên chặn theo hướng, quỹ đạo, tốc độ ném, vùng lửa, né, tiếp viện, mô phỏng cân bằng bằng bot) và các kiểm thử cũ (formation, FSM người biểu tình và dân thường, quy tắc "cảnh sát không đánh dân thường", mô phỏng 120 giây không NaN và không rời bản đồ, tính xác định theo seed, đổi đội hình mượt, thắng thua).
- `scripts/verify.cjs` và `scripts/play.cjs`: điều khiển Chrome headless (playwright-core) để kiểm tra chọn bằng click, kéo chọn, đổi đội hình bằng phím, chuột phải di chuyển, camera, tạm dừng, chơi tự động đến khi có kết quả, đo hiệu năng. Ảnh chụp nằm trong `shots/`.
- `scripts/balance.ts`: cân bằng bằng bot (`TUNE='{"pressure":1.2}' ONLY=mixed npx vite-node scripts/balance.ts 30`). `scripts/fx.cjs`: chụp ảnh ném/vòng cảnh báo/lửa/né bằng Chrome headless và đếm lỗi console. `scripts/tools-shots.cjs`: chụp xe vòi rồng, tia nước, hơi cay, choáng, LRAD, vật cản cháy (`shots/tk-*`). `scripts/perf2.cjs`: đo FPS khi mọi hiệu ứng cùng bật (`QS='?quality=low'`).
- `scripts/simrun.ts`: chạy mô phỏng không giao diện theo các chiến thuật khác nhau để cân bằng.

## Hạn chế đã biết

- Hiệu năng đo trên Chrome headless với **SwiftShader (render bằng CPU)**, không có GPU thật: khoảng 12-20 fps ở 960x540 đến 1440x810. Phần mô phỏng chỉ tốn khoảng 0.2-0.4 ms mỗi khung hình. Chưa đo trên GPU thật hay thiết bị di động.
- Chưa thử trên cảm ứng. Âm thanh chỉ là tiếng tổng hợp đơn giản (mặc định tắt).
- Cân bằng chỉ được tinh chỉnh qua các bot kịch bản đơn giản, chưa có người chơi thật thử; chiến thuật hỗn hợp chưa vượt rõ rệt tiến thẳng (xem bảng cân bằng).
- Hàng rào dài hoặc vật cản dày có thể làm một số đơn vị đi vòng chậm; đội hình rộng (LINE) kẹt trong lối hẹp sẽ tạm xô lệch.
- Cảnh sát tụt lại sau khi đi có thể đứng lệch ô vài giây khi đội đổi hướng gấp.
