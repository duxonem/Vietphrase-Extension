# Vietphrase-Extension

## Phi lộ

Nếu dùng userscript ở folder gốc sẽ bị hạn chế trong việc quản lý các từ điển (Names, vietphrase...) do phải tải lên 1 host có kết nối internet từ những hạn chế của userscript không cho tải local file . Việc dùng từ điển remote có nguy cơ bảo mật nếu không phải file của chính bạn. Ngoài ra còn thêm hạn chế khi hiện tại pastebin không truy cập được từ VN.

Extension này hỗ trợ lưu file từ điển trong trình duyệt (indexedDB), tránh được những rắc rối như nêu ở trên. Ngoài ra còn hỗ trợ dịch cách cấu trúc tương tự như Luatnhan nhưng mở rộng thành dạng 
- {V0}abc{0}def{1}ghi{2} = tiếng{1}việt{V0}ở{0}đây{2}

Trong đó nếu cụm từ đầu hoặc cuối đứng ngoài cùng có thể ký hiệu là {N} (hoặc {Nsố} dùng cho Name), {V} (dùng cho Name+VP), và {số} (dùng cho cụm từ dài nhất có thể). Những cụm tìm  kiếm nhưng không nằm ngoài cùng thì {N}, {V} xử lý như {số}.

Có thể bôi đen 1 cụm từ, bấm chuột phải và chọn "Edit Name" hoặc "Edit Vietphrase". Điểu này rất thuận lợi vì giúp bạn vừa xem truyện ngay trên trang web gốc, vừa thêm/sửa dữ liệu của bạn. Nếu dùng Strucphrase thì sẽ không thể Edit Name/Vietphrase.

Chức năng export từ điển để lưu chỗ khác bị đang bị lỗi, khi chạy thử không lỗi, sau khi đăng ký với Firefox bị lỗi, sẽ sửa lại sau

## Cài đặt

[Vào phần extension của Firefox, search "vietphrase"](https://addons.mozilla.org/en-US/firefox/addon/vietphrase-extension)

Sau đó vào Option để cài đặt các thiết lập và tải các từ điển lên rồi bấm nút Lưu.

