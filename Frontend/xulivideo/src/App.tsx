import React, { lazy, Suspense } from 'react';
import {
    createBrowserRouter,
    RouterProvider,
    Outlet,
    Navigate
} from 'react-router-dom';
import { Spin } from 'antd'; // Ant Design Spin component for loading fallback

// Import ProtectedRoute (đảm bảo đường dẫn chính xác)
import ProtectedRoute from './Components/Auth/auth'; // Chắc chắn đường dẫn này đúng

// --- Component hiển thị khi chờ tải code ---
const LoadingFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
    </div>
);

// --- Layout Chung bao gồm Suspense và Outlet ---
// Tất cả các route con sẽ được render bên trong Outlet
// và được bọc bởi Suspense để xử lý lazy loading
const AppLayout = () => {
    return (
        <Suspense fallback={<LoadingFallback />}>
            {/* Có thể thêm Header/Footer/Sidebar chung ở đây nếu muốn */}
            <Outlet />
        </Suspense>
    );
};

// --- Định nghĩa Lazy Load cho TẤT CẢ các component của Route ---
const UploadPage = lazy(() => import('./Components/VideoPage/upload'));
const SummaryPage = lazy(() => import('./Components/VideoPage/summary'));
const VideoEditorPage = lazy(() => import('./Components/VideoPage/VideoEditor'));
const AuthenticatePage = lazy(() => import('./Components/Auth/AuthenticatePage'));
const HomePage = lazy(() => import('./Components/HomePage/home')); // Kapwing-like page
const OAuth2Page = lazy(() => import('./Components/Auth/OAuth2RedirectPage'));
const PaymentSuccessPage = lazy(() => import('./Components/HomePage/PaymentSuccessPage'));
const UserPageContainer = lazy(() => import('./Components/HomePage/UserPageContainer')); // Kapwing-like page
const ForgotPassword = lazy(() => import('./Components/Auth/ForgotPassword'));
const UpdatePassword = lazy(() => import('./Components/Auth/UpdatePassword'));
const VerifyOtp = lazy(() => import('./Components/Auth/VerifyOtp'));
const UserManager = lazy(() => import('./Components/Admin/UserManager'));

// --- Cấu hình Router với createBrowserRouter ---
const router = createBrowserRouter([
    {
        path: "/",
        element: <AppLayout />, // Sử dụng Layout chung cho tất cả các routes
        children: [
            // --- Default Route ---
            // The root path "/" should display HomePage
            {
                index: true, // Chỉ định đây là route mặc định cho path cha ("/")
                element: <HomePage />
            },

            // --- Public Routes (No Protection) ---
            { path: "login", element: <AuthenticatePage /> },
            { path: "register", element: <AuthenticatePage /> },
            { path: "oauth2/redirect", element: <OAuth2Page /> },
            // These are the pages that were redirecting unexpectedly
            { path: "forgotpassword", element: <ForgotPassword /> }, // Giữ nguyên path này theo code cũ
            { path: "verifyotp", element: <VerifyOtp /> },
            { path: "updatepassword", element: <UpdatePassword /> },

            // --- Protected Routes (Require Authentication) ---
            // These routes use ProtectedRoute component
            {
                path: "index",
                element: <ProtectedRoute component={UserPageContainer} />,
                // loader: yourLoaderFunction, // Thêm loader nếu cần fetch data trước khi render
            },
            {
                path: "upload",
                element: <ProtectedRoute component={UploadPage} />,
            },
            {
                path: "summary",
                element: <ProtectedRoute component={SummaryPage} />,
            },
            {
                path: "paymentsuccess",
                element: <ProtectedRoute component={PaymentSuccessPage} />,
            },
            {
                path: "videoeditor",
                element: <ProtectedRoute component={VideoEditorPage} />,
            },
            {
                path: "usermanager",
                element: <ProtectedRoute component={UserManager} />,
            },


            // --- Catch-all Route (Tùy chọn) ---
            // Nếu bạn muốn bất kỳ đường dẫn nào không khớp sẽ chuyển hướng về trang chủ
            // { path: "*", element: <Navigate to="/" replace /> }
            // Lưu ý: Nếu có index: true ở trên, thì "*" sẽ bắt các path khác ngoài "/"
            // mà không khớp với các path con khác.
        ]
    }
]);

// Component App giờ chỉ cần cung cấp RouterProvider
function App() {
    return (
        <RouterProvider router={router} />
        // Không cần <BrowserRouter>, <Routes> ở đây nữa
    );
}

export default App;