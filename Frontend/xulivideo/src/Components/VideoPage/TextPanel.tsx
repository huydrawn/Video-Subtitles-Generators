// src/components/TextPanel.tsx
import React from 'react';
import { Button, Typography, Space } from 'antd';
import { theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface TextPanelProps {
    onAddTextClip: () => void;
}

export const TextPanel: React.FC<TextPanelProps> = React.memo(({ onAddTextClip }) => {
    const { token } = theme.useToken();

    return (
        <div className="contextual-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', background: token.colorBgContainer }}>
            {/* Header */}
            <Title level={5} style={{ marginBottom: 16, flexShrink: 0, color: token.colorText }}>
                TEXT
            </Title>

            {/* Add Text Button */}
            <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                style={{ marginBottom: 24, flexShrink: 0 }}
                onClick={onAddTextClip}
            >
                Add Text
            </Button>

            {/* Placeholder for templates */}
            <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 16, flexShrink: 0 }}>
                Templates (Coming Soon)
            </Paragraph>

            <div style={{
                flexGrow: 1,
                textAlign: 'center',
                color: token.colorTextSecondary,
                overflowY: 'auto', // Allow scrolling for templates if many
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadiusLG,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                background: token.colorBgLayout // Slightly different background
            }}>
                <Text type="secondary" style={{fontSize: '12px'}}>
                    Click 'Add Text' to add a basic text clip to the timeline at the current playhead position. Select the clip on the timeline to edit its properties.
                </Text>
            </div>
        </div>
    );
});