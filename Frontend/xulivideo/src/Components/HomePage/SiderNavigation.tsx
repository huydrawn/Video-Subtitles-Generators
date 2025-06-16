// src/Components/VideoPage/SiderNavigation.tsx
import React from 'react';
import { Layout, Menu, Space, Typography, Button } from 'antd';
import {
    SearchOutlined, FolderOutlined, SettingOutlined, ShareAltOutlined,
    QuestionCircleOutlined, UserOutlined, DownOutlined
} from '@ant-design/icons';

import { DarkModeToggle } from './utils';

const { Sider } = Layout;
const { Text } = Typography;

interface SiderNavigationProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    displayedTeamName: string;
    displayedUsername: string;
    displayedEmail: string;
    searchInputRef: React.RefObject<any>;
    setIsSearchVisible: (visible: boolean) => void;
    showSettingsPanel: () => void;
}

export const SiderNavigation: React.FC<SiderNavigationProps> = ({
                                                                    collapsed, setCollapsed, displayedTeamName, displayedUsername,
                                                                    displayedEmail, searchInputRef, setIsSearchVisible, showSettingsPanel
                                                                }) => {
    const getSelectedKeys = () => ['new-folder-item'];

    return (
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={240}>
            <div id="sider-workspace-name" style={{ // Thêm ID ở đây
                height: 40, margin: 12, background: 'rgba(255,255,255,0.1)',
                borderRadius: 4, textAlign: 'center', lineHeight: '40px', color: 'white',
                fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap',
                textOverflow: 'ellipsis', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '0 8px'
            }}>
                {collapsed ? 'VSA' : displayedTeamName}
                {!collapsed && <DownOutlined style={{ marginLeft: 8, fontSize: 12 }} />}
            </div>
            <Menu theme="dark" selectedKeys={getSelectedKeys()} mode="inline" style={{ borderRight: 0 }}>
                <Menu.Item
                    key="search-sider"
                    id="sider-search-menu-item" // Thêm ID ở đây
                    icon={<SearchOutlined />}
                    onClick={() => { setIsSearchVisible(true); if (searchInputRef.current) searchInputRef.current.focus(); }}
                >
                    Search
                </Menu.Item>
                <Menu.Item key="settings-main-menu" id="sider-settings-menu-item" icon={<SettingOutlined />} onClick={showSettingsPanel}> {/* Thêm ID ở đây */}
                    Settings
                </Menu.Item>
                <Menu.Divider />

                <Menu.Divider />

            </Menu>
            {!collapsed && displayedUsername && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex',
                    alignItems: 'center', gap: 12, backgroundColor: '#001529', color: 'white'
                }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%', backgroundColor: '#6a1b9a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 'bold', color: 'white'
                    }}>
                        {displayedUsername.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{
                            fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150
                        }}>
                            {displayedUsername}
                        </div>
                        <div style={{
                            fontSize: 12, color: '#aaa', whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150
                        }}>
                            {displayedEmail}
                        </div>
                    </div>
                </div>
            )}
        </Sider>
    );
};