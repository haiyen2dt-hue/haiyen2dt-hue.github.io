/* =====================================================================
   DANY NAIL: NHẬN LỊCH ĐẶT, DUYỆT LỊCH, ĐÁNH GIÁ, KHIẾU NẠI, GHI VÀO GOOGLE SHEET

   CÁCH CÀI (làm 1 lần, khoảng 3 phút). Bảng tính sẽ được TỰ TẠO.
   1. Đăng nhập Gmail của tiệm, vào https://script.new
   2. Xoá hết code mẫu, dán TOÀN BỘ file này vào, bấm biểu tượng Lưu.
   3. Bấm Triển khai (Deploy) > Tùy chọn triển khai mới (New deployment)
        - Bấm bánh răng, chọn loại: Ứng dụng web (Web app)
        - Thực thi dưới dạng (Execute as): Tôi (Me)
        - Người có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
      Bấm Triển khai > Cho phép truy cập > chọn Gmail > Nâng cao >
      Đi tới ... (không an toàn) > Cho phép.
   4. Copy "URL ứng dụng web" (dạng https://script.google.com/macros/s/.../exec)
      rồi dán vào biến LINK_GOOGLE_SHEET trong file data.js của web.

   CÁC TRANG TÍNH
     "Lịch CN1 · Tân Định", "Lịch CN2 · Hoàn Kiếm": lịch của từng cơ sở. Nhân viên chọn ở cột
        "Trạng thái": Chờ duyệt -> Đã duyệt (khách thấy Mã làm) -> Hoàn thành.
        Đã huỷ / Khách không đến: trả slot.
        Các dòng tự xếp: Chờ duyệt trên cùng, rồi Đã duyệt, Hoàn thành, Khách không đến, Đã huỷ ở cuối.
        Hết ngày: lịch Hoàn thành rời trang này (đã có ở trang 24h), lịch huỷ / không đến sang trang 7 ngày.
        Cột "Mẫu thực tế", "Ảnh thành quả": nhân viên ghi trên web nhân viên sau khi hoàn thành (làm như mẫu đặt
        hay mẫu mới tư vấn tại tiệm, link ảnh bộ nail). Khách xem được trên đơn; khi khiếu nại, 2 ô này được chép
        sang trang "Khiếu nại" làm chứng cứ.
     "24h bảo hành": lịch vừa Hoàn thành được thêm vào đây ngay. Khách gửi khiếu nại được trong 24 giờ.
        Qua 24 giờ: không khiếu nại, không đánh giá -> sang "Lưu trữ 7 ngày";
        có khiếu nại -> xem ở trang "Khiếu nại"; có đánh giá -> xem ở trang "Đánh giá".
     "Lưu trữ 7 ngày": chờ khách đánh giá. Khách đánh giá thì dòng chuyển sang trang "Đánh giá";
        sau 7 ngày không đánh giá, dòng lịch TỰ XOÁ.
     "Đánh giá", "Khiếu nại": phản hồi của khách. Khách chỉ đánh giá được lịch trong vòng 7 ngày.
     "Cài đặt": ô B1 là mã đăng nhập web nhân viên (nhan-vien.html): tra cứu lịch, duyệt / hoàn thành / huỷ,
        ghi thợ phụ trách ngay trên web (Sheet đổi theo). Đổi mã: sửa ô B1.
     "Hồ sơ 30 ngày" (ẩn): toàn bộ lịch và các mốc thời gian, giữ 30 ngày cho web nhân viên tra cứu.
        Script tự ghi, không sửa tay.
   Không cần cài thêm gì: mỗi khi có người dùng web (tối đa 30 giây 1 lần), script tự xếp dòng,
   ghi giờ duyệt / hoàn thành, chuyển trang và xoá lịch quá hạn.

   Muốn có file Excel: Tệp (File) > Tải xuống (Download) > Microsoft Excel (.xlsx).
   Nếu sau này sửa code ở đây: Triển khai > Quản lý triển khai > sửa (bút chì) >
   Phiên bản: Phiên bản mới > Triển khai. Link giữ nguyên.
   ===================================================================== */

const SO_KHACH_MOI_GIO = 3;   // phải giống với số trong data.js
const HUY_TRUOC_PHUT = 60;    // khách chỉ tự huỷ được trước giờ hẹn ít nhất 60 phút
const MUI_GIO = 'Asia/Ho_Chi_Minh';
const BAO_HANH_GIO = 24;      // tiệm bảo hành 24 giờ sau khi làm xong
const LUU_TRU_NGAY = 7;       // giữ lịch 7 ngày trong trang lưu trữ rồi xoá
const DANH_GIA_NGAY = 7;      // khách chỉ đánh giá được lịch trong 7 ngày (tính từ giờ hẹn / lúc hoàn thành)
const HO_SO_NGAY = 30;        // web nhân viên giữ thông tin khách 30 ngày
const DON_DEP_MOI_GIAY = 30;  // tự dọn / xếp dòng tối đa 30 giây 1 lần
const NGAY_MS = 86400000;

// Mỗi cơ sở 1 trang tính. "ma" phải giống mã chi nhánh trong data.js
const CO_SO = [
  { ma: 'CN1', ten: 'Lịch CN1 · Tân Định', mau: '#f9d5e5' },
  { ma: 'CN2', ten: 'Lịch CN2 · Hoàn Kiếm', mau: '#d9e8fb' },
];
const TEN_24H = '24h bảo hành';
const TEN_LUU_TRU = 'Lưu trữ 7 ngày';
const TEN_HO_SO = 'Hồ sơ 30 ngày';
const TEN_CAI_DAT = 'Cài đặt';
const TEN_TRANG_CU = 'Lịch đặt';   // bản cũ để chung 1 trang, sẽ được chia sang trang của từng cơ sở
const DA_ROI_SHEET = 'Đã rời các trang lịch';

const COT = ['Thời gian đặt', 'Mã lịch', 'Ngày hẹn', 'Giờ hẹn', 'Chi nhánh', 'Họ tên', 'Số điện thoại',
  'Kiểu làm', 'Mã mẫu', 'Tên mẫu', 'Yêu cầu riêng', 'Dịch vụ', 'Ghi chú', 'Thợ phụ trách', 'Trạng thái',
  'Huỷ lúc / lý do', 'Đánh giá', 'Mã làm', 'Duyệt lúc', 'Hoàn thành lúc', 'Mẫu thực tế', 'Ảnh thành quả'];
// Vị trí cột (đếm từ 0)
const C_THOI_GIAN = 0, C_MA_LICH = 1, C_NGAY = 2, C_GIO = 3, C_CHI_NHANH = 4, C_HO_TEN = 5, C_SDT = 6, C_KIEU = 7,
  C_MA_MAU = 8, C_TEN_MAU = 9, C_YEU_CAU = 10, C_DICH_VU = 11, C_GHI_CHU = 12, C_THO = 13, C_TRANG_THAI = 14,
  C_HUY = 15, C_DANH_GIA = 16, C_MA_LAM = 17, C_DUYET_LUC = 18, C_XONG_LUC = 19,
  C_MAU_TT = 20, C_ANH = 21;   // nhân viên ghi sau khi hoàn thành: làm như mẫu đặt hay mẫu mới, link ảnh thành quả
const COT_CU = 20;            // bản trước có 20 cột lịch, 2 cột kết quả được chèn vào sau cột "Hoàn thành lúc"
// Cột thêm ở cuối (cột thứ 21): trang cơ sở = số để xếp dòng (ẩn), trang 24h / lưu trữ = lúc chuyển vào
const COT_THEM = COT.length + 1;
// Trang hồ sơ: các cột lịch + đang ở trang nào + lần cập nhật cuối
const COT_HO_SO = COT.concat(['Đang ở trang', 'Cập nhật lúc']);
const HS_TRANG = COT.length, HS_CAP_NHAT = COT.length + 1;

const TRANG_THAI = ['Chờ duyệt', 'Đã duyệt', 'Hoàn thành', 'Đã huỷ', 'Khách không đến'];
const MAU_TRANG_THAI = { 'Chờ duyệt': ['#fff2cc', '#7f6000'], 'Đã duyệt': ['#cfe2f3', '#1c4587'],
  'Hoàn thành': ['#d9ead3', '#274e13'], 'Đã huỷ': ['#efefef', '#999999'], 'Khách không đến': ['#fce5cd', '#b45f06'] };
// Thứ tự từ trên xuống: lịch cần xử lý ở trên, lịch huỷ ở cuối
const THU_TU_TRANG_THAI = { 'Chờ duyệt': 0, 'Đã duyệt': 1, 'Hoàn thành': 2, 'Khách không đến': 3, 'Đã huỷ': 4 };
// Tên trạng thái của bản cũ -> tên mới
const TRANG_THAI_CU = { 'Mới': 'Chờ duyệt', 'Đã xác nhận': 'Đã duyệt', 'Xong': 'Hoàn thành' };
function tt_(v) {
  const s = String(v == null ? '' : v).trim();
  return TRANG_THAI_CU[s] || s || 'Chờ duyệt';
}
const TRANG_THAI_KN = ['Mới', 'Đang xử lý', 'Đã xử lý'];
const maCua_ = (r) => String(r[C_MA_LICH] || '').trim().toUpperCase();

// ---------- Bảng tính ----------
// Code dán từ trong 1 Google Sheet thì dùng sheet đó; dán ở script.new thì tự tạo và nhớ lại.
function layBangTinh_() {
  const dangMo = SpreadsheetApp.getActiveSpreadsheet();
  if (dangMo) return dangMo;
  const luu = PropertiesService.getScriptProperties();
  const id = luu.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* sheet đã bị xoá thì tạo lại */ }
  }
  const ss = SpreadsheetApp.create('Lịch đặt Dany Nail');
  luu.setProperty('SHEET_ID', ss.getId());
  return ss;
}

// "CN1 · Tân Định, Q1 (TP.HCM)" hoặc "CN1" -> cơ sở CN1
function coSoCua_(chiNhanh) {
  const s = String(chiNhanh || '').trim();
  return CO_SO.filter(function (c) { return s.indexOf(c.ma) === 0; })[0] || null;
}

// Trang lịch của 1 cơ sở (tự tạo nếu chưa có)
function layTrangCoSo_(ma) {
  const coSo = CO_SO.filter(function (c) { return c.ma === ma; })[0];
  const ss = layBangTinh_();
  return ss.getSheetByName(coSo.ten) || taoTrangLich_(ss, coSo.ten, coSo.mau, 'Thứ tự (tự động)', true);
}
const trang24h_ = () => layBangTinh_().getSheetByName(TEN_24H) || taoTrangLich_(layBangTinh_(), TEN_24H, '#fff2cc', 'Chuyển vào lúc', false);
const trangLuuTru_ = () => layBangTinh_().getSheetByName(TEN_LUU_TRU) || taoTrangLich_(layBangTinh_(), TEN_LUU_TRU, '#e6e6e6', 'Chuyển vào lúc', false);

// Các trang đang chứa lịch, theo thứ tự ưu tiên khi 1 lịch có ở 2 nơi (trang cơ sở và trang 24h)
function cacTrangLich_() {
  return CO_SO.map(function (c) { return { sh: layTrangCoSo_(c.ma), trang: 'co-so' }; })
    .concat([{ sh: trang24h_(), trang: '24h' }, { sh: trangLuuTru_(), trang: 'luu-tru' }]);
}

const GHI_CHU = {
  coSo: 'Chọn trạng thái ở ô thả xuống:\n'
    + '• Đã duyệt: web khách hiện "Đã duyệt" + Mã làm\n'
    + '• Hoàn thành: lịch được thêm ngay vào trang "' + TEN_24H + '", khách gửi khiếu nại được trong 24h\n'
    + '• Đã huỷ / Khách không đến: trả slot\n'
    + 'Khoảng 30 giây sau các dòng tự xếp lại: Chờ duyệt trên cùng, Đã huỷ ở cuối.',
  t24: 'Lịch Hoàn thành được thêm vào đây ngay (sửa thông tin ở trang cơ sở, trang này tự cập nhật theo). '
    + 'Khách khiếu nại được trong ' + BAO_HANH_GIO + ' giờ. Qua ' + BAO_HANH_GIO + ' giờ: không khiếu nại, không đánh giá thì sang trang "'
    + TEN_LUU_TRU + '"; có khiếu nại / đánh giá thì xem ở trang "Khiếu nại" / "Đánh giá".',
  luuTru: 'Lịch chờ khách đánh giá. Khách đánh giá thì dòng chuyển sang trang "Đánh giá". '
    + 'Sau ' + LUU_TRU_NGAY + ' ngày không đánh giá, dòng lịch TỰ XOÁ.',
};

// Cột thời gian hiện dạng ngày giờ. Sheet tự đổi chữ "26/10/2026 12:33" thành số ngày giờ,
// chép dòng sang trang khác (chỉ chép giá trị) sẽ hiện thành số 46321,52 nếu cột không có định dạng này
function dinhDangThoiGian_(sh, laCoSo) {
  const cot = [C_THOI_GIAN, C_DUYET_LUC, C_XONG_LUC].concat(laCoSo ? [] : [COT_THEM - 1]);
  cot.forEach(function (c) { sh.getRange(2, c + 1, sh.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm'); });
}

// Mỗi trạng thái 1 màu nền cho cả dòng lịch
function datMauTrangThai_(sh) {
  const dong = sh.getRange(2, 1, 2000, COT.length);
  sh.setConditionalFormatRules(Object.keys(MAU_TRANG_THAI).map(function (t) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$O2="' + t + '"')
      .setBackground(MAU_TRANG_THAI[t][0]).setFontColor(MAU_TRANG_THAI[t][1])
      .setRanges([dong]).build();
  }));
}

function taoTrangLich_(ss, ten, mau, tenCotThem, laCoSo) {
  const dau = ss.getSheets()[0];
  const sh = ss.getSheets().length === 1 && dau.getLastRow() === 0 ? dau.setName(ten) : ss.insertSheet(ten);
  sh.getRange(1, 1, 1, COT_THEM).setValues([COT.concat([tenCotThem])]).setFontWeight('bold').setBackground(mau);
  sh.setFrozenRows(1);
  sh.getRange('C:D').setNumberFormat('@'); // giữ ngày, giờ ở dạng chữ
  dinhDangThoiGian_(sh, laCoSo);
  sh.setColumnWidths(1, COT_THEM, 140);
  sh.setColumnWidth(C_YEU_CAU + 1, 260);
  datMauTrangThai_(sh);
  if (!laCoSo) {
    sh.getRange(1, 1).setNote(ten === TEN_24H ? GHI_CHU.t24 : GHI_CHU.luuTru);
    return sh;
  }
  // Trang cơ sở: ô chọn trạng thái, bộ lọc, cột thứ tự ẩn
  sh.getRange(2, C_TRANG_THAI + 1, 2000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TRANG_THAI, true).setAllowInvalid(false).build());
  sh.hideColumns(COT_THEM);
  sh.getRange(1, 1, sh.getMaxRows(), COT_THEM).createFilter();
  sh.getRange(1, C_TRANG_THAI + 1).setNote(GHI_CHU.coSo);
  sh.getRange(1, C_MA_LAM + 1).setNote('Mã làm tạo sẵn khi khách đặt. Khách chỉ thấy mã này sau khi lịch được chọn "Đã duyệt". Khách tới tiệm đọc mã để đối chiếu.');
  return sh;
}

// Trang hồ sơ (ẩn): mọi ô ở dạng chữ để số điện thoại, mã mẫu "05" không bị đổi kiểu
function trangHoSo_() {
  const ss = layBangTinh_();
  let sh = ss.getSheetByName(TEN_HO_SO);
  if (sh) return sh;
  sh = ss.insertSheet(TEN_HO_SO);
  sh.getRange(1, 1, sh.getMaxRows(), COT_HO_SO.length).setNumberFormat('@');
  sh.getRange(1, 1, 1, COT_HO_SO.length).setValues([COT_HO_SO]).setFontWeight('bold').setBackground('#ead1dc');
  sh.setFrozenRows(1);
  sh.getRange(1, 1).setNote('Script tự ghi: mọi lịch và các mốc thời gian, giữ ' + HO_SO_NGAY + ' ngày cho web nhân viên tra cứu. Không sửa tay.');
  sh.hideSheet();
  return sh;
}

// Trang "Cài đặt": ô B1 = mã đăng nhập web nhân viên
function trangCaiDat_() {
  const ss = layBangTinh_();
  let sh = ss.getSheetByName(TEN_CAI_DAT);
  if (sh) return sh;
  sh = ss.insertSheet(TEN_CAI_DAT);
  sh.getRange('B1').setNumberFormat('@');
  sh.getRange('A1').setValue('Mã đăng nhập web nhân viên').setFontWeight('bold');
  sh.getRange('A3').setValue('Web nhân viên (nhan-vien.html) đăng nhập bằng mã ở ô B1. Muốn đổi thì sửa ô B1, ít nhất 8 ký tự. '
    + 'Không chia sẻ bảng tính này cho người ngoài.');
  sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 240);
  return sh;
}

// Bản cũ để mọi lịch chung trang "Lịch đặt": chép từng dòng sang trang của cơ sở, rồi ẩn trang cũ (không xoá)
function chiaLichCu_(ss) {
  const cu = ss.getSheetByName(TEN_TRANG_CU);
  if (!cu || cu.isSheetHidden()) return;
  const so = cu.getLastRow() - 1;
  if (so > 0) {
    cu.getRange(2, 1, so, COT.length).getValues().forEach(function (r, i) {
      if (!maCua_(r)) return;
      const sh = layTrangCoSo_((coSoCua_(r[C_CHI_NHANH]) || CO_SO[0]).ma);
      const hang = sh.getLastRow() + 1;
      cu.getRange(i + 2, 1, 1, COT.length).copyTo(sh.getRange(hang, 1), { contentsOnly: true });
      sh.getRange(hang, C_TRANG_THAI + 1).setValue(tt_(r[C_TRANG_THAI]));   // tên trạng thái kiểu cũ -> mới
    });
  }
  cu.setName(TEN_TRANG_CU + ' (cũ, đã chia theo cơ sở)');
  cu.hideSheet();
}

// Ghi chú ở dòng tiêu đề theo luồng mới (cập nhật 1 lần cho các trang tạo từ bản trước)
function capNhatGhiChu_() {
  const luu = PropertiesService.getScriptProperties();
  // Trang tạo từ bản trước chưa có định dạng ngày giờ ở các cột thời gian (làm 1 lần)
  if (!luu.getProperty('DINH_DANG_GIO_V1')) {
    CO_SO.forEach(function (c) { dinhDangThoiGian_(layTrangCoSo_(c.ma), true); });
    dinhDangThoiGian_(trang24h_(), false);
    dinhDangThoiGian_(trangLuuTru_(), false);
    luu.setProperty('DINH_DANG_GIO_V1', '1');
  }
  if (luu.getProperty('GHI_CHU_V2')) return;
  CO_SO.forEach(function (c) { layTrangCoSo_(c.ma).getRange(1, C_TRANG_THAI + 1).setNote(GHI_CHU.coSo); });
  trang24h_().getRange(1, 1).setNote(GHI_CHU.t24);
  trangLuuTru_().getRange(1, 1).setNote(GHI_CHU.luuTru);
  trangKhieuNai_().getRange(1, 13).setNote('Mới / Đang xử lý / Đã xử lý.');
  luu.setProperty('GHI_CHU_V2', '1');
}

// Trang tạo từ bản trước chưa có 2 cột "Mẫu thực tế", "Ảnh thành quả": chèn vào sau cột "Hoàn thành lúc"
// (cột thứ tự / chuyển vào lúc / đang ở trang dịch sang phải cùng dữ liệu)
function themCotKetQua_() {
  const luu = PropertiesService.getScriptProperties();
  if (luu.getProperty('COT_KET_QUA_V1')) return;
  const ss = layBangTinh_();
  const chen = function (sh) {
    if (!sh || sh.getRange(1, COT_CU + 1).getValue() === COT[C_MAU_TT]) return;
    sh.insertColumnsBefore(COT_CU + 1, 2);
    sh.getRange(1, COT_CU + 1, 1, 2).setValues([[COT[C_MAU_TT], COT[C_ANH]]]).setFontWeight('bold');
  };
  const trangLich = CO_SO.map(function (c) { return ss.getSheetByName(c.ten); })
    .concat([ss.getSheetByName(TEN_24H), ss.getSheetByName(TEN_LUU_TRU)]).filter(Boolean);
  trangLich.forEach(function (sh) { chen(sh); datMauTrangThai_(sh); });
  const hs = ss.getSheetByName(TEN_HO_SO);
  if (hs) {
    chen(hs);
    hs.getRange(1, 1, hs.getMaxRows(), COT_HO_SO.length).setNumberFormat('@');
  }
  luu.setProperty('COT_KET_QUA_V1', '1');
}

// ---------- Tự dọn (chạy khi có người dùng web, tối đa 30 giây 1 lần, đang giữ khoá) ----------
function donDepNeuDenHan_(batBuoc) {
  themCotKetQua_();
  chiaLichCu_(layBangTinh_());
  const luu = PropertiesService.getScriptProperties();
  if (!batBuoc && Date.now() - Number(luu.getProperty('DON_DEP_LUC') || 0) < DON_DEP_MOI_GIAY * 1000) return;
  luu.setProperty('DON_DEP_LUC', String(Date.now()));
  donDep_();
}

function donDep_() {
  const bayGio = Date.now();
  const dauHomNay = Utilities.parseDate(Utilities.formatDate(new Date(), MUI_GIO, 'dd/MM/yyyy'), MUI_GIO, 'dd/MM/yyyy').getTime();
  const t24 = trang24h_();
  const luuTru = trangLuuTru_();
  const daRoi = [];   // dòng bị xoá khỏi các trang lịch: vẫn giữ trong hồ sơ 30 ngày
  capNhatGhiChu_();

  // 1. Trang cơ sở: ghi giờ duyệt / hoàn thành còn thiếu, lịch Hoàn thành có ngay ở trang 24h,
  //    hết ngày thì lịch Hoàn thành rời trang (đã có ở 24h), lịch huỷ / không đến sang lưu trữ; xếp lại
  const conOCoSo = {};
  CO_SO.forEach(function (c) {
    const sh = layTrangCoSo_(c.ma);
    boSungThoiGian_(sh);
    dongBo24h_(sh, t24);
    chuyenDong_(sh, function (r) {
      const ngay = thoiDiem_(chuNgay_(r[C_NGAY]));
      if (!ngay || ngay.getTime() >= dauHomNay) return null;
      const t = tt_(r[C_TRANG_THAI]);
      if (t === 'Hoàn thành') return 'xoa';
      if (t === 'Đã huỷ' || t === 'Khách không đến') return luuTru;
      return null;   // chờ duyệt / đã duyệt của ngày cũ: giữ lại để tiệm xử lý
    }, null);
    sapXep_(sh);
    docDong_(sh).forEach(function (r) { conOCoSo[maCua_(r)] = true; });
  });

  // 2. Trang 24h: qua 24 giờ sau khi làm xong -> không khiếu nại, không đánh giá thì sang lưu trữ;
  //    có khiếu nại / đánh giá thì rời trang (xem ở trang "Khiếu nại" / "Đánh giá")
  const coKhieuNai = maLichCoKhieuNai_();
  chuyenDong_(t24, function (r) {
    if (conOCoSo[maCua_(r)]) return null;   // còn ở trang cơ sở (trong ngày): chờ hết ngày
    const xong = thoiDiem_(r[C_XONG_LUC]) || thoiDiemHenAnToan_(r);
    if (!xong || bayGio - xong.getTime() < BAO_HANH_GIO * 3600000) return null;
    return coKhieuNai[maCua_(r)] || String(r[C_DANH_GIA] || '').trim() ? 'xoa' : luuTru;
  }, daRoi);

  // 3. Lưu trữ: khách đã đánh giá -> rời trang (xem ở trang "Đánh giá"); quá 7 ngày -> xoá hẳn
  chuyenDong_(luuTru, function (r) {
    if (String(r[C_DANH_GIA] || '').trim()) return 'xoa';
    const vao = thoiDiem_(r[COT_THEM - 1]);
    return vao && bayGio - vao.getTime() > LUU_TRU_NGAY * NGAY_MS ? 'xoa' : null;
  }, daRoi);

  // 4. Hồ sơ 30 ngày cho web nhân viên
  dongBoHoSo_(daRoi);
}

function docDong_(sh, soCot) {
  const so = sh.getLastRow() - 1;
  return so > 0 ? sh.getRange(2, 1, so, soCot || COT.length).getValues() : [];
}

// Chuyển các dòng được chọn sang trang khác (ghi lúc chuyển vào cột cuối) hoặc xoá ('xoa'), rồi xoá ở trang cũ.
// daRoi: nơi nhận các dòng bị xoá hẳn khỏi trang lịch.
function chuyenDong_(sh, chonTrangDen, daRoi) {
  const giaTri = docDong_(sh, COT_THEM);
  const xoa = [];
  giaTri.forEach(function (r, i) {
    if (!maCua_(r)) return;
    const den = chonTrangDen(r);
    if (!den) return;
    if (den === 'xoa') {
      if (daRoi) daRoi.push(r.slice(0, COT.length));
    } else {
      const hang = den.getLastRow() + 1;
      sh.getRange(i + 2, 1, 1, COT.length).copyTo(den.getRange(hang, 1), { contentsOnly: true });
      den.getRange(hang, COT_THEM).setValue(bayGio_());
    }
    xoa.push(i + 2);
  });
  for (let k = xoa.length - 1; k >= 0; k--) sh.deleteRow(xoa[k]);
}

// Lịch Hoàn thành ở trang cơ sở có ngay 1 bản ở trang 24h (cập nhật theo trang cơ sở);
// nhân viên đổi trạng thái khác Hoàn thành thì bỏ bản ở trang 24h
function dongBo24h_(sh, t24) {
  const coSo = docDong_(sh);
  const ban24 = docDong_(t24);
  const hang24 = {};
  ban24.forEach(function (r, i) { if (maCua_(r)) hang24[maCua_(r)] = i + 2; });
  const boDi = [];
  coSo.forEach(function (r, i) {
    const ma = maCua_(r);
    if (!ma) return;
    const h = hang24[ma];
    if (tt_(r[C_TRANG_THAI]) === 'Hoàn thành') {
      if (!h) {
        const hang = t24.getLastRow() + 1;
        sh.getRange(i + 2, 1, 1, COT.length).copyTo(t24.getRange(hang, 1), { contentsOnly: true });
        t24.getRange(hang, COT_THEM).setValue(bayGio_());
      } else if (JSON.stringify(r) !== JSON.stringify(ban24[h - 2])) {
        sh.getRange(i + 2, 1, 1, COT.length).copyTo(t24.getRange(h, 1), { contentsOnly: true });
      }
    } else if (h) boDi.push(h);
  });
  boDi.sort(function (a, b) { return b - a; }).forEach(function (h) { t24.deleteRow(h); });
}

// Nhân viên chọn trạng thái ngay trên Sheet: điền mã làm, giờ duyệt, giờ hoàn thành nếu còn trống
function boSungThoiGian_(sh) {
  docDong_(sh).forEach(function (r, i) {
    const t = tt_(r[C_TRANG_THAI]);
    if (!maCua_(r) || (t !== 'Đã duyệt' && t !== 'Hoàn thành')) return;
    const hang = i + 2;
    if (!String(r[C_MA_LAM] || '').trim()) sh.getRange(hang, C_MA_LAM + 1).setValue("'" + maLamMoi_());
    if (!String(r[C_DUYET_LUC] || '').trim()) sh.getRange(hang, C_DUYET_LUC + 1).setValue(bayGio_());
    if (t === 'Hoàn thành' && !String(r[C_XONG_LUC] || '').trim()) sh.getRange(hang, C_XONG_LUC + 1).setValue(bayGio_());
  });
}

// Mã lịch đã có khiếu nại (trang "Khiếu nại", cột 5)
function maLichCoKhieuNai_() {
  const ds = {};
  docDong_(trangKhieuNai_(), COT_KHIEU_NAI.length).forEach(function (r) {
    const ma = String(r[4] || '').trim().toUpperCase();
    if (ma) ds[ma] = true;
  });
  return ds;
}

// ---------- Hồ sơ 30 ngày: bản ghi đầy đủ của mọi lịch cho web nhân viên ----------
// Ô thành chữ để so sánh và ghi lại không bị đổi kiểu
function chuoiHoa_(r, soCot) {
  const kq = [];
  for (let i = 0; i < soCot; i++) {
    const v = r[i];
    if (v instanceof Date) kq.push(i === C_NGAY ? chuNgay_(v) : i === C_GIO ? chuGio_(v) : Utilities.formatDate(v, MUI_GIO, 'dd/MM/yyyy HH:mm'));
    else kq.push(v == null ? '' : String(v));
  }
  return kq;
}

function dongBoHoSo_(daRoi) {
  const hs = trangHoSo_();
  const cu = docDong_(hs, COT_HO_SO.length).map(function (r) { return chuoiHoa_(r, COT_HO_SO.length); });
  const moi = cu.map(function (r) { return r.slice(); });
  const viTri = {};
  moi.forEach(function (r, i) { if (maCua_(r)) viTri[maCua_(r)] = i; });
  const bayGio = bayGio_();
  const daThay = {};

  function ghi(r, trang) {
    const dong = chuoiHoa_(r, COT.length).concat([trang, '']);
    const ma = maCua_(dong);
    if (!ma) return;
    const i = viTri[ma];
    if (i === undefined) {
      dong[HS_CAP_NHAT] = bayGio;
      viTri[ma] = moi.length;
      moi.push(dong);
    } else if (dong.slice(0, HS_CAP_NHAT).join('\u0001') !== moi[i].slice(0, HS_CAP_NHAT).join('\u0001')) {
      dong[HS_CAP_NHAT] = bayGio;
      moi[i] = dong;
    }
  }

  // Lịch còn ở các trang lịch (ưu tiên trang cơ sở), rồi lịch vừa rời trang
  cacTrangLich_().forEach(function (t) {
    docDong_(t.sh).forEach(function (r) {
      if (!maCua_(r) || daThay[maCua_(r)]) return;
      daThay[maCua_(r)] = true;
      ghi(r, t.sh.getName());
    });
  });
  (daRoi || []).forEach(function (r) {
    if (!daThay[maCua_(r)]) { daThay[maCua_(r)] = true; ghi(r, DA_ROI_SHEET); }
  });
  moi.forEach(function (r, i) {
    if (!daThay[maCua_(r)] && r[HS_TRANG] !== DA_ROI_SHEET) {
      moi[i] = r.slice(0, HS_TRANG).concat([DA_ROI_SHEET, bayGio]);
    }
  });

  // Quá 30 ngày (tính từ giờ hẹn và lần cập nhật cuối) và không còn ở trang lịch nào -> xoá
  const conLai = moi.filter(function (r) {
    if (daThay[maCua_(r)] && r[HS_TRANG] !== DA_ROI_SHEET) return true;
    const moc = Math.max((thoiDiemHenAnToan_(r) || new Date(0)).getTime(), (thoiDiem_(r[HS_CAP_NHAT]) || new Date(0)).getTime());
    return Date.now() - moc <= HO_SO_NGAY * NGAY_MS;
  });

  const doi = conLai.length !== cu.length || conLai.some(function (r, i) { return r.join('\u0001') !== cu[i].join('\u0001'); });
  if (!doi) return;
  if (conLai.length + 1 > hs.getMaxRows()) hs.insertRowsAfter(hs.getMaxRows(), conLai.length + 1 - hs.getMaxRows() + 100);
  hs.getRange(1, 1, hs.getMaxRows(), COT_HO_SO.length).setNumberFormat('@');
  if (cu.length) hs.getRange(2, 1, cu.length, COT_HO_SO.length).clearContent();
  if (conLai.length) hs.getRange(2, 1, conLai.length, COT_HO_SO.length).setValues(conLai);
}

// ---------- Xếp dòng: Chờ duyệt > Đã duyệt > Hoàn thành > Khách không đến > Đã huỷ ----------
// Lịch chờ / đã duyệt: hẹn sớm ở trên. Lịch đã xong / huỷ: mới nhất ở trên.
function soThuTu_(r) {
  const nhom = THU_TU_TRANG_THAI[tt_(r[C_TRANG_THAI])];
  const hen = thoiDiemHenAnToan_(r);
  const gio = hen ? Number(Utilities.formatDate(hen, MUI_GIO, 'yyyyMMddHH')) : 0;
  return (nhom === undefined ? 0 : nhom) * 1e10 + (nhom > 1 ? 9999999999 - gio : gio);
}
function sapXep_(sh) {
  const so = sh.getLastRow() - 1;
  if (so < 1) return;
  const giaTri = sh.getRange(2, 1, so, COT_THEM).getValues();
  const moi = giaTri.map(function (r) { return maCua_(r) ? soThuTu_(r) : 9e10; });
  // Đã đúng thứ tự thì thôi, tránh làm dòng nhảy khi nhân viên đang xem
  const daDung = moi.every(function (k, i) { return k === giaTri[i][COT_THEM - 1] && (i === 0 || moi[i - 1] <= k); });
  if (daDung) return;
  sh.getRange(2, COT_THEM, so, 1).setValues(moi.map(function (k) { return [k]; }));
  const loc = sh.getFilter();
  if (loc) loc.sort(COT_THEM, true);
  else sh.getRange(2, 1, so, COT_THEM).sort({ column: COT_THEM, ascending: true });
}

// ---------- Hàm phụ ----------
function chuNgay_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, MUI_GIO, 'dd/MM/yyyy');
  return String(v).trim();
}
function chuGio_(v) {
  // Ô bị Sheet tự đổi thành kiểu giờ thường lệch vài phút do múi giờ năm 1899; khung giờ luôn tròn giờ nên làm tròn
  if (v instanceof Date) return ('0' + Math.round(v.getHours() + v.getMinutes() / 60)).slice(-2) + ':00';
  const s = String(v).trim();
  return /^\d{1,2}$/.test(s) ? ('0' + s).slice(-2) + ':00' : s;
}
function soGio_(v) {
  return parseInt(chuGio_(v), 10);
}
// Chỉ giữ chữ số, đổi +84 về 0 để so số điện thoại
function chuanSdt_(v) {
  let s = String(v).replace(/\D/g, '');
  if (s.indexOf('84') === 0 && s.length === 11) s = '0' + s.slice(2);
  return s;
}
function thoiDiemHen_(ngay, gio) {
  return Utilities.parseDate(chuNgay_(ngay) + ' ' + chuGio_(gio), MUI_GIO, 'dd/MM/yyyy HH:mm');
}
function thoiDiemHenAnToan_(r) {
  try { return thoiDiemHen_(r[C_NGAY], r[C_GIO]); } catch (e) { return null; }
}
// Ô ngày giờ: Sheet có thể tự đổi chữ "dd/MM/yyyy HH:mm" thành kiểu ngày, đọc được cả hai
function thoiDiem_(v) {
  if (v instanceof Date) return v;
  const s = String(v || '').trim().slice(0, 16);
  if (!s) return null;
  try { return Utilities.parseDate(s, MUI_GIO, s.length > 10 ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'); } catch (e) { return null; }
}
function traJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
// Chữ khách gõ: cắt độ dài, và thêm dấu ' nếu bắt đầu bằng = + - @ để Sheet không hiểu thành công thức
function chu_(v, toiDa) {
  let s = String(v == null ? '' : v).trim().slice(0, toiDa || 500);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function bayGio_() {
  return Utilities.formatDate(new Date(), MUI_GIO, 'dd/MM/yyyy HH:mm');
}
const maLamMoi_ = () => String(Math.floor(1000 + Math.random() * 9000));

// ---------- Trang tính "Đánh giá", "Khiếu nại" (tự tạo nếu chưa có) ----------
const COT_DANH_GIA = ['Thời gian', 'Chi nhánh', 'Điểm chung (1-5)', 'Chất lượng', 'Thái độ phục vụ', 'Vệ sinh',
  'Góp ý', 'Người gửi', 'Liên hệ (nếu muốn tiệm phản hồi)', 'Tiệm đã xem', 'Mã lịch được đánh giá',
  'Trạng thái lịch của khách', 'Lịch hẹn (ngày, giờ)', 'Mẫu / yêu cầu của lịch'];
const COT_KHIEU_NAI = ['Thời gian gửi', 'Mã khiếu nại', 'Họ tên', 'Số điện thoại', 'Mã lịch', 'Khớp lịch đặt',
  'Ngày làm', 'Chi nhánh', 'Loại vấn đề', 'Mô tả', 'Link ảnh', 'Khách mong muốn', 'Trạng thái', 'Người xử lý', 'Ghi chú của tiệm',
  'Mẫu đã làm (tiệm ghi)', 'Ảnh thành quả (tiệm chụp)'];

function layTrangPhu_(ten, cot, mauNen) {
  const ss = layBangTinh_();
  let sh = ss.getSheetByName(ten);
  if (!sh) {
    sh = ss.insertSheet(ten);
    sh.appendRow(cot);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cot.length).setFontWeight('bold').setBackground(mauNen);
    sh.setColumnWidths(1, cot.length, 130);
  }
  // Trang tạo từ bản cũ thiếu cột mới thì thêm tên cột
  const dau = sh.getRange(1, 1, 1, cot.length);
  const tenCot = dau.getValues()[0];
  if (tenCot.some(function (t) { return t === ''; })) {
    dau.setValues([cot.map(function (c, i) { return tenCot[i] || c; })]).setFontWeight('bold').setBackground(mauNen);
  }
  return sh;
}
function trangDanhGia_() {
  const sh = layTrangPhu_('Đánh giá', COT_DANH_GIA, '#d9ead3');
  // Bản cũ đặt tên cột K là "Khách đã làm tại tiệm (mã lịch)": đổi sang tên mới
  const k = sh.getRange(1, 11);
  if (k.getValue() === 'Khách đã làm tại tiệm (mã lịch)') k.setValue(COT_DANH_GIA[10]);
  return sh;
}
function trangKhieuNai_() {
  const sh = layTrangPhu_('Khiếu nại', COT_KHIEU_NAI, '#fce5cd');
  // Cột "Trạng thái" của khiếu nại thành ô chọn (làm 1 lần)
  const luu = PropertiesService.getScriptProperties();
  const khoa = 'KN_TRANG_THAI_V1_' + sh.getSheetId();
  if (!luu.getProperty(khoa)) {
    sh.getRange(2, 13, 2000, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TRANG_THAI_KN, true).setAllowInvalid(true).build());
    sh.getRange(1, 13).setNote('Mới / Đang xử lý / Đã xử lý.');
    luu.setProperty(khoa, '1');
  }
  return sh;
}

function diem_(v, batBuoc) {
  const n = parseInt(v, 10);
  if (n >= 1 && n <= 5) return n;
  return batBuoc ? null : '';
}

// Ghi 1 ô của lịch ở mọi nơi đang có lịch đó (trang cơ sở, 24h, lưu trữ, hồ sơ)
function ghiMoiNoi_(maLich, cot, giaTri) {
  const ma = String(maLich || '').trim().toUpperCase();
  cacTrangLich_().map(function (t) { return t.sh; }).concat([trangHoSo_()]).forEach(function (sh) {
    docDong_(sh).forEach(function (r, i) {
      if (maCua_(r) === ma) sh.getRange(i + 2, cot + 1).setValue(giaTri);
    });
  });
}

function danhGia_(d) {
  if (d.web) return { ok: true };                 // ô bẫy chống gửi rác tự động: người thật không điền ô này
  const chung = diem_(d.diem, true);
  if (!chung) return { ok: false, loi: 'Chưa chọn số sao.' };

  // Ai cũng đánh giá được. Gắn với lịch đã đặt (không bắt buộc) thì ghi kèm thông tin lịch, mỗi lịch 1 lần, trong 7 ngày
  let tim = null;
  if (String(d.maLich || '').trim()) {
    tim = timHang_(d.maLich, d.sdt);
    if (!tim) return { ok: false, loi: 'khong-thay' };
    if (String(tim.r[C_DANH_GIA] || '').trim()) return { ok: false, loi: 'da-danh-gia' };
    if (!conDanhGia_(tim.r)) return { ok: false, loi: 'qua-han-danh-gia' };
    // Mỗi ngày khách đánh giá tối đa 2 đơn chưa hoàn thành (web đếm và báo hết lượt); đơn đã hoàn thành không giới hạn
    if (d.hetLuotChuaXong && tt_(tim.r[C_TRANG_THAI]) !== 'Hoàn thành') return { ok: false, loi: 'qua-gioi-han' };
  }
  const anDanh = d.anDanh !== false;
  // Ẩn danh: không ghi tên, liên hệ vào trang "Đánh giá"; lịch đặt đánh dấu đã đánh giá
  if (tim) ghiMoiNoi_(tim.r[C_MA_LICH], C_DANH_GIA, '★ ' + chung + '/5 · ' + bayGio_() + (anDanh ? ' · ẩn danh' : ''));

  trangDanhGia_().appendRow([
    bayGio_(), chu_(tim ? tim.r[C_CHI_NHANH] : d.chiNhanh, 60), chung, diem_(d.chatLuong), diem_(d.dichVu), diem_(d.veSinh),
    chu_(d.gopY, 2000), anDanh ? 'Ẩn danh' : chu_(d.ten, 60) || 'Không ghi tên', anDanh ? '' : chu_(d.lienHe, 80), '',
    // Đánh giá cho lịch nào thì ghi rõ mã lịch, trạng thái, ngày giờ hẹn và mẫu (kể cả khi gửi ẩn danh)
    tim ? String(tim.r[C_MA_LICH]) : '',
    tim ? tt_(tim.r[C_TRANG_THAI]) : 'Không gắn lịch đặt',
    tim ? "'" + chuGio_(tim.r[C_GIO]) + ' ' + chuNgay_(tim.r[C_NGAY]) : '',
    tim ? chu_(noiDungLich_(tim.r), 300) : '',
  ]);
  return { ok: true, trangThai: tim ? tt_(tim.r[C_TRANG_THAI]) : '' };   // web dùng để đếm lượt đơn chưa hoàn thành
}

// "Theo mẫu · Mẫu 05 Hồng mắt mèo" / "Tự phối · ..." / "Yêu cầu riêng · ..."
function noiDungLich_(r) {
  const mau = String(r[C_MA_MAU] || '').trim() ? 'Mẫu ' + r[C_MA_MAU] + ' ' + String(r[C_TEN_MAU] || '') : '';
  return [String(r[C_KIEU] || ''), mau, String(r[C_YEU_CAU] || '')].filter(function (x) { return x.trim(); }).join(' · ');
}

// Còn được đánh giá: trong 7 ngày tính từ giờ hẹn (hoặc lúc hoàn thành nếu muộn hơn)
function conDanhGia_(r) {
  const hen = thoiDiemHenAnToan_(r);
  const xong = thoiDiem_(r[C_XONG_LUC]);
  const moc = Math.max(hen ? hen.getTime() : 0, xong ? xong.getTime() : 0);
  return !moc || Date.now() - moc <= DANH_GIA_NGAY * NGAY_MS;
}

// Lịch của khách (mã lịch + số điện thoại khớp) và tiệm đã chọn "Hoàn thành"
function timLichHoanThanh_(maLich, sdt) {
  const tim = timHang_(maLich, sdt);
  if (!tim) return { loi: 'khong-thay' };
  if (tt_(tim.r[C_TRANG_THAI]) !== 'Hoàn thành') return { loi: 'chua-xong' };
  return tim;
}

// Còn trong 24 giờ bảo hành: đã hoàn thành, chưa quá 24 giờ sau khi làm xong
function conBaoHanh_(r, trang) {
  if (tt_(r[C_TRANG_THAI]) !== 'Hoàn thành' || trang === 'luu-tru') return false;
  const xong = thoiDiem_(r[C_XONG_LUC]);
  return !xong || Date.now() - xong.getTime() <= BAO_HANH_GIO * 3600000;
}

function khieuNai_(d) {
  if (d.web) return { ok: true, maKN: 'KN' };
  const sdt = chuanSdt_(d.sdt);
  if (!chu_(d.hoTen) || sdt.length !== 10 || !d.loai || String(d.moTa || '').trim().length < 10) {
    return { ok: false, loi: 'Thiếu thông tin bắt buộc.' };
  }
  // Chỉ khiếu nại được lịch đã "Hoàn thành" và còn bảo hành 24 giờ; ngày làm, chi nhánh lấy từ lịch đặt
  const tim = timLichHoanThanh_(d.maLich, d.sdtLich);
  if (tim.loi) return { ok: false, loi: tim.loi };
  if (!conBaoHanh_(tim.r, tim.trang)) return { ok: false, loi: 'het-bao-hanh' };
  // Mỗi lịch khiếu nại 1 lần (không giới hạn số lần khiếu nại trong ngày)
  if (daKhieuNai_(tim.r[C_MA_LICH])) return { ok: false, loi: 'da-khieu-nai' };
  const maKN = 'KN' + Utilities.formatDate(new Date(), MUI_GIO, 'ddMM') + '-' + Math.floor(1000 + Math.random() * 9000);
  trangKhieuNai_().appendRow([
    bayGio_(), maKN, chu_(d.hoTen, 80), "'" + sdt, String(tim.r[C_MA_LICH]), 'Có (đã hoàn thành)', "'" + chuNgay_(tim.r[C_NGAY]),
    chu_(tim.r[C_CHI_NHANH], 60), chu_(d.loai, 60), chu_(d.moTa, 3000), chu_(d.link, 500), chu_(d.mongMuon, 200),
    'Mới', '', '',
    // Chứng cứ của tiệm: mẫu đã làm và ảnh thành quả nhân viên ghi lúc hoàn thành
    String(tim.r[C_MAU_TT] || ''), String(tim.r[C_ANH] || ''),
  ]);
  return { ok: true, maKN: maKN };
}

// Lịch đã có khiếu nại chưa
const daKhieuNai_ = (maLich) => !!maLichCoKhieuNai_()[String(maLich || '').trim().toUpperCase()];

// Đếm số khách đã giữ chỗ theo từng giờ của 1 ngày, 1 cơ sở.
// "Chờ duyệt" cũng được tính (khách đang giữ ghế), chỉ bỏ lịch đã huỷ.
function demDaDat_(ngay, chiNhanh) {
  const dem = {};
  const coSo = coSoCua_(chiNhanh);
  if (!coSo) return dem;
  layTrangCoSo_(coSo.ma).getDataRange().getValues().slice(1).forEach(function (r) {
    if (chuNgay_(r[C_NGAY]) !== ngay) return;
    if (tt_(r[C_TRANG_THAI]) === 'Đã huỷ') return;
    const gio = soGio_(r[C_GIO]);
    dem[gio] = (dem[gio] || 0) + 1;
  });
  return dem;
}

// Tìm dòng theo mã lịch + số điện thoại (phải khớp cả hai): trang 2 cơ sở, 24h, lưu trữ,
// rồi hồ sơ 30 ngày (lịch đã rời các trang lịch vẫn tra được trạng thái)
function timHang_(maLich, sdt) {
  const ma = String(maLich || '').trim().toUpperCase();
  const so = chuanSdt_(sdt || '');
  if (!ma || !so) return null;
  const cacTrang = cacTrangLich_().concat([{ sh: trangHoSo_(), trang: 'ho-so' }]);
  for (let k = 0; k < cacTrang.length; k++) {
    const giaTri = docDong_(cacTrang[k].sh);
    for (let i = 0; i < giaTri.length; i++) {
      const r = giaTri[i];
      if (maCua_(r) === ma && chuanSdt_(r[C_SDT]) === so) {
        return { sh: cacTrang[k].sh, trang: cacTrang[k].trang, hang: i + 2, r: r };
      }
    }
  }
  return null;
}

function lichRaJson_(r, trang) {
  const trangThai = tt_(r[C_TRANG_THAI]);
  return {
    maLich: String(r[C_MA_LICH]),
    ngay: chuNgay_(r[C_NGAY]),
    gio: chuGio_(r[C_GIO]),
    chiNhanh: String(r[C_CHI_NHANH]),
    hoTen: String(r[C_HO_TEN]),
    kieuLam: String(r[C_KIEU]),
    maMau: String(r[C_MA_MAU]),
    tenMau: String(r[C_TEN_MAU]),
    yeuCau: String(r[C_YEU_CAU]),
    dichVu: String(r[C_DICH_VU]),
    trangThai: trangThai,
    daDanhGia: String(r[C_DANH_GIA] || '').trim() !== '',
    conDanhGia: conDanhGia_(r),
    // Mã làm chỉ có khi tiệm đã duyệt
    maLam: trangThai === 'Đã duyệt' || trangThai === 'Hoàn thành' ? String(r[C_MA_LAM] || '') : '',
    conBaoHanh: conBaoHanh_(r, trang),
    daKhieuNai: trangThai === 'Hoàn thành' && daKhieuNai_(r[C_MA_LICH]),
    // Kết quả tiệm ghi sau khi làm xong (khách xem lại được, làm chứng cứ khi có khiếu nại)
    mauThucTe: trangThai === 'Hoàn thành' ? String(r[C_MAU_TT] || '') : '',
    anhThanhQua: trangThai === 'Hoàn thành' ? String(r[C_ANH] || '') : '',
  };
}

// ---------- Web nhân viên: mã đăng nhập ----------
function kiemPin_(pin) {
  const cache = CacheService.getScriptCache();
  const sai = Number(cache.get('nv-sai') || 0);
  if (sai >= 10) return 'tam-khoa';
  const dung = String(trangCaiDat_().getRange('B1').getValue() || '').trim();
  if (!dung) return 'chua-cai';
  if (String(pin || '').trim() !== dung) {
    cache.put('nv-sai', String(sai + 1), 600);
    return 'sai-pin';
  }
  return '';
}

// Chỉ đặt được mã lần đầu, khi ô B1 còn trống
function caiPin_(d) {
  const o = trangCaiDat_().getRange('B1');
  if (String(o.getValue() || '').trim()) return { ok: false, loi: 'da-co-pin' };
  const pin = String(d.pin || '').trim();
  if (pin.length < 8) return { ok: false, loi: 'pin-ngan' };
  o.setValue(pin);
  return { ok: true };
}

// Tra cứu cho nhân viên: lọc theo mã lịch, số điện thoại, khoảng ngày hẹn, cơ sở (bỏ trống = không lọc)
function nvTim_(d) {
  const ma = String(d.maLich || '').trim().toUpperCase();
  const so = chuanSdt_(d.sdt || '');
  const tu = d.tuNgay ? thoiDiem_(d.tuNgay) : null;
  const den = d.denNgay ? thoiDiem_(d.denNgay) : null;
  const coSo = String(d.coSo || '').trim();

  // Khiếu nại, đánh giá theo mã lịch
  const kn = {}, dg = {};
  const fmt = (v) => (v instanceof Date ? Utilities.formatDate(v, MUI_GIO, 'dd/MM/yyyy HH:mm') : String(v == null ? '' : v));
  docDong_(trangKhieuNai_(), COT_KHIEU_NAI.length).forEach(function (r) {
    const m = String(r[4] || '').trim().toUpperCase();
    if (m) (kn[m] = kn[m] || []).push({ luc: fmt(r[0]), maKN: fmt(r[1]), loai: fmt(r[8]), moTa: fmt(r[9]), link: fmt(r[10]),
      mongMuon: fmt(r[11]), trangThai: fmt(r[12]) || 'Mới', nguoiXuLy: fmt(r[13]), ghiChu: fmt(r[14]) });
  });
  docDong_(trangDanhGia_(), COT_DANH_GIA.length).forEach(function (r) {
    const m = String(r[10] || '').trim().toUpperCase();
    if (m) (dg[m] = dg[m] || []).push({ luc: fmt(r[0]), diem: fmt(r[2]), chatLuong: fmt(r[3]), thaiDo: fmt(r[4]), veSinh: fmt(r[5]),
      gopY: fmt(r[6]), nguoiGui: fmt(r[7]) });
  });

  const ds = [];
  docDong_(trangHoSo_(), COT_HO_SO.length).forEach(function (r0) {
    const r = chuoiHoa_(r0, COT_HO_SO.length);
    const m = maCua_(r);
    if (!m) return;
    if (ma && m.indexOf(ma) < 0) return;
    if (so && chuanSdt_(r[C_SDT]).indexOf(so) < 0) return;
    if (coSo && r[C_CHI_NHANH].indexOf(coSo) !== 0) return;
    const ngay = thoiDiem_(r[C_NGAY]);
    if ((tu || den) && !ngay) return;
    if (tu && ngay < tu) return;
    if (den && ngay > den) return;
    const hen = thoiDiemHenAnToan_(r);
    ds.push({
      maLich: r[C_MA_LICH], ngay: r[C_NGAY], gio: chuGio_(r[C_GIO]), chiNhanh: r[C_CHI_NHANH], hoTen: r[C_HO_TEN], sdt: r[C_SDT],
      noiDung: noiDungLich_(r), dichVu: r[C_DICH_VU], ghiChu: r[C_GHI_CHU], tho: r[C_THO], trangThai: tt_(r[C_TRANG_THAI]),
      maLam: r[C_MA_LAM], datLuc: r[C_THOI_GIAN], duyetLuc: r[C_DUYET_LUC], xongLuc: r[C_XONG_LUC], huy: r[C_HUY],
      danhGia: r[C_DANH_GIA], trang: r[HS_TRANG], capNhat: r[HS_CAP_NHAT], thoiDiem: hen ? hen.getTime() : 0,
      mauThucTe: r[C_MAU_TT], anhThanhQua: r[C_ANH],
      // Còn ở trang cơ sở thì nhân viên đổi trạng thái / thợ trên web được
      suaDuoc: CO_SO.some(function (c) { return c.ten === r[HS_TRANG]; }),
      khieuNai: kn[m] || [], danhGiaCt: dg[m] || [],
    });
  });
  ds.sort(function (a, b) { return a.thoiDiem - b.thoiDiem; });
  return { ok: true, ds: ds.slice(0, 500), tong: ds.length, bayGio: bayGio_() };
}

// Nhân viên đổi trạng thái / ghi thợ phụ trách từ web nhân viên (chỉ lịch còn ở trang cơ sở)
const CHUYEN_TRANG_THAI = {
  'Đã duyệt':        ['Chờ duyệt'],
  'Hoàn thành':      ['Đã duyệt'],
  'Khách không đến': ['Chờ duyệt', 'Đã duyệt'],
  'Đã huỷ':          ['Chờ duyệt', 'Đã duyệt'],
};
function nvCapNhat_(d) {
  const ma = String(d.maLich || '').trim().toUpperCase();
  if (d.ketQua) return nvLuuKetQua_(ma, d);
  let sh = null, hang = 0, r = null;
  CO_SO.forEach(function (c) {
    if (sh) return;
    const s = layTrangCoSo_(c.ma);
    docDong_(s).forEach(function (x, i) { if (!sh && maCua_(x) === ma) { sh = s; hang = i + 2; r = x; } });
  });
  if (!sh) return { ok: false, loi: 'khong-sua-duoc' };
  const hienTai = tt_(r[C_TRANG_THAI]);
  if (d.trangThaiCu && tt_(d.trangThaiCu) !== hienTai) return { ok: false, loi: 'trang-thai-da-doi', trangThai: hienTai };
  if (d.tho !== undefined) sh.getRange(hang, C_THO + 1).setValue(chu_(d.tho, 60));
  if (d.trangThai) {
    const tu = CHUYEN_TRANG_THAI[d.trangThai];
    if (!tu) return { ok: false, loi: 'viec-khong-hop-le' };
    if (tu.indexOf(hienTai) < 0) return { ok: false, loi: 'trang-thai-da-doi', trangThai: hienTai };
    sh.getRange(hang, C_TRANG_THAI + 1).setValue(d.trangThai);
    if (d.trangThai === 'Đã huỷ') sh.getRange(hang, C_HUY + 1).setValue(bayGio_() + ' · Tiệm huỷ' + (d.lyDo ? ': ' + chu_(d.lyDo, 200) : ''));
    if (d.trangThai === 'Khách không đến') sh.getRange(hang, C_HUY + 1).setValue(bayGio_() + ' · Khách không đến');
  }
  // Ghi giờ duyệt / hoàn thành, thêm vào trang 24h, xếp lại dòng và cập nhật hồ sơ ngay
  donDepNeuDenHan_(true);
  const kq = nvTim_({ maLich: ma });
  return { ok: true, lich: kq.ds.filter(function (l) { return String(l.maLich).toUpperCase() === ma; })[0] || null };
}

// Sau khi hoàn thành: nhân viên ghi làm như mẫu đặt hay mẫu mới (tư vấn tại tiệm) và link ảnh thành quả.
// Ghi vào mọi nơi đang có lịch (trang cơ sở, 24h, lưu trữ, hồ sơ); khách thấy trên đơn của mình.
const SO_ANH_TOI_DA = 5;
function nvLuuKetQua_(ma, d) {
  let r = null;
  cacTrangLich_().map(function (t) { return t.sh; }).concat([trangHoSo_()]).some(function (sh) {
    return docDong_(sh).some(function (x) { if (maCua_(x) === ma) { r = x; return true; } return false; });
  });
  if (!r) return { ok: false, loi: 'khong-sua-duoc' };
  if (tt_(r[C_TRANG_THAI]) !== 'Hoàn thành') return { ok: false, loi: 'chua-xong' };
  const moTa = String(d.moTaMau || '').trim();
  if (d.mauMoi && !moTa) return { ok: false, loi: 'thieu-mau-moi' };
  const anh = String(d.anh || '').split(/[\s,]+/).filter(Boolean);
  if (anh.some(function (u) { return !/^https?:\/\/\S+\.\S+/i.test(u); })) return { ok: false, loi: 'link-anh-sai' };
  if (anh.length > SO_ANH_TOI_DA) return { ok: false, loi: 'qua-nhieu-anh' };
  ghiMoiNoi_(ma, C_MAU_TT, d.mauMoi ? chu_('Mẫu mới: ' + moTa, 300) : 'Như mẫu đặt');
  ghiMoiNoi_(ma, C_ANH, anh.join(' '));
  donDepNeuDenHan_(true);
  const kq = nvTim_({ maLich: ma });
  return { ok: true, lich: kq.ds.filter(function (l) { return String(l.maLich).toUpperCase() === ma; })[0] || null };
}

// ---------- Web hỏi số slot: ...exec?ngay=18/10/2026&chiNhanh=CN1 ----------
function doGet(e) {
  const ngay = (e.parameter.ngay || '').trim();
  const chiNhanh = (e.parameter.chiNhanh || 'CN1').trim();
  const khoa = LockService.getScriptLock();
  if (khoa.tryLock(5000)) {
    try { donDepNeuDenHan_(); } finally { khoa.releaseLock(); }
  }
  if (!ngay) {
    trangDanhGia_(); trangKhieuNai_();   // mở link này một lần là các trang tính được tạo sẵn
    CO_SO.forEach(function (c) { layTrangCoSo_(c.ma); });
    trang24h_(); trangLuuTru_(); trangHoSo_();
    const ss = layBangTinh_();
    return traJson_({ ok: true, ping: 'Dany Nail Sheet đang chạy', phienBan: 6,
      coPin: !!String(trangCaiDat_().getRange('B1').getValue() || '').trim(),
      trang: ss.getSheets().map(function (s) { return s.getName() + (s.isSheetHidden() ? ' (ẩn)' : ''); }), sheet: ss.getUrl() });
  }
  return traJson_({ ok: true, sucChua: SO_KHACH_MOI_GIO, daDat: demDaDat_(ngay, chiNhanh) });
}

// ---------- Web gửi lên ----------
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return traJson_({ ok: false, loi: 'Dữ liệu gửi lên không đọc được.' }); }

  // Giữ khoá: dòng không bị chuyển / xếp lại giữa chừng, và 2 khách không cùng giữ 1 slot cuối cùng
  const khoa = LockService.getScriptLock();
  khoa.waitLock(20000);
  try {
    if (d.hanhDong === 'nv-cai-pin') return traJson_(caiPin_(d));
    if (d.hanhDong === 'nv-tim') {
      const loiPin = kiemPin_(d.pin);
      if (loiPin) return traJson_({ ok: false, loi: loiPin });
      donDepNeuDenHan_(true);   // nhân viên tra cứu: cập nhật hồ sơ mới nhất
      return traJson_(nvTim_(d));
    }
    if (d.hanhDong === 'nv-cap-nhat') {
      const loiPin = kiemPin_(d.pin);
      return traJson_(loiPin ? { ok: false, loi: loiPin } : nvCapNhat_(d));
    }
    donDepNeuDenHan_();
    if (d.hanhDong === 'tra') return traJson_(traLich_(d));
    if (d.hanhDong === 'danh-gia') return traJson_(danhGia_(d));
    if (d.hanhDong === 'khieu-nai') return traJson_(khieuNai_(d));
    if (d.hanhDong === 'huy') return traJson_(huyLich_(d));
    return traJson_(datLich_(d));
  } catch (err) {
    return traJson_({ ok: false, loi: String(err) });
  } finally {
    khoa.releaseLock();
  }
}

function datLich_(d) {
  const gio = parseInt(d.gio, 10);
  if (!d.hoTen || !d.sdt || !d.ngay || isNaN(gio) || !d.chiNhanh) {
    return { ok: false, loi: 'Thiếu thông tin bắt buộc.' };
  }
  const coSo = coSoCua_(d.chiNhanh);
  if (!coSo) return { ok: false, loi: 'Chi nhánh không hợp lệ.' };
  if (thoiDiemHen_(d.ngay, gio).getTime() <= Date.now()) return { ok: false, loi: 'qua-gio' };
  if ((demDaDat_(d.ngay, coSo.ma)[gio] || 0) >= SO_KHACH_MOI_GIO) return { ok: false, loi: 'het-cho' };

  const maLich = 'DN' + Utilities.formatDate(new Date(), MUI_GIO, 'ddMM') + '-' + Math.floor(1000 + Math.random() * 9000);
  const sh = layTrangCoSo_(coSo.ma);
  sh.appendRow([
    bayGio_(),
    maLich,
    "'" + d.ngay,                   // dấu ' giữ ngày, giờ ở dạng chữ, Sheet không tự đổi kiểu
    "'" + ('0' + gio).slice(-2) + ':00',
    chu_(d.chiNhanhTen || d.chiNhanh, 60),
    chu_(d.hoTen, 80),
    "'" + chuanSdt_(d.sdt),         // dấu ' giữ số 0 ở đầu số điện thoại
    chu_(d.kieuLam, 30),
    d.maMau ? "'" + String(d.maMau).slice(0, 120) : '',   // giữ mã "05" không bị đổi thành số 5
    chu_(d.tenMau, 120),
    chu_(d.yeuCau, 2000),
    chu_(d.dichVu, 120),
    chu_(d.ghiChu, 1000),
    '',
    'Chờ duyệt',
    '',
    '',
    "'" + maLamMoi_(),              // mã làm tạo sẵn, khách chỉ thấy khi tiệm chọn "Đã duyệt"
  ]);
  sapXep_(sh);
  return { ok: true, maLich: maLich, trangThai: 'Chờ duyệt' };
}

function traLich_(d) {
  const tim = timHang_(d.maLich, d.sdt);
  if (!tim) return { ok: false, loi: 'khong-thay' };
  boSungMaLam_(tim);
  return { ok: true, lich: lichRaJson_(tim.r, tim.trang) };
}

// Tiệm vừa chọn "Đã duyệt" / "Hoàn thành" trên Sheet mà lần dọn tiếp theo chưa chạy:
// khách xem lịch thì tạo luôn mã làm + giờ duyệt / hoàn thành (đang giữ khoá trong doPost)
function boSungMaLam_(tim) {
  const trangThai = tt_(tim.r[C_TRANG_THAI]);
  // Chỉ lịch còn ở trang cơ sở: lịch cũ ở trang khác không được ghi "Hoàn thành lúc = bây giờ" (sai hạn bảo hành, đánh giá)
  if (tim.trang !== 'co-so' || (trangThai !== 'Đã duyệt' && trangThai !== 'Hoàn thành')) return;
  const sh = tim.sh, hang = tim.hang;
  if (!String(tim.r[C_MA_LAM] || '').trim()) {
    tim.r[C_MA_LAM] = maLamMoi_();
    sh.getRange(hang, C_MA_LAM + 1).setValue("'" + tim.r[C_MA_LAM]);
  }
  if (!String(tim.r[C_DUYET_LUC] || '').trim()) sh.getRange(hang, C_DUYET_LUC + 1).setValue(bayGio_());
  if (trangThai === 'Hoàn thành' && !String(tim.r[C_XONG_LUC] || '').trim()) {
    tim.r[C_XONG_LUC] = bayGio_();
    sh.getRange(hang, C_XONG_LUC + 1).setValue(tim.r[C_XONG_LUC]);
  }
}

function huyLich_(d) {
  const tim = timHang_(d.maLich, d.sdt);
  if (!tim) return { ok: false, loi: 'khong-thay' };
  const trangThai = tt_(tim.r[C_TRANG_THAI]);
  if (trangThai === 'Đã huỷ') return { ok: false, loi: 'da-huy' };
  if (trangThai === 'Hoàn thành' || trangThai === 'Khách không đến' || tim.trang !== 'co-so') return { ok: false, loi: 'da-xong' };
  const hen = thoiDiemHen_(tim.r[C_NGAY], tim.r[C_GIO]);
  if (hen.getTime() - Date.now() < HUY_TRUOC_PHUT * 60000) return { ok: false, loi: 'qua-han' };

  tim.sh.getRange(tim.hang, C_TRANG_THAI + 1).setValue('Đã huỷ');
  tim.sh.getRange(tim.hang, C_HUY + 1).setValue(bayGio_() + ' · ' + chu_(d.lyDo || 'Khách tự huỷ trên web', 200));
  tim.r[C_TRANG_THAI] = 'Đã huỷ';
  sapXep_(tim.sh);   // lịch huỷ xuống cuối trang
  return { ok: true, lich: lichRaJson_(tim.r, tim.trang) };
}
