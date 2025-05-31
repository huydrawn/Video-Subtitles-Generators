// File: ./Components/Auth/OAuth2RedirectPage.tsx

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Chỉ cần useLocation
import Swal from 'sweetalert2'; // Cần Swal
import { Spin } from 'antd'; // Cần Spin

const OAuth2RedirectPage: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token'); // Lấy token từ URL param
        const error = params.get('error'); // Lấy lỗi từ URL param

        console.log("OAuth2 Redirect Popup - URL Params:", params.toString());
        console.log("OAuth2 Redirect Popup - Token:", token);
        console.log("OAuth2 Redirect Popup - Error:", error);

        // Kiểm tra xem cửa sổ này có phải được mở từ một cửa sổ khác không
        // và có cửa sổ cha để điều hướng hay không
        const isPopupContext = window.opener && window.opener !== window;


        if (isPopupContext) {
            if (token) {
                // <-- Nếu có token từ URL param (đăng nhập mới thành công) -->
                // LƯU token vào localStorage ở đây trong popup
                localStorage.setItem('accessToken', token);
                console.log("OAuth2 Redirect Popup - Token received from URL and stored:", token);

                // <-- Hiển thị SweetAlert thành công ở đây trong popup -->
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    text: 'You have been logged in.',
                    timer: 2000, // Tự đóng sau 2 giây
                    timerProgressBar: true,
                    showConfirmButton: false
                }).then(() => { // <-- Bắt đầu khối .then() của SweetAlert
                    // <-- Sau khi Swal đóng, điều hướng cửa sổ chính -->
                    // Sử dụng window.opener.location.href để điều hướng cửa sổ đã mở popup
                    try {
                        // Kiểm tra lại window.opener trước khi truy cập location.href
                        if (window.opener) {
                            // NOTE: Bạn đang điều hướng về '/login', thường sẽ là '/' (index) sau login thành công.
                            // Tôi giữ '/login' theo code bạn cung cấp, nhưng hãy xem xét chuyển về '/'
                            window.close();
                            console.log("OAuth2 Redirect Popup - Redirecting main window to /");
                        } else {
                            console.error("OAuth2 Redirect Popup - window.opener is null in Swal then block.");
                        }
                    } catch (e) {
                        console.error("OAuth2 Redirect Popup - Error redirecting main window:", e);
                        // Fallback: Nếu không điều hướng được cửa sổ chính, ít nhất đóng popup
                    } finally {
                        // <-- Luôn Đóng cửa sổ popup sau khi SweetAlert và điều hướng cửa sổ chính (cố gắng) -->
                        window.close();
                    }
                }); // <-- Kết thúc khối .then() của SweetAlert và lệnh Swal.fire()

            } else if (error) {
                // <-- Nếu có lỗi từ URL param -->
                console.error("OAuth2 Redirect Popup - Received error param:", error);
                // Hiển thị SweetAlert lỗi ở đây trong popup
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed!',
                    text: `Authentication failed: ${error}`, // Hiển thị thông báo lỗi từ backend/popup
                    confirmButtonText: 'OK'
                }).then(() => { // <-- Bắt đầu khối .then() của SweetAlert
                    // <-- Đóng cửa sổ popup sau khi người dùng click OK -->
                    window.close();
                }); // <-- Kết thúc khối .then() của SweetAlert và lệnh Swal.fire()

            } else {
                // <-- Trường hợp không có cả token và error param -->
                console.error("OAuth2 Redirect Popup - No token or error param found in URL.");
                // Hiển thị SweetAlert cảnh báo ở đây trong popup
                Swal.fire({
                    icon: 'warning',
                    title: 'Login Status',
                    text: 'Authentication process completed, but no token or error was received.',
                    confirmButtonText: 'OK'
                }).then(() => { // <-- Bắt đầu khối .then() của SweetAlert
                    // <-- Đóng cửa sổ popup sau khi người dùng click OK -->
                    window.close();
                }); // <-- Kết thúc khối .then() của SweetAlert và lệnh Swal.fire()
            }
        } else {
            // Trường hợp trang này được truy cập trực tiếp (không phải popup)
            console.error("OAuth2 Redirect Page was not opened as a popup. Redirecting to login.");
            // Báo lỗi bằng Swal và chuyển hướng cửa sổ hiện tại
            Swal.fire({
                icon: 'error',
                title: 'Invalid Access',
                text: 'This page should only be accessed via the OAuth2 login popup.',
                confirmButtonText: 'OK'
            }).then(() => {
                window.close()// <-- Bắt đầu khối .then() của SweetAlert
                // Chuyển hướng cửa sổ hiện tại (vì nó không phải popup)
            }); // <-- Kết thúc khối .then() của SweetAlert và lệnh Swal.fire()
        }

        // Không cần cleanup listener vì component sẽ unmount và cửa sổ đóng ngay sau đó

    }, [location]); // Chạy useEffect khi location thay đổi

    // Component này hiển thị spinner hoặc thông báo ngắn gọn trong khi xử lý trong useEffect
    // Nó sẽ đóng rất nhanh sau khi useEffect chạy xong
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <Spin size="large" /> {/* Hiển thị spinner */}
            <p style={{ marginTop: 20 }}>Processing OAuth2 login...</p> {/* Thông báo đang xử lý */}
        </div>
    );
};

export default OAuth2RedirectPage;