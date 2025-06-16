// src/Components/VideoPage/NavigationAndToolbar.tsx
import React from 'react';
import {
    Layout, Menu, Input, Space, Button, Typography, Dropdown, Badge, Form, DatePicker, Radio
} from 'antd';
import {
    SearchOutlined, FolderOutlined, SettingOutlined, ShareAltOutlined,
    QuestionCircleOutlined, UserOutlined, DownOutlined, BellOutlined,
    UsergroupAddOutlined, CloseOutlined, FilterOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { RadioChangeEvent } from 'antd/es/radio';

// Shared Utilities & Interfaces
import { DarkModeToggle } from './utils';

const { Header, Sider } = Layout;
const { Text, Title } = Typography;

interface NavigationAndToolbarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    isSearchVisible: boolean;
    setIsSearchVisible: (visible: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchInputRef: React.RefObject<any>;
    showSettingsPanel: () => void;
    handleOpenUpgradeModal: () => void;
    displayedTeamName: string;
    displayedUsername: string;
    displayedEmail: string;
    activeFilterCount: number;
    filterVisible: boolean;
    setFilterVisible: (visible: boolean) => void;
    dateFilterRange: [Dayjs | null, Dayjs | null] | null;
    handleDateFilterChange: (dates: any) => void;
    durationFilter: string | null;
    handleDurationFilterChange: (e: RadioChangeEvent) => void;
    clearAllFilters: () => void;
    screens: { [key: string]: boolean };
}

export const NavigationAndToolbar: React.FC<NavigationAndToolbarProps> = ({
                                                                              collapsed, setCollapsed, isSearchVisible, setIsSearchVisible,
                                                                              searchQuery, setSearchQuery, searchInputRef, showSettingsPanel,
                                                                              handleOpenUpgradeModal, displayedTeamName, displayedUsername,
                                                                              displayedEmail, activeFilterCount, filterVisible, setFilterVisible,
                                                                              dateFilterRange, handleDateFilterChange, durationFilter, handleDurationFilterChange,
                                                                              clearAllFilters, screens
                                                                          }) => {
    // Example for menu selection, could be managed in parent or here if static
    const getSelectedKeys = () => ['new-folder-item'];

    const filterMenuContent = (
        <div
            style={{
                padding: '16px',
                width: 300,
                backgroundColor: 'var(--ant-popover-bg, white)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                borderRadius: 4
            }}
            onClick={e => e.stopPropagation()}
        >
            <Title level={5} style={{ marginBottom: 16 }}>
                Filter Projects
            </Title>
            <Form layout="vertical" style={{ width: '100%' }}>
                <Form.Item label="By Date Updated" style={{ marginBottom: 16 }}>
                    <DatePicker.RangePicker
                        value={dateFilterRange as any}
                        onChange={handleDateFilterChange}
                        style={{ width: '100%' }}
                        allowClear
                    />
                </Form.Item>
                <Form.Item label="By Video Duration" style={{ marginBottom: 16 }}>
                    <Radio.Group
                        value={durationFilter}
                        onChange={handleDurationFilterChange}
                        optionType="button"
                        buttonStyle="solid"
                        style={{ width: '100%', display: 'flex' }}
                    >
                        <Radio.Button value="under_1m" style={{ flex: 1, textAlign: 'center' }}>
                            {'< 1 min'}
                        </Radio.Button>
                        <Radio.Button value="1m_to_3m" style={{ flex: 1, textAlign: 'center' }}>
                            1-3 min
                        </Radio.Button>
                        <Radio.Button value="over_3m" style={{ flex: 1, textAlign: 'center' }}>
                            {'> 3 min'}
                        </Radio.Button>
                    </Radio.Group>
                    {durationFilter && (
                        <Button
                            type="link"
                            onClick={() => handleDurationFilterChange({ target: { value: null } } as RadioChangeEvent)}
                            style={{ paddingLeft: 0, marginTop: 4, fontSize: '12px' }}
                        >
                            Clear duration filter
                        </Button>
                    )}
                </Form.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 24 }}>
                    <Button onClick={clearAllFilters} disabled={activeFilterCount === 0}>
                        Clear All Filters
                    </Button>
                    <Button type="primary" onClick={() => setFilterVisible(false)}>Done</Button>
                </Space>
            </Form>
        </div>
    );

    return (
        <>
            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={240}>
                <div style={{
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
                        icon={<SearchOutlined />}
                        onClick={() => { setIsSearchVisible(true); if (searchInputRef.current) searchInputRef.current.focus(); }}
                    >
                        Search
                    </Menu.Item>
                    <Menu.Item key="settings-main-menu" icon={<SettingOutlined />} onClick={showSettingsPanel}>
                        Settings
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.SubMenu key="team-folders" title="Team Folders" icon={<FolderOutlined />}>
                        <Menu.Item key="new-folder-item" icon={<FolderOutlined />}>New Folder</Menu.Item>
                    </Menu.SubMenu>
                    <Menu.Divider />
                    <Menu.Item key="shared-with-me" icon={<ShareAltOutlined />}>Shared with Me</Menu.Item>
                    <Menu.Item key="help-resources" icon={<QuestionCircleOutlined />}>Help and Resources</Menu.Item>
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

            <Header style={{
                padding: '0 16px', background: 'var(--ant-layout-header-background, #fff)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--ant-border-color-split, #f0f0f0)'
            }}>
                {isSearchVisible ? (
                    <Input.Search
                        ref={searchInputRef}
                        placeholder="Search projects by name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onSearch={value => setSearchQuery(value)}
                        allowClear
                        style={{ flexGrow: 1, marginRight: 16 }}
                    />
                ) : (
                    <div style={{
                        display: 'flex', alignItems: 'center', fontWeight: 'bold',
                        fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {displayedTeamName}
                        <DownOutlined style={{ marginLeft: 8, fontSize: 12, cursor: 'pointer' }} />
                    </div>
                )}
                <Space size="middle" style={{ marginRight: screens.md ? 24 : 16 }}>
                    {!isSearchVisible && (
                        <Button
                            type="primary"
                            onClick={handleOpenUpgradeModal}
                            style={{ backgroundColor: '#f89b29', borderColor: '#f89b29', fontWeight: 'bold' }}
                        >
                            UPGRADE ✨
                        </Button>
                    )}
                    {isSearchVisible ? (
                        <Button
                            type="text"
                            shape="circle"
                            icon={<CloseOutlined />}
                            onClick={() => { setIsSearchVisible(false); setSearchQuery(''); }}
                            style={{ fontSize: "20px", color: 'unset' }}
                            aria-label="Close search"
                        />
                    ) : (
                        <SearchOutlined
                            style={{ fontSize: 20, cursor: 'pointer' }}
                            onClick={() => setIsSearchVisible(true)}
                            aria-label="Open search"
                        />
                    )}
                    <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                    <Dropdown
                        overlay={filterMenuContent}
                        trigger={['click']}
                        open={filterVisible}
                        onOpenChange={setFilterVisible}
                    >
                        <Button type="text">
                            <Space>
                                <FilterOutlined style={{ fontSize: 20 }} />
                                {activeFilterCount > 0 && (
                                    <Badge count={activeFilterCount} size="small" offset={[0, -1]} />
                                )}
                            </Space>
                        </Button>
                    </Dropdown>
                    <SettingOutlined style={{ fontSize: 20, cursor: 'pointer' }} onClick={showSettingsPanel} />
                    <UserOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                    <UsergroupAddOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                    <DarkModeToggle />
                </Space>
            </Header>
        </>
    );
};