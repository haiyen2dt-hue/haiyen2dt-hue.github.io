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
        "Trạng thái": Chờ duyệt -> Đã duyệt (khách thấy Mã làm) -> Hoàn thành (khách được gửi khiếu nại
        trong 24h). Đã huỷ / Khách không đến: trả slot. Đánh giá thì ai cũng gửi được.
        Các dòng tự xếp: Chờ duyệt trên cùng, rồi Đã duyệt, Hoàn thành, Khách không đến, Đã huỷ ở cuối.
     "24h bảo hành": hết ngày, lịch đã Hoàn thành của hôm đó chuyển sang đây (tiệm bảo hành 24 giờ,
        khách còn gửi được khiếu nại).
     "Lưu trữ 7 ngày": qua 24 giờ không có khiếu nại (hoặc khiếu nại đã "Đã xử lý") thì chuyển sang đây,
        khách vẫn đánh giá được. Lịch huỷ / khách không đến của ngày cũ cũng vào đây.
        Sau 7 ngày trong trang này, dòng lịch (tên, số điện thoại...) TỰ XOÁ.
     "Đánh giá", "Khiếu nại": phản hồi của khách.
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
const LUU_TRU_NGAY = 7;       // giữ thông tin khách 7 ngày trong trang lưu trữ rồi xoá
const KHIEU_NAI_MOI_NGAY = 2; // mỗi số điện thoại tối đa 2 khiếu nại 1 ngày
const DON_DEP_MOI_GIAY = 30;  // tự dọn / xếp dòng tối đa 30 giây 1 lần

// Mỗi cơ sở 1 trang tính. "ma" phải giống mã chi nhánh trong data.js
const CO_SO = [
  { ma: 'CN1', ten: 'Lịch CN1 · Tân Định', mau: '#f9d5e5' },
  { ma: 'CN2', ten: 'Lịch CN2 · Hoàn Kiếm', mau: '#d9e8fb' },
];
const TEN_24H = '24h bảo hành';
const TEN_LUU_TRU = 'Lưu trữ 7 ngày';
const TEN_TRANG_CU = 'Lịch đặt';   // bản cũ để chung 1 trang, sẽ được chia sang trang của từng cơ sở

const COT = ['Thời gian đặt', 'Mã lịch', 'Ngày hẹn', 'Giờ hẹn', 'Chi nhánh', 'Họ tên', 'Số điện thoại',
  'Kiểu làm', 'Mã mẫu', 'Tên mẫu', 'Yêu cầu riêng', 'Dịch vụ', 'Ghi chú', 'Thợ phụ trách', 'Trạng thái',
  'Huỷ lúc / lý do', 'Đánh giá', 'Mã làm', 'Duyệt lúc', 'Hoàn thành lúc'];
// Vị trí cột (đếm từ 0)
const C_THOI_GIAN = 0, C_MA_LICH = 1, C_NGAY = 2, C_GIO = 3, C_CHI_NHANH = 4, C_HO_TEN = 5, C_SDT = 6, C_KIEU = 7,
  C_MA_MAU = 8, C_TEN_MAU = 9, C_YEU_CAU = 10, C_DICH_VU = 11, C_GHI_CHU = 12, C_THO = 13, C_TRANG_THAI = 14,
  C_HUY = 15, C_DANH_GIA = 16, C_MA_LAM = 17, C_DUYET_LUC = 18, C_XONG_LUC = 19;
// Cột thêm ở cuối (cột thứ 21): trang cơ sở = số để xếp dòng (ẩn), trang 24h / lưu trữ = lúc chuyển vào
const COT_THEM = COT.length + 1;

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

function taoTrangLich_(ss, ten, mau, tenCotThem, laCoSo) {
  const dau = ss.getSheets()[0];
  const sh = ss.getSheets().length === 1 && dau.getLastRow() === 0 ? dau.setName(ten) : ss.insertSheet(ten);
  sh.getRange(1, 1, 1, COT_THEM).setValues([COT.concat([tenCotThem])]).setFontWeight('bold').setBackground(mau);
  sh.setFrozenRows(1);
  sh.getRange('C:D').setNumberFormat('@'); // giữ ngày, giờ ở dạng chữ
  sh.setColumnWidths(1, COT_THEM, 140);
  sh.setColumnWidth(C_YEU_CAU + 1, 260);
  // Mỗi trạng thái 1 màu
  const dong = sh.getRange(2, 1, 2000, COT.length);
  sh.setConditionalFormatRules(Object.keys(MAU_TRANG_THAI).map(function (t) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$O2="' + t + '"')
      .setBackground(MAU_TRANG_THAI[t][0]).setFontColor(MAU_TRANG_THAI[t][1])
      .setRanges([dong]).build();
  }));
  if (!laCoSo) {
    sh.getRange(1, 1).setNote(ten === TEN_24H
      ? 'Lịch đã hoàn thành của những ngày trước. Khách còn khiếu nại được trong ' + BAO_HANH_GIO + ' giờ sau khi làm xong.'
      : 'Lịch đã hết bảo hành, huỷ hoặc khách không đến. Khách vẫn đánh giá được. Sau ' + LUU_TRU_NGAY + ' ngày trong trang này dòng sẽ TỰ XOÁ.');
    return sh;
  }
  // Trang cơ sở: ô chọn trạng thái, bộ lọc, cột thứ tự ẩn
  sh.getRange(2, C_TRANG_THAI + 1, 2000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TRANG_THAI, true).setAllowInvalid(false).build());
  sh.hideColumns(COT_THEM);
  sh.getRange(1, 1, sh.getMaxRows(), COT_THEM).createFilter();
  sh.getRange(1, C_TRANG_THAI + 1).setNote('Chọn trạng thái ở ô thả xuống:\n'
    + '• Đã duyệt: web khách hiện "Đã duyệt" + Mã làm\n'
    + '• Hoàn thành: khách được gửi khiếu nại (bảo hành 24h)\n'
    + '• Đã huỷ / Khách không đến: trả slot\n'
    + 'Khoảng 30 giây sau các dòng tự xếp lại: Chờ duyệt trên cùng, Đã huỷ ở cuối.\n'
    + 'Hết ngày, lịch Hoàn thành chuyển sang trang "' + TEN_24H + '".');
  sh.getRange(1, C_MA_LAM + 1).setNote('Mã làm tạo sẵn khi khách đặt. Khách chỉ thấy mã này sau khi lịch được chọn "Đã duyệt". Khách tới tiệm đọc mã để đối chiếu.');
  return sh;
}

// Bản cũ để mọi lịch chung trang "Lịch đặt": chép từng dòng sang trang của cơ sở, rồi ẩn trang cũ (không xoá)
function chiaLichCu_(ss) {
  const cu = ss.getSheetByName(TEN_TRANG_CU);
  if (!cu || cu.isSheetHidden()) return;
  const so = cu.getLastRow() - 1;
  if (so > 0) {
    cu.getRange(2, 1, so, COT.length).getValues().forEach(function (r, i) {
      if (!String(r[C_MA_LICH]).trim()) return;
      const sh = layTrangCoSo_((coSoCua_(r[C_CHI_NHANH]) || CO_SO[0]).ma);
      const hang = sh.getLastRow() + 1;
      cu.getRange(i + 2, 1, 1, COT.length).copyTo(sh.getRange(hang, 1), { contentsOnly: true });
      sh.getRange(hang, C_TRANG_THAI + 1).setValue(tt_(r[C_TRANG_THAI]));   // tên trạng thái kiểu cũ -> mới
    });
  }
  cu.setName(TEN_TRANG_CU + ' (cũ, đã chia theo cơ sở)');
  cu.hideSheet();
}

// ---------- Tự dọn (chạy khi có người dùng web, tối đa 30 giây 1 lần, đang giữ khoá) ----------
function donDepNeuDenHan_() {
  chiaLichCu_(layBangTinh_());
  const luu = PropertiesService.getScriptProperties();
  if (Date.now() - Number(luu.getProperty('DON_DEP_LUC') || 0) < DON_DEP_MOI_GIAY * 1000) return;
  luu.setProperty('DON_DEP_LUC', String(Date.now()));
  donDep_();
}

function donDep_() {
  const bayGio = Date.now();
  const dauHomNay = Utilities.parseDate(Utilities.formatDate(new Date(), MUI_GIO, 'dd/MM/yyyy'), MUI_GIO, 'dd/MM/yyyy').getTime();
  const t24 = trang24h_();
  const luuTru = trangLuuTru_();

  // 1. Trang cơ sở: ghi giờ duyệt / hoàn thành còn thiếu; lịch của ngày trước chuyển trang; xếp lại
  CO_SO.forEach(function (c) {
    const sh = layTrangCoSo_(c.ma);
    boSungThoiGian_(sh);
    chuyenDong_(sh, function (r) {
      const ngay = thoiDiem_(chuNgay_(r[C_NGAY]));
      if (!ngay || ngay.getTime() >= dauHomNay) return null;
      const t = tt_(r[C_TRANG_THAI]);
      if (t === 'Hoàn thành') return t24;
      if (t === 'Đã huỷ' || t === 'Khách không đến') return luuTru;
      return null;   // chờ duyệt / đã duyệt của ngày cũ: giữ lại để tiệm xử lý
    });
    sapXep_(sh);
  });

  // 2. Trang 24h: quá 24 giờ sau khi làm xong và không còn khiếu nại đang mở -> lưu trữ
  const dangKhieuNai = maLichDangKhieuNai_();
  chuyenDong_(t24, function (r) {
    const xong = thoiDiem_(r[C_XONG_LUC]) || thoiDiemHenAnToan_(r);
    if (!xong || bayGio - xong.getTime() < BAO_HANH_GIO * 3600000) return null;
    return dangKhieuNai[String(r[C_MA_LICH]).trim().toUpperCase()] ? null : luuTru;
  });

  // 3. Lưu trữ: quá 7 ngày -> xoá hẳn thông tin khách
  const so = luuTru.getLastRow() - 1;
  if (so > 0) {
    const vao = luuTru.getRange(2, COT_THEM, so, 1).getValues();
    for (let i = so - 1; i >= 0; i--) {
      const t = thoiDiem_(vao[i][0]);
      if (t && bayGio - t.getTime() > LUU_TRU_NGAY * 86400000) luuTru.deleteRow(i + 2);
    }
  }
}

// Chuyển các dòng được chọn sang trang khác (ghi lúc chuyển vào cột cuối), rồi xoá ở trang cũ
function chuyenDong_(sh, chonTrangDen) {
  const so = sh.getLastRow() - 1;
  if (so < 1) return;
  const giaTri = sh.getRange(2, 1, so, COT.length).getValues();
  const xoa = [];
  giaTri.forEach(function (r, i) {
    if (!String(r[C_MA_LICH]).trim()) return;
    const den = chonTrangDen(r);
    if (!den) return;
    const hang = den.getLastRow() + 1;
    sh.getRange(i + 2, 1, 1, COT.length).copyTo(den.getRange(hang, 1), { contentsOnly: true });
    den.getRange(hang, COT_THEM).setValue(bayGio_());
    xoa.push(i + 2);
  });
  for (let k = xoa.length - 1; k >= 0; k--) sh.deleteRow(xoa[k]);
}

// Nhân viên chọn trạng thái ngay trên Sheet: điền mã làm, giờ duyệt, giờ hoàn thành nếu còn trống
function boSungThoiGian_(sh) {
  const so = sh.getLastRow() - 1;
  if (so < 1) return;
  sh.getRange(2, 1, so, COT.length).getValues().forEach(function (r, i) {
    const t = tt_(r[C_TRANG_THAI]);
    if (!String(r[C_MA_LICH]).trim() || (t !== 'Đã duyệt' && t !== 'Hoàn thành')) return;
    const hang = i + 2;
    if (!String(r[C_MA_LAM] || '').trim()) sh.getRange(hang, C_MA_LAM + 1).setValue("'" + maLamMoi_());
    if (!String(r[C_DUYET_LUC] || '').trim()) sh.getRange(hang, C_DUYET_LUC + 1).setValue(bayGio_());
    if (t === 'Hoàn thành' && !String(r[C_XONG_LUC] || '').trim()) sh.getRange(hang, C_XONG_LUC + 1).setValue(bayGio_());
  });
}

// Mã lịch có khiếu nại chưa "Đã xử lý" -> giữ ở trang 24h
function maLichDangKhieuNai_() {
  const kn = trangKhieuNai_();
  const ds = {};
  const so = kn.getLastRow() - 1;
  if (so < 1) return ds;
  kn.getRange(2, 1, so, COT_KHIEU_NAI.length).getValues().forEach(function (r) {
    const ma = String(r[4] || '').trim().toUpperCase();
    if (ma && String(r[12] || '').trim() !== 'Đã xử lý') ds[ma] = true;
  });
  return ds;
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
  const moi = giaTri.map(function (r) { return String(r[C_MA_LICH]).trim() ? soThuTu_(r) : 9e10; });
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
  const s = String(v || '').trim();
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
  'Góp ý', 'Người gửi', 'Liên hệ (nếu muốn tiệm phản hồi)', 'Tiệm đã xem', 'Khách đã làm tại tiệm (mã lịch)',
  'Trạng thái lịch của khách'];
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
function trangKhieuNai_() {
  const sh = layTrangPhu_('Khiếu nại', COT_KHIEU_NAI, '#fce5cd');
  // Cột "Trạng thái" của khiếu nại thành ô chọn (làm 1 lần). Chọn "Đã xử lý" thì lịch rời trang 24h.
  const luu = PropertiesService.getScriptProperties();
  const khoa = 'KN_TRANG_THAI_V1_' + sh.getSheetId();
  if (!luu.getProperty(khoa)) {
    sh.getRange(2, 13, 2000, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TRANG_THAI_KN, true).setAllowInvalid(true).build());
    sh.getRange(1, 13).setNote('Mới / Đang xử lý / Đã xử lý. Lịch có khiếu nại chưa "Đã xử lý" sẽ được giữ ở trang "' + TEN_24H + '".');
    luu.setProperty(khoa, '1');
  }
  return sh;
}

function diem_(v, batBuoc) {
  const n = parseInt(v, 10);
  if (n >= 1 && n <= 5) return n;
  return batBuoc ? null : '';
}

function danhGia_(d) {
  if (d.web) return { ok: true };                 // ô bẫy chống gửi rác tự động: người thật không điền ô này
  const chung = diem_(d.diem, true);
  if (!chung) return { ok: false, loi: 'Chưa chọn số sao.' };

  // Ai cũng đánh giá được. Gắn với lịch đã đặt (không bắt buộc) thì ghi kèm trạng thái lịch, mỗi lịch 1 lần
  let tim = null;
  if (String(d.maLich || '').trim()) {
    tim = timHang_(d.maLich, d.sdt);
    if (!tim) return { ok: false, loi: 'khong-thay' };
    if (String(tim.r[C_DANH_GIA] || '').trim()) return { ok: false, loi: 'da-danh-gia' };
  }
  const anDanh = d.anDanh !== false;
  // Ẩn danh: không ghi tên, liên hệ, mã lịch vào trang "Đánh giá", lịch đặt chỉ đánh dấu đã đánh giá
  if (tim) tim.sh.getRange(tim.hang, C_DANH_GIA + 1).setValue(anDanh ? 'Đã đánh giá (ẩn danh)' : '★ ' + chung + '/5 · ' + bayGio_());

  trangDanhGia_().appendRow([
    bayGio_(), chu_(tim ? tim.r[C_CHI_NHANH] : d.chiNhanh, 60), chung, diem_(d.chatLuong), diem_(d.dichVu), diem_(d.veSinh),
    chu_(d.gopY, 2000), anDanh ? 'Ẩn danh' : chu_(d.ten, 60) || 'Không ghi tên', anDanh ? '' : chu_(d.lienHe, 80), '',
    !tim ? '' : anDanh ? '✓ Đã xác minh' : '✓ ' + String(tim.r[C_MA_LICH]),
    tim ? tt_(tim.r[C_TRANG_THAI]) : 'Không gắn lịch đặt',
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

// Còn trong 24 giờ bảo hành: đã hoàn thành, chưa vào trang lưu trữ, chưa quá 24 giờ sau khi làm xong
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
  // Mỗi lịch khiếu nại 1 lần; mỗi số điện thoại tối đa 2 khiếu nại 1 ngày
  if (daKhieuNai_(tim.r[C_MA_LICH])) return { ok: false, loi: 'da-khieu-nai' };
  if (soKhieuNaiHomNay_(sdt) >= KHIEU_NAI_MOI_NGAY) return { ok: false, loi: 'qua-gioi-han' };
  const maKN = 'KN' + Utilities.formatDate(new Date(), MUI_GIO, 'ddMM') + '-' + Math.floor(1000 + Math.random() * 9000);
  trangKhieuNai_().appendRow([
    bayGio_(), maKN, chu_(d.hoTen, 80), "'" + sdt, String(tim.r[C_MA_LICH]), 'Có (đã hoàn thành)', "'" + chuNgay_(tim.r[C_NGAY]),
    chu_(tim.r[C_CHI_NHANH], 60), chu_(d.loai, 60), chu_(d.moTa, 3000), chu_(d.link, 500), chu_(d.mongMuon, 200),
    'Mới', '', '',
  ]);
  return { ok: true, maKN: maKN };
}

// Trang "Khiếu nại": cột 1 = Thời gian gửi, cột 4 = Số điện thoại, cột 5 = Mã lịch
function dongKhieuNai_() {
  const kn = trangKhieuNai_();
  const so = kn.getLastRow() - 1;
  return so > 0 ? kn.getRange(2, 1, so, COT_KHIEU_NAI.length).getValues() : [];
}
function daKhieuNai_(maLich) {
  const ma = String(maLich || '').trim().toUpperCase();
  return dongKhieuNai_().some(function (r) { return String(r[4] || '').trim().toUpperCase() === ma; });
}
function soKhieuNaiHomNay_(sdt) {
  const homNay = Utilities.formatDate(new Date(), MUI_GIO, 'dd/MM/yyyy');
  return dongKhieuNai_().filter(function (r) {
    const luc = thoiDiem_(r[0]);
    return luc && Utilities.formatDate(luc, MUI_GIO, 'dd/MM/yyyy') === homNay && chuanSdt_(r[3]) === sdt;
  }).length;
}

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

// Tìm dòng theo mã lịch + số điện thoại (phải khớp cả hai): trang 2 cơ sở, rồi 24h, rồi lưu trữ
function timHang_(maLich, sdt) {
  const ma = String(maLich || '').trim().toUpperCase();
  const so = chuanSdt_(sdt || '');
  if (!ma || !so) return null;
  const cacTrang = CO_SO.map(function (c) { return { sh: layTrangCoSo_(c.ma), trang: 'co-so' }; })
    .concat([{ sh: trang24h_(), trang: '24h' }, { sh: trangLuuTru_(), trang: 'luu-tru' }]);
  for (let k = 0; k < cacTrang.length; k++) {
    const giaTri = cacTrang[k].sh.getDataRange().getValues();
    for (let i = 1; i < giaTri.length; i++) {
      const r = giaTri[i];
      if (String(r[C_MA_LICH]).trim().toUpperCase() === ma && chuanSdt_(r[C_SDT]) === so) {
        return { sh: cacTrang[k].sh, trang: cacTrang[k].trang, hang: i + 1, r: r };
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
    // Mã làm chỉ có khi tiệm đã duyệt
    maLam: trangThai === 'Đã duyệt' || trangThai === 'Hoàn thành' ? String(r[C_MA_LAM] || '') : '',
    conBaoHanh: conBaoHanh_(r, trang),
    daKhieuNai: trangThai === 'Hoàn thành' && daKhieuNai_(r[C_MA_LICH]),
  };
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
    trang24h_(); trangLuuTru_();
    const ss = layBangTinh_();
    return traJson_({ ok: true, ping: 'Dany Nail Sheet đang chạy', phienBan: 5,
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
  if (trangThai !== 'Đã duyệt' && trangThai !== 'Hoàn thành') return;
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
