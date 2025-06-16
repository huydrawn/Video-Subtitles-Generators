import React from 'react';
import {
    Layout, Menu, Input, Space, Button, Typography, Dropdown, Badge, Form, DatePicker, Radio, Col, Row, Divider, Spin
} from 'antd';
import {
    SearchOutlined, SettingOutlined, BellOutlined,
    UserOutlined, UsergroupAddOutlined, CloseOutlined, FilterOutlined,
    PlusOutlined, TranslationOutlined, BarsOutlined, BulbOutlined, // BarsOutlined cho Repurpose
    PictureOutlined, DownOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { RadioChangeEvent } from 'antd/es/radio';

// Shared Utilities & Interfaces
import { DarkModeToggle, Project } from './utils';
import { ProjectCard } from './utils';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

interface HeaderAndContentProps {
    isSearchVisible: boolean;
    setIsSearchVisible: (visible: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchInputRef: React.RefObject<any>;
    showSettingsPanel: () => void;
    handleOpenUpgradeModal: () => void;
    displayedTeamName: string;
    screens: { [key: string]: boolean };
    startTour: () => void;

    // Filter Props
    activeFilterCount: number;
    filterVisible: boolean;
    setFilterVisible: (visible: boolean) => void;
    dateFilterRange: [Dayjs | null, Dayjs | null] | null;
    handleDateFilterChange: (dates: any) => void;
    durationFilter: string | null;
    handleDurationFilterChange: (e: RadioChangeEvent) => void;
    clearAllFilters: () => void;

    // Project List Props
    filteredProjects: Project[];
    displayedUsername: string;
    handleProjectCardClick: (project: Project) => void;
    handleOpenRenameModal: (project: Project) => void;
    handleDeleteProjectClick: (project: Project) => void;
    showCreateProjectModal: () => void;
    isLoadingProjects: boolean;
    hasUserData: boolean;
    debouncedSearchQuery: string;
    handleChangetoSummary: () => void;
}

export const HeaderAndContent: React.FC<HeaderAndContentProps> = ({
                                                                      isSearchVisible, setIsSearchVisible, searchQuery, setSearchQuery, searchInputRef,
                                                                      showSettingsPanel, handleOpenUpgradeModal, displayedTeamName, screens,
                                                                      activeFilterCount, filterVisible, setFilterVisible, dateFilterRange, handleDateFilterChange,
                                                                      durationFilter, handleDurationFilterChange, clearAllFilters,
                                                                      filteredProjects, displayedUsername, handleProjectCardClick, handleOpenRenameModal,
                                                                      handleDeleteProjectClick, showCreateProjectModal, isLoadingProjects, hasUserData,
                                                                      debouncedSearchQuery, handleChangetoSummary, startTour // Destructure startTour
                                                                  }) => {

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
            <Typography.Title level={5} style={{ marginBottom: 16 }}>
                Filter Projects
            </Typography.Title>
            <Divider style={{ marginTop: 0, marginBottom: 16 }} />
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
                <Row gutter={8} justify="space-between" align="middle" style={{ marginTop: 24 }}>
                    <Col>
                        <Button onClick={clearAllFilters} disabled={activeFilterCount === 0}>
                            Clear All Filters
                        </Button>
                    </Col>
                    <Col>
                        <Button type="primary" onClick={() => setFilterVisible(false)}>Done</Button>
                    </Col>
                </Row>
            </Form>
        </div>
    );

    return (
        <Layout className="site-layout">
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
                            id="header-upgrade-button" // Thêm ID ở đây
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
                            id="header-search-icon" // Thêm ID ở đây
                            style={{ fontSize: 20, cursor: 'pointer' }}
                            onClick={() => setIsSearchVisible(true)}
                            aria-label="Open search"
                        />
                    )}
                    <div id="header-filters-dropdown"> {/* Wrapped Dropdown with a div for ID */}
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
                    </div>
                    <SettingOutlined id="header-settings-icon" style={{ fontSize: 20, cursor: 'pointer' }} onClick={showSettingsPanel} /> {/* Thêm ID ở đây */}

                    <div id="header-dark-mode-toggle"> {/* Wrapped DarkModeToggle with a div for ID */}
                        <DarkModeToggle />
                    </div>
                </Space>
            </Header>

            <Content style={{
                margin: '0 16px', padding: 24, minHeight: 280,
                background: 'var(--ant-layout-content-background, transparent)'
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 24
                }}>
                    <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                        {displayedTeamName || 'My Workspace'}
                        <DownOutlined style={{ marginLeft: 8, fontSize: 16, cursor: 'pointer' }} />
                    </Title>
                </div>
                <Space size="middle" style={{ marginBottom: 24 }}>
                    <Button
                        id="content-create-new-button" // Thêm ID ở đây
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={showCreateProjectModal}
                        style={{ fontWeight: 'bold' }}

                    >
                        Create new
                    </Button>
                    <Button id="content-summary-button" icon={<TranslationOutlined />} onClick={handleChangetoSummary}>Summary</Button> {/* Thêm ID ở đây */}
                    <Button
                        id="content-guide-button" // Thêm ID này để Intro.js có thể nhắm mục tiêu
                        icon={<QuestionCircleOutlined />} // Icon mới
                        onClick={startTour} // Gọi hàm startTour khi click
                    >
                        Guide
                    </Button>
                    <Button id="content-generate-button" icon={<BulbOutlined />}>Generate</Button> {/* Thêm ID ở đây */}
                </Space>

                {/* Corrected ternary JSX syntax */}
                {isLoadingProjects && filteredProjects.length === 0 ? (
                    <Row gutter={[16, 24]} justify="center" style={{ marginTop: 40}}>
                        <Col> <Spin tip="Loading projects..." /> </Col>
                    </Row>
                ) : filteredProjects.length > 0 ? (
                    <Row gutter={[16, 24]}>
                        {filteredProjects.map((project) => (
                            <Col key={project.publicId} className="gutter-row" xs={24} sm={12} md={8} lg={6} xl={4}>
                                <ProjectCard
                                    project={project}
                                    ownerName={displayedUsername}
                                    onClick={handleProjectCardClick}
                                    onRename={handleOpenRenameModal}
                                    onDelete={handleDeleteProjectClick}
                                />
                            </Col>
                        ))}
                    </Row>
                ) : (debouncedSearchQuery.trim() !== '' || activeFilterCount > 0) ? (
                    <Row gutter={[16, 24]} justify="center" style={{ marginTop: 40 }}>
                        <Col style={{ textAlign: 'center' }}>
                            <SearchOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
                            <Text>No projects match your current search and filter criteria.</Text><br />
                            {debouncedSearchQuery.trim() !== '' && (
                                <Text type="secondary" style={{ display: 'block' }}>
                                    Try a different search term.
                                </Text>
                            )}
                            {activeFilterCount > 0 && (
                                <Text type="secondary" style={{ display: 'block' }}>
                                    Try adjusting or clearing your filters.
                                </Text>
                            )}
                            {activeFilterCount > 0 && (
                                <Button type="link" onClick={clearAllFilters} style={{ marginTop: 8 }}>
                                    Clear All Filters
                                </Button>
                            )}
                        </Col>
                    </Row>
                ) : (
                    <Row gutter={[16, 24]} justify="center" style={{ marginTop: 40 }}>
                        <Col style={{ textAlign: 'center' }}>
                            <PictureOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
                            <Text>No projects found in your workspace.</Text><br />
                            <Text type="secondary">Click "Create new" to get started.</Text>
                        </Col>
                    </Row>
                )}
            </Content>
        </Layout>
    );
};