import React, { useState } from 'react';
import { Form, Input, Button, Select, Upload, message, Layout } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import {Row, Col} from 'antd';

const { Footer, Content } = Layout;

const normFile = (e: any) => {
    console.log('Upload event:', e);
    if (Array.isArray(e)) {
        return e;
    }
    return e && e.fileList;
};

const UploadPage: React.FC = () => {
    const [uploading, setUploading] = useState(false);

    const onFinish = (values: any) => {
        console.log('Success:', values);
    };

    const onFinishFailed = (errorInfo: any) => {
        console.log('Failed:', errorInfo);
    };

    const props = {
        name: 'file',
        action: 'https://www.mocky.io/v2/5cc8019d300000980a055e76', // Replace with your upload endpoint
        headers: {
            authorization: 'authorization-text',
        },
        onChange(info: any) {
            if (info.file.status !== 'uploading') {
                console.log(info.file, info.fileList);
            }
            if (info.file.status === 'done') {
                message.success(`${info.file.name} file uploaded successfully`);
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} file upload failed.`);
            }
        },
        beforeUpload: () => {
            setUploading(true);
            return true;
        },
        onSuccess: () => {
            setUploading(false);
        },
        onError: () => {
            setUploading(false);
        },
    };

    return (
        <Layout>
            <Content style={{ padding: '0 50px', marginTop: 20 }}>
                <div style={{ background: '#fff', padding: 24, minHeight: 280, textAlign: 'center' }}>
                    <h1>Upload Videos</h1>
                    <Form
                        name="basic"
                        labelCol={{ xs: { span: 24 }, sm: { span: 8 } }} // Responsive label width
                        wrapperCol={{ xs: { span: 24 }, sm: { span: 16 } }} // Responsive wrapper width
                        initialValues={{ remember: true }}
                        onFinish={onFinish}
                        onFinishFailed={onFinishFailed}
                        autoComplete="off"
                        style={{ maxWidth: 600, margin: 'auto' }}
                    >
                        <Form.Item label="Video Title" name="videoTitle" rules={[{ required: true, message: 'Please input video title!' }]}>
                            <Input />
                        </Form.Item>

                        <Form.Item label="Video Description" name="videoDescription" rules={[{ required: true, message: 'Please input video description!' }]}>
                            <Input.TextArea />
                        </Form.Item>

                        <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Please select a category!' }]}>
                            <Select>
                                <Select.Option value="motivation">MOTIVATION</Select.Option>
                                <Select.Option value="education">EDUCATION</Select.Option>
                                <Select.Option value="technology">TECHNOLOGY</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item label="Upload" valuePropName="fileList" getValueFromEvent={normFile}>
                            <Upload {...props}>
                                <Button icon={<UploadOutlined />} loading={uploading}>Click to Upload</Button>
                            </Upload>
                        </Form.Item>

                        <Form.Item wrapperCol={{ xs: { offset: 0, span: 24 }, sm: { offset: 8, span: 16 } }}>
                            <Button type="primary" htmlType="submit" disabled={uploading}>
                                Submit
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}>Video Streaming App ©2024</Footer>
        </Layout>
    );
};

export default UploadPage;