// =====================================================================
// DỮ LIỆU CỦA TIỆM: muốn đổi giá, thêm mẫu, thêm bộ sưu tập thì sửa ở đây
// =====================================================================

// ---------- KẾT NỐI GOOGLE SHEET ----------
// Dán link Web App của Google Apps Script vào đây (xem hướng dẫn trong file apps-script.gs).
// Để trống '' thì web chạy CHẾ ĐỘ THỬ: slot là số giả lập, lịch chỉ lưu trên trình duyệt.
const LINK_GOOGLE_SHEET = 'https://script.google.com/macros/s/AKfycbzvCjqO6doND_k9Ridy2TQtZroFE6iJKm_9mY4WqgMbz7bdHXuWD4h9yKnMi72bJRyg/exec';
// Mỗi khung giờ nhận tối đa bao nhiêu khách (thường bằng số thợ)
const SO_KHACH_MOI_GIO = 3;
const GIO_MO_CUA = 9;    // 09:00
const GIO_DONG_CUA = 21; // 21:00, khung cuối nhận khách là 20:00
const HUY_TRUOC_PHUT = 60; // khách tự huỷ được trước giờ hẹn ít nhất bao nhiêu phút (giống apps-script.gs)

const CHI_NHANH = [
  { ma: 'CN1', ten: 'CN1 · Tân Định, Q1 (TP.HCM)', diaChi: '2A Thạch Thị Thanh, P. Tân Định, Quận 1' },
  { ma: 'CN2', ten: 'CN2 · Hoàn Kiếm (Hà Nội)', diaChi: 'B1A Ngõ 8 Lý Nam Đế, Hoàn Kiếm, Hà Nội' },
];

// ---------- BỘ SƯU TẬP ----------
const BO_SUU_TAP = [
  { id: 'thu-dong',  ten: 'Thu Đông',             moTa: 'Tông rượu vang, mâm xôi, xanh rêu cho những ngày se lạnh.' },
  { id: 'mua-he',    ten: 'Mùa hè',               moTa: 'Xanh biển, nắng vàng, chrome mát lạnh.' },
  { id: 'le-hoi',    ten: 'Lễ hội & tiệc cuối năm', moTa: 'Giáng Sinh, Tết và mùa tiệc: caro đỏ, bông tuyết, cherry, nơ, ánh ngọc và đính đá.' },
  { id: 'de-thuong', ten: 'Dễ thương',            moTa: 'Sao hồng, hươu con, hoa vẽ tay và họa tiết vui mắt.' },
  { id: 'ca-tinh',   ten: 'Cá tính',              moTa: 'Pantone đậm, chrome, khói đen và mix nhiều chất liệu.' },
  { id: 'diu-dang',  ten: 'Dịu dàng',             moTa: 'Ngọc trai, ombré nude, aura hồng và mắt mèo nhẹ.' },
];

// ---------- TƯ VẤN ----------
const LINK_INSTAGRAM = 'https://www.instagram.com/dany.nailroom/';

// ---------- THÀNH PHẦN ĐỂ KHÁCH TỰ PHỐI BỘ NAIL ----------
// Mỗi mẫu tự được tách thành: màu sơn + các thành phần lấy từ "tags" của mẫu theo bảng dưới.
// Muốn một mẫu có thành phần riêng, thêm vào dòng của mẫu đó, ví dụ:
//   thanhPhan: [{ loai: 'trang-tri', ten: 'Charm nơ bạc', gia: '30K/pcs' }]
const LOAI_THANH_PHAN = [
  { id: 'mau',       ten: 'Màu sơn' },
  { id: 'hieu-ung',  ten: 'Hiệu ứng' },
  { id: 'trang-tri', ten: 'Trang trí' },
  { id: 'form',      ten: 'Form móng' },
];
// Màu sơn: lấy các từ chỉ màu trong tags của mẫu
const TU_CHI_MAU = ['hồng', 'đỏ', 'nude', 'trắng', 'xanh ngọc', 'xanh rêu', 'xanh lá', 'xanh biển', 'xanh', 'mint', 'olive',
  'nâu', 'vàng', 'bạc', 'tím', 'mận', 'berry', 'đen', 'xám', 'pastel', 'hổ phách', 'rượu vang', 'nhiều màu'];
const GIA_SON = { gel: '100 – 120K', thach: '100 – 120K' };
// tag của mẫu -> thành phần (gia lấy theo bảng giá của tiệm)
const THANH_PHAN_THEO_TAG = {
  // Hiệu ứng
  'mắt mèo':     { loai: 'hieu-ung', ten: 'Mắt mèo', gia: '130 – 150K' },
  'chrome':      { loai: 'hieu-ung', ten: 'Tráng chrome', gia: '100K' },
  'tráng gương': { loai: 'hieu-ung', ten: 'Tráng gương', gia: '100K' },
  'bóng gương':  { loai: 'hieu-ung', ten: 'Tráng gương', gia: '100K' },
  'hologram':    { loai: 'hieu-ung', ten: 'Tráng gương hologram', gia: '100K' },
  'ngọc trai':   { loai: 'hieu-ung', ten: 'Ánh ngọc trai', gia: '100K' },
  'ánh ngọc':    { loai: 'hieu-ung', ten: 'Ánh ngọc trai', gia: '100K' },
  'ombré':       { loai: 'hieu-ung', ten: 'Ombré', gia: '100 – 150K' },
  'aura':        { loai: 'hieu-ung', ten: 'Loang aura', gia: '5 – 100K/pcs' },
  'loang':       { loai: 'hieu-ung', ten: 'Vẽ loang', gia: '5 – 100K/pcs' },
  'vẽ loang':    { loai: 'hieu-ung', ten: 'Vẽ loang', gia: '5 – 100K/pcs' },
  'nhũ':         { loai: 'hieu-ung', ten: 'Nhũ lấp lánh', gia: '5 – 100K/pcs' },
  'pha lê':      { loai: 'hieu-ung', ten: 'Nhũ pha lê', gia: '5 – 100K/pcs' },
  'ánh vàng':    { loai: 'hieu-ung', ten: 'Ánh vàng', gia: '5 – 100K/pcs' },
  'ánh nắng':    { loai: 'hieu-ung', ten: 'Ánh vàng', gia: '5 – 100K/pcs' },
  // Trang trí
  'charm':       { loai: 'trang-tri', ten: 'Charm', gia: '10 – 50K/pcs' },
  'nơ':          { loai: 'trang-tri', ten: 'Charm nơ', gia: '10 – 50K/pcs' },
  'đính đá':     { loai: 'trang-tri', ten: 'Đính đá', gia: '5 – 25K/pcs' },
  'xà cừ':       { loai: 'trang-tri', ten: 'Vụn xà cừ', gia: '5 – 25K/pcs' },
  'french':      { loai: 'trang-tri', ten: 'Đầu French', gia: '5 – 15K/pcs' },
  'vẽ tay':      { loai: 'trang-tri', ten: 'Vẽ tay', gia: '5 – 100K/pcs' },
  'gel nổi':     { loai: 'trang-tri', ten: 'Gel nổi 3D', gia: '5 – 100K/pcs' },
  '3D':          { loai: 'trang-tri', ten: 'Gel nổi 3D', gia: '5 – 100K/pcs' },
  'chấm bi':     { loai: 'trang-tri', ten: 'Vẽ chấm bi', gia: '5 – 100K/pcs' },
  'sao':         { loai: 'trang-tri', ten: 'Họa tiết sao', gia: '5 – 100K/pcs' },
  'hoa':         { loai: 'trang-tri', ten: 'Vẽ hoa', gia: '5 – 100K/pcs' },
  'hoa hồng':    { loai: 'trang-tri', ten: 'Vẽ hoa hồng', gia: '5 – 100K/pcs' },
  'hoa cúc':     { loai: 'trang-tri', ten: 'Vẽ hoa cúc', gia: '5 – 100K/pcs' },
  'cherry':      { loai: 'trang-tri', ten: 'Vẽ cherry', gia: '5 – 100K/pcs' },
  'bông tuyết':  { loai: 'trang-tri', ten: 'Vẽ bông tuyết', gia: '5 – 100K/pcs' },
  'caro':        { loai: 'trang-tri', ten: 'Vẽ caro', gia: '5 – 100K/pcs' },
  'ren':         { loai: 'trang-tri', ten: 'Vẽ ren', gia: '5 – 100K/pcs' },
  'Hello Kitty': { loai: 'trang-tri', ten: 'Vẽ Hello Kitty', gia: '5 – 100K/pcs' },
  // Form móng
  'hạnh nhân':   { loai: 'form', ten: 'Form hạnh nhân', gia: 'Theo móng thật' },
  'móng ngắn':   { loai: 'form', ten: 'Móng ngắn bo tròn', gia: 'Theo móng thật' },
  'móng dài':    { loai: 'form', ten: 'Móng dài (úp móng)', gia: '100 – 150K' },
  'móng nhọn':   { loai: 'form', ten: 'Form nhọn (úp móng)', gia: '100 – 150K' },
  'coffin':      { loai: 'form', ten: 'Form coffin (úp móng)', gia: '100 – 150K' },
};

// ---------- MẪU NAIL ----------
// Thêm mẫu mới: chép ảnh vào thư mục assets/mau/ (đặt tên theo mã, ví dụ 18.jpg)
// rồi thêm 1 dòng giống các dòng dưới. "bst" là id bộ sưu tập ở trên (được chọn nhiều).
const MAU_NAIL = [
  { ma: '01', ten: 'Sao hồng lấp lánh',   bst: ['diu-dang', 'de-thuong'], tags: ['jelly', 'ngọc trai', 'sao', 'hồng'],
    moTa: 'Nền jelly hồng trong, ánh ngọc trai và sao bạc rải đều. Moodboard kẹo ngôi sao và mặt nước hồng gợn sóng.' },
  { ma: '02', ten: 'Nàng tiên ngọc trai', bst: ['diu-dang', 'le-hoi'], tags: ['ngọc trai', 'trắng', 'xà cừ', 'móng nhọn'],
    moTa: 'Trắng ngọc trai bóng như vỏ sò, thêm một móng vụn xà cừ. Form nhọn dài.' },
  { ma: '03', ten: 'Bong bóng aura',      bst: ['diu-dang'], tags: ['aura', 'ngọc trai', 'jelly', 'hồng'],
    moTa: 'Móng trong, ánh ngọc trai lên ở giữa như bong bóng xà phòng ngả màu cầu vồng.' },
  { ma: '04', ten: 'Nắng trên biển',      bst: ['mua-he', 'diu-dang'], tags: ['ombré', 'nude', 'ánh vàng'],
    moTa: 'Ombré nude hồng, ánh vàng nhẹ ở đầu móng như mặt biển lúc chiều muộn.' },
  { ma: '05', ten: 'Hồng mắt mèo vàng',   bst: ['diu-dang'], tags: ['mắt mèo', 'hồng', 'hạnh nhân', 'bóng gương'],
    moTa: 'Gel hồng trong tôn da, ánh mắt mèo vàng sang chảnh, form hạnh nhân thon dài, bề mặt bóng gương.' },
  { ma: '06', ten: 'Kẹo hồng ánh ngọc',   bst: ['diu-dang', 'de-thuong'], tags: ['hồng', 'ngọc trai', 'tráng gương'],
    moTa: 'Hồng ngọc trai bóng mượt, ánh kim nhẹ chạy theo thân móng.' },
  { ma: '07', ten: 'Hoa ly nổi',          bst: ['de-thuong', 'diu-dang'], tags: ['gel nổi', 'hoa', 'vẽ tay', '3D'],
    moTa: 'Đắp gel nổi thành hoa ly hồng và lá xanh, các móng còn lại vẽ loang nhẹ.' },
  { ma: '08', ten: 'Bọt biển bạc hà',     bst: ['mua-he'], tags: ['chrome', 'mint', 'nhũ', 'xanh'],
    moTa: 'Chrome mint xen một móng nhũ bạc như cát ướt. Moodboard bọt sóng và mặt biển ngọc.' },
  { ma: '09', ten: 'Ren bạc hà',          bst: ['mua-he', 'diu-dang'], tags: ['chrome', 'mint', 'ngọc trai', 'xanh'],
    moTa: 'Ánh ngọc xanh bạc hà trên nền trong, moodboard ren xanh và nước lấp lánh.' },
  { ma: '10', ten: 'Ceramic',             bst: ['mua-he', 'ca-tinh'], tags: ['pantone', 'xanh ngọc', 'gel nổi', 'một màu'],
    moTa: 'Xanh ngọc đúng mã Pantone 16-5127 TCX Ceramic, sơn bóng một màu và thánh giá nổi cùng tông.' },
  { ma: '11', ten: 'Winetasting',         bst: ['thu-dong', 'le-hoi'], tags: ['pantone', 'ngọc trai', 'rượu vang', 'tím'],
    moTa: 'Lớp ngọc tím phủ lên nền rượu chín, lấy màu Pantone 19-2118 TCX Winetasting.' },
  { ma: '12', ten: 'Mâm xôi đêm',         bst: ['thu-dong', 'le-hoi'], tags: ['mắt mèo', 'berry', 'đỏ', 'tối màu'],
    moTa: 'Mắt mèo tông berry đậm, đậm ở giữa và nhạt dần ra mép. Moodboard mâm xôi chín.' },
  { ma: '13', ten: 'Nho hồng chrome',     bst: ['thu-dong', 'ca-tinh'], tags: ['chrome', 'tím', 'bóng gương', 'pantone'],
    moTa: 'Chrome hồng tím bóng gương, moodboard chùm nho và bảng màu mận chín.' },
  { ma: '14', ten: 'Olive obsession',     bst: ['thu-dong', 'ca-tinh'], tags: ['mắt mèo', 'olive', 'xanh rêu', 'tối màu'],
    moTa: 'Mắt mèo xanh olive, ánh sáng chạy dọc giữa móng như vỏ quả ô liu.' },
  { ma: '15', ten: 'Nhật thực chấm bi',   bst: ['ca-tinh', 'le-hoi'], tags: ['mix móng', 'chấm bi', 'chrome', 'móng ngắn'],
    moTa: 'Mỗi móng một chất liệu: mắt mèo bạc, khói đen, chrome, nhũ hồng và chấm bi.' },
  { ma: '16', ten: 'Hươu con và hoa hồng', bst: ['de-thuong'], tags: ['vẽ tay', 'hoa hồng', 'charm', 'đính đá'],
    moTa: 'Hươu đốm trắng, hoa hồng pastel và nơ vẽ tay, thêm đá ngọc trai nhỏ theo viền móng.' },
  { ma: '17', ten: 'Pop confetti',        bst: ['de-thuong', 'ca-tinh'], tags: ['french', 'đính đá', 'chấm bi', 'nhiều màu'],
    moTa: 'French nhiều màu, chấm bi, kẻ sọc, vằn zebra và đá màu kẹo. Mỗi móng một họa tiết.' },

  // ----- Lấy từ Instagram @dany.nailroom (10/2026) -----
  { ma: '18', ten: 'Candy Crush',          bst: ['diu-dang', 'de-thuong'], tags: ['jelly', 'hồng', 'xà cừ', 'hạnh nhân'],
    moTa: 'Thạch hồng ngọt như kẹo, ẩn vụn xà cừ ở 2 ngón. Moodboard kẹo hồng trong và pha lê.' },
  { ma: '19', ten: 'Kitty sao lấp lánh',   bst: ['de-thuong', 'mua-he'], tags: ['jelly', 'sao', 'nhũ', 'móng ngắn'],
    moTa: 'Nền jelly trong ánh xanh hồng, rắc sao vàng bạc và nhũ lấp lánh. Moodboard Hello Kitty đi biển.' },
  { ma: '20', ten: 'French cute đính đá',  bst: ['de-thuong', 'ca-tinh'], tags: ['french', 'đính đá', 'chấm bi', 'nhiều màu'],
    moTa: 'French nhưng cute hơn: mỗi đầu móng một màu, chấm bi, kẻ sọc, hoa và đá màu kẹo.' },
  { ma: '21', ten: 'Hồng đào ánh ngọc',    bst: ['diu-dang'], tags: ['ngọc trai', 'hồng', 'hạnh nhân', 'mắt mèo'],
    moTa: 'Hồng đào trong, ánh ngọc chạy dọc thân móng. Moodboard pha lê, bọt hồng và ly đá.' },
  { ma: '22', ten: 'Nâu mùa thu',          bst: ['thu-dong', 'de-thuong'], tags: ['mắt mèo', 'nâu', 'nơ', 'móng ngắn'],
    moTa: 'Mix mắt mèo nâu, nhũ và một móng vẽ nơ trắng. Tông màu ấm áp cho mùa thu.' },
  { ma: '23', ten: 'Plum & Ocean',         bst: ['ca-tinh', 'thu-dong'], tags: ['mắt mèo', 'mận', 'xanh biển', 'mix màu'],
    moTa: 'Một tay thạch mận chín, một tay mắt mèo xanh đại dương. Hai tay hai màu đối lập.' },
  { ma: '24', ten: 'Hồng viền tráng gương', bst: ['diu-dang'], tags: ['tráng gương', 'jelly', 'hồng', 'xanh lá'],
    moTa: 'Thạch hồng trong, điểm một chút tráng gương ánh xanh lá ở đầu móng.' },
  { ma: '25', ten: 'Ngẫu hứng ngày mưa',   bst: ['ca-tinh'], tags: ['vẽ tay', 'hoa cúc', 'đính đá', 'mix móng'],
    moTa: 'Mỗi móng một kiểu: hoa cúc, khung đỏ, chữ vẽ tay, đinh tán bạc. Phong cách ngầu, đường phố.' },
  { ma: '26', ten: 'Viền chrome trắng',    bst: ['diu-dang', 'le-hoi'], tags: ['chrome', 'french', 'hồng', 'hạnh nhân'],
    moTa: 'Nền hồng trong, viền chrome trắng bóng ôm sát đầu móng. Sang mà vẫn nhẹ nhàng.' },
  { ma: '27', ten: 'Lan hồng vẽ loang',    bst: ['diu-dang'], tags: ['vẽ loang', 'jelly', 'hồng', 'hoa'],
    moTa: 'Thạch hồng nhạt, vẽ loang trắng như cánh lan. Moodboard hoa lan và ren hồng.' },
  { ma: '28', ten: 'French đính đá màu',   bst: ['le-hoi', 'de-thuong'], tags: ['french', 'đính đá', 'trắng', 'móng nhọn'],
    moTa: 'French trắng đính đá nhiều màu như tường đá lấp lánh. Sáng bừng bàn tay.' },
  { ma: '29', ten: 'Champagne ngọc trai',  bst: ['le-hoi', 'diu-dang'], tags: ['ngọc trai', 'chrome', 'xà cừ', 'móng dài'],
    moTa: 'Một chút champagne, một chút ngọc trai, thêm vụn xà cừ. Form dài thanh lịch cho mùa tiệc.' },
  { ma: '30', ten: 'Hồng đào quốc dân',    bst: ['diu-dang'], tags: ['ombré', 'hồng', 'ánh ngọc', 'hạnh nhân'],
    moTa: 'Màu "quốc dân" được săn đón nhất: hồng đào ombré, ánh ngọc nhẹ ở đầu móng. Moodboard quả đào.' },
  { ma: '31', ten: 'Tiên cá xanh ngọc',    bst: ['mua-he'], tags: ['mắt mèo', 'xanh ngọc', 'aura', 'móng ngắn'],
    moTa: 'Mắt mèo xanh ngọc ánh aura như vảy tiên cá. Moodboard bọt nước và voan xanh.' },
  { ma: '32', ten: 'Lấp lánh mix 3 kiểu',  bst: ['le-hoi', 'diu-dang'], tags: ['mắt mèo', 'nhũ', 'tráng gương', 'móng dài'],
    moTa: 'Mix 3 kiểu design trên một bộ: mắt mèo, nhũ và tráng gương. Lấp lánh dưới mọi góc đèn.' },
  { ma: '33', ten: 'Vintage hổ phách',     bst: ['thu-dong', 'ca-tinh'], tags: ['loang', 'nâu', 'hổ phách', 'móng dài'],
    moTa: 'Loang nâu hổ phách với ánh bạc trên nền trong. Moodboard ly rượu và nắng dưới nước.' },
  { ma: '34', ten: 'Ombré bạc hà',         bst: ['mua-he', 'diu-dang'], tags: ['ombré', 'mint', 'ánh ngọc', 'móng dài'],
    moTa: 'Hồng trong chuyển ánh bạc hà ngọc trai ở đầu móng. Moodboard hồ nước và hoa cẩm tú cầu.' },
  { ma: '35', ten: 'Blue baby',            bst: ['mua-he'], tags: ['xanh', 'tráng gương', 'một màu', 'hạnh nhân'],
    moTa: 'Xanh Blue baby phủ tráng gương cao cấp, tôn da. Làm được cả tay lẫn chân.' },
  { ma: '36', ten: 'Sóng xanh tráng gương', bst: ['mua-he'], tags: ['xanh', 'tráng gương', 'nhũ', 'mix móng'],
    moTa: 'Xanh xám sóng biển, một móng tráng gương và một móng nhũ bạc như bọt sóng.' },
  { ma: '37', ten: 'Brown ngôi sao',       bst: ['thu-dong', 'ca-tinh'], tags: ['nâu', 'sao', 'nhũ', 'chấm bi'],
    moTa: 'Nude hồng, nhũ vàng, ngôi sao nâu vẽ tay và chấm bi. Moodboard ren chấm bi và lụa nâu.' },
  { ma: '38', ten: 'Mắt mèo cầu vồng',     bst: ['de-thuong', 'mua-he'], tags: ['mắt mèo', 'nhiều màu', 'nhũ', 'móng ngắn'],
    moTa: 'Mỗi móng một màu mắt mèo: vàng, xanh, hồng, kèm nhũ và đá nhỏ. Như kẹo cầu vồng.' },
  { ma: '39', ten: 'Hai tay hai mood',     bst: ['ca-tinh', 'thu-dong'], tags: ['mix màu', 'vẽ tay', 'aura', 'hoa'],
    moTa: 'Một tay trầm aura sung chín, một tay tươi ombré xanh vàng vẽ hoa ly.' },
  { ma: '40', ten: 'Brown & Yellow dots',  bst: ['de-thuong', 'mua-he'], tags: ['french', 'chấm bi', 'vàng', 'nâu'],
    moTa: 'French vàng bơ chấm bi nâu trên nền nude. Vui mắt, dễ thương, hợp đi chơi.' },
  { ma: '41', ten: 'Mắt mèo chấm bi',      bst: ['diu-dang', 'ca-tinh'], tags: ['mắt mèo', 'chấm bi', 'nhũ', 'nude'],
    moTa: 'Nude mắt mèo ánh bạc, điểm chấm bi xám và đầu móng nhũ. Moodboard ngọc trai và hoa văn cổ điển.' },

  // ----- Lấy thêm từ Instagram: mùa hè 2026 -----
  { ma: '42', ten: 'Mắt mèo hồng phấn',    bst: ['diu-dang'], tags: ['mắt mèo', 'hồng', 'hạnh nhân'],
    moTa: 'Mắt mèo hồng phấn trong veo, đơn giản mà "1 ngày 7 chị mê". Moodboard pha lê và kem hồng.' },
  { ma: '43', ten: 'Thạch hồng ánh bạc',   bst: ['diu-dang'], tags: ['jelly', 'hồng', 'ánh ngọc', 'móng dài'],
    moTa: 'Thạch hồng nude bóng, ánh bạc nhẹ dọc thân móng. Moodboard hologram và lụa trắng.' },
  { ma: '44', ten: 'French pastel kẹo ngọt', bst: ['de-thuong', 'mua-he'], tags: ['french', 'pastel', 'chấm bi', 'nhiều màu'],
    moTa: 'Mỗi đầu móng một màu pastel: hồng, xanh, vàng, thêm chấm bi và kẻ sọc như giấy kẹo.' },
  { ma: '45', ten: 'Nắng hè đính đá',      bst: ['mua-he', 'le-hoi'], tags: ['đính đá', 'nude', 'ánh nắng', 'móng dài'],
    moTa: 'Nude trong, đính đá pha lê bắt sáng như nắng trên mặt nước mùa hè.' },
  { ma: '46', ten: 'Xà cừ cầu vồng',       bst: ['diu-dang', 'le-hoi'], tags: ['xà cừ', 'aura', 'móng dài', 'ánh ngọc'],
    moTa: 'Vụn xà cừ ánh cầu vồng trên nền hồng trong, form dài thanh thoát.' },
  { ma: '47', ten: 'Mosi ngọc trai',       bst: ['le-hoi', 'diu-dang'], tags: ['ngọc trai', 'chrome', 'trắng', 'móng dài'],
    moTa: 'Trắng ngọc trai phủ chrome bóng, form nhọn dài. Hợp đi tiệc, chụp ảnh.' },
  { ma: '48', ten: 'Bay bổng xà cừ',       bst: ['diu-dang'], tags: ['mắt mèo', 'xà cừ', 'hồng', 'hạnh nhân'],
    moTa: 'Mắt mèo hồng xen móng vụn xà cừ, nhẹ nhàng "bay bổng". Moodboard kem hồng và đá trong.' },
  { ma: '49', ten: 'Chấm bi pastel',       bst: ['de-thuong'], tags: ['chấm bi', 'pastel', 'sao', 'móng dài'],
    moTa: 'Chấm bi hồng, vàng, xanh nhạt và sao nhỏ trên nền trong. Moodboard bánh ngọt và giấy chấm bi.' },
  { ma: '50', ten: 'Nude ánh vàng',        bst: ['thu-dong', 'diu-dang'], tags: ['nude', 'ánh vàng', 'hổ phách', 'móng dài'],
    moTa: 'Nude hồng, đầu móng ánh vàng hổ phách. "Chảnh" một cách tinh tế.' },
  { ma: '51', ten: 'Cún bông móng ngắn',   bst: ['de-thuong'], tags: ['vẽ tay', 'móng ngắn', 'sao', 'hoa'],
    moTa: 'Móng ngắn xinh xắn vẽ cún bông, hoa nhí và sao. Moodboard chó poodle trắng.' },
  { ma: '52', ten: 'Ren và hoa hồng',      bst: ['de-thuong', 'diu-dang'], tags: ['vẽ tay', 'hoa hồng', 'ren', 'móng ngắn'],
    moTa: 'Vẽ tay hoa hồng nhỏ và họa tiết ren trên nền nude. Moodboard váy ren hồng.' },
  { ma: '53', ten: 'Sao chrome nổi',       bst: ['ca-tinh', 'le-hoi'], tags: ['chrome', 'sao', 'gel nổi', 'bạc'],
    moTa: 'Ngôi sao chrome bạc đắp nổi trên nền trong. Moodboard pháo sáng và sao lấp lánh.' },
  { ma: '54', ten: 'French viền trắng mảnh', bst: ['diu-dang'], tags: ['french', 'trắng', 'tối giản', 'hạnh nhân'],
    moTa: 'French trắng viền mảnh và ánh chrome nhẹ. Tối giản, hợp đi làm.' },
  { ma: '55', ten: 'Đầu trắng đính sao',   bst: ['le-hoi', 'diu-dang'], tags: ['french', 'sao', 'charm', 'móng dài'],
    moTa: 'Nude dài, đầu móng trắng sữa, đính charm sao bạc nhỏ.' },
  { ma: '56', ten: 'Hồng loang mây',       bst: ['diu-dang'], tags: ['vẽ loang', 'hồng', 'sao', 'hạnh nhân'],
    moTa: 'Hồng loang trắng như mây chiều, điểm sao nhỏ. Moodboard bầu trời hồng và pháo hoa.' },
  { ma: '57', ten: 'Ombré xám vỏ sò',      bst: ['diu-dang', 'mua-he'], tags: ['ombré', 'xám', 'mắt mèo', 'hạnh nhân'],
    moTa: 'Hồng nude chuyển xám khói ở đầu móng. Moodboard vỏ sò và váy ren hồng.' },
  { ma: '58', ten: 'Băng biển',            bst: ['mua-he'], tags: ['xanh', 'ombré', 'xà cừ', 'mùa hè'],
    moTa: 'Đầu móng xanh băng biển loang trên nền hồng, thêm vụn xà cừ như bọt sóng.' },
  { ma: '59', ten: 'Hồng rượu chrome',     bst: ['diu-dang', 'le-hoi'], tags: ['chrome', 'hồng', 'best seller', 'hạnh nhân'],
    moTa: 'Một trong những mẫu best seller tháng 7: hồng rượu phủ chrome bóng. Moodboard ly rượu hồng.' },
  { ma: '60', ten: 'Miss teen',            bst: ['de-thuong', 'diu-dang'], tags: ['mắt mèo', 'nhũ', 'hồng', 'hạnh nhân'],
    moTa: 'Mắt mèo hồng xen nhũ lấp lánh, trẻ trung như "Miss teen 2026".' },
  { ma: '61', ten: 'Chấm bi đính đá',      bst: ['de-thuong'], tags: ['chấm bi', 'đính đá', 'hồng', 'hạnh nhân'],
    moTa: 'Hồng trong, một móng chấm bi đen và móng đính đá bạc. Moodboard tất lưới chấm bi.' },
  { ma: '62', ten: 'Silver blue',          bst: ['ca-tinh', 'mua-he'], tags: ['bạc', 'xanh', 'chrome', 'vẽ tay'],
    moTa: 'Nét chrome bạc xanh vẽ tự do trên nền nude. Lạnh lùng và cá tính.' },
  { ma: '63', ten: 'Nail chân ngọc trai',  bst: ['diu-dang'], tags: ['nail chân', 'ngọc trai', 'chrome', 'trắng'],
    moTa: 'Nail chân ngọc trai chrome, basic mà làm lại hoài vẫn đẹp.' },
  { ma: '64', ten: 'Tráng gương hologram', bst: ['le-hoi', 'ca-tinh'], tags: ['tráng gương', 'hologram', 'hồng', 'móng dài'],
    moTa: 'Đổi tí ánh tráng gương là ra vibe mới: hồng trong ánh hologram cầu vồng.' },
  { ma: '65', ten: 'Hoa nhí móng ngắn',    bst: ['de-thuong', 'mua-he'], tags: ['hoa', 'vẽ tay', 'móng ngắn', 'hồng'],
    moTa: 'Hoa nhí vẽ tay trên nền hồng đào, móng ngắn gọn gàng.' },
  { ma: '66', ten: 'Mắt mèo nhũ pha lê',   bst: ['le-hoi', 'diu-dang'], tags: ['mắt mèo', 'nhũ', 'pha lê', 'hạnh nhân'],
    moTa: 'Mắt mèo xen nhũ pha lê lên sóng nhiều nhất. Lấp lánh dưới mọi ánh đèn.' },
  { ma: '67', ten: 'Blue ocean',           bst: ['mua-he'], tags: ['xanh', 'jelly', 'xà cừ', 'móng ngắn'],
    moTa: 'Thạch xanh đại dương trong veo, đính vụn xà cừ. Moodboard bong bóng nước.' },
  { ma: '68', ten: 'Butter sea',           bst: ['mua-he', 'de-thuong'], tags: ['ombré', 'french', 'vàng', 'xanh'],
    moTa: 'Ombré xanh biển và vàng bơ ở đầu móng. Moodboard kem bơ, phao bơi và bikini vàng.' },
  { ma: '69', ten: 'Nhũ pha lê lấp lánh',  bst: ['diu-dang', 'le-hoi'], tags: ['nhũ', 'pha lê', 'nude', 'best seller'],
    moTa: 'Nhũ pha lê best seller: nude hồng rắc nhũ mịn, ra nắng là lấp lánh.' },
  { ma: '70', ten: 'Chrome bạc tinh tế',   bst: ['ca-tinh'], tags: ['chrome', 'bạc', 'đính đá', 'móng dài'],
    moTa: 'Nude dài phủ chrome bạc, điểm đá nhỏ. Moodboard khói xanh và môi ánh ngọc.' },

  // ----- Giáng Sinh 2025 và Tết 2026 -----
  { ma: '71', ten: 'Chấm bi charm vàng',   bst: ['le-hoi'], tags: ['chấm bi', 'charm', 'móng dài', 'coffin'],
    moTa: 'Combo lấp lánh: nude dài form coffin, chấm bi và charm vàng.' },
  { ma: '72', ten: 'Noel hổ phách',        bst: ['le-hoi', 'thu-dong'], tags: ['loang', 'hổ phách', 'đỏ', 'Giáng Sinh'],
    moTa: '"Ai bảo noel là phải đỏ": loang hổ phách và nâu đỏ, điểm bi đỏ như quả cherry.' },
  { ma: '73', ten: 'Dear Santa',           bst: ['le-hoi'], tags: ['caro', 'đỏ', 'Giáng Sinh', 'móng ngắn'],
    moTa: 'Caro đỏ Giáng Sinh, chấm bi đỏ và đá nhỏ trên nền nude. Gửi ông già Noel.' },
  { ma: '74', ten: 'Tuyết lạnh đính đá',   bst: ['le-hoi', 'diu-dang'], tags: ['đính đá', 'nude', 'mùa đông', 'móng dài'],
    moTa: 'Nude trong form dài, đính đá hồng và bông tuyết bạc. Mùa lạnh mà vẫn xinh.' },
  { ma: '75', ten: 'Bông tuyết',           bst: ['le-hoi', 'thu-dong'], tags: ['bông tuyết', 'nhũ', 'trắng', 'Giáng Sinh'],
    moTa: 'Trắng sữa phủ nhũ, vẽ bông tuyết. Mùa đông đang đến.' },
  { ma: '76', ten: 'Cherry chấm bi',       bst: ['le-hoi', 'de-thuong'], tags: ['cherry', 'chấm bi', 'french', 'đỏ'],
    moTa: 'Hồng bao giờ out trend: French chấm bi điểm quả cherry đỏ vẽ tay.' },
  { ma: '77', ten: 'Noel đỏ Jennie',       bst: ['le-hoi', 'ca-tinh'], tags: ['đỏ', 'chấm bi', 'đính đá', 'Giáng Sinh'],
    moTa: 'Noel lấy cảm hứng Jennie: đỏ chấm bi, móng nhũ bạc và đá pha lê.' },
  { ma: '78', ten: 'Nail chân hồng',       bst: ['de-thuong'], tags: ['nail chân', 'hồng', 'thạch', 'đơn giản'],
    moTa: 'Nail chân hồng thạch cưng xỉu, đi sandal nào cũng hợp.' },
  { ma: '79', ten: 'Cherry chế ri',        bst: ['le-hoi', 'ca-tinh'], tags: ['cherry', 'french', 'đỏ', 'coffin'],
    moTa: 'French đỏ viền mảnh và quả cherry nổi trên form coffin dài. Rực rỡ mùa lễ.' },
  { ma: '80', ten: 'Nơ trắng 3D',          bst: ['le-hoi'], tags: ['nơ', 'gel nổi', 'đính đá', 'coffin'],
    moTa: 'Nơ trắng đắp nổi 3D, đính đá bạc trên nền trong dài. Như váy cưới mùa đông.' },
  { ma: '81', ten: 'Tết lấp lánh',         bst: ['le-hoi'], tags: ['xà cừ', 'đính đá', 'Tết', 'móng dài'],
    moTa: 'Biết Tết làm gì chưa: xà cừ ánh ngọc, đá lớn và chrome trên form dài.' },
  { ma: '82', ten: 'Đỏ mệnh hoả',          bst: ['le-hoi', 'thu-dong'], tags: ['đỏ', 'mắt mèo', 'Tết', 'móng ngắn'],
    moTa: 'Đỏ thạch mắt mèo đón năm 2026, hợp người mệnh Hoả. Móng ngắn bo tròn.' },
  { ma: '83', ten: 'Less color, more attitude', bst: ['ca-tinh'], tags: ['đen', 'bạc', 'chrome', 'móng nhọn'],
    moTa: 'Ít màu nhưng nhiều thái độ: đen, bạc chrome, vẽ nét trên form nhọn dài.' },
  { ma: '84', ten: 'Nailbox Tết',          bst: ['le-hoi', 'de-thuong'], tags: ['nailbox', 'Hello Kitty', 'nơ', 'Tết'],
    moTa: 'Nailbox Tết làm sẵn: Kitty nâu, đá bạc, nơ đỏ, tim đỏ và ngọc trai trắng. Chọn bộ yêu thích.' },
  { ma: '85', ten: 'Vàng hổ phách Tết',    bst: ['le-hoi'], tags: ['vàng', 'hổ phách', 'chrome', 'Tết'],
    moTa: 'Vàng nâu hổ phách phủ chrome, đầu móng nhọn. Quá yêu cho mùa Tết 2026.' },
  { ma: '86', ten: 'Chấm bi nhũ',          bst: ['de-thuong', 'le-hoi'], tags: ['chấm bi', 'nhũ', 'móng ngắn', 'nude'],
    moTa: 'Nude móng ngắn, chấm bi đen và nhũ bạc. Đơn giản mà vẫn đủ không khí ngày Tết.' },
];

// ---------- COMBO THEO MÙA ----------
const COMBO_MUA = {
  ten: 'Christmas combo',
  apDung: 'Áp dụng 09:00 – 15:00, thứ 2 đến thứ 5',
  mon: [
    { ten: 'Sạch da + sơn gel', gia: '99K' },
    { ten: 'Sạch da + mắt mèo', gia: '159K' },
    { ten: 'Úp móng + sơn gel', gia: '179K' },
  ],
};

// ---------- BẢNG GIÁ ----------
const BANG_GIA = [
  { nhom: 'Manicure', dong: [
    ['Phá gel / Tháo móng', '30 – 50K'], ['Cắt da tay / chân', '40 – 50K'], ['Cứng móng', '60K'],
    ['Úp móng keo / gel', '100 – 150K'], ['Nối móng đắp gel', '270K'], ['Fill gel', '80 – 150K'],
    ['Phủ gel móng thật', '150K'], ['BIAB', '150 – 200K'], ['Dual Form', '260 – 300K'],
  ] },
  { nhom: 'Gel polish', dong: [
    ['Sơn gel / Thạch', '100 – 120K'], ['Mắt mèo', '130 – 150K'], ['Ombré', '100 – 150K'],
    ['Tráng gương', '100K'], ['Vẽ / Loang / Gel nổi', '5 – 100K/pcs'], ['French', '5 – 15K/pcs'],
    ['Sticker', '5 – 15K/pcs'], ['Charm', '10 – 50K/pcs'], ['Đính đá', '5 – 25K/pcs'],
  ] },
];
