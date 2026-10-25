/* =====================================================================
   NHẬN LỊCH ĐẶT / TRA CỨU / HUỶ LỊCH TỪ WEB, GHI VÀO GOOGLE SHEET

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

   Mỗi khi khách đặt lịch, 1 dòng mới xuất hiện trong trang tính "Lịch đặt".
   Đánh giá của khách vào trang tính "Đánh giá", khiếu nại vào trang tính "Khiếu nại"
   (2 trang này tự tạo khi mở link web app lần đầu hoặc khi có khách gửi).
   Thợ điền cột "Thợ phụ trách" và đổi "Trạng thái" (Mới / Đã xác nhận / Đã huỷ / Xong).
   Khách tự huỷ trên web: trạng thái thành "Đã huỷ", dòng chuyển chữ xám, slot được trả lại.
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
  'Huỷ lúc / lý do'];
// Vị trí cột (đếm từ 0)
const C_MA_LICH = 1, C_NGAY = 2, C_GIO = 3, C_CHI_NHANH = 4, C_HO_TEN = 5, C_SDT = 6, C_KIEU = 7,
  C_MA_MAU = 8, C_TEN_MAU = 9, C_YEU_CAU = 10, C_DICH_VU = 11, C_TRANG_THAI = 14, C_HUY = 15;

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
  // Bảng tính tạo từ bản cũ chưa có cột cuối thì thêm vào
  const oCuoi = sh.getRange(1, COT.length);
  if (oCuoi.getValue() === '') oCuoi.setValue(COT[COT.length - 1]);
  sh.getRange(1, 1, 1, COT.length).setFontWeight('bold').setBackground('#f9d5e5');
  return sh;
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

// ---------- Trang tính "Đánh giá" và "Khiếu nại" (tự tạo nếu chưa có) ----------
const COT_DANH_GIA = ['Thời gian', 'Chi nhánh', 'Điểm chung (1-5)', 'Chất lượng', 'Thái độ phục vụ', 'Vệ sinh',
  'Góp ý', 'Người gửi', 'Liên hệ (nếu muốn tiệm phản hồi)', 'Tiệm đã xem'];
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
  trangDanhGia_().appendRow([
    bayGio_(),
    chu_(d.chiNhanh, 60),
    chung,
    diem_(d.chatLuong),
    diem_(d.dichVu),
    diem_(d.veSinh),
    chu_(d.gopY, 2000),
    chu_(d.ten, 60) || 'Ẩn danh',
    chu_(d.lienHe, 80),
    '',
  ]);
  return { ok: true };
}

function khieuNai_(d) {
  if (d.web) return { ok: true, maKN: 'KN' };
  const sdt = chuanSdt_(d.sdt);
  if (!chu_(d.hoTen) || sdt.length !== 10 || !/^\d{2}\/\d{2}\/\d{4}$/.test(String(d.ngayLam || ''))
      || !d.chiNhanh || !d.loai || String(d.moTa || '').trim().length < 10) {
    return { ok: false, loi: 'Thiếu thông tin bắt buộc.' };
  }
  const maLich = String(d.maLich || '').trim().toUpperCase();
  const khop = maLich ? (timHang_(maLich, sdt) ? 'Có' : 'Không khớp, cần kiểm tra') : 'Khách không ghi mã';
  const maKN = 'KN' + Utilities.formatDate(new Date(), MUI_GIO, 'ddMM') + '-' + Math.floor(1000 + Math.random() * 9000);
  trangKhieuNai_().appendRow([
    bayGio_(), maKN, chu_(d.hoTen, 80), "'" + sdt, chu_(maLich, 20), khop, "'" + d.ngayLam,
    chu_(d.chiNhanh, 60), chu_(d.loai, 60), chu_(d.moTa, 3000), chu_(d.link, 500), chu_(d.mongMuon, 200),
    'Mới', '', '',
  ]);
  return { ok: true, maKN: maKN };
}

// Đếm số khách đã đặt theo từng giờ của 1 ngày, 1 chi nhánh (bỏ qua lịch đã huỷ)
function demDaDat_(ngay, chiNhanh) {
  const dem = {};
  layTrangTinh_().getDataRange().getValues().slice(1).forEach(function (r) {
    if (chuNgay_(r[C_NGAY]) !== ngay) return;
    if (String(r[C_CHI_NHANH]).indexOf(chiNhanh) !== 0) return;
    if (String(r[C_TRANG_THAI]).trim() === 'Đã huỷ') return;
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
    trangThai: String(r[C_TRANG_THAI]).trim() || 'Mới',
  };
}

// ---------- Web hỏi số slot: ...exec?ngay=18/10/2026&chiNhanh=CN1 ----------
function doGet(e) {
  const ngay = (e.parameter.ngay || '').trim();
  const chiNhanh = (e.parameter.chiNhanh || 'CN1').trim();
  if (!ngay) {
    trangDanhGia_(); trangKhieuNai_();   // mở link này một lần là 2 trang tính mới được tạo sẵn
    return traJson_({ ok: true, ping: 'Dany Nail Sheet đang chạy', phienBan: 2,
      trang: layBangTinh_().getSheets().map(function (s) { return s.getName(); }), sheet: layTrangTinh_().getParent().getUrl() });
  }
  return traJson_({ ok: true, sucChua: SO_KHACH_MOI_GIO, daDat: demDaDat_(ngay, chiNhanh) });
}

// ---------- Web gửi lên: đặt lịch / tra lịch / huỷ lịch ----------
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return traJson_({ ok: false, loi: 'Dữ liệu gửi lên không đọc được.' }); }
  if (d.hanhDong === 'tra') return traJson_(traLich_(d));
  try {
    if (d.hanhDong === 'danh-gia') return traJson_(danhGia_(d));
    if (d.hanhDong === 'khieu-nai') return traJson_(khieuNai_(d));
  } catch (err) {
    return traJson_({ ok: false, loi: String(err) });
  }

  const khoa = LockService.getScriptLock();
  khoa.waitLock(20000); // tránh 2 khách cùng giữ 1 slot cuối cùng
  try {
    return traJson_(d.hanhDong === 'huy' ? huyLich_(d) : datLich_(d));
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
    Utilities.formatDate(new Date(), MUI_GIO, 'dd/MM/yyyy HH:mm'),
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
    'Mới',
    '',
  ]);
  return { ok: true, maLich: maLich };
}

function traLich_(d) {
  const tim = timHang_(d.maLich, d.sdt);
  if (!tim) return { ok: false, loi: 'khong-thay' };
  return { ok: true, lich: lichRaJson_(tim.r) };
}

function huyLich_(d) {
  const tim = timHang_(d.maLich, d.sdt);
  if (!tim) return { ok: false, loi: 'khong-thay' };
  const trangThai = String(tim.r[C_TRANG_THAI]).trim();
  if (trangThai === 'Đã huỷ') return { ok: false, loi: 'da-huy' };
  if (trangThai === 'Xong') return { ok: false, loi: 'da-xong' };
  const hen = thoiDiemHen_(tim.r[C_NGAY], tim.r[C_GIO]);
  if (hen.getTime() - Date.now() < HUY_TRUOC_PHUT * 60000) return { ok: false, loi: 'qua-han' };

  const sh = layTrangTinh_();
  sh.getRange(tim.hang, C_TRANG_THAI + 1).setValue('Đã huỷ');
  sh.getRange(tim.hang, C_HUY + 1).setValue(
    Utilities.formatDate(new Date(), MUI_GIO, 'dd/MM/yyyy HH:mm') + ' · ' + (d.lyDo || 'Khách tự huỷ trên web'));
  sh.getRange(tim.hang, 1, 1, COT.length).setFontColor('#9e9e9e'); // làm mờ dòng đã huỷ cho thợ dễ thấy
  tim.r[C_TRANG_THAI] = 'Đã huỷ';
  return { ok: true, lich: lichRaJson_(tim.r) };
}
