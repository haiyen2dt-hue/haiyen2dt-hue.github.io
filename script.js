// =====================================================================
// DANY NAILROOM: toàn bộ chức năng của trang
// Dữ liệu (mẫu nail, giá, link Google Sheet) nằm trong data.js
// Web có nhiều "trang" trong cùng 1 file: địa chỉ #/bo-suu-tap, #/dat-lich… quyết định trang nào hiện.
// Mỗi khối chạy trong chay(...) nên một khối lỗi không làm hỏng khối khác.
// =====================================================================
(() => {
  'use strict';
  // Thư mục chứa ảnh: để trống khi chạy trên GitHub; trên WordPress theme tự điền đường dẫn theme
  const GOC = window.DANY_GOC || '';

  /* ---------- Hàm phụ ---------- */
  const $ = (s, goc = document) => goc.querySelector(s);
  const $$ = (s, goc = document) => [...goc.querySelectorAll(s)];
  const giamChuyenDong = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coChuot = matchMedia('(pointer: fine)').matches;
  const them0 = (n) => String(n).padStart(2, '0');
  const CHE_DO_THU = !LINK_GOOGLE_SHEET;
  const HOTLINE = '0767 111 047';

  function chay(ten, fn) {
    try { return fn(); } catch (e) { console.error(`[Dany] Lỗi ở khối "${ten}":`, e); }
  }

  // Bỏ dấu tiếng Việt để tìm "mat meo" vẫn ra "mắt mèo"
  function boDau(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();
  }
  // Chống chèn mã HTML khi hiện chữ khách gõ hoặc dữ liệu từ sheet
  function an(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Ngày dạng dd/MM/yyyy (giống cột "Ngày hẹn" trong Google Sheet)
  const ngayChu = (d) => `${them0(d.getDate())}/${them0(d.getMonth() + 1)}/${d.getFullYear()}`;
  const HOM_NAY = ngayChu(new Date());
  const CAC_GIO = [];
  for (let g = GIO_MO_CUA; g < GIO_DONG_CUA; g++) CAC_GIO.push(g);
  const THU = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  function thoiDiemHen(ngay, gio) {
    const [d, m, y] = ngay.split('/').map(Number);
    return new Date(y, m - 1, d, parseInt(gio, 10), 0);
  }

  const toast = $('#toast');
  let henToast;
  function bao(noiDung) {
    toast.textContent = noiDung;
    toast.classList.add('show');
    clearTimeout(henToast);
    henToast = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  const timMau = (ma) => MAU_NAIL.find((m) => m.ma === ma);
  const tenBst = (id) => (BO_SUU_TAP.find((b) => b.id === id) || {}).ten || '';
  // Mẫu mới thêm (số lớn) hiện trước
  const mauTrongBst = (id) => MAU_NAIL.filter((m) => m.bst.includes(id)).reverse();

  // Gửi dữ liệu lên Google Sheet (dạng text để Apps Script nhận được mà không bị chặn CORS)
  async function guiSheet(goi) {
    try {
      const res = await fetch(LINK_GOOGLE_SHEET, { method: 'POST', body: JSON.stringify(goi) });
      return await res.json();
    } catch (err) {
      console.error('[Dany] Gửi lên Google Sheet thất bại:', err);
      return { ok: false, loi: 'mang' };
    }
  }

  /* ---------- Trạng thái chung ---------- */
  const tt = { chiNhanh: CHI_NHANH[0].ma, ngay: HOM_NAY, gio: null };

  /* ================= 1. MÀN MỞ ĐẦU, CUỘN TRANG ================= */
  chay('man-mo-dau', () => {
    const rem = $('#curtain');
    const mo = () => rem.classList.add('out');
    addEventListener('load', () => setTimeout(mo, giamChuyenDong ? 0 : 400));
    setTimeout(mo, 2500);
  });

  chay('cuon-trang', () => {
    const thanh = $('#progress');
    const nav = $('#nav');
    let yTruoc = 0, dangCho = false;
    function capNhat() {
      const toiDa = document.documentElement.scrollHeight - innerHeight;
      thanh.style.transform = `scaleX(${toiDa > 0 ? scrollY / toiDa : 0})`;
      nav.classList.toggle('hide', scrollY > yTruoc && scrollY > 500);
      yTruoc = scrollY;
      dangCho = false;
    }
    addEventListener('scroll', () => { if (!dangCho) { dangCho = true; requestAnimationFrame(capNhat); } }, { passive: true });
  });

  // Nút đổi nền sáng / tối, lưu lựa chọn trên trình duyệt
  chay('sang-toi', () => {
    const goc = document.documentElement;
    const nut = $('#nutGiaoDien');
    const capNhatNhan = () => {
      const toi = goc.dataset.theme === 'dark';
      nut.setAttribute('aria-label', toi ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối');
    };
    capNhatNhan();
    nut.addEventListener('click', () => {
      const toi = goc.dataset.theme !== 'dark';
      if (toi) goc.dataset.theme = 'dark'; else delete goc.dataset.theme;
      try { localStorage.setItem('dany-giao-dien', toi ? 'dark' : 'light'); } catch (e) { /* trình duyệt chặn lưu */ }
      capNhatNhan();
    });
  });

  /* ================= 2. THÔNG TIN, BẢNG GIÁ, COMBO ================= */
  function capNhatMoCua() {
    const bayGio = new Date();
    const phut = bayGio.getHours() * 60 + bayGio.getMinutes();
    const dangMo = phut >= GIO_MO_CUA * 60 && phut < GIO_DONG_CUA * 60;
    $('#openStatus').classList.toggle('open', dangMo);
    $('#openText').textContent = dangMo ? `Đang mở cửa, đóng lúc ${GIO_DONG_CUA}:00` : `Đang đóng cửa, mở lúc ${them0(GIO_MO_CUA)}:00`;
  }
  chay('mo-cua', capNhatMoCua);

  chay('chep-so', () => {
    document.addEventListener('click', (e) => {
      const nut = e.target.closest('[data-copy]');
      if (!nut) return;
      const so = nut.dataset.copy;
      const duPhong = () => bao(`Số tiệm: ${so}`);
      if (navigator.clipboard) navigator.clipboard.writeText(so).then(() => bao(`Đã chép ${so}`), duPhong);
      else duPhong();
    });
  });

  chay('bang-gia', () => {
    $('#priceGrid').innerHTML = BANG_GIA.map((nhom) => `
      <article class="glass price-card" data-tilt>
        <h3>${nhom.nhom}</h3>
        <ul>${nhom.dong.map(([ten, gia]) => `<li><span>${ten}</span><i></i><b>${gia}</b></li>`).join('')}</ul>
      </article>`).join('');
  });

  // Menu theo mùa nằm trong trang Bảng giá
  chay('combo-mua', () => {
    $('#comboTitle').textContent = COMBO_MUA.ten;
    $('#comboNote').textContent = COMBO_MUA.apDung;
    $('#comboList').innerHTML = COMBO_MUA.mon.map((m) => `
      <article class="glass combo" data-tilt><h3>${m.ten}</h3><b>${m.gia}</b></article>`).join('');
    $('#scCombo').textContent = `${COMBO_MUA.ten} từ ${COMBO_MUA.mon[0].gia}`;
    $('#scComboChu').textContent = COMBO_MUA.apDung;
  });

  /* ================= 3. MẪU NAIL: lưới mẫu, bộ sưu tập, tìm kiếm ================= */
  function veLuoiMau(khung, ds) {
    khung.innerHTML = ds.map((m, i) => `
      <article class="mau" data-tilt style="--i:${Math.min(i, 12)}">
        <button class="mau-anh" type="button" data-xem="${m.ma}" aria-label="Xem lớn mẫu ${m.ma}">
          <img src="${GOC}assets/mau/${m.ma}.jpg" alt="Mẫu nail ${m.ma}: ${m.ten}" loading="lazy">
          <span class="tag-ma">${m.ma}</span>
        </button>
        <div class="mau-info">
          <h3>${m.ten}</h3>
          <p class="mau-tags">${m.tags.map((t) => '#' + t).join(' ')}</p>
          <div class="mau-nut">
            <button class="mini" type="button" data-dat="${m.ma}">Đặt mẫu này</button>
            <button class="mini mini-phoi" type="button" data-xem="${m.ma}">Tự phối</button>
          </div>
        </div>
      </article>`).join('');
  }

  // Trang danh sách bộ sưu tập: mỗi thẻ có 3 ảnh xếp quạt, rê chuột thì xoè ra
  chay('ds-bo-suu-tap', () => {
    $('#bstGrid').innerHTML = BO_SUU_TAP.map((b, i) => {
      const ds = mauTrongBst(b.id);
      return `
        <a class="bst-card glass" href="#/bo-suu-tap/${b.id}" data-tilt style="--i:${i}">
          <div class="bst-anh">${ds.slice(0, 3).map((m, j) => `<img src="${GOC}assets/mau/${m.ma}.jpg" alt="" loading="lazy" style="--j:${j}">`).join('')}</div>
          <div class="bst-info">
            <h3>${b.ten}</h3>
            <p class="muted">${b.moTa}</p>
            <span class="dem">${ds.length} mẫu <span aria-hidden="true">→</span></span>
          </div>
        </a>`;
    }).join('') + `
      <a class="bst-card glass bst-tat-ca" href="#/tim-mau" data-tilt style="--i:${BO_SUU_TAP.length}">
        <div class="bst-info">
          <h3>Tất cả ${MAU_NAIL.length} mẫu</h3>
          <p class="muted">Tìm theo số mẫu, màu hoặc kiểu: mắt mèo, chrome, ngọc trai…</p>
          <span class="dem">Tìm mẫu <span aria-hidden="true">→</span></span>
        </div>
      </a>`;

    // Thẻ lối tắt ở trang chủ
    $('#scAnh').innerHTML = ['30', '31', '19', '23'].map((ma, j) => `<img src="${GOC}assets/mau/${ma}.jpg" alt="" style="--j:${j}">`).join('');
    $('#scDemMau').textContent = `${MAU_NAIL.length} mẫu đánh số · ${BO_SUU_TAP.length} bộ sưu tập`;
  });

  // Trang 1 bộ sưu tập
  function veTrangBst(id) {
    const b = BO_SUU_TAP.find((x) => x.id === id);
    if (!b) { location.hash = '#/bo-suu-tap'; return; }
    $('#bstTen').textContent = b.ten;
    $('#bstMoTa').textContent = `${b.moTa} ${mauTrongBst(id).length} mẫu.`;
    $('#bstTabs').innerHTML = BO_SUU_TAP.map((x) =>
      `<a class="tab" href="#/bo-suu-tap/${x.id}" aria-current="${x.id === id ? 'page' : 'false'}">${x.ten}<small>${mauTrongBst(x.id).length}</small></a>`).join('');
    veLuoiMau($('#bstGallery'), mauTrongBst(id));
    document.title = `${b.ten} | Dany Nailroom`;
  }

  // Tìm kiếm
  const chuoiTim = new Map(
    MAU_NAIL.map((m) => [m.ma, boDau([m.ma, 'mau ' + m.ma, m.ten, m.tags.join(' '), m.bst.map(tenBst).join(' '), m.moTa].join(' '))])
  );
  function locMau(tuKhoa) {
    const q = boDau(tuKhoa);
    if (!q) return MAU_NAIL;
    const theoSo = q.match(/^(?:#|mau\s*|so\s*|ma\s*)?(\d{1,3})$/); // "05", "mẫu 5", "#5"
    if (theoSo) return MAU_NAIL.filter((m) => Number(m.ma) === Number(theoSo[1]));
    const tu = q.split(/\s+/);
    return MAU_NAIL.filter((m) => tu.every((t) => chuoiTim.get(m.ma).includes(t)));
  }
  function veTimKiem(tuKhoa) {
    const ds = locMau(tuKhoa);
    veLuoiMau($('#searchGallery'), ds);
    $('#empty').hidden = ds.length > 0;
    $('#searchDesc').textContent = tuKhoa.trim() ? `Tìm "${tuKhoa.trim()}": ${ds.length} mẫu` : `Tất cả ${MAU_NAIL.length} mẫu của tiệm.`;
  }

  chay('tim-kiem', () => {
    const goiY = ['mắt mèo', 'ngọc trai', 'chrome', 'Tết', 'Giáng Sinh', 'nail chân', 'mẫu 05'];
    const chip = goiY.map((g) => `<button class="chip" type="button" data-goi-y="${g}">${g}</button>`).join('');
    $('#heroChips').innerHTML = chip;
    $('#searchChips').innerHTML = chip;

    let cho;
    $('#q').addEventListener('input', (e) => {
      clearTimeout(cho);
      cho = setTimeout(() => {
        veTimKiem(e.target.value);
        history.replaceState(null, '', '#/tim-mau' + (e.target.value.trim() ? '?q=' + encodeURIComponent(e.target.value.trim()) : ''));
      }, 150);
    });
    $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); veTimKiem($('#q').value); });
    $('#heroSearch').addEventListener('submit', (e) => {
      e.preventDefault();
      location.hash = '#/tim-mau?q=' + encodeURIComponent($('#heroQ').value.trim());
    });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-goi-y]');
      if (c) location.hash = '#/tim-mau?q=' + encodeURIComponent(c.dataset.goiY);
    });
  });

  /* ================= 3b. TỰ PHỐI: tách mẫu thành thành phần + giỏ "Bộ nail của bạn" ================= */
  const tenLoai = (id) => (LOAI_THANH_PHAN.find((l) => l.id === id) || {}).ten || '';

  // Danh sách thành phần của 1 mẫu (màu sơn + các thành phần lấy từ tags)
  function thanhPhanCua(m) {
    const ds = [];
    const daCo = new Set();
    const them = (tp) => {
      const khoa = `${m.ma}:${tp.loai}:${boDau(tp.ten)}`;
      if (daCo.has(khoa)) return;
      daCo.add(khoa);
      ds.push({ ...tp, khoa, ma: m.ma });
    };
    // Màu sơn
    const mau = TU_CHI_MAU.filter((t) => m.tags.includes(t) && !(t === 'xanh' && m.tags.some((x) => x.startsWith('xanh '))));
    const thach = m.tags.includes('jelly') || m.tags.includes('thạch');
    them({ loai: 'mau', ten: `${thach ? 'Sơn thạch' : 'Sơn gel'} ${mau.length ? mau.join(', ') : 'màu như ảnh'}`, gia: thach ? GIA_SON.thach : GIA_SON.gel });
    // Thành phần riêng ghi trong data.js (nếu có), không thì lấy theo tags
    (m.thanhPhan || m.tags.map((t) => THANH_PHAN_THEO_TAG[t]).filter(Boolean)).forEach(them);
    const thuTu = LOAI_THANH_PHAN.map((l) => l.id);
    return ds.sort((a, b) => thuTu.indexOf(a.loai) - thuTu.indexOf(b.loai));
  }

  const KHOA_GIO = 'dany-gio-nail';
  let boNail = [];
  try { boNail = JSON.parse(localStorage.getItem(KHOA_GIO)) || []; } catch (e) { boNail = []; }
  const luuGio = () => { try { localStorage.setItem(KHOA_GIO, JSON.stringify(boNail)); } catch (e) { /* trình duyệt chặn lưu */ } };
  const trongGio = (khoa) => boNail.some((x) => x.khoa === khoa);

  function doiTrongGio(tp) {
    if (trongGio(tp.khoa)) {
      boNail = boNail.filter((x) => x.khoa !== tp.khoa);
      bao(`Đã bỏ ${tp.ten} (mẫu ${tp.ma})`);
    } else {
      boNail.push({ khoa: tp.khoa, ma: tp.ma, loai: tp.loai, ten: tp.ten, gia: tp.gia });
      bao(`Đã thêm ${tp.ten} của mẫu ${tp.ma} vào bộ nail`);
    }
    luuGio();
    capNhatGio();
  }

  // Một dòng thành phần (dùng trong hộp xem mẫu)
  function dongThanhPhan(tp) {
    const co = trongGio(tp.khoa);
    return `<li><span class="tp-ten">${an(tp.ten)}</span>
      <button class="tp-nut${co ? ' da-them' : ''}" type="button" data-tp="${an(tp.khoa)}" aria-pressed="${co}">${co ? '✓ Đã thêm' : '+ Thêm'}</button></li>`;
  }
  function veThanhPhan(khung, m) {
    const ds = thanhPhanCua(m);
    khung.innerHTML = LOAI_THANH_PHAN.map((l) => {
      const nhom = ds.filter((tp) => tp.loai === l.id);
      return nhom.length ? `<div class="tp-nhom"><p class="tp-loai">${l.ten}</p><ul>${nhom.map(dongThanhPhan).join('')}</ul></div>` : '';
    }).join('');
  }

  // Tóm tắt bộ nail dạng chữ (gửi kèm lịch hẹn)
  const tomTatGio = () => LOAI_THANH_PHAN.map((l) => {
    const nhom = boNail.filter((x) => x.loai === l.id);
    return nhom.length ? `${l.ten}: ${nhom.map((x) => `${x.ten} (mẫu ${x.ma})`).join(', ')}` : '';
  }).filter(Boolean).join('; ');

  function veDanhSachGio(khung, coNutXoa) {
    if (!boNail.length) {
      khung.innerHTML = '<p class="muted gio-trong">Chưa có thành phần nào. Vào <a href="#/bo-suu-tap">Bộ sưu tập</a>, bấm vào ảnh một mẫu rồi chọn "+ Thêm" ở màu, charm, hiệu ứng… bạn thích.</p>';
      return;
    }
    khung.innerHTML = LOAI_THANH_PHAN.map((l) => {
      const nhom = boNail.filter((x) => x.loai === l.id);
      if (!nhom.length) return '';
      return `<div class="tp-nhom"><p class="tp-loai">${l.ten}</p><ul>${nhom.map((x) => `
        <li class="gio-dong"><img src="${GOC}assets/mau/${x.ma}.jpg" alt="">
          <span class="tp-ten">${an(x.ten)}<small>Từ mẫu ${x.ma}</small></span>
          ${coNutXoa ? `<button class="gio-xoa" type="button" data-bo="${an(x.khoa)}" aria-label="Bỏ ${an(x.ten)}">×</button>` : ''}</li>`).join('')}</ul></div>`;
    }).join('');
  }

  function capNhatGio() {
    const n = boNail.length;
    $('#gioNut').hidden = n === 0;
    $('#gioSo').textContent = n;
    $('#gioNut').classList.remove('nay'); void $('#gioNut').offsetWidth; $('#gioNut').classList.add('nay');
    veDanhSachGio($('#gioDs'), true);
    $('#gioDat').disabled = n === 0;
    $('#gioXoaHet').hidden = n === 0;
    veDanhSachGio($('#phoiDs'), false);
    // Cập nhật nút "+ Thêm" đang hiện trong hộp xem mẫu
    $$('[data-tp]').forEach((b) => {
      const co = trongGio(b.dataset.tp);
      b.classList.toggle('da-them', co);
      b.setAttribute('aria-pressed', co);
      b.textContent = co ? '✓ Đã thêm' : '+ Thêm';
    });
  }

  // Sang trang đặt lịch với lựa chọn "Tự phối từ bộ nail"
  function datVoiBoNail() {
    $('input[name="kieuLam"][value="phoi"]').checked = true;
    doiKieuLam();
    $('#done').hidden = true;
    $('#bookArea').hidden = false;
    location.hash = '#/dat-lich';
  }

  chay('tu-phoi', () => {
    $$('[data-ig]').forEach((a) => { a.href = LINK_INSTAGRAM; });
    const hopGio = $('#gioBox');
    document.addEventListener('click', (e) => {
      const nutTp = e.target.closest('[data-tp]');
      if (nutTp) {
        const m = timMau(nutTp.dataset.tp.split(':')[0]);
        const tp = m && thanhPhanCua(m).find((x) => x.khoa === nutTp.dataset.tp);
        if (tp) doiTrongGio(tp);
      }
      const bo = e.target.closest('[data-bo]');
      if (bo) { boNail = boNail.filter((x) => x.khoa !== bo.dataset.bo); luuGio(); capNhatGio(); }
      if (e.target.closest('[data-mo-gio]')) { if ($('#lightbox').open) $('#lightbox').close(); hopGio.showModal(); }
    });
    $('#gioNut').addEventListener('click', () => hopGio.showModal());
    $('#gioDong').addEventListener('click', () => hopGio.close());
    hopGio.addEventListener('click', (e) => { if (e.target === hopGio) hopGio.close(); });
    $('#gioXoaHet').addEventListener('click', () => { boNail = []; luuGio(); capNhatGio(); bao('Đã xoá hết bộ nail'); });
    $('#gioDat').addEventListener('click', () => { hopGio.close(); datVoiBoNail(); });
    capNhatGio();
  });

  /* ================= 4. XEM MẪU LỚN ================= */
  chay('xem-lon', () => {
    const hop = $('#lightbox');
    let maDangXem = null;
    function moHop(ma) {
      const m = timMau(ma);
      if (!m) return;
      maDangXem = ma;
      $('#lbImg').src = `${GOC}assets/mau/${m.ma}.jpg`;
      $('#lbImg').alt = `Mẫu nail ${m.ma}: ${m.ten}`;
      $('#lbMa').textContent = m.ma;
      $('#lbBst').textContent = m.bst.map(tenBst).join(' · ');
      $('#lbTen').textContent = m.ten;
      $('#lbMoTa').textContent = m.moTa;
      $('#lbTags').innerHTML = m.tags.map((t) => `<span>#${t}</span>`).join('');
      veThanhPhan($('#lbTP'), m);
      hop.showModal();
    }
    document.addEventListener('click', (e) => {
      const xem = e.target.closest('[data-xem]');
      if (xem) moHop(xem.dataset.xem);
      const dat = e.target.closest('[data-dat]');
      if (dat) chonMau(dat.dataset.dat);
    });
    $('#lbClose').addEventListener('click', () => hop.close());
    hop.addEventListener('click', (e) => { if (e.target === hop) hop.close(); });
    $('#lbDat').addEventListener('click', () => { hop.close(); chonMau(maDangXem); });
  });

  /* ================= 5. ĐẶT LỊCH ================= */
  const boNhoSlot = {}; // { "20/10/2026|CN1": { daDat: {10: 1, ...} } }

  // Chế độ thử (chưa nối Google Sheet): lịch lưu trên trình duyệt
  function docLichThu() {
    try { return JSON.parse(localStorage.getItem('dany-lich-thu')) || []; } catch (e) { return []; }
  }
  function ghiLichThu(ds) {
    try { localStorage.setItem('dany-lich-thu', JSON.stringify(ds)); } catch (e) { /* trình duyệt chặn lưu */ }
  }
  function daDatGiaLap(ngay, chiNhanh) {
    const goc = Number(ngay.slice(0, 2)) + (chiNhanh === 'CN2' ? 5 : 0);
    const kq = {};
    CAC_GIO.forEach((g) => { kq[g] = (goc * 7 + g * 3) % (SO_KHACH_MOI_GIO + 1); });
    docLichThu().forEach((l) => {
      if (l.ngay === ngay && l.chiNhanh === chiNhanh && l.trangThai !== 'Đã huỷ') kq[l.gio] = (kq[l.gio] || 0) + 1;
    });
    return kq;
  }

  async function taiSlot(ngay, chiNhanh, taiLai) {
    const khoa = `${ngay}|${chiNhanh}`;
    if (boNhoSlot[khoa] && !taiLai) return boNhoSlot[khoa];
    if (CHE_DO_THU) {
      boNhoSlot[khoa] = { daDat: daDatGiaLap(ngay, chiNhanh) };
    } else {
      try {
        const res = await fetch(`${LINK_GOOGLE_SHEET}?ngay=${encodeURIComponent(ngay)}&chiNhanh=${chiNhanh}`);
        const json = await res.json();
        boNhoSlot[khoa] = { daDat: json.daDat || {} };
      } catch (e) {
        console.error('[Dany] Không tải được slot từ Google Sheet:', e);
        boNhoSlot[khoa] = { daDat: {}, loi: true };
      }
    }
    return boNhoSlot[khoa];
  }

  function daQuaGio(ngay, gio) {
    const bayGio = new Date();
    return ngay === HOM_NAY && gio * 60 <= bayGio.getHours() * 60 + bayGio.getMinutes();
  }
  function conLai(duLieu, ngay, gio) {
    if (daQuaGio(ngay, gio)) return 0;
    return Math.max(0, SO_KHACH_MOI_GIO - (duLieu.daDat[gio] || 0));
  }

  // --- Ô "Hôm nay còn bao nhiêu slot" (trang đặt lịch + thẻ ở trang chủ) ---
  const CHU_VI = 2 * Math.PI * 58;
  let soDangHien = 0;
  function demSo(el, tu, den) {
    if (giamChuyenDong || tu === den) { el.textContent = den; return; }
    const batDau = performance.now();
    (function buoc(t) {
      const p = Math.min((t - batDau) / 900, 1);
      el.textContent = Math.round(tu + (den - tu) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(buoc);
    })(batDau);
  }

  // Đếm slot còn trống của 1 ngày (bỏ các giờ đã qua nếu là hôm nay)
  function demSlot(duLieu, ngay) {
    let con = 0, tong = 0;
    CAC_GIO.forEach((g) => { if (!daQuaGio(ngay, g)) { tong += SO_KHACH_MOI_GIO; con += conLai(duLieu, ngay, g); } });
    return { con, tong };
  }

  // Ô vòng tròn ở trang đặt lịch: hiện số slot của NGÀY ĐANG CHỌN.
  // Thẻ lối tắt ở trang chủ luôn hiện số slot của HÔM NAY.
  let soLoiTat = 0;
  async function veHomNay() {
    const cn = tt.chiNhanh;
    const ngay = tt.ngay;
    const laHomNay = ngay === HOM_NAY;
    const tenCn = CHI_NHANH.find((c) => c.ma === cn).ten;
    $('#scSlotChu').textContent = `Tại ${tenCn}`;

    // Thẻ trang chủ: hôm nay
    const duLieuHomNay = await taiSlot(HOM_NAY, cn, true);
    if (!duLieuHomNay.loi) {
      const homNay = demSlot(duLieuHomNay, HOM_NAY).con;
      demSo($('#scSlot'), soLoiTat, homNay);
      soLoiTat = homNay;
    } else $('#scSlot').textContent = '--';

    // Ô vòng tròn: ngày đang chọn
    const duLieu = laHomNay ? duLieuHomNay : await taiSlot(ngay, cn, true);
    if (tt.ngay !== ngay) return;   // khách vừa bấm sang ngày khác trong lúc đang tải
    const d = thoiDiemHen(ngay, 12);
    $('#todayLabel').textContent = `${laHomNay ? 'Hôm nay' : THU[d.getDay()]} ${ngay.slice(0, 5)} · ${cn}`;
    if (duLieu.loi) {
      $('#gaugeNum').textContent = '--';
      $('#todayMsg').textContent = 'Chưa tải được số slot. Bạn vẫn gửi lịch được, tiệm sẽ gọi xác nhận.';
      return;
    }
    const { con, tong } = demSlot(duLieu, ngay);
    $('#gaugeBar').style.strokeDashoffset = CHU_VI * (1 - (tong ? con / tong : 0));
    demSo($('#gaugeNum'), soDangHien, con);
    soDangHien = con;
    const tenNgay = laHomNay ? 'Hôm nay' : 'Ngày này';
    $('#todayMsg').textContent = !tong ? 'Hôm nay đã hết giờ nhận khách, bạn chọn ngày khác ở bên cạnh nhé.'
      : con === 0 ? `${tenNgay} đã kín lịch, bạn chọn ngày khác nhé.`
      : con <= 5 ? `${tenNgay} chỉ còn ${con} slot, nên giữ chỗ sớm.`
      : `${tenNgay} còn ${con} slot, từ ${laHomNay ? 'bây giờ' : them0(GIO_MO_CUA) + ':00'} đến ${GIO_DONG_CUA}:00.`;
    $('#bars').innerHTML = CAC_GIO.map((g) => {
      const qua = daQuaGio(ngay, g);
      const c = conLai(duLieu, ngay, g);
      const lop = qua ? 'qua' : c === 0 ? 'kin' : '';
      const cao = qua || c === 0 ? 6 : Math.max(8, (c / SO_KHACH_MOI_GIO) * 100);
      return `<div class="${lop}" title="${them0(g)}:00, ${qua ? 'đã qua' : c ? `còn ${c} chỗ` : 'kín'}"><i style="height:${cao}%"></i><span>${g}</span></div>`;
    }).join('');
  }

  function veChiNhanh() {
    $('#branches').innerHTML = CHI_NHANH.map((c) =>
      `<button type="button" data-cn="${c.ma}" aria-pressed="${c.ma === tt.chiNhanh}">${c.ten}</button>`).join('');
  }

  function veNgay() {
    const ngan = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const chu = ngayChu(d);
      const nhan = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : ngan[d.getDay()];
      html += `<button type="button" class="pick" data-ngay="${chu}" aria-pressed="${chu === tt.ngay}"><small>${nhan}</small>${chu.slice(0, 5)}</button>`;
    }
    $('#dates').innerHTML = html;
  }

  let lanVeGio = 0; // tránh kết quả cũ ghi đè khi bấm đổi ngày liên tục
  // Hiện ngay số đã biết (nếu có), rồi luôn tải số mới nhất từ Google Sheet để thấy cả lịch khách khác vừa đặt
  async function veGio() {
    const lan = ++lanVeGio;
    const daBiet = boNhoSlot[`${tt.ngay}|${tt.chiNhanh}`];
    if (daBiet) veNutGio(daBiet); else $('#slotHint').textContent = 'Đang tải…';
    const duLieu = await taiSlot(tt.ngay, tt.chiNhanh, true);
    if (lan !== lanVeGio) return;
    veNutGio(duLieu);
  }
  function veNutGio(duLieu) {
    let soKhungCon = 0;
    $('#slots').innerHTML = CAC_GIO.map((g) => {
      const qua = daQuaGio(tt.ngay, g);
      const c = duLieu.loi && !qua ? 1 : conLai(duLieu, tt.ngay, g);
      if (c > 0) soKhungCon++;
      const chu = qua ? 'đã qua' : duLieu.loi ? 'chọn được' : c === 0 ? 'kín' : `còn ${c}`;
      return `<button type="button" class="pick${c === 1 && !duLieu.loi ? ' it' : ''}" data-gio="${g}" aria-pressed="${tt.gio === g && c > 0}" ${c === 0 ? 'disabled' : ''}>${them0(g)}:00<small>${chu}</small></button>`;
    }).join('');
    // Ca khách đang chọn vừa bị người khác đặt kín: bỏ chọn và báo cho khách
    if (tt.gio !== null && !$(`#slots [data-gio="${tt.gio}"]:not(:disabled)`)) {
      if (!daQuaGio(tt.ngay, tt.gio)) bao(`Ca ${them0(tt.gio)}:00 vừa có người đặt kín, bạn chọn giờ khác nhé.`);
      tt.gio = null;
    }
    $('#slotHint').textContent = soKhungCon ? `· ${soKhungCon} khung giờ còn chỗ` : '· Ngày này đã kín';
  }

  function veXemTruocMau() {
    const m = timMau($('#fMau').value);
    $('#mauPreview').innerHTML = m
      ? `<img src="${GOC}assets/mau/${m.ma}.jpg" alt=""><div><b>Mẫu ${m.ma}</b><p class="muted">${m.ten}</p></div>`
      : '<p class="muted">Chưa chọn mẫu. Chọn ở ô trên hoặc bấm "Đặt mẫu này" trong bộ sưu tập.</p>';
  }
  function doiKieuLam() {
    const kieu = $('input[name="kieuLam"]:checked').value;
    $('#panelMau').hidden = kieu !== 'mau';
    $('#panelPhoi').hidden = kieu !== 'phoi';
    $('#panelRieng').hidden = kieu !== 'rieng';
  }

  // Bấm "Đặt mẫu này" ở bất kỳ đâu: điền sẵn mẫu rồi sang trang đặt lịch
  function chonMau(ma) {
    const m = timMau(ma);
    if (!m) return;
    $('input[name="kieuLam"][value="mau"]').checked = true;
    doiKieuLam();
    $('#fMau').value = ma;
    veXemTruocMau();
    $('#done').hidden = true;
    $('#bookArea').hidden = false;
    location.hash = '#/dat-lich';
    bao(`Đã chọn mẫu ${m.ma} · ${m.ten}`);
  }

  chay('dat-lich', () => {
    if (CHE_DO_THU) $('#demoNote').hidden = false;
    $('#fMau').innerHTML = '<option value="">Chọn mẫu…</option>' +
      MAU_NAIL.map((m) => `<option value="${m.ma}">${m.ma} · ${m.ten}</option>`).join('');

    veChiNhanh();
    veNgay();
    veXemTruocMau();

    $('#branches').addEventListener('click', (e) => {
      const nut = e.target.closest('[data-cn]');
      if (!nut) return;
      tt.chiNhanh = nut.dataset.cn;
      tt.gio = null;
      veChiNhanh();
      veHomNay();
      veGio();
    });
    $('#dates').addEventListener('click', (e) => {
      const nut = e.target.closest('[data-ngay]');
      if (!nut) return;
      tt.ngay = nut.dataset.ngay;
      tt.gio = null;
      veNgay();
      veGio();
      veHomNay();
    });
    $('#slots').addEventListener('click', (e) => {
      const nut = e.target.closest('[data-gio]');
      if (!nut || nut.disabled) return;
      tt.gio = Number(nut.dataset.gio);
      $$('#slots .pick').forEach((p) => p.setAttribute('aria-pressed', p === nut));
    });
    $$('input[name="kieuLam"]').forEach((r) => r.addEventListener('change', doiKieuLam));
    $('#fMau').addEventListener('change', veXemTruocMau);

    const form = $('#bookForm');
    const loi = $('#formError');
    const nutGui = $('#submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      loi.textContent = '';
      const hoTen = $('#fTen').value.trim();
      const sdt = $('#fSdt').value.replace(/[\s.\-]/g, '');
      const kieu = $('input[name="kieuLam"]:checked').value;   // 'mau' | 'phoi' | 'rieng'
      const theoMau = kieu === 'mau';
      const mau = timMau($('#fMau').value);
      const moTa = $('#fYeuCau').value.trim();
      const link = $('#fLink').value.trim();

      if (tt.gio === null) { loi.textContent = 'Bạn chọn giờ hẹn còn chỗ trước nhé.'; return; }
      if (theoMau && !mau) { loi.textContent = 'Bạn chọn mẫu số mấy? Hoặc chọn "Tự phối" hay "Theo yêu cầu riêng".'; $('#fMau').focus(); return; }
      if (kieu === 'phoi' && !boNail.length) { loi.textContent = 'Bộ nail của bạn đang trống. Vào Bộ sưu tập, bấm vào ảnh mẫu rồi chọn "+ Thêm" nhé.'; return; }
      if (kieu === 'rieng' && link && !/^https?:\/\/\S+\.\S+/i.test(link)) { loi.textContent = 'Link ảnh cần bắt đầu bằng http:// hoặc https://'; $('#fLink').focus(); return; }
      if (kieu === 'rieng' && moTa.length < 5 && !link) { loi.textContent = 'Bạn mô tả mẫu muốn làm hoặc dán link ảnh giúp thợ nhé.'; $('#fYeuCau').focus(); return; }
      if (hoTen.length < 2) { loi.textContent = 'Bạn nhập họ tên giúp Dany nhé.'; $('#fTen').focus(); return; }
      if (!/^(0|\+84)\d{9}$/.test(sdt)) { loi.textContent = 'Số điện thoại cần 10 số, ví dụ 0901234567.'; $('#fSdt').focus(); return; }

      // Nội dung gửi tiệm theo từng kiểu làm
      let kieuLam, maMau = '', tenMau = '', yeuCau = '', noiDung;
      if (theoMau) {
        kieuLam = 'Theo mẫu'; maMau = mau.ma; tenMau = mau.ten; noiDung = `Mẫu ${mau.ma} · ${mau.ten}`;
      } else if (kieu === 'phoi') {
        kieuLam = 'Tự phối';
        maMau = [...new Set(boNail.map((x) => x.ma))].join(', ');
        tenMau = 'Bộ tự phối';
        yeuCau = tomTatGio();
        noiDung = `Tự phối: ${yeuCau}`;
      } else {
        kieuLam = 'Yêu cầu riêng';
        yeuCau = [moTa, link && `Link ảnh: ${link}`].filter(Boolean).join(' | ');
        noiDung = `Yêu cầu riêng: ${yeuCau}`;
      }

      const cn = CHI_NHANH.find((c) => c.ma === tt.chiNhanh);
      const goi = {
        hanhDong: 'dat',
        ngay: tt.ngay, gio: tt.gio, chiNhanh: cn.ma, chiNhanhTen: cn.ten,
        hoTen, sdt, kieuLam, maMau, tenMau, yeuCau,
        ghiChu: $('#fGhiChu').value.trim(),
      };

      nutGui.disabled = true;
      nutGui.textContent = 'Đang gửi…';
      let kq;
      if (CHE_DO_THU) {
        kq = { ok: true, maLich: 'THU-' + Math.floor(1000 + Math.random() * 9000) };
        const ds = docLichThu();
        ds.push({ maLich: kq.maLich, sdt, ngay: goi.ngay, gio: goi.gio, chiNhanh: goi.chiNhanh, trangThai: 'Chờ duyệt' });
        ghiLichThu(ds);
      } else {
        kq = await guiSheet(goi);
      }
      nutGui.disabled = false;
      nutGui.textContent = 'Gửi lịch hẹn';

      if (!kq.ok) {
        if (kq.loi === 'het-cho') {
          loi.textContent = 'Khung giờ này vừa có người đặt kín. Bạn chọn giờ khác nhé.';
          tt.gio = null;
          await taiSlot(tt.ngay, tt.chiNhanh, true);
          veGio();
          veHomNay();
        } else if (kq.loi === 'qua-gio') {
          loi.textContent = 'Giờ này vừa qua mất rồi, bạn chọn giờ khác nhé.';
          veGio();
        } else if (kq.loi === 'mang') {
          loi.textContent = `Chưa gửi được, bạn kiểm tra mạng rồi thử lại, hoặc gọi ${HOTLINE}.`;
        } else {
          loi.textContent = `Chưa gửi được: ${kq.loi || 'lỗi không rõ'}. Bạn gọi ${HOTLINE} giúp Dany nhé.`;
        }
        return;
      }

      // Lưu vào "Lịch của tôi" trên máy này để khách xem / huỷ sau
      luuLichCuaToi({
        maLich: kq.maLich, sdt, hoTen, ngay: goi.ngay, gio: goi.gio, chiNhanh: cn.ten,
        noiDung,
        trangThai: 'Chờ duyệt',
      });

      $('#doneCode').textContent = kq.maLich;
      // Trừ ngay 1 chỗ của ca vừa đặt trên màn hình (không chờ tải lại từ Google Sheet)
      const khoaSlot = `${goi.ngay}|${goi.chiNhanh}`;
      if (CHE_DO_THU) {
        boNhoSlot[khoaSlot] = { daDat: daDatGiaLap(goi.ngay, goi.chiNhanh) };
      } else if (boNhoSlot[khoaSlot]) {
        const daDat = boNhoSlot[khoaSlot].daDat;
        daDat[goi.gio] = (daDat[goi.gio] || 0) + 1;
      }
      const conCa = boNhoSlot[khoaSlot] ? conLai(boNhoSlot[khoaSlot], goi.ngay, goi.gio) : null;
      $('#doneText').textContent = `${hoTen}, ${them0(goi.gio)}:00 ngày ${goi.ngay} tại ${cn.ten}. ${noiDung}`
        + (conCa === null ? '' : ` · Ca ${them0(goi.gio)}:00 ngày ${goi.ngay.slice(0, 5)} giờ ${conCa ? `còn ${conCa} chỗ` : 'đã kín'}.`);
      if (kieu === 'phoi') { boNail = []; luuGio(); capNhatGio(); }   // đặt xong thì làm trống bộ nail
      $('#doneNote').textContent = (CHE_DO_THU ? 'Chế độ thử: lịch chỉ lưu trên trình duyệt này, chưa gửi tới tiệm. ' : 'Lịch đã vào sổ của tiệm. ')
        + `Bạn ghi lại mã lịch. Cần huỷ thì vào "Lịch của tôi" trước giờ hẹn ít nhất ${HUY_TRUOC_PHUT} phút.`;
      $('#bookArea').hidden = true;
      $('#done').hidden = false;
      scrollTo({ top: 0, behavior: giamChuyenDong ? 'auto' : 'smooth' });

      await taiSlot(goi.ngay, goi.chiNhanh, true);
      tt.gio = null;
      veHomNay();
      veGio();
    });

    $('#againBtn').addEventListener('click', () => {
      form.reset();
      doiKieuLam();
      veXemTruocMau();
      $('#done').hidden = true;
      $('#bookArea').hidden = false;
      scrollTo({ top: 0, behavior: giamChuyenDong ? 'auto' : 'smooth' });
    });
  });

  /* ================= 6. LỊCH CỦA TÔI: xem và huỷ ================= */
  const KHOA_LICH = 'dany-lich-cua-toi';
  function docLichCuaToi() {
    try { return JSON.parse(localStorage.getItem(KHOA_LICH)) || []; } catch (e) { return []; }
  }
  function ghiLichCuaToi(ds) {
    try { localStorage.setItem(KHOA_LICH, JSON.stringify(ds.slice(0, 20))); } catch (e) { /* trình duyệt chặn lưu */ }
  }
  function luuLichCuaToi(lich) {
    const ds = docLichCuaToi().filter((l) => l.maLich !== lich.maLich);
    ds.unshift(lich);
    ghiLichCuaToi(ds);
  }
  function capNhatLichCuaToi(maLich, thayDoi) {
    ghiLichCuaToi(docLichCuaToi().map((l) => (l.maLich === maLich ? { ...l, ...thayDoi } : l)));
  }

  // Tên trạng thái của bản cũ -> tên mới (Chờ duyệt -> Đã duyệt -> Hoàn thành)
  const TRANG_THAI_CU = { 'Mới': 'Chờ duyệt', 'Đã xác nhận': 'Đã duyệt', 'Xong': 'Hoàn thành' };
  const ttChuan = (v) => TRANG_THAI_CU[v] || v || 'Chờ duyệt';

  // Dữ liệu từ Google Sheet -> dạng lưu trên máy
  function tuSheet(lich, sdt) {
    return {
      maLich: lich.maLich, sdt, hoTen: lich.hoTen, ngay: lich.ngay, gio: parseInt(lich.gio, 10), chiNhanh: lich.chiNhanh,
      noiDung: lich.kieuLam === 'Theo mẫu' ? `Mẫu ${lich.maMau} · ${lich.tenMau}`
        : lich.kieuLam === 'Tự phối' ? `Tự phối: ${lich.yeuCau}` : `Yêu cầu riêng: ${lich.yeuCau}`,
      trangThai: ttChuan(lich.trangThai),
      daDanhGia: !!lich.daDanhGia,
      maLam: lich.maLam || '',
      conBaoHanh: lich.conBaoHanh !== false,
      conDanhGia: lich.conDanhGia !== false,
      mauThucTe: lich.mauThucTe || '', anhThanhQua: lich.anhThanhQua || '',
      daKhieuNai: !!lich.daKhieuNai,
    };
  }

  const LOP_TRANG_THAI = { 'Chờ duyệt': 'cho', 'Đã duyệt': 'duyet', 'Hoàn thành': 'xong', 'Đã huỷ': 'huy', 'Khách không đến': 'khong-den' };
  const LY_DO = ['Bận việc đột xuất', 'Muốn đổi sang giờ khác', 'Đặt nhầm', 'Lý do khác'];

  function theLich(l) {
    const trangThai = ttChuan(l.trangThai);
    const hen = thoiDiemHen(l.ngay, l.gio);
    const conPhut = (hen - Date.now()) / 60000;
    const conHieuLuc = trangThai === 'Chờ duyệt' || trangThai === 'Đã duyệt';
    // Mỗi lịch khiếu nại 1 lần, tiệm chỉ bảo hành 24 giờ sau khi làm xong: đã gửi hoặc quá hạn thì không còn nút báo vấn đề
    const nutBaoLoi = l.daKhieuNai ? '<span class="note">Đã gửi khiếu nại, tiệm sẽ liên hệ bạn</span>'
      : l.conBaoHanh === false ? '<span class="note">Đã hết 24 giờ bảo hành</span>'
        : `<button class="mini" type="button" data-phan-hoi="khieu-nai" data-ma="${an(l.maLich)}">Báo vấn đề (bảo hành 24h)</button>`;
    const nutHuy = `<button class="mini nut-huy" type="button" data-mo-huy="${an(l.maLich)}">Huỷ lịch này</button>`;

    // Thông tin theo trạng thái
    let thongTin = '';
    if (trangThai === 'Chờ duyệt') thongTin = '<p class="buoc buoc-cho">⏳ Đang chờ tiệm duyệt. Chỗ của bạn đã được giữ, tiệm duyệt xong bạn sẽ nhận mã làm ở đây.</p>';
    if (trangThai === 'Đã duyệt') thongTin = `<div class="buoc buoc-duyet"><span>Tiệm đã duyệt lịch ✓ Đưa mã này khi tới tiệm</span><b class="ma-lam">${an(l.maLam || '----')}</b></div>`;
    // Kết quả tiệm ghi sau khi làm xong: mẫu thực tế + ảnh thành quả
    if (trangThai === 'Hoàn thành' && (l.mauThucTe || l.anhThanhQua)) {
      const anh = String(l.anhThanhQua || '').split(/\s+/).filter((u) => /^https?:\/\//i.test(u))
        .map((u, i) => `<a href="${an(u)}" target="_blank" rel="noopener">Ảnh ${i + 1}</a>`).join(' · ');
      thongTin = `<p class="ket-qua-lam">Bộ nail đã làm: <b>${an(l.mauThucTe || 'Như mẫu đặt')}</b>${anh ? `<br>Ảnh thành quả: ${anh}` : ''}</p>`;
    }

    let hanhDong;
    // Chỉ đánh giá được lịch trong vòng 7 ngày
    const hetHanDanhGia = l.conDanhGia === false && !l.daDanhGia;
    if (trangThai === 'Hoàn thành') {
      hanhDong = l.daDanhGia || hetHanDanhGia
        ? `<p class="note">${l.daDanhGia ? 'Bạn đã đánh giá lịch này, cảm ơn bạn!' : 'Lịch đã quá 7 ngày nên không đánh giá được nữa.'}</p><div class="lich-phan-hoi">${nutBaoLoi}</div>`
        : `<p class="moi-danh-gia">Tiệm đã xác nhận hoàn thành. Bộ nail thế nào, đánh giá giúp Dany nhé!</p>
           <div class="lich-phan-hoi"><button class="btn btn-primary btn-sm" type="button" data-phan-hoi="danh-gia-lich" data-ma="${an(l.maLich)}">★ Đánh giá bộ nail này</button>${nutBaoLoi}</div>`;
    } else if (!conHieuLuc) hanhDong = '';
    else if (conPhut < 0) hanhDong = `<p class="note">Đã qua giờ hẹn. Khi tiệm xác nhận hoàn thành, bạn sẽ gửi được khiếu nại (bảo hành 24h) cho lịch này.</p>`;
    else if (conPhut < HUY_TRUOC_PHUT) hanhDong = `<p class="note">Sắp tới giờ hẹn nên không huỷ online được. Gọi <a href="tel:0767111047">${HOTLINE}</a> nhé.</p>`;
    else hanhDong = nutHuy;
    // Đánh giá không cần chờ hoàn thành: lịch nào chưa đánh giá cũng có nút nhỏ
    if (trangThai !== 'Hoàn thành' && !l.daDanhGia && !hetHanDanhGia) {
      hanhDong += `<div class="lich-phan-hoi"><button class="mini" type="button" data-phan-hoi="danh-gia-lich" data-ma="${an(l.maLich)}">☆ Đánh giá</button></div>`;
    }

    return `
      <article class="glass lich-card tt-${LOP_TRANG_THAI[trangThai] || 'cho'}" data-ma="${an(l.maLich)}">
        <div class="lich-top">
          <b class="lich-ma">${an(l.maLich)}</b>
          <span class="pill">${an(trangThai)}</span>
        </div>
        <p class="lich-gio">${them0(l.gio)}:00 · ${THU[hen.getDay()]} ${an(l.ngay)}</p>
        <p class="muted">${an(l.chiNhanh)}</p>
        <p class="muted">${an(l.noiDung)}</p>
        ${thongTin}
        <div class="lich-hanh-dong">${hanhDong}</div>
        <div class="huy-hop" hidden>
          <label>Lý do huỷ
            <select class="huy-ly-do">${LY_DO.map((x) => `<option>${x}</option>`).join('')}</select>
          </label>
          <div class="cta-row">
            <button class="btn btn-danger btn-sm" type="button" data-xac-nhan-huy="${an(l.maLich)}">Xác nhận huỷ</button>
            <button class="btn btn-ghost btn-sm" type="button" data-giu-lich>Giữ lịch</button>
          </div>
          <p class="error huy-loi" role="alert"></p>
        </div>
      </article>`;
  }

  function veDanhSachLich() {
    const ds = docLichCuaToi();
    $('#myList').innerHTML = ds.length
      ? ds.map(theLich).join('')
      : `<div class="glass empty-lich"><p>Máy này chưa có lịch nào.</p><a class="btn btn-primary btn-sm" href="#/dat-lich">Đặt lịch</a></div>`;
    $('#xoaLichCu').hidden = !ds.some(daKetThuc);
  }

  // Lịch đã xong / đã huỷ / khách không đến: cho xoá khỏi máy (lịch trên Google Sheet vẫn giữ nguyên)
  const daKetThuc = (l) => ['Hoàn thành', 'Đã huỷ', 'Khách không đến'].includes(ttChuan(l.trangThai));
  chay('xoa-lich-cu', () => {
    const nut = $('#xoaLichCu');
    const CHU = nut.textContent;
    nut.addEventListener('click', () => {
      if (nut.dataset.chac !== '1') {
        nut.dataset.chac = '1';
        nut.textContent = 'Bấm lần nữa để xoá';
        setTimeout(() => { nut.dataset.chac = ''; nut.textContent = CHU; }, 3000);
        return;
      }
      nut.dataset.chac = '';
      nut.textContent = CHU;
      ghiLichCuaToi(docLichCuaToi().filter((l) => !daKetThuc(l)));
      veDanhSachLich();
      nhacLich();
      bao('Đã xoá các lịch cũ khỏi máy này');
    });
  });

  // Hỏi lại trạng thái mới nhất từ sheet (tiệm có thể vừa đổi trạng thái trên Sheet)
  // chiDangCho: chỉ hỏi các lịch còn đang chờ duyệt / đã duyệt (dùng khi tự hỏi lại liên tục)
  const BAO_DOI_TRANG_THAI = {
    'Đã duyệt': (l) => `Tiệm đã duyệt lịch ${them0(l.gio)}:00 ngày ${l.ngay.slice(0, 5)} ✓ Mã làm ${l.maLam}`,
    'Hoàn thành': () => 'Tiệm đã xác nhận hoàn thành, bạn có thể đánh giá rồi ✓',
    'Đã huỷ': (l) => `Lịch ${l.maLich} đã bị huỷ. Gọi ${HOTLINE} nếu cần hỗ trợ.`,
  };
  async function lamMoiTrangThai(chiDangCho) {
    if (CHE_DO_THU) return;
    const ds = docLichCuaToi().filter((l) => !chiDangCho || ['Chờ duyệt', 'Đã duyệt'].includes(ttChuan(l.trangThai))).slice(0, 8);
    if (!ds.length) return;
    const kq = await Promise.all(ds.map((l) => guiSheet({ hanhDong: 'tra', maLich: l.maLich, sdt: l.sdt })));
    kq.forEach((k, i) => {
      if (!k.ok) return;
      const moi = { trangThai: ttChuan(k.lich.trangThai), daDanhGia: !!k.lich.daDanhGia, maLam: k.lich.maLam || '', conBaoHanh: k.lich.conBaoHanh !== false, daKhieuNai: !!k.lich.daKhieuNai, conDanhGia: k.lich.conDanhGia !== false,
        mauThucTe: k.lich.mauThucTe || '', anhThanhQua: k.lich.anhThanhQua || '' };
      const cu = ttChuan(ds[i].trangThai);
      capNhatLichCuaToi(ds[i].maLich, moi);
      if (moi.trangThai !== cu && BAO_DOI_TRANG_THAI[moi.trangThai]) bao(BAO_DOI_TRANG_THAI[moi.trangThai]({ ...ds[i], ...moi }));
    });
    if (docDiaChi().trang === 'lich-cua-toi') veDanhSachLich();
    nhacLich();
  }

  // Lời nhắc góc màn hình: (1) lịch vừa được duyệt -> báo mã làm; (2) lịch hoàn thành chưa đánh giá -> mời đánh giá
  function docDaNhac() {
    try { return JSON.parse(localStorage.getItem('dany-da-nhac')) || []; } catch (e) { return []; }
  }
  function nhacLich() {
    const daTat = docDaNhac();
    const ds = docLichCuaToi().map((l) => ({ ...l, trangThai: ttChuan(l.trangThai) }));
    const hop = $('#nhacDanhGia');
    const duyet = ds.find((x) => x.trangThai === 'Đã duyệt' && !daTat.includes(x.maLich + ':duyet') && thoiDiemHen(x.ngay, x.gio) > Date.now());
    const xong = ds.find((x) => x.trangThai === 'Hoàn thành' && !x.daDanhGia && x.conDanhGia !== false && !daTat.includes(x.maLich));
    if (duyet && docDiaChi().trang !== 'lich-cua-toi') {
      $('#nhacTieuDe').textContent = 'Lịch của bạn đã được duyệt ✓';
      $('#nhacChu').textContent = ` ${them0(duyet.gio)}:00 ngày ${duyet.ngay.slice(0, 5)} · Mã làm ${duyet.maLam || ''}`;
      $('#nhacNut').textContent = 'Xem lịch';
      hop.dataset.ma = duyet.maLich; hop.dataset.loai = 'duyet';
      hop.hidden = false;
    } else if (xong && docDiaChi().trang !== 'danh-gia') {
      $('#nhacTieuDe').textContent = 'Bộ nail của bạn đã hoàn thành ✓';
      $('#nhacChu').textContent = ` Lịch ${xong.maLich} ngày ${xong.ngay.slice(0, 5)}. Đánh giá giúp Dany nhé!`;
      $('#nhacNut').textContent = 'Đánh giá';
      hop.dataset.ma = xong.maLich; hop.dataset.loai = 'xong';
      hop.hidden = false;
    } else hop.hidden = true;
  }
  const nhacDanhGia = nhacLich;
  function tatNhac(khoa) {
    const daTat = docDaNhac();
    daTat.push(khoa);
    try { localStorage.setItem('dany-da-nhac', JSON.stringify(daTat.slice(-40))); } catch (e) { /* trình duyệt chặn lưu */ }
  }
  chay('nhac-lich', () => {
    const hop = $('#nhacDanhGia');
    $('#nhacNut').addEventListener('click', () => {
      hop.hidden = true;
      if (hop.dataset.loai === 'duyet') { tatNhac(hop.dataset.ma + ':duyet'); location.hash = '#/lich-cua-toi'; }
      else moDanhGiaTuLich(hop.dataset.ma, 'danh-gia-lich');
    });
    $('#nhacDong').addEventListener('click', () => {
      tatNhac(hop.dataset.loai === 'duyet' ? hop.dataset.ma + ':duyet' : hop.dataset.ma);
      hop.hidden = true;
      nhacLich();
    });
    // Còn lịch đang chờ duyệt / đã duyệt thì cứ 15 giây (và mỗi khi quay lại tab) hỏi lại trạng thái,
    // tiệm đổi trạng thái trên Sheet là web khách hiện ra ngay
    const conCho = () => docLichCuaToi().some((l) => ['Chờ duyệt', 'Đã duyệt'].includes(ttChuan(l.trangThai)));
    if (conCho()) setTimeout(lamMoiTrangThai, 1500); else nhacLich();
    const hoiLai = () => { if (!document.hidden && conCho()) lamMoiTrangThai(true); };
    setInterval(hoiLai, 15000);
    document.addEventListener('visibilitychange', hoiLai);
  });
  const LOI_HUY = {
    'khong-thay': 'Không tìm thấy lịch. Kiểm tra lại mã lịch và số điện thoại đã dùng khi đặt.',
    'qua-han': `Lịch này sắp tới giờ hoặc đã qua nên không huỷ online được. Gọi ${HOTLINE} nhé.`,
    'da-huy': 'Lịch này đã được huỷ trước đó.',
    'da-xong': 'Lịch này đã hoàn thành.',
    'mang': `Chưa kết nối được, bạn kiểm tra mạng rồi thử lại hoặc gọi ${HOTLINE}.`,
  };

  async function huyLich(maLich, lyDo, the) {
    const lich = docLichCuaToi().find((l) => l.maLich === maLich);
    if (!lich) return;
    const nut = $('[data-xac-nhan-huy]', the);
    const oLoi = $('.huy-loi', the);
    nut.disabled = true;
    nut.textContent = 'Đang huỷ…';

    let kq;
    if (CHE_DO_THU) {
      ghiLichThu(docLichThu().map((l) => (l.maLich === maLich ? { ...l, trangThai: 'Đã huỷ' } : l)));
      kq = { ok: true };
    } else {
      kq = await guiSheet({ hanhDong: 'huy', maLich, sdt: lich.sdt, lyDo: `Khách tự huỷ trên web: ${lyDo}` });
    }

    if (!kq.ok) {
      nut.disabled = false;
      nut.textContent = 'Xác nhận huỷ';
      oLoi.textContent = LOI_HUY[kq.loi] || `Chưa huỷ được: ${kq.loi}. Gọi ${HOTLINE} giúp Dany nhé.`;
      if (kq.loi === 'da-huy') { capNhatLichCuaToi(maLich, { trangThai: 'Đã huỷ' }); setTimeout(veDanhSachLich, 1500); }
      return;
    }
    capNhatLichCuaToi(maLich, { trangThai: 'Đã huỷ' });
    delete boNhoSlot[`${lich.ngay}|${lich.chiNhanh.slice(0, 3)}`]; // lần sau tải lại slot cho đúng
    veDanhSachLich();
    bao(`Đã huỷ lịch ${maLich}. Slot đã được trả lại.`);
    if (lyDo === 'Muốn đổi sang giờ khác') setTimeout(() => { location.hash = '#/dat-lich'; }, 1200);
  }

  chay('lich-cua-toi', () => {
    $('#huyChinhSach').textContent = `Bạn tự huỷ được trước giờ hẹn ít nhất ${HUY_TRUOC_PHUT} phút. Gấp hơn thì gọi ${HOTLINE}. Lịch huỷ xong, slot được trả lại cho khách khác.`;

    $('#myList').addEventListener('click', (e) => {
      const the = e.target.closest('.lich-card');
      if (!the) return;
      if (e.target.closest('[data-mo-huy]')) {
        $('.huy-hop', the).hidden = false;
        $('.lich-hanh-dong', the).hidden = true;
      }
      if (e.target.closest('[data-giu-lich]')) {
        $('.huy-hop', the).hidden = true;
        $('.lich-hanh-dong', the).hidden = false;
      }
      const xacNhan = e.target.closest('[data-xac-nhan-huy]');
      if (xacNhan) huyLich(xacNhan.dataset.xacNhanHuy, $('.huy-ly-do', the).value, the);
    });

    // Tra cứu lịch đặt từ máy khác
    $('#lookupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ma = $('#tMa').value.trim().toUpperCase();
      const sdt = $('#tSdt').value.replace(/[\s.\-]/g, '');
      const oLoi = $('#tLoi');
      oLoi.textContent = '';
      if (!/^[A-Z]+\d{4}-\d{4}$/.test(ma)) { oLoi.textContent = 'Mã lịch có dạng DN1810-1234.'; return; }
      if (!/^(0|\+84)\d{9}$/.test(sdt)) { oLoi.textContent = 'Số điện thoại cần 10 số, ví dụ 0901234567.'; return; }
      if (CHE_DO_THU) { oLoi.textContent = 'Chế độ thử chưa nối Google Sheet nên chưa tra cứu được.'; return; }

      const nut = $('#tNut');
      nut.disabled = true;
      nut.textContent = 'Đang tìm…';
      const kq = await guiSheet({ hanhDong: 'tra', maLich: ma, sdt });
      nut.disabled = false;
      nut.textContent = 'Tìm lịch';
      if (!kq.ok) { oLoi.textContent = LOI_HUY[kq.loi] || `Chưa tìm được: ${kq.loi}`; return; }
      luuLichCuaToi(tuSheet(kq.lich, sdt));
      veDanhSachLich();
      $('#lookupForm').reset();
      bao(`Đã tìm thấy lịch ${kq.lich.maLich}`);
      $('#myList').scrollIntoView({ behavior: giamChuyenDong ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ================= 6b. ĐÁNH GIÁ (ai cũng gửi được) VÀ KHIẾU NẠI (lịch đã "Hoàn thành", bảo hành 24h) ================= */
  const CHU_SAO = ['', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];

  function doiTabDanhGia(tab) {
    $$('[data-dg-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.dgTab === tab));
    $('#formDanhGia').hidden = tab !== 'danh-gia';
    $('#knKhu').hidden = tab !== 'khieu-nai';
    $('#dgDone').hidden = true;
  }

  // ----- Đánh giá: chọn lịch đã đặt (không bắt buộc) để tiệm biết trạng thái lịch của khách -----
  function veChonLichDanhGia(chon) {
    const ds = docLichCuaToi();
    $('#dgLich').innerHTML = '<option value="">Không chọn lịch (góp ý chung, 1 lần/ngày)</option>'
      + ds.filter((l) => l.conDanhGia !== false).map((l) => `<option value="${an(l.maLich)}">${an(l.maLich)} · ${them0(l.gio)}:00 ${an(l.ngay)} · ${an(ttChuan(l.trangThai))}${l.daDanhGia ? ' · đã đánh giá' : ''}</option>`).join('')
      + '<option value="khac">Lịch đặt ở máy khác (nhập mã lịch)</option>';
    $('#dgLich').value = chon && ds.some((l) => l.maLich === chon) ? chon : '';
    capNhatChonLich();
  }
  function capNhatChonLich() {
    const v = $('#dgLich').value;
    $('#dgLichKhac').hidden = v !== 'khac';
    $('#dgCnKhung').hidden = v !== '';   // có lịch thì chi nhánh lấy theo lịch
    const l = docLichCuaToi().find((x) => x.maLich === v);
    $('#dgLoi').textContent = l && l.daDanhGia ? 'Lịch này đã được đánh giá rồi, cảm ơn bạn! Muốn góp ý thêm thì chọn "Không chọn lịch".' : '';
  }

  // ----- Khiếu nại: lịch đang khiếu nại, đã kiểm tra trên sheet là "Hoàn thành" ({ maLich, sdt, ngay, chiNhanh, hoTen, conBaoHanh }) -----
  let dgLich = null;
  let giuGanLich = false;
  const lichXongTrenMay = () => docLichCuaToi().filter((l) => ttChuan(l.trangThai) === 'Hoàn thành');

  // Bước 1: chưa chọn lịch -> chỉ hiện ô chọn / nhập mã lịch, ẩn form khiếu nại
  function veCongKhieuNai() {
    dgLich = null;
    const ds = lichXongTrenMay();
    $('#dgChonLich').innerHTML = ds.map((l) =>
      `<option value="${an(l.maLich)}">${an(l.maLich)} · ${them0(l.gio)}:00 ${an(l.ngay)}</option>`).join('');
    $('#dgCoSan').hidden = !ds.length;
    $('#dgCongLoi').textContent = '';
    $('#dgCong').hidden = false;
    $('#dgKhu').hidden = true;
  }

  // Mở trang "Đánh giá & hỗ trợ" ở tab cần thiết, mọi thứ về trạng thái ban đầu
  function veTrangDanhGia(tab, maLich) {
    veChonLichDanhGia(maLich);
    veCongKhieuNai();
    doiTabDanhGia(tab || 'danh-gia');
  }

  const LOI_CONG = {
    'khong-thay': 'Không tìm thấy lịch. Kiểm tra lại mã lịch và số điện thoại đã dùng khi đặt.',
    'mang': 'Không kết nối được, bạn kiểm tra mạng rồi thử lại nhé.',
    'Chờ duyệt': 'Lịch này chưa được tiệm xác nhận hoàn thành. Làm xong và tiệm bấm "Hoàn thành" thì bạn mới gửi được khiếu nại.',
    'Đã duyệt': 'Lịch này chưa được tiệm xác nhận hoàn thành. Làm xong và tiệm bấm "Hoàn thành" thì bạn mới gửi được khiếu nại.',
    'Đã huỷ': 'Lịch này đã huỷ nên không gửi khiếu nại được.',
    'Khách không đến': 'Lịch này được ghi là khách không đến nên không gửi khiếu nại được.',
  };
  const LOI_KN = {
    'het-bao-hanh': `Lịch này đã quá 24 giờ bảo hành nên không gửi khiếu nại online được. Bạn vẫn có thể đánh giá, hoặc gọi ${HOTLINE} nếu cần hỗ trợ.`,
    'da-khieu-nai': `Lịch này đã gửi khiếu nại rồi (mỗi lịch 1 lần). Tiệm sẽ liên hệ bạn, cần gấp thì gọi ${HOTLINE} nhé.`,
  };

  // Hỏi sheet: lịch có đúng của khách và đã "Hoàn thành" chưa. Đúng thì mở form khiếu nại.
  async function kiemLichKhieuNai(maLich, sdt) {
    const oLoi = $('#dgCongLoi');
    oLoi.textContent = '';
    let lich;
    if (CHE_DO_THU) {
      lich = docLichCuaToi().find((l) => l.maLich === maLich && l.sdt === sdt);
      if (!lich) { oLoi.textContent = LOI_CONG['khong-thay']; return; }
      lich = { ...lich, trangThai: ttChuan(lich.trangThai) };
    } else {
      const nut = $('#dgKiem');
      nut.disabled = true; nut.textContent = 'Đang kiểm tra…';
      const kq = await guiSheet({ hanhDong: 'tra', maLich, sdt });
      nut.disabled = false; nut.textContent = 'Kiểm tra lịch';
      if (!kq.ok) { oLoi.textContent = LOI_CONG[kq.loi] || `Lỗi: ${kq.loi}`; return; }
      lich = { ...kq.lich, trangThai: ttChuan(kq.lich.trangThai) };
      if (docLichCuaToi().some((l) => l.maLich === lich.maLich)) {
        capNhatLichCuaToi(lich.maLich, { trangThai: lich.trangThai, daDanhGia: !!lich.daDanhGia, maLam: lich.maLam || '', conBaoHanh: lich.conBaoHanh !== false, daKhieuNai: !!lich.daKhieuNai, conDanhGia: lich.conDanhGia !== false, mauThucTe: lich.mauThucTe || '', anhThanhQua: lich.anhThanhQua || '' });
      }
    }
    if (lich.trangThai !== 'Hoàn thành') { oLoi.textContent = LOI_CONG[lich.trangThai] || LOI_CONG['Chờ duyệt']; return; }
    moFormKhieuNai({ maLich: lich.maLich, sdt, ngay: lich.ngay, chiNhanh: lich.chiNhanh, hoTen: lich.hoTen, conBaoHanh: lich.conBaoHanh !== false, daKhieuNai: !!lich.daKhieuNai });
  }

  // Bước 2: hiện form khiếu nại, điền sẵn thông tin của lịch
  function moFormKhieuNai(l) {
    dgLich = l;
    $('#dgGanLich').innerHTML = `Khiếu nại cho lịch <b>${an(l.maLich)}</b> ngày ${an(l.ngay)} · ${an(l.chiNhanh)} <button class="mini" type="button" id="dgDoiLich">Đổi lịch</button>`;
    $('#dgCong').hidden = true;
    $('#dgKhu').hidden = false;
    $('#knTen').value = l.hoTen || '';
    $('#knSdt').value = l.sdt || '';
    // Lịch đã khiếu nại hoặc quá 24 giờ bảo hành: khoá form khiếu nại
    const loiKN = l.daKhieuNai ? LOI_KN['da-khieu-nai'] : !l.conBaoHanh ? LOI_KN['het-bao-hanh'] : '';
    $('#knNut').disabled = !!loiKN;
    $('#knLoi').textContent = loiKN;
  }

  // Bấm "Đánh giá" / "Báo vấn đề" ở thẻ lịch trong "Lịch của tôi"
  function moDanhGiaTuLich(maLich, tab) {
    const l = docLichCuaToi().find((x) => x.maLich === maLich);
    giuGanLich = true;
    location.hash = '#/danh-gia';
    setTimeout(() => {
      giuGanLich = false;
      if (tab === 'khieu-nai') {
        veTrangDanhGia('khieu-nai');
        if (l) kiemLichKhieuNai(l.maLich, l.sdt);
      } else veTrangDanhGia('danh-gia', l && l.maLich);
    }, 60);
  }

  // Đánh giá mỗi ngày trên mỗi trình duyệt: 1 góp ý chưa có đơn + 2 đơn chưa hoàn thành.
  // Đơn đã hoàn thành: không giới hạn. Mỗi đơn chỉ đánh giá 1 lần (sheet kiểm tra). Khiếu nại không giới hạn lượt.
  // Chỉ đếm lần gửi thành công, gửi lỗi không bị trừ lượt.
  const GIOI_HAN_NGAY = { 'dg-khong-don': 1, 'dg-chua-xong': 2 };
  const khoaDem = (loai) => `dany-${loai}-${HOM_NAY}`;
  function soDaGui(loai) {
    try { return Number(localStorage.getItem(khoaDem(loai))) || 0; } catch (e) { return 0; }
  }
  const duocGuiThem = (loai) => soDaGui(loai) < GIOI_HAN_NGAY[loai];
  function ghiDaGui(loai) {
    try { localStorage.setItem(khoaDem(loai), soDaGui(loai) + 1); } catch (e) { /* trình duyệt chặn lưu */ }
  }

  function hienCamOn(tieuDe, chu, maKN) {
    $('#formDanhGia').hidden = true;
    $('#knKhu').hidden = true;
    $('#dgDoneTieuDe').textContent = tieuDe;
    $('#dgDoneChu').textContent = chu;
    $('#dgDoneMa').hidden = !maKN;
    $('#dgDoneMaSo').textContent = maKN || '';
    $('#dgDone').hidden = false;
    scrollTo({ top: 0, behavior: giamChuyenDong ? 'auto' : 'smooth' });
  }

  chay('danh-gia', () => {
    $('#dgChiNhanh').innerHTML = CHI_NHANH.map((c) => `<option value="${c.ma}">${c.ten}</option>`).join('');

    // Hàng sao chấm điểm
    $$('[data-sao]').forEach((khung) => {
      khung.innerHTML = [1, 2, 3, 4, 5].map((n) =>
        `<button type="button" role="radio" data-n="${n}" aria-checked="false" aria-label="${n} sao, ${CHU_SAO[n]}">★</button>`).join('');
      khung.addEventListener('click', (e) => {
        const nut = e.target.closest('[data-n]');
        if (!nut) return;
        const n = Number(nut.dataset.n);
        khung.dataset.giaTri = n;
        $$('button', khung).forEach((b) => {
          b.classList.toggle('sang', Number(b.dataset.n) <= n);
          b.setAttribute('aria-checked', Number(b.dataset.n) === n);
        });
        if (khung.dataset.sao === 'diem') $('#saoChu').textContent = CHU_SAO[n];
      });
    });
    const diemCua = (ten) => Number($(`[data-sao="${ten}"]`).dataset.giaTri || 0);

    $('#dgLich').addEventListener('change', capNhatChonLich);

    // ----- Khiếu nại bước 1: chọn lịch có sẵn trên máy hoặc nhập mã lịch -----
    $('#dgDungLich').addEventListener('click', () => {
      const l = lichXongTrenMay().find((x) => x.maLich === $('#dgChonLich').value);
      if (l) kiemLichKhieuNai(l.maLich, l.sdt);
    });
    $('#dgKiem').addEventListener('click', () => {
      const ma = $('#dgMa').value.trim().toUpperCase();
      const sdt = $('#dgSdt').value.replace(/[\s.\-]/g, '').replace(/^\+84/, '0');
      if (!ma) { $('#dgCongLoi').textContent = 'Bạn nhập mã lịch (in trên màn hình lúc đặt, dạng DN2610-1234) nhé.'; $('#dgMa').focus(); return; }
      if (!/^0\d{9}$/.test(sdt)) { $('#dgCongLoi').textContent = 'Số điện thoại cần 10 số, ví dụ 0901234567.'; $('#dgSdt').focus(); return; }
      kiemLichKhieuNai(ma, sdt);
    });
    $('#dgGanLich').addEventListener('click', (e) => { if (e.target.closest('#dgDoiLich')) veCongKhieuNai(); });

    $$('[data-dg-tab]').forEach((b) => b.addEventListener('click', () => doiTabDanhGia(b.dataset.dgTab)));
    $('#dgAnDanh').addEventListener('change', (e) => { $('#dgDanhTinh').hidden = e.target.checked; });

    // ----- Gửi đánh giá -----
    $('#formDanhGia').addEventListener('submit', async (e) => {
      e.preventDefault();
      const loi = $('#dgLoi');
      loi.textContent = '';
      const LOI_DG = {
        'mang': 'Chưa gửi được, bạn kiểm tra mạng rồi thử lại nhé.',
        'da-danh-gia': 'Lịch này đã được đánh giá rồi, cảm ơn bạn! Muốn góp ý thêm thì chọn "Không chọn lịch".',
        'khong-thay': 'Không tìm thấy lịch này. Kiểm tra mã lịch và số điện thoại, hoặc chọn "Không chọn lịch".',
        'qua-han-danh-gia': 'Lịch này đã quá 7 ngày nên không đánh giá được nữa. Bạn vẫn có thể gửi góp ý chung (chọn "Không chọn lịch").',
        'het-khong-don': 'Mỗi ngày bạn gửi được 1 góp ý chưa gắn đơn, hôm nay bạn đã gửi rồi. Bạn vẫn đánh giá được cho đơn đã đặt, hoặc quay lại vào ngày mai nhé.',
        'qua-gioi-han': 'Mỗi ngày bạn đánh giá được tối đa 2 đơn chưa hoàn thành, hôm nay bạn đã đủ. Đơn đã hoàn thành thì vẫn đánh giá được, cảm ơn bạn!',
      };
      // Lịch gắn kèm (không bắt buộc): lịch trên máy này, hoặc mã lịch + số điện thoại đặt ở máy khác
      const chon = $('#dgLich').value;
      let maLich = '', sdtLich = '';
      if (chon === 'khac') {
        maLich = $('#dgMaKhac').value.trim().toUpperCase();
        sdtLich = $('#dgSdtKhac').value.replace(/[\s.\-]/g, '').replace(/^\+84/, '0');
        if (!maLich) { loi.textContent = 'Bạn nhập mã lịch, hoặc chọn "Không chọn lịch" nhé.'; $('#dgMaKhac').focus(); return; }
        if (!/^0\d{9}$/.test(sdtLich)) { loi.textContent = 'Số điện thoại đã đặt cần 10 số, ví dụ 0901234567.'; $('#dgSdtKhac').focus(); return; }
      } else if (chon) {
        const l = docLichCuaToi().find((x) => x.maLich === chon);
        if (l && l.daDanhGia) { loi.textContent = 'Lịch này đã được đánh giá rồi, cảm ơn bạn! Muốn góp ý thêm thì chọn "Không chọn lịch".'; return; }
        if (l) { maLich = l.maLich; sdtLich = l.sdt; }
      }
      if (!diemCua('diem')) { loi.textContent = 'Bạn chấm số sao ở dòng "Bạn hài lòng với Dany thế nào?" giúp Dany nhé.'; return; }
      // Hết lượt đơn chưa hoàn thành: vẫn gửi được cho đơn đã hoàn thành, sheet kiểm tra trạng thái thật của đơn
      const hetLuotChuaXong = !duocGuiThem('dg-chua-xong');
      if (!maLich && !duocGuiThem('dg-khong-don')) { loi.textContent = LOI_DG['het-khong-don']; return; }
      const lDaBiet = docLichCuaToi().find((x) => x.maLich === maLich);
      if (maLich && hetLuotChuaXong && lDaBiet && ttChuan(lDaBiet.trangThai) !== 'Hoàn thành') { loi.textContent = LOI_DG['qua-gioi-han']; return; }
      const anDanh = $('#dgAnDanh').checked;
      const cn = CHI_NHANH.find((c) => c.ma === $('#dgChiNhanh').value) || CHI_NHANH[0];
      const goi = {
        hanhDong: 'danh-gia', maLich, sdt: sdtLich, chiNhanh: cn.ten, anDanh, hetLuotChuaXong,
        diem: diemCua('diem'), chatLuong: diemCua('chatLuong'), dichVu: diemCua('dichVu'), veSinh: diemCua('veSinh'),
        gopY: $('#dgGopY').value.trim(),
        ten: anDanh ? '' : $('#dgTen').value.trim(),
        lienHe: anDanh ? '' : $('#dgLienHe').value.trim(),
        web: $('#dgWeb').value,
      };
      const nut = $('#dgNut');
      nut.disabled = true; nut.textContent = 'Đang gửi…';
      const kq = CHE_DO_THU ? { ok: true } : await guiSheet(goi);
      nut.disabled = false; nut.textContent = 'Gửi đánh giá';
      if (!kq.ok) {
        loi.textContent = LOI_DG[kq.loi] || `Chưa gửi được: ${kq.loi}`;
        if (kq.loi === 'da-danh-gia' && maLich) capNhatLichCuaToi(maLich, { daDanhGia: true });
        return;
      }
      if (!maLich) ghiDaGui('dg-khong-don');
      else if (ttChuan(kq.trangThai) !== 'Hoàn thành') ghiDaGui('dg-chua-xong');
      if (maLich) { capNhatLichCuaToi(maLich, { daDanhGia: true }); nhacDanhGia(); }
      hienCamOn('Cảm ơn bạn đã đánh giá!',
        goi.diem >= 4 ? 'Dany rất vui vì bạn hài lòng. Hẹn gặp lại bạn ở bộ nail tiếp theo!'
          : 'Dany ghi nhận góp ý của bạn và sẽ cải thiện. Nếu bộ nail có vấn đề cần xử lý, bạn gửi ở mục "Khiếu nại / cần hỗ trợ" để tiệm liên hệ nhé.');
    });

    // ----- Gửi khiếu nại -----
    $('#formKhieuNai').addEventListener('submit', async (e) => {
      e.preventDefault();
      const loi = $('#knLoi');
      loi.textContent = '';
      if (!dgLich) { veCongKhieuNai(); return; }
      const hoTen = $('#knTen').value.trim();
      const sdt = $('#knSdt').value.replace(/[\s.\-]/g, '');
      const moTa = $('#knMoTa').value.trim();
      const link = $('#knLink').value.trim();
      if (hoTen.length < 2) { loi.textContent = 'Bạn nhập họ tên đã dùng khi đặt lịch nhé.'; $('#knTen').focus(); return; }
      if (!/^(0|\+84)\d{9}$/.test(sdt)) { loi.textContent = 'Số điện thoại cần 10 số, ví dụ 0901234567.'; $('#knSdt').focus(); return; }
      if (!$('#knLoai').value) { loi.textContent = 'Bạn chọn vấn đề gặp phải nhé.'; $('#knLoai').focus(); return; }
      if (moTa.length < 10) { loi.textContent = 'Bạn mô tả rõ hơn một chút để tiệm hiểu vấn đề nhé.'; $('#knMoTa').focus(); return; }
      if (link && !/^https?:\/\/\S+\.\S+/i.test(link)) { loi.textContent = 'Link ảnh cần bắt đầu bằng http:// hoặc https://'; $('#knLink').focus(); return; }
      if (dgLich.daKhieuNai) { loi.textContent = LOI_KN['da-khieu-nai']; return; }
      const goi = {
        hanhDong: 'khieu-nai', maLich: dgLich.maLich, sdtLich: dgLich.sdt, hoTen, sdt,
        loai: $('#knLoai').value, moTa, link, mongMuon: $('#knMongMuon').value, web: $('#knWeb').value,
      };
      const nut = $('#knNut');
      nut.disabled = true; nut.textContent = 'Đang gửi…';
      const kq = CHE_DO_THU ? { ok: true, maKN: 'KN-THU' } : await guiSheet(goi);
      nut.disabled = false; nut.textContent = 'Gửi khiếu nại';
      if (!kq.ok) {
        if (kq.loi === 'chua-xong') { loi.textContent = LOI_CONG['Chờ duyệt']; return; }
        if (kq.loi === 'da-khieu-nai') { dgLich.daKhieuNai = true; capNhatLichCuaToi(dgLich.maLich, { daKhieuNai: true }); }
        if (LOI_KN[kq.loi]) { loi.textContent = LOI_KN[kq.loi]; return; }
        loi.textContent = kq.loi === 'mang' ? `Chưa gửi được, bạn kiểm tra mạng hoặc gọi ${HOTLINE} nhé.` : `Chưa gửi được: ${kq.loi}. Bạn gọi ${HOTLINE} giúp Dany nhé.`;
        return;
      }
      dgLich.daKhieuNai = true;
      capNhatLichCuaToi(dgLich.maLich, { daKhieuNai: true });
      hienCamOn('Dany đã nhận khiếu nại của bạn',
        `Tiệm sẽ kiểm tra và liên hệ với ${hoTen} qua số ${sdt}. Bạn ghi lại mã khiếu nại để tiện trao đổi. Cần gấp thì gọi ${HOTLINE}.`, kq.maKN);
    });

    $('#dgLai').addEventListener('click', () => {
      $('#formDanhGia').reset(); $('#formKhieuNai').reset();
      $('#dgDanhTinh').hidden = true;
      $$('[data-sao]').forEach((k) => { delete k.dataset.giaTri; $$('button', k).forEach((b) => { b.classList.remove('sang'); b.setAttribute('aria-checked', 'false'); }); });
      $('#saoChu').textContent = 'Bấm vào sao để chấm điểm';
      veTrangDanhGia('danh-gia');
    });

    document.addEventListener('click', (e) => {
      const nut = e.target.closest('[data-phan-hoi]');
      if (nut) moDanhGiaTuLich(nut.dataset.ma, nut.dataset.phanHoi);
    });
  });

  /* ================= 7. CHUYỂN TRANG ================= */
  const TEN_TRANG = {
    'trang-chu': 'Dany Nailroom | Tiệm nails bà nội', 'thong-tin': 'Thông tin quán', 'bang-gia': 'Bảng giá',
    'bo-suu-tap': 'Bộ sưu tập', 'tim-mau': 'Tìm mẫu', 'dat-lich': 'Đặt lịch',
    'lich-cua-toi': 'Lịch của tôi', 'danh-gia': 'Đánh giá & hỗ trợ',
  };

  // Đọc địa chỉ: "#/bo-suu-tap/diu-dang" -> trang "bst", tham số "diu-dang"; "#/tim-mau?q=sao" -> từ khoá "sao"
  function docDiaChi() {
    const h = location.hash.replace(/^#\/?/, '');
    const [duong, chuoiQ] = h.split('?');
    const phan = duong.split('/').filter(Boolean);
    let trang = phan[0] || 'trang-chu';
    const thamSo = phan[1] || '';
    if (trang === 'bo-suu-tap' && thamSo) trang = 'bst';
    // "Thông tin" nằm trong trang chủ, "Menu mùa" nằm trong bảng giá: hiện trang đó rồi cuộn xuống mục
    const cuonToi = trang === 'thong-tin' ? '#thong-tin' : trang === 'menu-mua' ? '#menu-mua' : '';
    if (trang === 'menu-mua') trang = 'bang-gia';
    if (!$(`.page[data-page="${trang}"]`)) trang = 'trang-chu';
    const q = new URLSearchParams(chuoiQ || '').get('q') || '';
    return { trang, thamSo, q, cuonToi };
  }

  function chuyenTrang() {
    const { trang, thamSo, q, cuonToi } = docDiaChi();
    $$('.page').forEach((p) => {
      const dung = p.dataset.page === trang;
      p.hidden = !dung;
      p.classList.remove('vao');
      if (dung) { void p.offsetWidth; p.classList.add('vao'); } // chạy lại hiệu ứng vào trang
    });
    const nhom = cuonToi === '#thong-tin' ? 'thong-tin' : trang === 'bst' ? 'bo-suu-tap' : trang;
    $$('[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === nhom));
    scrollTo(0, 0);
    if (cuonToi) setTimeout(() => $(cuonToi).scrollIntoView({ behavior: giamChuyenDong ? 'auto' : 'smooth', block: 'start' }), 350);
    document.title = trang === 'trang-chu' ? TEN_TRANG[trang] : `${TEN_TRANG[trang] || ''} | Dany Nailroom`;

    chay(`trang-${trang}`, () => {
      if (trang === 'bst') veTrangBst(thamSo);
      if (trang === 'tim-mau') { $('#q').value = q; veTimKiem(q); }
      if (trang === 'dat-lich') { veHomNay(); veGio(); }
      if (trang === 'trang-chu') { veHomNay(); capNhatMoCua(); }
      if (trang === 'lich-cua-toi') { veDanhSachLich(); lamMoiTrangThai(); }
      if (trang === 'danh-gia' && !giuGanLich) veTrangDanhGia('danh-gia');   // vào từ menu: mở tab đánh giá
      nhacDanhGia();
    });
  }

  chay('chuyen-trang', () => {
    addEventListener('hashchange', chuyenTrang);
    chuyenTrang();
  });

  // Mỗi phút cập nhật lại slot hôm nay và trạng thái mở cửa
  // Cứ 30 giây (và mỗi khi khách quay lại tab web) tải lại số slot mới nhất
  function lamMoiSlot() {
    chay('cap-nhat-dinh-ky', () => {
      capNhatMoCua();
      const { trang } = docDiaChi();
      if (trang === 'dat-lich' || trang === 'trang-chu') { veHomNay(); if (trang === 'dat-lich') veGio(); }
    });
  }
  setInterval(() => { if (!document.hidden) lamMoiSlot(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lamMoiSlot(); });

  /* ================= 8. HIỆU ỨNG 3D NGHIÊNG THEO CHUỘT ================= */
  chay('nghieng-3d', () => {
    if (!coChuot || giamChuyenDong) return;
    const thoiNghieng = (el) => {
      el.classList.remove('dang-nghieng');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('[data-tilt]');
      $$('[data-tilt].dang-nghieng').forEach((o) => { if (o !== el) thoiNghieng(o); });
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const muc = el.classList.contains('mau') || el.classList.contains('poster') || el.classList.contains('bst-card') ? 9 : 5;
      el.style.setProperty('--ry', `${((px - 0.5) * 2 * muc).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * 2 * muc).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      el.classList.add('dang-nghieng');
    });

    const hero = $('.hero'), deck = $('#deck');
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      deck.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 30).toFixed(1)}deg`);
      deck.style.setProperty('--rx', `${((0.5 - (e.clientY - r.top) / r.height) * 22).toFixed(1)}deg`);
    });
    hero.addEventListener('pointerleave', () => { deck.style.removeProperty('--ry'); deck.style.removeProperty('--rx'); });
  });
})();
