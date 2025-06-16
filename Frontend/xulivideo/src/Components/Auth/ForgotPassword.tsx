// File: ./Components/Auth/ForgotPasswordPage.tsx

"use client" // Dấu hiệu cho Next.js rằng đây là một Client Component

import type React from "react" // Import type React
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom" // Import Link và useNavigate
import Swal from "sweetalert2" // Import SweetAlert2
import "./style.css" // Sử dụng file CSS riêng cho trang này

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState<string>("") // State để quản lý giá trị email
    const [loading, setLoading] = useState<boolean>(false) // State để quản lý trạng thái loading của button
    const navigate = useNavigate()

    // Hàm xử lý khi form được submit
    const handleSubmitForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault() // Ngăn chặn hành vi submit mặc định của form
        setLoading(true) // Bắt đầu trạng thái loading

        if (!email) {
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Vui lòng nhập email của bạn!",
            })
            setLoading(false) // Dừng loading nếu có lỗi validate
            return
        }

        try {
            // Chuẩn bị FormData
            const formData = new FormData()
            formData.append("email", email)

            // Gửi request sử dụng fetch
            const response = await fetch("https://localhost:8080/forgot_password", {
                method: "POST",
                body: formData, // Gửi FormData trực tiếp
            })

            if (response.ok) { // Kiểm tra nếu response thành công (status 2xx)
                Swal.fire({
                    icon: "success",
                    title: "OTP đã được gửi!",
                    text: "Một mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra.",
                    confirmButtonText: "OK",
                }).then(() => {
                    // Điều hướng đến trang verify OTP và truyền email qua state
                    navigate("/verifyotp", { state: { email: email } })
                    setEmail("") // Xóa trường email sau khi gửi thành công
                })
            } else {
                // Đọc thông báo lỗi từ body của response nếu có
                const errorData = await response.json().catch(() => ({ message: "Không thể đọc thông báo lỗi từ server." }));
                Swal.fire({
                    icon: "error",
                    title: "Lỗi",
                    text: errorData.message || "Có lỗi xảy ra. Vui lòng thử lại sau.",
                    confirmButtonText: "OK",
                })
            }
        } catch (error) {
            console.error("Lỗi khi gửi yêu cầu quên mật khẩu:", error)
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Không thể kết nối với máy chủ. Vui lòng thử lại sau.",
                confirmButtonText: "OK",
            })
        } finally {
            setLoading(false) // Dừng trạng thái loading dù thành công hay thất bại
        }
    }

    return (
        <div className="forgot-password-container"> {/* Thay đổi tên class để rõ ràng hơn */}
            <main className="hero-section">
                {/* Image background, đảm bảo đường dẫn ảnh đúng */}
                <img
                    src="https://i.pinimg.com/736x/1c/fb/ec/1cfbec7b6e28bc517fa5c9c3e66cf22e.jpg"
                    alt="Computer Lab Background"
                    className="hero-image"
                />
                <div className="content">
                    <div className="card custom-card">
                        <div className="card-body"> {/* Bỏ p-4 p-md-5 vì đã có trong CSS */}
                            <h3 className="text-center fw-bold mb-5 text-black">Quên mật khẩu</h3>
                            <form onSubmit={handleSubmitForgotPassword}>
                                {/* Email Input */}
                                <div className="form-group"> {/* Bỏ mb-4 vì đã có trong CSS */}
                                    <label htmlFor="email" className="form-label">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="form-control"
                                        placeholder="Nhập email của bạn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading} // Disable input when loading
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="button-group"> {/* Thay mb-4 bằng class riêng */}
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100"
                                        disabled={loading} // Disable button when loading
                                    >
                                        {loading ? "Đang gửi..." : "Gửi mã xác minh"}
                                    </button>
                                </div>
                            </form>

                            <p className="text-center"> {/* Bỏ mb-0 vì đã có trong CSS */}
                                Quay lại{" "}
                                <Link to="/login" className="text-primary">
                                    Đăng nhập
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default ForgotPassword