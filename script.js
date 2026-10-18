// =====================================================================
// DANY NAILROOM: toàn bộ chức năng của trang
// Dữ liệu (mẫu nail, giá, link Google Sheet) nằm trong data.js
// Web có nhiều "trang" trong cùng 1 file: địa chỉ #/bo-suu-tap, #/dat-lich… quyết định trang nào hiện.
// Mỗi khối chạy trong chay(...) nên một khối lỗi không làm hỏng khối khác.
// =====================================================================
(() => {
  'use strict';

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

  chay('combo-mua', () => {
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
          <img src="assets/mau/${m.ma}.jpg" alt="Mẫu nail ${m.ma}: ${m.ten}" loading="lazy">
          <span class="tag-ma">${m.ma}</span>
        </button>
        <div class="mau-info">
          <h3>${m.ten}</h3>
          <p class="mau-tags">${m.tags.map((t) => '#' + t).join(' ')}</p>
          <button class="mini" type="button" data-dat="${m.ma}">Đặt mẫu này</button>
        </div>
      </article>`).join('');
  }

  // Trang danh sách bộ sưu tập: mỗi thẻ có 3 ảnh xếp quạt, rê chuột thì xoè ra
  chay('ds-bo-suu-tap', () => {
    $('#bstGrid').innerHTML = BO_SUU_TAP.map((b, i) => {
      const ds = mauTrongBst(b.id);
      return `
        <a class="bst-card glass" href="#/bo-suu-tap/${b.id}" data-tilt style="--i:${i}">
          <div class="bst-anh">${ds.slice(0, 3).map((m, j) => `<img src="assets/mau/${m.ma}.jpg" alt="" loading="lazy" style="--j:${j}">`).join('')}</div>
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
    $('#scAnh').innerHTML = ['30', '31', '19', '23'].map((ma, j) => `<img src="assets/mau/${ma}.jpg" alt="" style="--j:${j}">`).join('');
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

  /* ================= 4. XEM MẪU LỚN ================= */
  chay('xem-lon', () => {
    const hop = $('#lightbox');
    let maDangXem = null;
    function moHop(ma) {
      const m = timMau(ma);
      if (!m) return;
      maDangXem = ma;
      $('#lbImg').src = `assets/mau/${m.ma}.jpg`;
      $('#lbImg').alt = `Mẫu nail ${m.ma}: ${m.ten}`;
      $('#lbMa').textContent = m.ma;
      $('#lbBst').textContent = m.bst.map(tenBst).join(' · ');
      $('#lbTen').textContent = m.ten;
      $('#lbMoTa').textContent = m.moTa;
      $('#lbTags').innerHTML = m.tags.map((t) => `<span>#${t}</span>`).join('');
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

  // Bấm poster ở trang Bảng giá để xem lớn
  chay('xem-poster', () => {
    const hop = $('#posterBox');
    document.addEventListener('click', (e) => {
      const nut = e.target.closest('[data-poster]');
      if (!nut) return;
      $('#posterImg').src = nut.dataset.poster;
      $('#posterImg').alt = $('img', nut).alt;
      hop.showModal();
    });
    $('#posterClose').addEventListener('click', () => hop.close());
    hop.addEventListener('click', (e) => { if (e.target === hop || e.target.id === 'posterImg') hop.close(); });
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

  async function veHomNay() {
    const cn = tt.chiNhanh;
    const duLieu = await taiSlot(HOM_NAY, cn, true);
    let con = 0, tong = 0;
    CAC_GIO.forEach((g) => { if (!daQuaGio(HOM_NAY, g)) { tong += SO_KHACH_MOI_GIO; con += conLai(duLieu, HOM_NAY, g); } });

    const tenCn = CHI_NHANH.find((c) => c.ma === cn).ten;
    $('#todayLabel').textContent = `Hôm nay ${HOM_NAY.slice(0, 5)} · ${cn}`;
    $('#scSlotChu').textContent = `Tại ${tenCn}`;
    if (duLieu.loi) {
      $('#gaugeNum').textContent = '--';
      $('#scSlot').textContent = '--';
      $('#todayMsg').textContent = 'Chưa tải được số slot. Bạn vẫn gửi lịch được, tiệm sẽ gọi xác nhận.';
      return;
    }
    $('#gaugeBar').style.strokeDashoffset = CHU_VI * (1 - (tong ? con / tong : 0));
    demSo($('#gaugeNum'), soDangHien, con);
    demSo($('#scSlot'), soDangHien, con);
    soDangHien = con;
    $('#todayMsg').textContent = !tong ? 'Hôm nay đã hết giờ nhận khách, bạn chọn ngày mai nhé.'
      : con === 0 ? 'Hôm nay đã kín lịch, bạn chọn ngày khác nhé.'
      : con <= 5 ? `Chỉ còn ${con} slot, nên giữ chỗ sớm.`
      : `Còn ${con} slot từ bây giờ đến ${GIO_DONG_CUA}:00.`;
    $('#bars').innerHTML = CAC_GIO.map((g) => {
      const qua = daQuaGio(HOM_NAY, g);
      const c = conLai(duLieu, HOM_NAY, g);
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
  async function veGio() {
    const lan = ++lanVeGio;
    $('#slotHint').textContent = 'Đang tải…';
    const duLieu = await taiSlot(tt.ngay, tt.chiNhanh, false);
    if (lan !== lanVeGio) return;
    let soKhungCon = 0;
    $('#slots').innerHTML = CAC_GIO.map((g) => {
      const qua = daQuaGio(tt.ngay, g);
      const c = duLieu.loi && !qua ? 1 : conLai(duLieu, tt.ngay, g);
      if (c > 0) soKhungCon++;
      const chu = qua ? 'đã qua' : duLieu.loi ? 'chọn được' : c === 0 ? 'kín' : `còn ${c}`;
      return `<button type="button" class="pick${c === 1 && !duLieu.loi ? ' it' : ''}" data-gio="${g}" aria-pressed="${tt.gio === g && c > 0}" ${c === 0 ? 'disabled' : ''}>${them0(g)}:00<small>${chu}</small></button>`;
    }).join('');
    if (tt.gio !== null && !$(`#slots [data-gio="${tt.gio}"]:not(:disabled)`)) tt.gio = null;
    $('#slotHint').textContent = soKhungCon ? `· ${soKhungCon} khung giờ còn chỗ` : '· Ngày này đã kín';
  }

  function veXemTruocMau() {
    const m = timMau($('#fMau').value);
    $('#mauPreview').innerHTML = m
      ? `<img src="assets/mau/${m.ma}.jpg" alt=""><div><b>Mẫu ${m.ma}</b><p class="muted">${m.ten}</p></div>`
      : '<p class="muted">Chưa chọn mẫu. Chọn ở ô trên hoặc bấm "Đặt mẫu này" trong bộ sưu tập.</p>';
  }
  function doiKieuLam() {
    const theoMau = $('input[name="kieuLam"]:checked').value === 'mau';
    $('#panelMau').hidden = !theoMau;
    $('#panelRieng').hidden = theoMau;
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
    $('#fDichVu').innerHTML = '<option value="">Chưa chắc, tư vấn tại quán</option>' +
      `<optgroup label="${COMBO_MUA.ten}">${COMBO_MUA.mon.map((m) => `<option>${m.ten} (${m.gia})</option>`).join('')}</optgroup>` +
      BANG_GIA.map((n) => `<optgroup label="${n.nhom}">${n.dong.map(([t, g]) => `<option>${t} (${g})</option>`).join('')}</optgroup>`).join('');

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
      const theoMau = $('input[name="kieuLam"]:checked').value === 'mau';
      const mau = timMau($('#fMau').value);
      const yeuCau = $('#fYeuCau').value.trim();

      if (tt.gio === null) { loi.textContent = 'Bạn chọn giờ hẹn còn chỗ trước nhé.'; return; }
      if (theoMau && !mau) { loi.textContent = 'Bạn chọn mẫu số mấy? Hoặc chuyển sang "Theo yêu cầu riêng".'; $('#fMau').focus(); return; }
      if (!theoMau && yeuCau.length < 5) { loi.textContent = 'Bạn mô tả mẫu muốn làm giúp thợ nhé.'; $('#fYeuCau').focus(); return; }
      if (hoTen.length < 2) { loi.textContent = 'Bạn nhập họ tên giúp Dany nhé.'; $('#fTen').focus(); return; }
      if (!/^(0|\+84)\d{9}$/.test(sdt)) { loi.textContent = 'Số điện thoại cần 10 số, ví dụ 0901234567.'; $('#fSdt').focus(); return; }

      const cn = CHI_NHANH.find((c) => c.ma === tt.chiNhanh);
      const goi = {
        hanhDong: 'dat',
        ngay: tt.ngay, gio: tt.gio, chiNhanh: cn.ma, chiNhanhTen: cn.ten,
        hoTen, sdt,
        kieuLam: theoMau ? 'Theo mẫu' : 'Yêu cầu riêng',
        maMau: theoMau ? mau.ma : '', tenMau: theoMau ? mau.ten : '',
        yeuCau: theoMau ? '' : yeuCau,
        dichVu: $('#fDichVu').value, ghiChu: $('#fGhiChu').value.trim(),
      };

      nutGui.disabled = true;
      nutGui.textContent = 'Đang gửi…';
      let kq;
      if (CHE_DO_THU) {
        kq = { ok: true, maLich: 'THU-' + Math.floor(1000 + Math.random() * 9000) };
        const ds = docLichThu();
        ds.push({ maLich: kq.maLich, sdt, ngay: goi.ngay, gio: goi.gio, chiNhanh: goi.chiNhanh, trangThai: 'Mới' });
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
        maLich: kq.maLich, sdt, ngay: goi.ngay, gio: goi.gio, chiNhanh: cn.ten,
        noiDung: theoMau ? `Mẫu ${mau.ma} · ${mau.ten}` : `Yêu cầu riêng: ${yeuCau}`,
        trangThai: 'Mới',
      });

      $('#doneCode').textContent = kq.maLich;
      $('#doneText').textContent = `${hoTen}, ${them0(goi.gio)}:00 ngày ${goi.ngay} tại ${cn.ten}. `
        + (theoMau ? `Mẫu ${mau.ma} · ${mau.ten}.` : `Yêu cầu riêng: ${yeuCau}`);
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

  // Dữ liệu từ Google Sheet -> dạng lưu trên máy
  function tuSheet(lich, sdt) {
    return {
      maLich: lich.maLich, sdt, ngay: lich.ngay, gio: parseInt(lich.gio, 10), chiNhanh: lich.chiNhanh,
      noiDung: lich.kieuLam === 'Theo mẫu' ? `Mẫu ${lich.maMau} · ${lich.tenMau}` : `Yêu cầu riêng: ${lich.yeuCau}`,
      trangThai: lich.trangThai || 'Mới',
    };
  }

  const LOP_TRANG_THAI = { 'Mới': 'moi', 'Đã xác nhận': 'xac-nhan', 'Đã huỷ': 'huy', 'Xong': 'xong' };
  const LY_DO = ['Bận việc đột xuất', 'Muốn đổi sang giờ khác', 'Đặt nhầm', 'Lý do khác'];

  function theLich(l) {
    const hen = thoiDiemHen(l.ngay, l.gio);
    const conPhut = (hen - Date.now()) / 60000;
    const conHieuLuc = l.trangThai === 'Mới' || l.trangThai === 'Đã xác nhận';
    let hanhDong;
    if (!conHieuLuc) hanhDong = '';
    else if (conPhut < 0) hanhDong = '<p class="note">Đã qua giờ hẹn.</p>';
    else if (conPhut < HUY_TRUOC_PHUT) hanhDong = `<p class="note">Sắp tới giờ hẹn nên không huỷ online được. Gọi <a href="tel:0767111047">${HOTLINE}</a> nhé.</p>`;
    else hanhDong = `<button class="mini nut-huy" type="button" data-mo-huy="${an(l.maLich)}">Huỷ lịch này</button>`;

    return `
      <article class="glass lich-card tt-${LOP_TRANG_THAI[l.trangThai] || 'moi'}" data-ma="${an(l.maLich)}">
        <div class="lich-top">
          <b class="lich-ma">${an(l.maLich)}</b>
          <span class="pill">${an(l.trangThai)}</span>
        </div>
        <p class="lich-gio">${them0(l.gio)}:00 · ${THU[hen.getDay()]} ${an(l.ngay)}</p>
        <p class="muted">${an(l.chiNhanh)}</p>
        <p class="muted">${an(l.noiDung)}</p>
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
  }

  // Hỏi lại trạng thái mới nhất từ sheet (thợ có thể đã xác nhận / đánh dấu xong)
  async function lamMoiTrangThai() {
    if (CHE_DO_THU) return;
    const ds = docLichCuaToi().slice(0, 8);
    const kq = await Promise.all(ds.map((l) => guiSheet({ hanhDong: 'tra', maLich: l.maLich, sdt: l.sdt })));
    kq.forEach((k, i) => { if (k.ok) capNhatLichCuaToi(ds[i].maLich, { trangThai: k.lich.trangThai }); });
    veDanhSachLich();
  }

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

  /* ================= 7. CHUYỂN TRANG ================= */
  const TEN_TRANG = {
    'trang-chu': 'Dany Nailroom | Tiệm nails bà nội', 'thong-tin': 'Thông tin quán', 'bang-gia': 'Bảng giá',
    'menu-mua': 'Menu theo mùa', 'bo-suu-tap': 'Bộ sưu tập', 'tim-mau': 'Tìm mẫu', 'dat-lich': 'Đặt lịch',
    'lich-cua-toi': 'Lịch của tôi',
  };

  // Đọc địa chỉ: "#/bo-suu-tap/diu-dang" -> trang "bst", tham số "diu-dang"; "#/tim-mau?q=sao" -> từ khoá "sao"
  function docDiaChi() {
    const h = location.hash.replace(/^#\/?/, '');
    const [duong, chuoiQ] = h.split('?');
    const phan = duong.split('/').filter(Boolean);
    let trang = phan[0] || 'trang-chu';
    const thamSo = phan[1] || '';
    if (trang === 'bo-suu-tap' && thamSo) trang = 'bst';
    // "Thông tin" nằm trong trang chủ: hiện trang chủ rồi cuộn xuống mục đó
    const cuonToi = trang === 'thong-tin' ? '#thong-tin' : '';
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
    const nhom = cuonToi ? 'thong-tin' : trang === 'bst' ? 'bo-suu-tap' : trang;
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
    });
  }

  chay('chuyen-trang', () => {
    addEventListener('hashchange', chuyenTrang);
    chuyenTrang();
  });

  // Mỗi phút cập nhật lại slot hôm nay và trạng thái mở cửa
  setInterval(() => {
    chay('cap-nhat-dinh-ky', () => {
      capNhatMoCua();
      const { trang } = docDiaChi();
      if (trang === 'dat-lich' || trang === 'trang-chu') { veHomNay(); if (trang === 'dat-lich') veGio(); }
    });
  }, 60000);

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
