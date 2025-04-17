"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Form, Input, Button, Typography, Space } from "antd"
import { GoogleOutlined, FacebookOutlined } from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import "./Authenticate.css"

const { Title, Paragraph } = Typography

const AuthenticatePage: React.FC = () => {
    const [signIn, setSignIn] = useState<boolean>(true)
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        setSignIn(location.pathname === "/login")
    }, [location.pathname])

    const toggleSignIn = (isSignIn: boolean) => {
        setSignIn(isSignIn)
        navigate(isSignIn ? "/login" : "/register")
    }

    return (
        <div className="auth-page-container">
            <div className="auth-card">
                <div className={`auth-container ${signIn ? "" : "right-panel-active"}`}>
                    {/* Conditionally render either Login or Register form */}
                    <div className="form-container active-form-container">
                        {signIn ? (
                            <Form layout="vertical" className="auth-form">
                                <Title level={2}>Sign in</Title>

                                <Space className="social-container" size="middle">
                                    <Button shape="circle" icon={<GoogleOutlined />} className="social-button google" />
                                    <Button shape="circle" icon={<FacebookOutlined />} className="social-button facebook" />
                                </Space>

                                <Form.Item name="username">
                                    <Input placeholder="User name" size="large" />
                                </Form.Item>

                                <Form.Item name="password">
                                    <Input.Password placeholder="Password" size="large" />
                                </Form.Item>

                                <a href="#" className="forgot-password">
                                    Forgot your password?
                                </a>

                                <Form.Item>
                                    <Button type="primary" htmlType="submit" className="auth-button sign-in-button" block>
                                        SIGN IN
                                    </Button>
                                </Form.Item>
                            </Form>
                        ) : (
                            <Form layout="vertical" className="auth-form">
                                <Title level={2}>Create Account</Title>

                                <Form.Item name="username">
                                    <Input placeholder="User name" size="large" />
                                </Form.Item>

                                <Form.Item name="email">
                                    <Input placeholder="Email" type="email" size="large" />
                                </Form.Item>

                                <Form.Item name="phone">
                                    <Input placeholder="Telephone" size="large" />
                                </Form.Item>

                                <Form.Item name="password">
                                    <Input.Password placeholder="Password" size="large" />
                                </Form.Item>

                                <Form.Item>
                                    <Button type="primary" htmlType="submit" className="auth-button sign-up-button" block>
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
