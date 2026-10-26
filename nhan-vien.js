// =====================================================================
// DANY NAILROOM: WEB NHÂN VIÊN (nhan-vien.html), CHỈ ĐỂ TRA CỨU
// Tìm lịch theo mã, số điện thoại, ngày, cơ sở; xem khách, thợ, các mốc thời gian, khiếu nại, đánh giá.
// Dữ liệu lấy từ trang "Hồ sơ 30 ngày" của Google Sheet, cần mã đăng nhập (ô B1, trang "Cài đặt").
// =====================================================================
(() => {
  'use strict';

  /* ---------- Hàm phụ ---------- */
  const $ = (s, goc = document) => goc.querySelector(s);
  const $$ = (s, goc = document) => [...goc.querySelectorAll(s)];
  const them0 = (n) => String(n).padStart(2, '0');
  const CHE_DO_THU = !LINK_GOOGLE_SHEET;

  function chay(ten, fn) {
    try { return fn(); } catch (e) { console.error(`[Dany NV] Lỗi ở khối "${ten}":`, e); }
  }
  function an(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // Ô ngày của trình duyệt (yyyy-mm-dd) <-> ngày của Sheet (dd/MM/yyyy)
  const isoCua = (d) => `${d.getFullYear()}-${them0(d.getMonth() + 1)}-${them0(d.getDate())}`;
  const sangSheet = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const ngayLech = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoCua(d); };
  const THU = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  let henToast;
  function bao(noiDung) {
    const toast = $('#toast');
    toast.textContent = noiDung;
    toast.classList.add('show');
    clearTimeout(henToast);
    henToast = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  async function guiSheet(goi) {
    try {
      const res = await fetch(LINK_GOOGLE_SHEET, { method: 'POST', body: JSON.stringify(goi) });
      return await res.json();
    } catch (err) {
      console.error('[Dany NV] Gửi lên Google Sheet thất bại:', err);
      return { ok: false, loi: 'mang' };
    }
  }

  // Nút đổi nền sáng / tối, dùng chung lựa chọn với web khách
  chay('sang-toi', () => {
    const goc = document.documentElement;
    const nut = $('#nutGiaoDien');
    const capNhatNhan = () => nut.setAttribute('aria-label', goc.dataset.theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối');
    capNhatNhan();
    nut.addEventListener('click', () => {
      const toi = goc.dataset.theme !== 'dark';
      if (toi) goc.dataset.theme = 'dark'; else delete goc.dataset.theme;
      try { localStorage.setItem('dany-giao-dien', toi ? 'dark' : 'light'); } catch (e) { /* trình duyệt chặn lưu */ }
      capNhatNhan();
    });
  });

  /* ================= ĐĂNG NHẬP ================= */
  // Mã chỉ giữ trong tab đang mở (đóng tab là phải nhập lại)
  const KHOA_PIN = 'dany-nv-pin';
  const docPin = () => { try { return sessionStorage.getItem(KHOA_PIN) || ''; } catch (e) { return ''; } };
  const ghiPin = (p) => { try { if (p) sessionStorage.setItem(KHOA_PIN, p); else sessionStorage.removeItem(KHOA_PIN); } catch (e) { /* trình duyệt chặn lưu */ } };
  const LOI = {
    'sai-pin': 'Mã đăng nhập không đúng.',
    'tam-khoa': 'Nhập sai quá nhiều lần, web nhân viên tạm khoá 10 phút.',
    'chua-cai': 'Tiệm chưa đặt mã đăng nhập (ô B1, trang tính "Cài đặt").',
    'mang': 'Không kết nối được, kiểm tra mạng rồi thử lại.',
  };

  function hienKhu(daDangNhap) {
    $('#nvDangNhap').hidden = daDangNhap;
    $('#nvKhu').hidden = !daDangNhap;
    $('#nvThoat').hidden = !daDangNhap;
  }
  function veLoiPin(loi) {
    ghiPin('');
    hienKhu(false);
    $('#nvLoiPin').textContent = LOI[loi] || `Lỗi: ${loi}`;
  }

  /* ================= TÌM KIẾM ================= */
  let ketQua = [];

  async function tim(imLang) {
    if (CHE_DO_THU) { hienKhu(false); $('#nvLoiPin').textContent = 'Web đang ở chế độ thử, chưa nối Google Sheet.'; return false; }
    const pin = docPin();
    if (!pin) { hienKhu(false); return false; }
    const nut = $('#lTim');
    nut.disabled = true;
    if (!imLang) $('#nvCapNhat').textContent = 'Đang tải…';
    const kq = await guiSheet({
      hanhDong: 'nv-tim', pin,
      maLich: $('#lMa').value.trim(), sdt: $('#lSdt').value.trim(),
      tuNgay: sangSheet($('#lTu').value), denNgay: sangSheet($('#lDen').value), coSo: $('#lCoSo').value,
    });
    nut.disabled = false;
    if (!kq.ok) {
      if (['sai-pin', 'tam-khoa', 'chua-cai'].includes(kq.loi)) veLoiPin(kq.loi);
      else $('#nvCapNhat').textContent = LOI[kq.loi] || `Lỗi: ${kq.loi}`;
      return false;
    }
    ketQua = kq.ds;
    hienKhu(true);
    ve();
    $('#nvCapNhat').textContent = `Cập nhật lúc ${kq.bayGio}${kq.tong > kq.ds.length ? ` · hiện ${kq.ds.length}/${kq.tong} lịch, thu hẹp bộ lọc để xem hết` : ''}`;
    return true;
  }

  // Lọc thêm theo trạng thái ngay trên máy (không cần hỏi lại Sheet)
  function locTrangThai() {
    const v = $('#lTrangThai').value;
    if (!v) return ketQua;
    if (v === 'kn') return ketQua.filter((l) => l.khieuNai.length);
    if (v === 'dg') return ketQua.filter((l) => l.danhGiaCt.length || l.danhGia);
    return ketQua.filter((l) => l.trangThai === v);
  }

  const LOP_TRANG_THAI = { 'Chờ duyệt': 'cho', 'Đã duyệt': 'duyet', 'Hoàn thành': 'xong', 'Đã huỷ': 'huy', 'Khách không đến': 'khong-den' };

  function veTong(ds) {
    const dem = (f) => ds.filter(f).length;
    const diem = ds.flatMap((l) => l.danhGiaCt.map((d) => Number(d.diem))).filter((n) => n > 0);
    const tb = diem.length ? (diem.reduce((a, b) => a + b, 0) / diem.length).toFixed(1) : '–';
    const o = [
      ['Tổng lịch', ds.length, ''],
      ['Chờ duyệt', dem((l) => l.trangThai === 'Chờ duyệt'), 'cho'],
      ['Đã duyệt', dem((l) => l.trangThai === 'Đã duyệt'), 'duyet'],
      ['Hoàn thành', dem((l) => l.trangThai === 'Hoàn thành'), 'xong'],
      ['Huỷ / không đến', dem((l) => l.trangThai === 'Đã huỷ' || l.trangThai === 'Khách không đến'), 'huy'],
      ['Có khiếu nại', dem((l) => l.khieuNai.length), 'kn'],
      ['Đánh giá (TB ★)', `${diem.length} · ${tb}`, 'dg'],
    ];
    const theoCoSo = CHI_NHANH.map((c) => `${an(c.ma)}: <b>${dem((l) => String(l.chiNhanh).indexOf(c.ma) === 0)}</b>`).join(' · ');
    $('#nvTong').innerHTML = o.map(([nhan, so, lop]) => `<div class="glass nv-o ${lop ? 'nv-o-' + lop : ''}"><span>${nhan}</span><b>${so}</b></div>`).join('')
      + `<p class="note nv-theo-co-so">Theo cơ sở: ${theoCoSo}</p>`;
  }

  // Các mốc thời gian của 1 lịch, theo thứ tự
  function cacMoc(l) {
    const moc = [
      ['Đặt chỗ', l.datLuc],
      ['Xác nhận (đã duyệt)', l.duyetLuc],
      ['Đến làm (giờ hẹn)', `${l.gio} ${l.ngay}`],
      ['Hoàn thành', l.xongLuc],
    ];
    if (l.huy) moc.push([l.trangThai === 'Khách không đến' ? 'Khách không đến' : 'Huỷ', l.huy]);
    l.khieuNai.forEach((k) => moc.push([`Khiếu nại ${k.maKN} · ${k.trangThai}`, k.luc,
      `${k.loai}: ${k.moTa}${k.mongMuon ? ` · Mong muốn: ${k.mongMuon}` : ''}${k.nguoiXuLy ? ` · Người xử lý: ${k.nguoiXuLy}` : ''}${k.ghiChu ? ` · Ghi chú: ${k.ghiChu}` : ''}`, k.link]));
    l.danhGiaCt.forEach((d) => moc.push([`Đánh giá ★ ${d.diem}/5`, d.luc,
      `${d.gopY || 'Không ghi góp ý'} · ${d.nguoiGui}${d.chatLuong ? ` · Chất lượng ${d.chatLuong}★` : ''}${d.thaiDo ? ` · Thái độ ${d.thaiDo}★` : ''}${d.veSinh ? ` · Vệ sinh ${d.veSinh}★` : ''}`]));
    return moc;
  }

  function theLich(l) {
    const [d, m, y] = String(l.ngay).split('/').map(Number);
    const thu = y ? THU[new Date(y, m - 1, d).getDay()] : '';
    const nhan = [
      l.khieuNai.length ? `<span class="nv-nhan nv-nhan-kn">Khiếu nại</span>` : '',
      l.danhGiaCt.length || l.danhGia ? `<span class="nv-nhan nv-nhan-dg">Đánh giá</span>` : '',
    ].join('');
    const moc = cacMoc(l).map(([ten, luc, chiTiet, link]) => `
      <li class="${luc ? 'co' : ''}"><b>${an(ten)}</b><span>${an(luc || 'Chưa có')}</span>
        ${chiTiet ? `<p>${an(chiTiet)}</p>` : ''}${link ? `<a href="${an(link)}" target="_blank" rel="noopener">Xem ảnh khách gửi</a>` : ''}</li>`).join('');
    return `
      <details class="glass nv-the tt-${LOP_TRANG_THAI[l.trangThai] || 'cho'}" data-ma="${an(l.maLich)}">
        <summary>
          <span class="nv-gio">${an(l.gio)} · ${thu} ${an(l.ngay)}</span>
          <span class="nv-khach"><b>${an(l.hoTen)}</b> · ${an(l.sdt)}</span>
          <span class="nv-ma">${an(l.maLich)} · ${an(String(l.chiNhanh).split(' · ')[0])}</span>
          <span class="nv-phai">${nhan}<span class="pill">${an(l.trangThai)}</span></span>
        </summary>
        <div class="nv-chi-tiet">
          <dl>
            <div><dt>Khách</dt><dd>${an(l.hoTen)} · <a href="tel:${an(l.sdt)}">${an(l.sdt)}</a></dd></div>
            <div><dt>Cơ sở</dt><dd>${an(l.chiNhanh)}</dd></div>
            <div><dt>Làm gì</dt><dd>${an(l.noiDung || '–')}${l.dichVu ? ` · ${an(l.dichVu)}` : ''}</dd></div>
            <div><dt>Thợ phụ trách</dt><dd>${an(l.tho || 'Chưa ghi')}</dd></div>
            <div><dt>Mã làm</dt><dd>${an(l.maLam || '–')}</dd></div>
            ${l.ghiChu ? `<div><dt>Ghi chú của khách</dt><dd>${an(l.ghiChu)}</dd></div>` : ''}
            <div><dt>Đang ở trang</dt><dd>${an(l.trang)}</dd></div>
          </dl>
          <ol class="nv-moc">${moc}</ol>
          ${khuSua(l)}
        </div>
      </details>`;
  }

  /* ================= DUYỆT / ĐỔI TRẠNG THÁI ================= */
  const NUT_TRANG_THAI = {
    'Chờ duyệt': [['Đã duyệt', 'Duyệt lịch', 'btn btn-primary btn-sm'], ['Khách không đến', 'Khách không đến', 'mini'], ['Đã huỷ', 'Huỷ lịch', 'mini nv-nguy']],
    'Đã duyệt': [['Hoàn thành', 'Hoàn thành', 'btn btn-primary btn-sm'], ['Khách không đến', 'Khách không đến', 'mini'], ['Đã huỷ', 'Huỷ lịch', 'mini nv-nguy']],
  };
  function khuSua(l) {
    if (!l.suaDuoc) return '<p class="note nv-sua">Lịch đã rời trang cơ sở nên không đổi trạng thái được nữa.</p>';
    const nut = (NUT_TRANG_THAI[l.trangThai] || [])
      .map(([tt, chu, lop]) => `<button class="${lop}" type="button" data-doi="${tt}">${chu}</button>`).join('');
    return `
      <div class="nv-sua" data-ma="${an(l.maLich)}" data-tt="${an(l.trangThai)}">
        ${nut ? `<div class="nv-sua-nut">${nut}</div>` : ''}
        <label class="nv-sua-tho">Thợ phụ trách<span><input value="${an(l.tho)}" maxlength="60" placeholder="Tên thợ" data-tho><button class="mini" type="button" data-luu-tho>Lưu</button></span></label>
        <p class="error nv-sua-loi" role="alert"></p>
      </div>`;
  }

  const LOI_SUA = {
    'trang-thai-da-doi': 'Lịch vừa được đổi ở nơi khác (Sheet hoặc máy khác), đã tải lại.',
    'khong-sua-duoc': 'Lịch đã rời trang cơ sở nên không đổi được nữa.',
    'viec-khong-hop-le': 'Thao tác không hợp lệ.',
  };
  const BAO_SUA = { 'Đã duyệt': 'Đã duyệt, web khách hiện mã làm', 'Hoàn thành': 'Đã hoàn thành, lịch có ở trang 24h',
    'Khách không đến': 'Đã ghi khách không đến', 'Đã huỷ': 'Đã huỷ lịch, slot được trả lại' };

  async function sua(khu, goi) {
    const oLoi = $('.nv-sua-loi', khu);
    oLoi.textContent = '';
    $$('button', khu).forEach((b) => { b.disabled = true; });
    const kq = await guiSheet(Object.assign({ hanhDong: 'nv-cap-nhat', pin: docPin(), maLich: khu.dataset.ma, trangThaiCu: khu.dataset.tt }, goi));
    $$('button', khu).forEach((b) => { b.disabled = false; });
    if (!kq.ok) {
      if (['sai-pin', 'tam-khoa', 'chua-cai'].includes(kq.loi)) { veLoiPin(kq.loi); return; }
      oLoi.textContent = LOI_SUA[kq.loi] || LOI[kq.loi] || `Lỗi: ${kq.loi}`;
      if (kq.loi === 'trang-thai-da-doi') setTimeout(() => tim(true), 1200);
      return;
    }
    if (kq.lich) {
      const i = ketQua.findIndex((l) => l.maLich === kq.lich.maLich);
      if (i >= 0) ketQua[i] = kq.lich;
    }
    ve();
    bao(goi.trangThai ? BAO_SUA[goi.trangThai] : 'Đã lưu thợ phụ trách');
  }

  // Vẽ lại danh sách, giữ nguyên các lịch đang mở
  function ve() {
    const dangMo = $$('.nv-the[open]').map((d) => d.dataset.ma);
    const ds = locTrangThai();
    veTong(ds);
    $('#nvDs').innerHTML = ds.length ? ds.map(theLich).join('')
      : '<div class="glass empty-lich"><p>Không có lịch nào khớp bộ lọc.</p></div>';
    $$('.nv-the').forEach((d) => { if (dangMo.includes(d.dataset.ma)) d.open = true; });
  }

  // Nút chọn nhanh khoảng ngày
  function chonNhanh(loai) {
    const dat = (tu, den) => { $('#lTu').value = tu; $('#lDen').value = den; };
    if (loai === 'hom-nay') dat(ngayLech(0), ngayLech(0));
    if (loai === '7-qua') dat(ngayLech(-7), ngayLech(0));
    if (loai === '7-toi') dat(ngayLech(0), ngayLech(7));
    if (loai === '30') dat(ngayLech(-30), ngayLech(7));
    if (loai === 'xoa') { dat('', ''); $('#lMa').value = ''; $('#lSdt').value = ''; $('#lCoSo').value = ''; $('#lTrangThai').value = ''; }
    tim();
  }

  chay('nhan-vien', () => {
    $('#lCoSo').innerHTML = '<option value="">Tất cả cơ sở</option>' + CHI_NHANH.map((c) => `<option value="${c.ma}">${c.ten}</option>`).join('');
    $('#lTu').value = ngayLech(0);
    $('#lDen').value = ngayLech(0);

    $('#nvDangNhap').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = $('#nvPin').value.trim();
      $('#nvLoiPin').textContent = '';
      if (pin.length < 8) { $('#nvLoiPin').textContent = 'Mã đăng nhập có ít nhất 8 ký tự.'; return; }
      $('#nvNutPin').disabled = true;
      ghiPin(pin);
      const ok = await tim();
      $('#nvNutPin').disabled = false;
      if (ok) { $('#nvPin').value = ''; bao('Đã đăng nhập'); }
    });
    $('#nvLoc').addEventListener('submit', (e) => { e.preventDefault(); tim(); });
    $('#lTrangThai').addEventListener('change', ve);
    $('#lNhanh').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nhanh]');
      if (b) chonNhanh(b.dataset.nhanh);
    });
    // Nút đổi trạng thái (huỷ phải bấm 2 lần cho chắc) và lưu thợ phụ trách
    $('#nvDs').addEventListener('click', (e) => {
      const nut = e.target.closest('[data-doi], [data-luu-tho]');
      if (!nut) return;
      const khu = nut.closest('.nv-sua');
      if (nut.dataset.luuTho !== undefined) { sua(khu, { tho: $('[data-tho]', khu).value.trim() }); return; }
      const tt = nut.dataset.doi;
      if ((tt === 'Đã huỷ' || tt === 'Khách không đến') && nut.dataset.chac !== '1') {
        const chuCu = nut.textContent;
        nut.dataset.chac = '1';
        nut.textContent = 'Bấm lần nữa để xác nhận';
        setTimeout(() => { if (nut.isConnected) { nut.dataset.chac = ''; nut.textContent = chuCu; } }, 3000);
        return;
      }
      sua(khu, { trangThai: tt, tho: $('[data-tho]', khu).value.trim() });
    });
    $('#nvDs').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('[data-tho]')) { e.preventDefault(); sua(e.target.closest('.nv-sua'), { tho: e.target.value.trim() }); }
    });
    $('#nvThoat').addEventListener('click', () => { ghiPin(''); ketQua = []; $('#nvDs').innerHTML = ''; $('#nvTong').innerHTML = ''; hienKhu(false); });

    if (docPin()) tim(); else hienKhu(false);
  });
})();
