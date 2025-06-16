"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Form, Input, Button, Typography, Space, Dropdown, Menu } from "antd"
import { GoogleOutlined, FacebookOutlined, GlobalOutlined, DownOutlined } from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import "./Authenticate.css"
import axios from "axios"
import Swal from "sweetalert2"
import { useTranslation } from "react-i18next";

const { Title, Paragraph, Text } = Typography;

const AuthenticatePage: React.FC = () => {
    const [signIn, setSignIn] = useState<boolean>(true);
    const location = useLocation();
    const navigate = useNavigate();

    const [loginForm] = Form.useForm();
    const [registerForm] = Form.useForm();

    const { t, i18n } = useTranslation();

    const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

    useEffect(() => {
        if (signIn) {
            registerForm.resetFields();
        } else {
            loginForm.resetFields();
        }
    }, [signIn, registerForm, loginForm]);

    useEffect(() => {
        setSignIn(location.pathname === "/login");
    }, [location.pathname]);

    useEffect(() => {
        setCurrentLanguage(i18n.language);
    }, [i18n.language]);

    const toggleSignIn = (isSignIn: boolean) => {
        setSignIn(isSignIn);
    };

    // --- Language Switcher Logic ---
    const languageOptions = [
        { key: 'en', label: 'English', flag: '🇺🇸' },
        { key: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    ];

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const languageMenu = {
        items: languageOptions.map(lang => ({
            key: lang.key,
            label: <Space>{lang.flag} {lang.label}</Space>,
            onClick: () => changeLanguage(lang.key),
        })),
    };

    const currentLangOption = languageOptions.find(lang => lang.key === currentLanguage) || languageOptions[0];
    // --- End Language Switcher Logic ---

    // --- Registration API Handling ---
    const handleRegister = async (values: any) => {
        console.log("Register form values received:", values);

        const { username, email, password } = values;
        const registrationData = { username, email, password };

        console.log("Registering user with data:", registrationData);

        try {
            const response = await axios.post(
                "http://localhost:8080/api/public/auth/register",
                registrationData
            );

            console.log("Register API response:", response);

            if (response.status === 201) {
                Swal.fire({
                    icon: "success",
                    title: t('auth.alert.registrationSuccessTitle'),
                    text: t('auth.alert.registrationSuccessText'),
                    confirmButtonText: t('auth.alert.okButton')
                }).then(() => {
                    toggleSignIn(true);
                    registerForm.resetFields();
                });
            } else {
                Swal.fire({
                    icon: "warning",
                    title: t('auth.alert.registrationStatusTitle'),
                    text: response.data?.message || t('auth.alert.registrationStatusText', { status: response.status }),
                    confirmButtonText: t('auth.alert.okButton')
                });
            }

        } catch (error: any) {
            console.error("Registration error object:", error);
            let errorMessage = t('auth.alert.unexpectedError', { action: 'registration' });

            if (error.response) {
                console.error("Registration error response data:", error.response.data);
                console.error("Registration error response status:", error.response.status);
                if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = t('auth.alert.serverResponseStatus', { status: error.response.status });
                }
            } else if (error.request) {
                errorMessage = t('auth.alert.noServerResponse');
            }
            else if (error.message) {
                errorMessage = error.message;
            } else {
                errorMessage = t('auth.alert.unknownError', { message: error.toString() });
            }

            Swal.fire({
                icon: "error",
                title: t('auth.alert.registrationFailedTitle'),
                text: errorMessage,
                confirmButtonText: t('auth.alert.okButton')
            });
        }
    };
    // --- End Registration API Handling ---


    // --- Login API Handling ---
    const handleLogin = async (values: any) => {
        console.log("Login form values received:", values);

        const { email, password } = values;
        const loginData = { email, password };

        console.log("Logging in with data:", loginData);

        try {
            const response = await axios.post(
                "http://localhost:8080/api/public/auth/login",
                loginData
            );

            console.log("Login API response:", response);
            console.log("Login response data:", response.data.data);

            if (response.status === 200 && response.data.data?.accessToken) {
                console.log("Condition met: status is 200 and accessToken exists."); // <-- Thêm dòng này

                const { accessToken, userId, userRole } = response.data.data;

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('userId', userId);
                localStorage.setItem('userRole', userRole);

                console.log("Access token stored in localStorage:", accessToken);
                console.log("User ID stored in localStorage:", userId);
                console.log("User Role stored in localStorage:", userRole);

                Swal.fire({
                    icon: "success",
                    title: t('auth.alert.loginSuccessTitle'),
                    text: t('auth.alert.redirecting'),
                    timer: 300,
                    timerProgressBar: true,
                    showConfirmButton: false
                }).then(() => {

                    if (userRole === "USER") {
                        navigate('/index');
                    } else if (userRole === "ADMIN") {
                        navigate('/usermanager');
                    } else {
                        console.warn("Unknown user role, redirecting to index:", userRole);
                        navigate('/index');
                    }
                });

            } else {
                console.log("Condition NOT met. Status:", response.status, "Has accessToken:", !!response.data.data?.accessToken); // <-- Thêm dòng này

                Swal.fire({
                    icon: "warning",
                    title: t('auth.alert.loginStatusTitle'),
                    text: response.data?.message || t('auth.alert.loginStatusText', { status: response.status }),
                    confirmButtonText: t('auth.alert.okButton')
                });
            }

        } catch (error: any) {
            console.error("Login error object:", error);
            let errorMessage = t('auth.alert.unexpectedError', { action: 'login' });

            if (error.response) {
                console.error("Login error response data:", error.response.data);
                console.error("Login error response status:", error.response.status);
                if (error.response.status === 401) {
                    errorMessage = t('auth.alert.invalidCredentials');
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = t('auth.alert.serverResponseStatus', { status: error.response.status });
                }
            } else if (error.request) {
                errorMessage = t('auth.alert.noServerResponse');
            }
            else if (error.message) {
                errorMessage = error.message;
            } else {
                errorMessage = t('auth.alert.unknownError', { message: error.toString() });
            }

            Swal.fire({
                icon: "error",
                title: t('auth.alert.loginFailedTitle'),
                text: errorMessage,
                confirmButtonText: t('auth.alert.okButton')
            });
        }
    };
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
                        const userId = localStorage.getItem("userId");
                        const userRole = localStorage.getItem("userRole");

                        if (token && userId && userRole) {
                            Swal.fire({
                                icon: 'success',
                                title: t('auth.alert.loginSuccessTitle'),
                                text: t('auth.alert.oauthSuccess'),
                                timer: 1000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            }).then(() => {
                                if (userRole === "USER") {
                                    navigate("/index");
                                } else if (userRole === "ADMIN") {
                                    navigate("/usermanager");
                                } else {
                                    console.warn("Unknown user role from OAuth2, redirecting to index:", userRole);
                                    navigate("/index");
                                }
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: t('auth.alert.oauthFailedTitle'),
                                text: t('auth.alert.oauthFailedText')
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
                title: t('auth.alert.popupBlockedTitle'),
                text: t('auth.alert.popupBlockedText'),
                confirmButtonText: t('auth.alert.okButton')
            });
        }

    };

    return (
        <div className="auth-page-container">
            {/* Language Switcher */}
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
                <Dropdown menu={languageMenu} trigger={['hover']} placement="bottomRight">
                    <Button type="text" icon={<Space><GlobalOutlined /> {currentLangOption.flag} <DownOutlined /></Space>}>
                        {currentLangOption.label}
                    </Button>
                </Dropdown>
            </div>

            <div className="auth-card">
                <div className={`auth-container ${signIn ? "" : "right-panel-active"}`}>
                    {/* Sign In Form Container */}
                    <div className={`form-container ${signIn ? 'active-form-container' : ''}`}>
                        {signIn && (
                            <Form
                                key={i18n.language}
                                layout="vertical"
                                className="auth-form"
                                onFinish={handleLogin}
                                form={loginForm}
                            >
                                <Title level={2}>{t('auth.signInTitle')}</Title>

                                <Space className="social-container" size="middle">
                                    <Button shape="circle" icon={<GoogleOutlined />} className="social-button google" onClick={openOAuth2Popup} />
                                    <Button shape="circle" icon={<FacebookOutlined />} className="social-button facebook" disabled />
                                </Space>

                                <Paragraph className="or">{t('auth.orUseEmail')}</Paragraph>

                                <Form.Item
                                    name="email"
                                    rules={[
                                        { required: true, message: t('auth.validation.requiredEmail') },
                                        { type: 'email', message: t('auth.validation.invalidEmailFormat') }
                                    ]}
                                >
                                    <Input placeholder={t('auth.form.email.placeholder')} size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="password"
                                    rules={[{ required: true, message: t('auth.validation.requiredPassword') }]}
                                >
                                    <Input.Password placeholder={t('auth.form.password.placeholder')} size="large" />
                                </Form.Item>

                                <Text className="forgot-password">
                                    <a href="#">{t('auth.forgotPassword')}</a>
                                </Text>

                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        className="auth-button sign-in-button"
                                        block
                                    >
                                        {t('auth.signInButton')}
                                    </Button>
                                </Form.Item>
                            </Form>
                        )}
                    </div>

                    {/* Sign Up Form Container */}
                    <div className={`form-container ${!signIn ? 'active-form-container' : ''}`}>
                        {!signIn && (
                            <Form
                                key={i18n.language}
                                layout="vertical"
                                className="auth-form"
                                onFinish={handleRegister}
                                form={registerForm}
                            >
                                <Title level={2}>{t('auth.createAccountTitle')}</Title>

                                <Form.Item
                                    name="username"
                                    rules={[
                                        { required: true, message: t('auth.validation.requiredUsername') },
                                        { min: 3, message: t('auth.validation.usernameMinLength', { min: 3 }) },
                                        { max: 50, message: t('auth.validation.usernameMaxLength', { max: 50 }) }
                                    ]}
                                >
                                    <Input placeholder={t('auth.form.username.placeholder')} size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="email"
                                    rules={[
                                        { required: true, message: t('auth.validation.requiredEmail') },
                                        { type: 'email', message: t('auth.validation.invalidEmailFormat') }
                                    ]}
                                >
                                    <Input placeholder={t('auth.form.email.placeholder')} type="email" size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="password"
                                    rules={[
                                        { required: true, message: t('auth.validation.requiredPassword') },
                                        { min: 6, message: t('auth.validation.passwordMinLength', { min: 6 }) }
                                    ]}
                                    hasFeedback
                                >
                                    <Input.Password placeholder={t('auth.form.password.placeholder')} size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="repass"
                                    dependencies={['password']}
                                    hasFeedback
                                    rules={[
                                        { required: true, message: t('auth.validation.requiredRepassword') },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('password') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error(t('auth.validation.passwordsMatch')));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password placeholder={t('auth.form.repassword.placeholder')} size="large" />
                                </Form.Item>

                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        className="auth-button sign-up-button"
                                        block
                                    >
                                        {t('auth.signUpButton')}
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
                                    {t('auth.overlay.welcomeBackTitle')}
                                </Title>
                                <Paragraph className="overlay-paragraph">
                                    {t('auth.overlay.welcomeBackParagraph')}
                                </Paragraph>
                                <Button ghost className="ghost-button" onClick={() => toggleSignIn(true)}>
                                    {t('auth.overlay.signInButton')}
                                </Button>
                            </div>
                            <div className="overlay-panel overlay-right">
                                <Title level={2} className="overlay-title">
                                    {t('auth.overlay.helloFriendTitle')}
                                </Title>
                                <Paragraph className="overlay-paragraph">
                                    {t('auth.overlay.helloFriendParagraph')}
                                </Paragraph>
                                <Button ghost className="ghost-button" onClick={() => toggleSignIn(false)}>
                                    {t('auth.overlay.signUpButton')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthenticatePage;