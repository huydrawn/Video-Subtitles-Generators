import type React from "react"
import { Form, Input, Button, Typography } from "antd"

const { Title } = Typography

interface RegisterProps {
    toggleSignIn: (isSignIn: boolean) => void
}

const Register: React.FC<RegisterProps> = ({ toggleSignIn }) => {
    return (
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
    )
}

export default Register
