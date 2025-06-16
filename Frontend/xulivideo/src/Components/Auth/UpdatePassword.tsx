// File: ./Components/Auth/UpdatePasswordPage.tsx

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Form, Input, Button, Typography } from "antd"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import "./Authenticate.css" // Reusing the same CSS

const { Title, Paragraph } = Typography

const UpdatePassword: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)

    // Get email and OTP (or verification token) from location state
    const { email, otp } = (location.state as { email: string; otp: string }) || {}

    useEffect(() => {
        // If email or OTP is not available, redirect back to forgot password page
        if (!email || !otp) {
            Swal.fire({
                icon: "warning",
                title: "Invalid Access",
                text: "Please go through the forgot password process again.",
                confirmButtonText: "OK",
            }).then(() => {
                navigate("/forgot-password")
            })
        }
    }, [email, otp, navigate])

    const handleUpdatePasswordSubmit = async (values: any) => {
        setLoading(true)
        console.log("Updating password for email:", email)

        try {
            // Thay thế bằng endpoint thực tế của bạn
            const response = await axios.post(
                "http://localhost:8080/api/public/auth/reset-password", // Ví dụ: Endpoint để cập nhật mật khẩu
                { email, otp, newPassword: values.newPassword }
            )

            console.log("Update password API response:", response)

            if (response.status === 200 || response.status === 204) {
                Swal.fire({
                    icon: "success",
                    title: "Password Updated!",
                    text: "Your password has been successfully reset. Please sign in with your new password.",
                    confirmButtonText: "OK",
                }).then(() => {
                    navigate("/login") // Redirect to login page
                    form.resetFields()
                })
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Update Failed",
                    text: response.data?.message || `Failed to update password. Status: ${response.status}.`,
                    confirmButtonText: "OK",
                })
            }
        } catch (error: any) {
            console.error("Update password error object:", error)
            let errorMessage = "An unexpected error occurred during password update."

            if (error.response) {
                console.error("Update password error response data:", error.response.data)
                if (error.response.status === 400) {
                    errorMessage = "Invalid or expired verification code. Please try again."
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

    if (!email || !otp) {
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
                        onFinish={handleUpdatePasswordSubmit}
                        form={form}
                    >
                        <Title level={2}>Reset Password</Title>
                        <Paragraph className="or">
                            Enter your new password below.
                        </Paragraph>

                        <Form.Item
                            name="newPassword"
                            rules={[
                                { required: true, message: "Please input your New Password!" },
                                { min: 6, message: "Password must be at least 6 characters." },
                            ]}
                            hasFeedback
                        >
                            <Input.Password placeholder="New Password" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="confirmNewPassword"
                            dependencies={["newPassword"]}
                            hasFeedback
                            rules={[
                                { required: true, message: "Please confirm your New Password!" },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue("newPassword") === value) {
                                            return Promise.resolve()
                                        }
                                        return Promise.reject(
                                            new Error("The two passwords that you entered do not match!")
                                        )
                                    },
                                }),
                            ]}
                        >
                            <Input.Password placeholder="Confirm New Password" size="large" />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="auth-button sign-in-button"
                                block
                                loading={loading}
                            >
                                Update Password
                            </Button>
                        </Form.Item>
                        <Paragraph className="return-to-login">
                            <a onClick={() => navigate("/login")}>Back to Sign In</a>
                        </Paragraph>
                    </Form>
                </div>
            </div>
        </div>
    )
}

export default UpdatePassword