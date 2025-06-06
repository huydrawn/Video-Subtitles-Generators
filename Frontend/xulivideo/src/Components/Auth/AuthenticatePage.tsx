// File: ./Components/Auth/AuthenticatePage.tsx (hoặc tên file của bạn)

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Form, Input, Button, Typography, Space } from "antd"
import { GoogleOutlined, FacebookOutlined } from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import "./Authenticate.css" // Assuming your CSS is here
import axios from "axios" // Import axios
import Swal from "sweetalert2" // Import SweetAlert2

const { Title, Paragraph, Text } = Typography

const AuthenticatePage: React.FC = () => {
    const [signIn, setSignIn] = useState<boolean>(true)
    const location = useLocation()
    const navigate = useNavigate()

    const [loginForm] = Form.useForm();
    const [registerForm] = Form.useForm()

    useEffect(() => {
        if (signIn) {
            registerForm.resetFields();
        } else {
            loginForm.resetFields();
        }
    }, [signIn, registerForm, loginForm]) // Changed dependency to signIn state

    const toggleSignIn = (isSignIn: boolean) => {
        setSignIn(isSignIn)
        // navigate(isSignIn ? "/login" : "/register") // Navigation is handled by App.tsx routing based on path
        // We toggle state, useEffect might handle navigation or router config does
        // Let's rely on the router config in App.tsx setting the initial signIn state
    }

    // Add useEffect to set initial signIn state based on route
    useEffect(() => {
        setSignIn(location.pathname === "/login");
    }, [location.pathname]);


    // --- Registration API Handling ---
    const handleRegister = async (values: any) => {
        console.log("Register form values received:", values);

        const { username, email, password } = values
        const registrationData = { username, email, password }

        console.log("Registering user with data:", registrationData);

        try {
            const response = await axios.post(
                "http://localhost:8080/api/public/auth/register",
                registrationData
            )

            console.log("Register API response:", response);

            if (response.status === 201) {
                Swal.fire({
                    icon: "success",
                    title: "Registration Successful!",
                    text: "Your account has been created. Please sign in.",
                    confirmButtonText: "OK"
                }).then(() => {
                    toggleSignIn(true); // Switch to login form
                    registerForm.resetFields(); // Clear register form
                });
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Registration Status",
                    text: response.data?.message || `Registration processed with status: ${response.status}.`,
                    confirmButtonText: "OK"
                });
            }

        } catch (error: any) {
            console.error("Registration error object:", error);
            let errorMessage = "An unexpected error occurred during registration."

            if (error.response) {
                console.error("Registration error response data:", error.response.data);
                console.error("Registration error response status:", error.response.status);
                if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = `Server responded with status: ${error.response.status}`;
                }
            } else if (error.request) {
                errorMessage = "No response received from server. Is the server running and accessible?";
            }
            else if (error.message) {
                errorMessage = error.message;
            } else {
                errorMessage = `An unknown error occurred: ${error}`;
            }

            Swal.fire({
                icon: "error",
                title: "Registration Failed!",
                text: errorMessage,
                confirmButtonText: "OK"
            });
        }
    }
    // --- End Registration API Handling ---


    // --- Login API Handling ---
    const handleLogin = async (values: any) => {
        console.log("Login form values received:", values);

        const { email, password } = values
        const loginData = { email, password }

        console.log("Logging in with data:", loginData);

        try {
            const response = await axios.post(
                "http://localhost:8080/api/public/auth/login",
                loginData
            )

            console.log("Login API response:", response);
            console.log("Login response data:", response.data);

            if (response.status === 200 && response.data?.accessToken) {
                const accessToken = response.data.accessToken;
                localStorage.setItem('accessToken', accessToken);
                console.log("Access token stored in localStorage:", accessToken);

                Swal.fire({
                    icon: "success",
                    title: "Login Successful!",
                    text: "Redirecting...",
                    timer: 1000,
                    timerProgressBar: true,
                    showConfirmButton: false
                }).then(() => {
                    navigate('/index'); // Redirect to the main home page after success
                    loginForm.resetFields(); // Clear form
                });

            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Login Status",
                    text: response.data?.message || `Login processed with status: ${response.status}, but token was not received.`,
                    confirmButtonText: "OK"
                });
            }

        } catch (error: any) {
            console.error("Login error object:", error);
            let errorMessage = "An unexpected error occurred during login."

            if (error.response) {
                console.error("Login error response data:", error.response.data);
                console.error("Login error response status:", error.response.status);
                if (error.response.status === 401) {
                    errorMessage = "Invalid email or password.";
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = `Server responded with status: ${error.response.status}`;
                }
            } else if (error.request) {
                errorMessage = "No response received from server. Is the server running and accessible?";
            }
            else if (error.message) {
                errorMessage = error.message;
            } else {
                errorMessage = `An unknown error occurred: ${error}`;
            }


            Swal.fire({
                icon: "error",
                title: "Login Failed!",
                text: errorMessage,
                confirmButtonText: "OK"
            });
        }
    }
    // --- End Login API Handling ---

    // --- OAuth2 Popup Function ---
    const openOAuth2Popup = () => {
        const oauthUrl = "http://localhost:8080/oauth2/authorization/google?redirect_uri=http://localhost:3000/oauth2/redirect";

        const width = 500;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const popup = window.open(
            oauthUrl,
            "OAuth2 Login",
            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        );

        if (popup) {
            const popupTick = setInterval(() => {
                try {
                    if (popup.closed) {
                        clearInterval(popupTick);

                        const token = localStorage.getItem("accessToken");
                        if (token) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Login Successful!',
                                text: 'You have been logged in.',
                                timer: 2000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            }).then(() => {
                                navigate("/index");
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Login Failed',
                                text: 'No access token received.'
                            });
                        }
                    }
                } catch (e) {
                    // Cross-origin issue; ignore
                }
            }, 500);
        } else {
            Swal.fire({
                icon: "warning",
                title: "Popup Blocked!",
                text: "Please allow popups for this site to continue with Google login.",
                confirmButtonText: "OK"
            });
        }

    };



    return (
        <div className="auth-page-container">
            <div className="auth-card">
                <div className={`auth-container ${signIn ? "" : "right-panel-active"}`}>
                    {/* Sign In Form Container */}
                    <div className={`form-container ${signIn ? 'active-form-container' : ''}`}>
                        {signIn && (
                            <Form
                                layout="vertical"
                                className="auth-form"
                                onFinish={handleLogin}
                                form={loginForm}
                            >
                                <Title level={2}>Sign in</Title>

                                <Space className="social-container" size="middle">
                                    <Button shape="circle" icon={<GoogleOutlined />} className="social-button google" onClick={openOAuth2Popup} /> {/* <-- Added onClick */}
                                    <Button shape="circle" icon={<FacebookOutlined />} className="social-button facebook" disabled /> {/* <-- Facebook disabled for now */}
                                </Space>

                                {/* ... rest of login form ... */}
                                <Paragraph className="or">or use your email account</Paragraph> {/* Add "or" text */}


                                <Form.Item
                                    name="email"
                                    rules={[
                                        { required: true, message: 'Please input your Email!' },
                                        { type: 'email', message: 'Please enter a valid Email!' }
                                    ]}
                                >
                                    <Input placeholder="Email" size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="password"
                                    rules={[{ required: true, message: 'Please input your Password!' }]}
                                >
                                    <Input.Password placeholder="Password" size="large" />
                                </Form.Item>

                                <Text className="forgot-password">
                                    <a href="#">Forgot your password?</a>
                                </Text>

                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        className="auth-button sign-in-button"
                                        block
                                    >
                                        SIGN IN
                                    </Button>
                                </Form.Item>
                            </Form>
                        )}
                    </div>

                    {/* Sign Up Form Container */}
                    <div className={`form-container ${!signIn ? 'active-form-container' : ''}`}>
                        {!signIn && (
                            <Form
                                layout="vertical"
                                className="auth-form"
                                onFinish={handleRegister}
                                form={registerForm}
                            >
                                <Title level={2}>Create Account</Title>

                                {/* Keep social buttons in register if needed, or remove */}
                                {/* <Space className="social-container" size="middle">
                                     <Button shape="circle" icon={<GoogleOutlined />} className="social-button google" onClick={openOAuth2Popup} />
                                     <Button shape="circle" icon={<FacebookOutlined />} className="social-button facebook" disabled />
                                 </Space>
                                 <Paragraph className="or">or use your email for registration</Paragraph> */}


                                {/* ... rest of register form ... */}
                                <Form.Item
                                    name="username"
                                    rules={[
                                        { required: true, message: 'Please input your Username!' },
                                        { min: 3, message: 'Username must be at least 3 characters.' },
                                        { max: 50, message: 'Username must be at most 50 characters.' }
                                    ]}
                                >
                                    <Input placeholder="User name" size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="email"
                                    rules={[
                                        { required: true, message: 'Please input your Email!' },
                                        { type: 'email', message: 'Please enter a valid Email!' }
                                    ]}
                                >
                                    <Input placeholder="Email" type="email" size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="password"
                                    rules={[
                                        { required: true, message: 'Please input your Password!' },
                                        { min: 6, message: 'Password must be at least 6 characters.' }
                                    ]}
                                    hasFeedback
                                >
                                    <Input.Password placeholder="Password" size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="repass"
                                    dependencies={['password']}
                                    hasFeedback
                                    rules={[
                                        { required: true, message: 'Please confirm your Password!' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('password') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('The two passwords that you entered do not match!'));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password placeholder="Repassword" size="large" />
                                </Form.Item>

                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        className="auth-button sign-up-button"
                                        block
                                    >
                                        SIGN UP
                                    </Button>
                                </Form.Item>
                            </Form>
                        )}
                    </div>


                    {/* Overlay Container */}
                    <div className="overlay-container">
                        <div className="overlay">
                            <div className="overlay-panel overlay-left">
                                <Title level={2} className="overlay-title">
                                    Welcome Back!
                                </Title>
                                <Paragraph className="overlay-paragraph">
                                    To keep connected with us please login with your personal info
                                </Paragraph>
                                <Button ghost className="ghost-button" onClick={() => toggleSignIn(true)}>
                                    Sign In
                                </Button>
                            </div>
                            <div className="overlay-panel overlay-right">
                                <Title level={2} className="overlay-title">
                                    Hello, Friend!
                                </Title>
                                <Paragraph className="overlay-paragraph">
                                    Enter your personal details and start journey with us
                                </Paragraph>
                                <Button ghost className="ghost-button" onClick={() => toggleSignIn(false)}>
                                    Sign Up
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AuthenticatePage