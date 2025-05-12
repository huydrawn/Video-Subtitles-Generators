import React from 'react';
import {
    Layout, Tabs, Button, Row, Col, Card, Typography, Upload, Avatar, Space, Tooltip
} from 'antd';
import { theme } from 'antd';
import {
    VideoCameraOutlined, FileImageOutlined, PlusOutlined, InboxOutlined,
    GoogleOutlined, MoreOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { MediaAsset } from './types'; // Adjusted path

const { TabPane } = Tabs;
const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface MediaPanelProps {
    draggerProps: UploadProps;
    editorState: 'initial' | 'uploading' | 'editor';
    mediaAssets: MediaAsset[];
}

export const MediaPanel: React.FC<MediaPanelProps> = React.memo(({ draggerProps, editorState, mediaAssets }) => {
    const { token } = theme.useToken();

    return (
        <div className="contextual-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: token.colorBgContainer }}>
            {/* Panel Header/Tabs */}
            <Tabs
                defaultActiveKey="project_media"
                centered={false}
                size="small"
                tabBarGutter={12}
                tabBarStyle={{ marginBottom: 0, paddingLeft: 12, paddingRight: 12 }}
                moreIcon={<MoreOutlined />}
                style={{ flexShrink: 0, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
            >
                <TabPane tab="This Project" key="project_media" />
                <TabPane tab="My Media" key="my_media" disabled />
                <TabPane tab="Google Photos" key="google_photos" disabled icon={<GoogleOutlined />} />
            </Tabs>

            {/* Panel Content */}
            <div className="media-panel-content">
                {/* Upgrade Section Placeholder */}
                <Card size="small" className="upgrade-card" style={{ marginBottom: 16, background: token.colorFillContent, border: `1px dashed ${token.colorBorder}` }}>
                    <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '13px' }}>Bigger, bolder assets</Text>
                        <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', lineHeight: '1.3' }}>Upgrade to upload and store assets over 250+ megabytes</Text>
                        <Button type="primary" size="small" block disabled>Upgrade ✨</Button>
                    </Space>
                </Card>

                {/* Upload Button */}
                <Button type="primary" icon={<PlusOutlined />} block style={{ marginBottom: 16 }} onClick={() => {
                    const draggerInput = document.querySelector('.media-panel-dragger .ant-upload-btn input');
                    if (draggerInput instanceof HTMLElement) draggerInput.click();
                }}>Add Media</Button>

                {/* Media Asset Grid in Dragger */}
                <Dragger
                    {...draggerProps}
                    className="media-panel-dragger"
                    style={{ padding: 0, border: 'none', background: 'transparent' }}
                >
                    <Row gutter={[8, 8]}>
                        {mediaAssets.map(asset => (
                            <Col span={12} key={asset.id}>
                                <Card hoverable size="small" className="media-asset-card">
                                    <Row gutter={8} wrap={false} align="top">
                                        <Col flex="48px">
                                            <Avatar
                                                shape="square" size={48} src={asset.objectURL}
                                                icon={!asset.objectURL ? (asset.type.startsWith('video') ? <VideoCameraOutlined /> : <FileImageOutlined />) : null}
                                                style={{ objectFit: 'cover', background: token.colorFillAlter }}
                                            />
                                        </Col>
                                        <Col flex="auto" style={{ overflow: 'hidden' }}>
                                            <Tooltip title={asset.name} placement="bottomLeft">
                                                {/* Use CSS for multi-line ellipsis if needed, or keep single line */}
                                                <Text strong ellipsis={true} style={{ color: token.colorText, display: 'block' }}>
                                                    {asset.name}
                                                </Text>
                                            </Tooltip>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* Empty State / Uploading Message */}
                    {mediaAssets.length === 0 && editorState !== 'uploading' && (
                        <div style={{textAlign: 'center', padding: '20px 0'}}>
                            <Paragraph type="secondary" style={{ marginBottom: 8 }}>Drop files here or</Paragraph>
                            <Button type="link" style={{ padding: 0 }} onClick={() => {
                                const draggerInput = document.querySelector('.media-panel-dragger .ant-upload-btn input');
                                if (draggerInput instanceof HTMLElement) draggerInput.click();
                            }}>click to upload</Button>
                        </div>
                    )}
                    {editorState === 'uploading' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Text style={{ color: token.colorTextSecondary }}>Processing upload...</Text>
                        </div>
                    )}
                </Dragger>
            </div>
        </div>
    );
});