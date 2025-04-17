import type React from "react"
import { Form, Input, Button, Typography, Space } from "antd"
import { GoogleOutlined, FacebookOutlined } from "@ant-design/icons"

const { Title, Text } = Typography

interface LoginProps {
    toggleSignIn: (isSignIn: boolean) => void
}

const Login: React.FC<LoginProps> = ({ toggleSignIn }) => {
    return (
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

            <Text className="forgot-password">
                <a href="#">Forgot your password?</a>
            </Text>

            <Form.Item>
                <Button type="primary" htmlType="submit" className="auth-button sign-in-button" block>
                    SIGN IN
                </Button>
            </Form.Item>
        </Form>
    )
}

export default Login
