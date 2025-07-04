import React from 'react';
import { Menu, Tooltip, Button } from 'antd';
import { theme } from 'antd';
import {
    VideoCameraOutlined, FontSizeOutlined, AudioOutlined,
    SettingOutlined, AppstoreOutlined, TranslationOutlined,
    MenuUnfoldOutlined, CustomerServiceOutlined,
    LeftOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd'; // Use MenuProps directly

// Custom data structure for menu items
interface CustomMenuItemData {
    key: string;
    icon?: React.ReactNode;
    title: string;
    disabled?: boolean;
}

interface MainMenuProps {
    selectedKey: string;
    onClick: (e: { key: string }) => void;
    mode?: 'inline' | 'vertical';
    collapsed?: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = React.memo(({
                                                                 selectedKey,
                                                                 onClick,
                                                                 mode = 'inline',
                                                                 collapsed
                                                             }) => {
    const { token } = theme.useToken();

    const menuItemsData: CustomMenuItemData[] = [
        { key: 'media', icon: <VideoCameraOutlined />, title: "Media" },
        { key: 'text', icon: <FontSizeOutlined />, title: "Text" },
        { key: 'visuals', icon: <AppstoreOutlined />, title: "Visuals", disabled: true },
        { key: 'audio', icon: <AudioOutlined />, title: "Audio", disabled: true },
        // Ensure 'subtitles' key exists and is enabled if you want to click it
        { key: 'subtitles', icon: <MenuUnfoldOutlined />, title: "Subtitles", disabled: false },
        { key: 'transcript', icon: <TranslationOutlined />, title: "Transcript", disabled: true },
        { key: 'translate', icon: <TranslationOutlined />, title: "Translate", disabled: true },
        { key: 'ai-voice', icon: <CustomerServiceOutlined />, title: "AI Voice", disabled: true },
    ];

    // Map data to Ant Design Menu items format
    const antdMenuItems: MenuProps['items'] = menuItemsData.map((itemData) => {
        const isInlineCollapsed = mode === 'inline' || (mode === 'vertical' && collapsed);
        const labelContent = isInlineCollapsed ? itemData.icon : itemData.title;

        return {
            key: itemData.key,
            icon: isInlineCollapsed ? null : itemData.icon, // Only show icon when not collapsed inline
            disabled: itemData.disabled,
            label: isInlineCollapsed
                ? <Tooltip placement="right" title={itemData.title}>{labelContent}</Tooltip>
                : labelContent,
            // Add icon specifically for inline collapsed mode rendering
            ...(isInlineCollapsed && { icon: itemData.icon }),
        };
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* This back button might be part of a header or a specific UI pattern, keep it if needed */}
            {mode === 'inline' && (
                <div style={{
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Button
                        type="text"
                        icon={<LeftOutlined />}
                        style={{ color: token.colorTextSecondary }}
                        disabled
                        title="Back (Placeholder)"
                    />
                </div>
            )}

            <Menu
                className="main-menu"
                onClick={onClick}
                selectedKeys={[selectedKey]}
                mode={mode}
                inlineCollapsed={mode === 'inline' ? true : collapsed}
                theme="dark"
                items={antdMenuItems}
                style={{
                    flexGrow: 1,
                    borderRight: 0,
                    background: 'transparent',
                    paddingTop: mode === 'inline' ? '8px' : '0px',
                }}
            />

            {mode === 'inline' && (
                <div style={{
                    paddingBottom: 16,
                    marginTop: 'auto',
                    width: '100%',
                    textAlign: 'center',
                    flexShrink: 0
                }}>
                    <Tooltip placement="right" title="Settings (Placeholder)">
                        <Button
                            type="text"
                            shape="circle"
                            icon={<SettingOutlined />}
                            disabled
                            style={{ color: token.colorTextSecondary }}
                        />
                    </Tooltip>
                </div>
            )}
        </div>
    );
});