// src/Components/VideoPage/ProjectListSection.tsx
import React from 'react';
import {
    Layout, Row, Col, Space, Button, Typography, Spin
} from 'antd';
import {
    PlusOutlined, TranslationOutlined, BarsOutlined, BulbOutlined,
    PictureOutlined, SearchOutlined, DownOutlined
} from '@ant-design/icons';

// Shared Utilities & Interfaces
import { Project } from './utils';
import { ProjectCard } from './utils'; // Assuming ProjectCard is moved to utils or a separate file

const { Content } = Layout;
const { Title, Text } = Typography;

interface ProjectListSectionProps {
    filteredProjects: Project[];
    displayedUsername: string;
    handleProjectCardClick: (project: Project) => void;
    handleOpenRenameModal: (project: Project) => void;
    handleDeleteProjectClick: (project: Project) => void;
    showCreateProjectModal: () => void;
    isLoadingProjects: boolean;
    hasUserData: boolean; // Checks if userData.workspace exists
    debouncedSearchQuery: string;
    activeFilterCount: number;
    displayedTeamName: string;
    handleChangetoSummary: () => void;
    clearAllFilters: () => void;
}

export const ProjectListSection: React.FC<ProjectListSectionProps> = ({
                                                                          filteredProjects, displayedUsername, handleProjectCardClick,
                                                                          handleOpenRenameModal, handleDeleteProjectClick, showCreateProjectModal,
                                                                          isLoadingProjects, hasUserData, debouncedSearchQuery, activeFilterCount,
                                                                          displayedTeamName, handleChangetoSummary, clearAllFilters
                                                                      }) => {
    return (
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
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showCreateProjectModal}
                    style={{ fontWeight: 'bold' }}
                    disabled={isLoadingProjects || !hasUserData}
                >
                    Create new
                </Button>
                <Button icon={<TranslationOutlined />} onClick={handleChangetoSummary}>Summary</Button>
                <Button icon={<BarsOutlined />}>Repurpose</Button>
                <Button icon={<BulbOutlined />}>Generate</Button>
            </Space>

            {isLoadingProjects && filteredProjects.length === 0 ? (
                <Row gutter={[16, 24]} justify="center" style={{ marginTop: 40 }}>
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
    );
};