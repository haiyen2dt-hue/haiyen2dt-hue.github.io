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

   DUYỆT LỊCH NGAY TRÊN SHEET (trang tính "Lịch đặt", chọn ở ô thả xuống cột "Trạng thái"):
     Chờ duyệt  : khách vừa đặt, slot đã bị giữ (trừ vào số chỗ còn lại).
     Đã duyệt   : nhân viên chọn "Đã duyệt" -> web khách hiện "Đã duyệt" và "Mã làm" (cột Mã làm).
     Hoàn thành : làm xong chọn "Hoàn thành" -> khách mới gửi được đánh giá, khiếu nại.
     Đã huỷ / Khách không đến : slot đã huỷ được trả lại.
   Web khách tự hỏi lại Sheet mỗi 15 giây nên khách thấy thay đổi gần như ngay.
   Muốn xem riêng lịch chờ duyệt: bấm biểu tượng lọc ở ô "Trạng thái" (dòng tiêu đề), chỉ tick "Chờ duyệt".

   Đánh giá của khách vào trang tính "Đánh giá", khiếu nại vào trang tính "Khiếu nại".
   Muốn có file Excel: Tệp (File) > Tải xuống (Download) > Microsoft Excel (.xlsx).

   Nếu sau này sửa code ở đây: Triển khai > Quản lý triển khai > sửa (bút chì) >
   Phiên bản: Phiên bản mới > Triển khai. Link giữ nguyên.
   ===================================================================== */

const TEN_TRANG_TINH = 'Lịch đặt';
const SO_KHACH_MOI_GIO = 3;   // phải giống với số trong data.js
const HUY_TRUOC_PHUT = 60;    // khách chỉ tự huỷ được trước giờ hẹn ít nhất 60 phút
const MUI_GIO = 'Asia/Ho_Chi_Minh';

const COT = ['Thời gian đặt', 'Mã lịch', 'Ngày hẹn', 'Giờ hẹn', 'Chi nhánh', 'Họ tên', 'Số điện thoại',
  'Kiểu làm', 'Mã mẫu', 'Tên mẫu', 'Yêu cầu riêng', 'Dịch vụ', 'Ghi chú', 'Thợ phụ trách', 'Trạng thái',
  'Huỷ lúc / lý do', 'Đánh giá', 'Mã làm', 'Duyệt lúc', 'Hoàn thành lúc'];
// Vị trí cột (đếm từ 0)
const C_THOI_GIAN = 0, C_MA_LICH = 1, C_NGAY = 2, C_GIO = 3, C_CHI_NHANH = 4, C_HO_TEN = 5, C_SDT = 6, C_KIEU = 7,
  C_MA_MAU = 8, C_TEN_MAU = 9, C_YEU_CAU = 10, C_DICH_VU = 11, C_GHI_CHU = 12, C_THO = 13, C_TRANG_THAI = 14,
  C_HUY = 15, C_DANH_GIA = 16, C_MA_LAM = 17, C_DUYET_LUC = 18, C_XONG_LUC = 19;

const TRANG_THAI = ['Chờ duyệt', 'Đã duyệt', 'Hoàn thành', 'Đã huỷ', 'Khách không đến'];
const MAU_TRANG_THAI = { 'Chờ duyệt': ['#fff2cc', '#7f6000'], 'Đã duyệt': ['#cfe2f3', '#1c4587'],
  'Hoàn thành': ['#d9ead3', '#274e13'], 'Đã huỷ': ['#efefef', '#999999'], 'Khách không đến': ['#fce5cd', '#b45f06'] };
// Tên trạng thái của bản cũ -> tên mới
const TRANG_THAI_CU = { 'Mới': 'Chờ duyệt', 'Đã xác nhận': 'Đã duyệt', 'Xong': 'Hoàn thành' };
function tt_(v) {
  const s = String(v == null ? '' : v).trim();
  return TRANG_THAI_CU[s] || s || 'Chờ duyệt';
}

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

function layTrangTinh_() {
  const ss = layBangTinh_();
  let sh = ss.getSheetByName(TEN_TRANG_TINH);
  if (!sh) {
    const dau = ss.getSheets()[0];
    sh = ss.getSheets().length === 1 && dau.getLastRow() === 0
      ? dau.setName(TEN_TRANG_TINH)
      : ss.insertSheet(TEN_TRANG_TINH);
    sh.appendRow(COT);
    sh.setFrozenRows(1);
    sh.getRange('C:D').setNumberFormat('@'); // giữ ngày, giờ ở dạng chữ
    sh.setColumnWidths(1, COT.length, 140);
    sh.setColumnWidth(11, 260);
  }
  // Bảng tính tạo từ bản cũ chưa có đủ cột thì thêm tên cột còn thiếu
  const dau = sh.getRange(1, 1, 1, COT.length);
  const tenCot = dau.getValues()[0];
  if (tenCot.some(function (t, i) { return t === '' && COT[i]; })) {
    dau.setValues([COT.map(function (c, i) { return tenCot[i] || c; })]);
    dau.setFontWeight('bold').setBackground('#f9d5e5');
  }
  caiTrangThai_(sh);
  caiDuyetTrenSheet_(sh);
  return sh;
}

// Cho nhân viên duyệt ngay trên Sheet: bộ lọc ở dòng tiêu đề + ghi chú hướng dẫn ở ô "Trạng thái" (làm 1 lần)
function caiDuyetTrenSheet_(sh) {
  const luu = PropertiesService.getScriptProperties();
  const khoa = 'DUYET_TREN_SHEET_V1_' + sh.getParent().getId();
  if (luu.getProperty(khoa)) return;
  if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), COT.length).createFilter();
  sh.getRange(1, C_TRANG_THAI + 1).setNote('Chọn trạng thái ở ô thả xuống:\n'
    + '• Đã duyệt: web khách hiện "Đã duyệt" + Mã làm\n'
    + '• Hoàn thành: khách được gửi đánh giá\n'
    + '• Đã huỷ / Khách không đến: trả slot\n'
    + 'Lọc nhanh: bấm biểu tượng lọc ở ô này, chỉ tick "Chờ duyệt".');
  sh.getRange(1, C_MA_LAM + 1).setNote('Mã làm tạo sẵn khi khách đặt. Khách chỉ thấy mã này sau khi lịch được chọn "Đã duyệt". Khách tới tiệm đọc mã để đối chiếu.');
  luu.setProperty(khoa, '1');
}

// Cột Trạng thái thành ô chọn có màu, đổi tên trạng thái cũ sang mới (làm 1 lần cho mỗi bảng tính)
function caiTrangThai_(sh) {
  const luu = PropertiesService.getScriptProperties();
  const khoa = 'TRANG_THAI_V2_' + sh.getParent().getId();
  if (luu.getProperty(khoa)) return;
  // Đặt danh sách chọn mới trước, nếu không ô còn danh sách cũ sẽ chặn tên trạng thái mới
  sh.getRange(2, C_TRANG_THAI + 1, 2000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TRANG_THAI, true).setAllowInvalid(false).build());
  const so = sh.getLastRow() - 1;
  if (so > 0) {
    const vung = sh.getRange(2, C_TRANG_THAI + 1, so, 1);
    vung.setValues(vung.getValues().map(function (r) { return [r[0] === '' ? '' : tt_(r[0])]; }));
  }
  const dong = sh.getRange(2, 1, 2000, COT.length);
  sh.setConditionalFormatRules(Object.keys(MAU_TRANG_THAI).map(function (t) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$O2="' + t + '"')
      .setBackground(MAU_TRANG_THAI[t][0]).setFontColor(MAU_TRANG_THAI[t][1])
      .setRanges([dong]).build();
  }));
  luu.setProperty(khoa, '1');
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

// ---------- Trang tính "Đánh giá", "Khiếu nại" (tự tạo nếu chưa có) ----------
const COT_DANH_GIA = ['Thời gian', 'Chi nhánh', 'Điểm chung (1-5)', 'Chất lượng', 'Thái độ phục vụ', 'Vệ sinh',
  'Góp ý', 'Người gửi', 'Liên hệ (nếu muốn tiệm phản hồi)', 'Tiệm đã xem', 'Khách đã làm tại tiệm (mã lịch)'];
const COT_KHIEU_NAI = ['Thời gian gửi', 'Mã khiếu nại', 'Họ tên', 'Số điện thoại', 'Mã lịch', 'Khớp lịch đặt',
  'Ngày làm', 'Chi nhánh', 'Loại vấn đề', 'Mô tả', 'Link ảnh', 'Khách mong muốn', 'Trạng thái', 'Người xử lý', 'Ghi chú của tiệm'];

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
const trangDanhGia_ = () => layTrangPhu_('Đánh giá', COT_DANH_GIA, '#d9ead3');
const trangKhieuNai_ = () => layTrangPhu_('Khiếu nại', COT_KHIEU_NAI, '#fce5cd');

function diem_(v, batBuoc) {
  const n = parseInt(v, 10);
  if (n >= 1 && n <= 5) return n;
  return batBuoc ? null : '';
}

function danhGia_(d) {
  if (d.web) return { ok: true };                 // ô bẫy chống gửi rác tự động: người thật không điền ô này
  const chung = diem_(d.diem, true);
  if (!chung) return { ok: false, loi: 'Chưa chọn số sao.' };

  // Chỉ khách có lịch đã được tiệm chọn "Hoàn thành" mới đánh giá được, mỗi lịch 1 lần
  const tim = timLichHoanThanh_(d.maLich, d.sdt);
  if (tim.loi) return { ok: false, loi: tim.loi };
  if (String(tim.r[C_DANH_GIA] || '').trim()) return { ok: false, loi: 'da-danh-gia' };
  const anDanh = d.anDanh !== false;
  // Ẩn danh: không ghi tên, liên hệ, mã lịch vào trang "Đánh giá", lịch đặt chỉ đánh dấu đã đánh giá
  layTrangTinh_().getRange(tim.hang, C_DANH_GIA + 1).setValue(anDanh ? 'Đã đánh giá (ẩn danh)' : '★ ' + chung + '/5 · ' + bayGio_());

  trangDanhGia_().appendRow([
    bayGio_(), chu_(tim.r[C_CHI_NHANH], 60), chung, diem_(d.chatLuong), diem_(d.dichVu), diem_(d.veSinh),
    chu_(d.gopY, 2000), anDanh ? 'Ẩn danh' : chu_(d.ten, 60) || 'Không ghi tên', anDanh ? '' : chu_(d.lienHe, 80), '',
    anDanh ? '✓ Đã xác minh' : '✓ ' + String(tim.r[C_MA_LICH]),
  ]);
  return { ok: true };
}

// Lịch của khách (mã lịch + số điện thoại khớp) và tiệm đã chọn "Hoàn thành"
function timLichHoanThanh_(maLich, sdt) {
  const tim = timHang_(maLich, sdt);
  if (!tim) return { loi: 'khong-thay' };
  if (tt_(tim.r[C_TRANG_THAI]) !== 'Hoàn thành') return { loi: 'chua-xong' };
  return tim;
}

function khieuNai_(d) {
  if (d.web) return { ok: true, maKN: 'KN' };
  const sdt = chuanSdt_(d.sdt);
  if (!chu_(d.hoTen) || sdt.length !== 10 || !d.loai || String(d.moTa || '').trim().length < 10) {
    return { ok: false, loi: 'Thiếu thông tin bắt buộc.' };
  }
  // Chỉ khiếu nại được lịch đã "Hoàn thành"; ngày làm, chi nhánh lấy từ lịch đặt
  const tim = timLichHoanThanh_(d.maLich, d.sdtLich);
  if (tim.loi) return { ok: false, loi: tim.loi };
  const maKN = 'KN' + Utilities.formatDate(new Date(), MUI_GIO, 'ddMM') + '-' + Math.floor(1000 + Math.random() * 9000);
  trangKhieuNai_().appendRow([
    bayGio_(), maKN, chu_(d.hoTen, 80), "'" + sdt, String(tim.r[C_MA_LICH]), 'Có (đã hoàn thành)', "'" + chuNgay_(tim.r[C_NGAY]),
    chu_(tim.r[C_CHI_NHANH], 60), chu_(d.loai, 60), chu_(d.moTa, 3000), chu_(d.link, 500), chu_(d.mongMuon, 200),
    'Mới', '', '',
  ]);
  return { ok: true, maKN: maKN };
}

// Đếm số khách đã giữ chỗ theo từng giờ của 1 ngày, 1 chi nhánh.
// "Chờ duyệt" cũng được tính (khách đang giữ ghế), chỉ bỏ lịch đã huỷ.
function demDaDat_(ngay, chiNhanh) {
  const dem = {};
  layTrangTinh_().getDataRange().getValues().slice(1).forEach(function (r) {
    if (chuNgay_(r[C_NGAY]) !== ngay) return;
    if (String(r[C_CHI_NHANH]).indexOf(chiNhanh) !== 0) return;
    if (tt_(r[C_TRANG_THAI]) === 'Đã huỷ') return;
    const gio = soGio_(r[C_GIO]);
    dem[gio] = (dem[gio] || 0) + 1;
  });
  return dem;
}

// Tìm dòng theo mã lịch + số điện thoại (phải khớp cả hai)
function timHang_(maLich, sdt) {
  const ma = String(maLich || '').trim().toUpperCase();
  const so = chuanSdt_(sdt || '');
  if (!ma || !so) return null;
  const giaTri = layTrangTinh_().getDataRange().getValues();
  for (let i = 1; i < giaTri.length; i++) {
    const r = giaTri[i];
    if (String(r[C_MA_LICH]).trim().toUpperCase() === ma && chuanSdt_(r[C_SDT]) === so) {
      return { hang: i + 1, r: r };
    }
  }
  return null;
}

function lichRaJson_(r) {
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
    // Mã làm chỉ có khi tiệm đã duyệt
    maLam: trangThai === 'Đã duyệt' || trangThai === 'Hoàn thành' ? String(r[C_MA_LAM] || '') : '',
  };
}

// ---------- Web hỏi số slot: ...exec?ngay=18/10/2026&chiNhanh=CN1 ----------
function doGet(e) {
  const ngay = (e.parameter.ngay || '').trim();
  const chiNhanh = (e.parameter.chiNhanh || 'CN1').trim();
  if (!ngay) {
    trangDanhGia_(); trangKhieuNai_();   // mở link này một lần là các trang tính mới được tạo sẵn
    return traJson_({ ok: true, ping: 'Dany Nail Sheet đang chạy', phienBan: 4,
      trang: layBangTinh_().getSheets().map(function (s) { return s.getName(); }), sheet: layTrangTinh_().getParent().getUrl() });
  }
  return traJson_({ ok: true, sucChua: SO_KHACH_MOI_GIO, daDat: demDaDat_(ngay, chiNhanh) });
}

// ---------- Web gửi lên ----------
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return traJson_({ ok: false, loi: 'Dữ liệu gửi lên không đọc được.' }); }
  try {
    if (d.hanhDong === 'tra') return traJson_(traLich_(d));
    if (d.hanhDong === 'danh-gia') return traJson_(danhGia_(d));
    if (d.hanhDong === 'khieu-nai') return traJson_(khieuNai_(d));
  } catch (err) {
    return traJson_({ ok: false, loi: String(err) });
  }

  const khoa = LockService.getScriptLock();
  khoa.waitLock(20000); // tránh 2 khách cùng giữ 1 slot cuối cùng
  try {
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
  if (thoiDiemHen_(d.ngay, gio).getTime() <= Date.now()) return { ok: false, loi: 'qua-gio' };
  if ((demDaDat_(d.ngay, d.chiNhanh)[gio] || 0) >= SO_KHACH_MOI_GIO) return { ok: false, loi: 'het-cho' };

  const maLich = 'DN' + Utilities.formatDate(new Date(), MUI_GIO, 'ddMM') + '-' + Math.floor(1000 + Math.random() * 9000);
  layTrangTinh_().appendRow([
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
    "'" + Math.floor(1000 + Math.random() * 9000),   // mã làm tạo sẵn, khách chỉ thấy khi tiệm chọn "Đã duyệt"
  ]);
  return { ok: true, maLich: maLich, trangThai: 'Chờ duyệt' };
}

function traLich_(d) {
  const tim = timHang_(d.maLich, d.sdt);
  if (!tim) return { ok: false, loi: 'khong-thay' };
  boSungMaLam_(tim);
  return { ok: true, lich: lichRaJson_(tim.r) };
}

// Lịch đặt từ bản cũ chưa có mã làm: khi tiệm đã duyệt, lần đầu khách xem lịch sẽ tự tạo
// mã làm + giờ duyệt (hoặc giờ hoàn thành) rồi ghi vào Sheet
function boSungMaLam_(tim) {
  const trangThai = tt_(tim.r[C_TRANG_THAI]);
  if (trangThai !== 'Đã duyệt' && trangThai !== 'Hoàn thành') return;
  if (String(tim.r[C_MA_LAM] || '').trim()) return;
  const khoa = LockService.getScriptLock();
  khoa.waitLock(20000);
  try {
    const sh = layTrangTinh_();
    const o = sh.getRange(tim.hang, C_MA_LAM + 1);
    let ma = String(o.getValue() || '').trim();   // đọc lại: có thể máy khác vừa tạo xong
    if (!ma) {
      ma = String(Math.floor(1000 + Math.random() * 9000));
      o.setValue("'" + ma);
      if (!String(tim.r[C_DUYET_LUC] || '').trim()) sh.getRange(tim.hang, C_DUYET_LUC + 1).setValue(bayGio_());
      if (trangThai === 'Hoàn thành' && !String(tim.r[C_XONG_LUC] || '').trim()) sh.getRange(tim.hang, C_XONG_LUC + 1).setValue(bayGio_());
    }
    tim.r[C_MA_LAM] = ma;
  } finally {
    khoa.releaseLock();
  }
}

function lamMoDongHuy_(sh, hang) {
  sh.getRange(hang, 1, 1, COT.length).setFontColor('#9e9e9e'); // làm mờ dòng đã huỷ cho thợ dễ thấy
}

function huyLich_(d) {
  const tim = timHang_(d.maLich, d.sdt);
  if (!tim) return { ok: false, loi: 'khong-thay' };
  const trangThai = tt_(tim.r[C_TRANG_THAI]);
  if (trangThai === 'Đã huỷ') return { ok: false, loi: 'da-huy' };
  if (trangThai === 'Hoàn thành' || trangThai === 'Khách không đến') return { ok: false, loi: 'da-xong' };
  const hen = thoiDiemHen_(tim.r[C_NGAY], tim.r[C_GIO]);
  if (hen.getTime() - Date.now() < HUY_TRUOC_PHUT * 60000) return { ok: false, loi: 'qua-han' };

  const sh = layTrangTinh_();
  sh.getRange(tim.hang, C_TRANG_THAI + 1).setValue('Đã huỷ');
  sh.getRange(tim.hang, C_HUY + 1).setValue(bayGio_() + ' · ' + chu_(d.lyDo || 'Khách tự huỷ trên web', 200));
  lamMoDongHuy_(sh, tim.hang);
  tim.r[C_TRANG_THAI] = 'Đã huỷ';
  return { ok: true, lich: lichRaJson_(tim.r) };
}
