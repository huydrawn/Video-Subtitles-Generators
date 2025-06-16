

import type React from "react"
import { useState, useEffect } from "react"
import { Form, Input, Button, Typography } from "antd"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import "./Authenticate.css" // Reusing the same CSS

const { Title, Paragraph, Text: AntdText } = Typography // Đổi tên 'Text' thành 'AntdText'
const VerifyOtp: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)

    // Get email from location state
    const email = (location.state as { email: string })?.email

    useEffect(() => {
        // If email is not available, redirect back to forgot password page
        if (!email) {
            Swal.fire({
                icon: "warning",
                title: "Email Missing",
                text: "Please enter your email first to verify OTP.",
                confirmButtonText: "OK",
            }).then(() => {
                navigate("/forgot-password")
            })
        }
    }, [email, navigate])

    const handleVerifyOtpSubmit = async (values: { otp: string }) => {
        setLoading(true)
        console.log("Verifying OTP for email:", email, "with OTP:", values.otp)

        try {
            // Thay thế bằng endpoint thực tế của bạn
            const response = await axios.post(
                "http://localhost:8080/api/public/auth/verify-otp", // Ví dụ: Endpoint để xác thực OTP
                { email, otp: values.otp }
            )

            console.log("Verify OTP API response:", response)

            if (response.status === 200 || response.status === 204) {
                Swal.fire({
                    icon: "success",
                    title: "OTP Verified!",
                    text: "You can now reset your password.",
                    confirmButtonText: "OK",
                }).then(() => {
                    // Navigate to update password page, passing email and OTP (or a verification token from backend)
                    // It's safer to pass a verification token returned by the backend after successful OTP verification
                    // For simplicity, we'll pass email and otp for now, but a token is recommended for security.
                    navigate("/update-password", { state: { email, otp: values.otp } })
                    form.resetFields()
                })
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Verification Failed",
                    text: response.data?.message || `Failed to verify OTP. Status: ${response.status}.`,
                    confirmButtonText: "OK",
                })
            }
        } catch (error: any) {
            console.error("Verify OTP error object:", error)
            let errorMessage = "An unexpected error occurred during OTP verification."

            if (error.response) {
                console.error("Verify OTP error response data:", error.response.data)
                if (error.response.status === 400) {
                    errorMessage = "Invalid or expired OTP. Please try again."
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message
                } else {
                    errorMessage = `Server responded with status: ${error.response.status}`
                }
            } else if (error.request) {
                errorMessage = "No response received from server. Is the server running and accessible?"
            } else if (error.message) {
                errorMessage = error.message
            }

            Swal.fire({
                icon: "error",
                title: "Error!",
                text: errorMessage,
                confirmButtonText: "OK",
            })
        } finally {
            setLoading(false)
        }
    }

    if (!email) {
        // Render a placeholder or nothing while redirecting
        return null;
    }

    return (
        <div className="auth-page-container">
            <div className="auth-card">
                <div className="form-container active-form-container">
                    <Form
                        layout="vertical"
                        className="auth-form"
                        onFinish={handleVerifyOtpSubmit}
                        form={form}
                    >
                        <Title level={2}>Verify OTP</Title>
                        <Paragraph className="or">
                            A verification code has been sent to <AntdText strong>{email}</AntdText>. Please enter it below.
                        </Paragraph>

                        <Form.Item
                            name="otp"
                            rules={[
                                { required: true, message: "Please input the OTP!" },
                                { len: 6, message: "OTP must be 6 digits." }, // Assuming 6-digit OTP
                                { pattern: /^\d{6}$/, message: "OTP must be digits only." },
                            ]}
                        >
                            <Input placeholder="Enter 6-digit OTP" size="large" maxLength={6} />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="auth-button sign-in-button"
                                block
                                loading={loading}
                            >
                                Verify Code
                            </Button>
                        </Form.Item>
                        <Paragraph className="return-to-login">
                            Didn't receive the code? <a onClick={() => navigate("/forgot-password")}>Resend</a>
                        </Paragraph>
                    </Form>
                </div>
            </div>
        </div>
    )
}

export default VerifyOtp