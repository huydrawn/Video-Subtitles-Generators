// src/Components/VideoPage/index.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Layout, Menu, Input, Row, Col, Card, Space, Grid, Button, Typography, Dropdown, Spin, Modal, Form,
    Drawer, DatePicker, Radio, Divider, Badge, Progress
} from 'antd';
import {
    SearchOutlined, FolderOutlined, SettingOutlined, ShareAltOutlined, QuestionCircleOutlined, UserOutlined,
    PlusOutlined, DownOutlined, EllipsisOutlined, TranslationOutlined, BarsOutlined, BulbOutlined,
    BellOutlined, UsergroupAddOutlined, SunOutlined, MoonOutlined, PictureOutlined,
    DatabaseOutlined, UserSwitchOutlined, CloseOutlined, FilterOutlined, EditOutlined, DeleteOutlined // Added EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import * as DarkReader from 'darkreader';

// --- Redux Imports ---
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../Store/index'; // Adjusted path
import {
    fetchUserData,
    createProject,
    renameProject, // Added
    deleteProject, // Added
    clearError,
    logoutUser
} from '../../Store/useSlice'; // Adjusted path to useSlice

// --- Dayjs Imports and Configuration ---
// ... (keep as is)
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import type { Dayjs } from 'dayjs';
import type { RadioChangeEvent } from 'antd/es/radio';

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);


const { Header, Sider, Content } = Layout;
const { Meta } = Card;
const { Title, Text } = Typography; // Paragraph removed as it's not used
const { useBreakpoint } = Grid;

// --- Custom Hook: useDebounce ---
// ... (keep as is)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Interfaces (keep as is)
// ... (keep as is)
export interface Project {
    projectId: number;
    publicId: string;
    projectName: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    video: {
        videoId: number;
        title: string;
        cloudinaryPublicId: string;
        url: string;
        thumbnailUrl: string;
        secureUrl: string;
        resourceType: string;
        format: string;
        duration: number; // in seconds
        bytes: number;
        width: number;
        height: number;
    } | null;
}

export interface Workspace {
    workspaceId: number;
    publicId: string;
    workspaceName: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    projects: Project[];
}

export interface UserDTO {
    userId: number;
    username: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    workspace: Workspace | null;
}

// --- Helper function to format bytes ---
// ... (keep as is)
const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- Dark Mode Toggle Component (Keep as is) ---
// ... (keep as is)
const DarkModeToggle = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            console.warn("DarkReader functions not available.");
            return false;
        }
        const persisted = localStorage.getItem('darkModeEnabled');
        try {
            return persisted ? JSON.parse(persisted) : DarkReader.isEnabled();
        } catch (error) {
            console.error("Error parsing darkModeEnabled from localStorage", error);
            return DarkReader.isEnabled();
        }
    });

    useEffect(() => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            // console.warn("DarkReader functions not available, cannot apply theme.");
            return;
        }
        const currentlyEnabled = DarkReader.isEnabled();

        if (isDarkMode && !currentlyEnabled) {
            try {
                DarkReader.enable({
                    brightness: 100,
                    contrast: 90,
                    sepia: 10,
                });
            } catch (error) {
                console.error("Error enabling DarkReader:", error);
                setIsDarkMode(false);
            }
        } else if (!isDarkMode && currentlyEnabled) {
            try {
                DarkReader.disable();
            } catch (error) {
                console.error("Error disabling DarkReader:", error);
                setIsDarkMode(true);
            }
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            // console.warn("DarkReader functions not available, cannot toggle.");
            return;
        }
        const newState = !isDarkMode;
        try {
            if (newState) {
                DarkReader.enable({
                    brightness: 100,
                    contrast: 90,
                    sepia: 10,
                });
            } else {
                DarkReader.disable();
            }
            setIsDarkMode(newState);
            localStorage.setItem('darkModeEnabled', JSON.stringify(newState));
        } catch (error) {
            console.error("Error toggling DarkReader:", error);
            setIsDarkMode(isDarkMode);
        }
    };

    if (typeof DarkReader.enable !== 'function') {
        return null;
    }

    return (
        <Button
            type="text"
            shape="circle"
            icon={
                isDarkMode ? (
                    <SunOutlined />
                ) : (
                    <MoonOutlined />
                )
            }
            onClick={toggleDarkMode}
            style={{
                fontSize: "20px",
                color: 'unset'
            }}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        />
    );
};

// --- Project Card Component (MODIFIED) ---
const ProjectCard: React.FC<{
    project: Project;
    ownerName: string;
    onClick: (project: Project) => void;
    onRename: (project: Project) => void; // Added prop
    onDelete: (project: Project) => void; // Added prop
}> = ({ project, ownerName, onClick, onRename, onDelete }) => {
    const { projectName, updatedAt, video } = project;
    const thumbnailUrl = video?.thumbnailUrl;

    const formatDate = (isoString: string) => {
        // ... (keep as is)
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
            });
        } catch (e) {
            console.error("Failed to parse date:", isoString, e);
            return 'Invalid Date';
        }
    };
    let durationString = '';
    // ... (keep as is)
    if (video?.duration) {
        const totalSeconds = Math.round(video.duration);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        durationString = `${minutes}:${seconds}`;
    }
    let dimensionsString = '';
    if (video?.width && video?.height) {
        dimensionsString = `${video.width}x${video.height}`;
    }

    const menu = (
        <Menu onClick={(e) => e.domEvent.stopPropagation()}>
            <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => onRename(project)}>
                Edit Details
            </Menu.Item>
            <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={() => onDelete(project)}>
                Delete Project
            </Menu.Item>
        </Menu>
    );

    return (
        <Card
            hoverable
            style={{
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 8,
            }}
            onClick={() => onClick(project)} // Main card click still navigates
        >
            {/* ... (thumbnail and card content as before) ... */}
            <div style={{
                width: '100%',
                paddingTop: '56.25%',
                backgroundColor: '#e9e9e9',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                marginBottom: 8,
                borderBottom: '1px solid #f0f0f0',
                overflow: 'hidden'
            }}>
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={`${projectName || 'Project'} thumbnail`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <PictureOutlined style={{ fontSize: 48, color: '#ccc', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                )}
            </div>
            <div style={{ padding: '0 8px 8px 8px' }}>
                <Text strong ellipsis={{ tooltip: projectName }} style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                    {projectName || 'Untitled Project'}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {ownerName}, {formatDate(updatedAt)}
                </Text>
                {durationString && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Duration: {durationString}
                    </Text>
                )}
                {dimensionsString && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Dimensions: {dimensionsString}
                    </Text>
                )}
            </div>
            <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '50%',
                padding: 4,
                zIndex: 10, // Ensure dropdown button is clickable
            }}>
                <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
                    <Button
                        type="text"
                        shape="circle"
                        icon={<EllipsisOutlined style={{ fontSize: 18, color: '#333' }} />}
                        onClick={e => {
                            e.preventDefault(); // Prevent card click
                            e.stopPropagation(); // Stop propagation to card
                        }}
                        aria-label="Project options"
                    />
                </Dropdown>
            </div>
        </Card>
    );
};


// Component for the New Homepage (MODIFIED)
const NewHomePage: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const dispatch = useDispatch<AppDispatch>();

    // --- Redux Selectors ---
    const {
        userData,
        projects,
        isLoading: isLoadingUserData,
        isSubmitting: isSubmittingProject, // For create
        isProjectActionLoading, // For rename/delete
        error: userError
    } = useSelector((state: RootState) => state.user);

    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [createForm] = Form.useForm();

    // --- State for Rename Modal ---
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [renameForm] = Form.useForm();


    // --- State for Settings Panel ---
    // ... (keep as is)
    const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);

    // --- State for Search Functionality ---
    // ... (keep as is)
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const searchInputRef = useRef<any>(null); // For focusing Input.Search

    // --- State for Filtering ---
    // ... (keep as is)
    const [filterVisible, setFilterVisible] = useState(false);
    const [dateFilterRange, setDateFilterRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [durationFilter, setDurationFilter] = useState<string | null>(null); // "under_1m", "1m_to_3m", "over_3m"

    // --- Focus search input when it becomes visible ---
    useEffect(() => {
        if (isSearchVisible && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchVisible]);

    // --- Filter Handlers (keep as is) ---
    // ...
    const handleDateFilterChange = (
        dates: [Dayjs | null, Dayjs | null] | null,
        _dateStrings: [string, string]
    ) => {
        setDateFilterRange(dates);
    };

    const handleDurationFilterChange = (e: RadioChangeEvent) => {
        setDurationFilter(e.target.value as string | null);
    };

    const clearAllFilters = () => {
        setDateFilterRange(null);
        setDurationFilter(null);
        // setFilterVisible(false); // Optionally close the filter dropdown
    };

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (dateFilterRange && (dateFilterRange[0] || dateFilterRange[1])) {
            count++;
        }
        if (durationFilter) {
            count++;
        }
        return count;
    }, [dateFilterRange, durationFilter]);

    // --- Filtered Projects for Display (keep as is) ---
    // ...
    const filteredProjects = useMemo(() => {
        let tempProjects = projects;

        // 1. Filter by search query
        if (debouncedSearchQuery.trim()) {
            tempProjects = tempProjects.filter(project =>
                project.projectName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }

        // 2. Filter by date updated
        if (dateFilterRange && (dateFilterRange[0] || dateFilterRange[1])) {
            const [rawStartDate, rawEndDate] = dateFilterRange;
            const startDate = rawStartDate ? dayjs(rawStartDate) : null;
            const endDate = rawEndDate ? dayjs(rawEndDate) : null;

            tempProjects = tempProjects.filter(project => {
                try {
                    const projectDate = dayjs(project.updatedAt);
                    if (!projectDate.isValid()) return false;

                    let match = true;
                    if (startDate) {
                        match = match && projectDate.isSameOrAfter(startDate, 'day');
                    }
                    if (endDate) {
                        match = match && projectDate.isSameOrBefore(endDate, 'day');
                    }
                    return match;
                } catch (e) {
                    console.error("Error parsing project date for filtering:", project.updatedAt, e);
                    return false;
                }
            });
        }

        // 3. Filter by duration
        if (durationFilter) {
            tempProjects = tempProjects.filter(project => {
                const duration = project.video?.duration;
                if (typeof duration !== 'number') return false;

                if (durationFilter === 'under_1m') return duration < 60;
                if (durationFilter === '1m_to_3m') return duration >= 60 && duration <= 180;
                if (durationFilter === 'over_3m') return duration > 180;
                return true;
            });
        }

        return tempProjects;
    }, [projects, debouncedSearchQuery, dateFilterRange, durationFilter]);

    // --- Fetch User Data (keep as is) ---
    // ...
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Not Logged In',
                text: 'Please log in to access this page.',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            }).then(() => {
                navigate('/login');
            });
            return;
        }
        if (!userData && !isLoadingUserData && !userError) {
            dispatch(fetchUserData())
                .unwrap()
                .catch((fetchError: any) => {
                    const errorMessage = typeof fetchError === 'string' ? fetchError : fetchError?.message || "An error occurred";
                    const shouldRedirect = errorMessage.includes("session has expired") || errorMessage.includes("Unauthorized");
                    Swal.fire({
                        icon: shouldRedirect ? 'warning' : 'error',
                        title: shouldRedirect ? 'Session Expired' : 'Fetch Failed',
                        text: errorMessage,
                        confirmButtonText: 'OK'
                    }).then(() => {
                        if (shouldRedirect) {
                            dispatch(logoutUser());
                            navigate('/login');
                        }
                    });
                });
        }
    }, [dispatch, navigate, userData, isLoadingUserData, userError]);

    // --- Calculate Total Storage Used (keep as is) ---
    const totalStorageUsedBytes = useMemo(() => {
        return projects.reduce((acc, project) => {
            return acc + (project.video?.bytes || 0);
        }, 0);
    }, [projects]);


    // --- Modal Handlers (Create Project - MODIFIED for clarity) ---
    const showCreateProjectModal = () => {
        if (!userData?.workspace?.publicId) {
            Swal.fire({
                icon: 'error',
                title: 'Cannot Create Project',
                text: 'User workspace information is missing. Please reload or contact support.',
            });
            return;
        }
        setIsCreateModalVisible(true);
        createForm.resetFields();
        if (userError) dispatch(clearError());
    };

    const handleCreateModalCancel = () => {
        setIsCreateModalVisible(false);
        createForm.resetFields();
    };

    const handleCreateProjectSubmit = async (values: { projectName: string; description: string }) => {
        const workspacePublicId = userData?.workspace?.publicId;
        if (!workspacePublicId) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Workspace information missing.' });
            handleCreateModalCancel();
            return;
        }
        dispatch(createProject({
            workspacePublicId,
            projectName: values.projectName,
            description: values.description,
        }))
            .unwrap()
            .then((newProject) => {
                Swal.fire({ icon: 'success', title: 'Success!', text: `Project "${newProject.projectName}" created.` });
                handleCreateModalCancel();
            })
            .catch((rejectionReason: any) => {
                const errorMessage = typeof rejectionReason === 'string' ? rejectionReason : "Failed to create project.";
                Swal.fire({ icon: 'error', title: 'Creation Failed', text: errorMessage })
                    .then(() => {
                        if (errorMessage.includes("You are not authorized") || errorMessage.includes("Unauthorized")) {
                            dispatch(logoutUser());
                            navigate('/login');
                        }
                    });
            });
    };

    // --- Rename Project Modal Handlers (NEW) ---
    const handleOpenRenameModal = (project: Project) => {
        if (!userData?.workspace?.publicId) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Workspace information is missing. Cannot rename project.',
            });
            return;
        }
        setEditingProject(project);
        renameForm.setFieldsValue({ newName: project.projectName });
        setIsRenameModalVisible(true);
        if (userError) dispatch(clearError());
    };

    const handleRenameModalCancel = () => {
        setIsRenameModalVisible(false);
        setEditingProject(null);
        renameForm.resetFields();
    };

    const handleRenameProjectSubmit = async (values: { newName: string }) => {
        if (!editingProject || !userData?.workspace?.publicId) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Required project or workspace information is missing.' });
            handleRenameModalCancel();
            return;
        }
        dispatch(renameProject({
            workspacePublicId: userData.workspace.publicId,
            projectPublicId: editingProject.publicId,
            newName: values.newName,
        }))
            .unwrap()
            .then((updatedProject) => {
                Swal.fire({ icon: 'success', title: 'Success!', text: `Project renamed to "${updatedProject.projectName}".` });
                handleRenameModalCancel();
            })
            .catch((rejectionReason: any) => {
                const errorMessage = typeof rejectionReason === 'string' ? rejectionReason : "Failed to rename project.";
                Swal.fire({ icon: 'error', title: 'Rename Failed', text: errorMessage })
                    .then(() => {
                        if (errorMessage.includes("You are not authorized") || errorMessage.includes("Unauthorized")) {
                            dispatch(logoutUser());
                            navigate('/login');
                        }
                    });
            });
    };

    // --- Delete Project Handler (NEW) ---
    const handleDeleteProjectClick = (project: Project) => {
        if (!userData?.workspace?.publicId) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Workspace information is missing. Cannot delete project.',
            });
            return;
        }
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the project "${project.projectName}". This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            customClass: {
                container: 'swal2-wide-container' // Ensures it's above modals if any
            }
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(deleteProject({
                    workspacePublicId: userData.workspace!.publicId, // Assert non-null as checked above
                    projectPublicId: project.publicId,
                }))
                    .unwrap()
                    .then(() => {
                        Swal.fire('Deleted!', `Project "${project.projectName}" has been deleted.`, 'success');
                    })
                    .catch((rejectionReason: any) => {
                        const errorMessage = typeof rejectionReason === 'string' ? rejectionReason : "Failed to delete project.";
                        Swal.fire({ icon: 'error', title: 'Deletion Failed', text: errorMessage })
                            .then(() => {
                                if (errorMessage.includes("You are not authorized") || errorMessage.includes("Unauthorized")) {
                                    dispatch(logoutUser());
                                    navigate('/login');
                                }
                            });
                    });
            }
        });
    };


    // --- Settings Panel Handlers (keep as is) ---
    const showSettingsPanel = () => setIsSettingsPanelVisible(true);
    const closeSettingsPanel = () => setIsSettingsPanelVisible(false);


    const handleChangetoSummary = () => navigate('/summary');

    const handleProjectCardClick = (project: Project) => {
        const { video, projectId, publicId } = project;

        // Bắt đầu với các thông tin cơ bản luôn cần thiết cho state điều hướng
        const navigationState: {
            projectId: number;
            publicId: string;
            initialVideoUrl?: string; // `?` cho biết thuộc tính này là tùy chọn
            videoWidth?: number;      // Tùy chọn
            videoHeight?: number;     // Tùy chọn
        } = {
            projectId: projectId,
            publicId: publicId,
        };

        // Nếu có thông tin video, thêm các thuộc tính liên quan vào state
        if (video) {
            if (video.secureUrl) {
                navigationState.initialVideoUrl = video.secureUrl;
            }

            // Chỉ thêm width và height nếu chúng là kiểu number hợp lệ
            if (typeof video.width === 'number' && typeof video.height === 'number') {
                navigationState.videoWidth = video.width;
                navigationState.videoHeight = video.height;
            }
        }

        // Thực hiện điều hướng với state đã được xây dựng
        navigate('/videoeditor', { state: navigationState });
    };

    const getSelectedKeys = () => ['new-folder-item']; // Example, adjust as needed

    // --- Render Logic (keep as is for loading/error states) ---
    if (isLoadingUserData && !userData && !userError) {
        // ...
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Loading your workspace..." />
            </Layout>
        );
    }

    if (userError && !isLoadingUserData && !userData) {
        // ...
        return (
            <Layout style={{ minHeight: '100vh', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Title level={3} type="danger">Oops! Something went wrong.</Title>
                <Text type="secondary" style={{marginBottom: 16}}>{userError}</Text>
                <Space>
                    <Button type="primary" onClick={() => dispatch(fetchUserData())} loading={isLoadingUserData}>Retry</Button>
                    <Button onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>Go to Login</Button>
                </Space>
            </Layout>
        );
    }

    if (!userData && !isLoadingUserData) {
        // ...
        return (
            <Layout style={{ minHeight: '100vh', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Title level={3}>Unable to load workspace</Title>
                <Text type="secondary" style={{marginBottom: 16}}>Please try logging in again or contact support.</Text>
                <Button type="primary" onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>Go to Login</Button>
            </Layout>
        );
    }

    const displayedUsername = userData?.username || 'User';
    const displayedEmail = userData?.email || 'email@example.com';
    const displayedTeamName = userData?.workspace?.workspaceName || `${displayedUsername}'s Workspace`;


    // --- Filter Dropdown Content (keep as is) ---
    // ...
    const filterMenuContent = (
        <div
            style={{
                padding: '16px',
                width: 300,
                backgroundColor: 'var(--ant-popover-bg, white)', // Theme aware background
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                borderRadius: 4
            }}
            onClick={e => e.stopPropagation()} // Prevent dropdown close on click inside
        >
            <Typography.Title level={5} style={{ marginBottom: 16 }}>Filter Projects</Typography.Title>
            <Divider style={{marginTop:0, marginBottom:16}}/>
            <Form layout="vertical" style={{width: '100%'}}>
                <Form.Item label="By Date Updated" style={{marginBottom: 16}}>
                    <DatePicker.RangePicker
                        value={dateFilterRange}
                        onChange={handleDateFilterChange}
                        style={{ width: '100%' }}
                        allowClear={true}
                    />
                </Form.Item>
                <Form.Item label="By Video Duration" style={{marginBottom: 16}}>
                    <Radio.Group
                        value={durationFilter}
                        onChange={handleDurationFilterChange}
                        optionType="button"
                        buttonStyle="solid"
                        style={{width: '100%', display: 'flex'}}
                    >
                        {/* Corrected lines below */}
                        <Radio.Button value="under_1m" style={{flex:1, textAlign:'center'}}> Nhỏ hơn 1 min </Radio.Button>
                        <Radio.Button value="1m_to_3m" style={{flex:1, textAlign:'center'}}> 1-3 min </Radio.Button>
                        <Radio.Button value="over_3m" style={{flex:1, textAlign:'center'}}> Lớn hơn 3 min </Radio.Button>
                    </Radio.Group>
                    {durationFilter && (
                        <Button type="link" onClick={() => setDurationFilter(null)} style={{ paddingLeft:0, marginTop: 4, fontSize: '12px' }}>
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
        <Layout style={{ minHeight: '100vh' }}>
            {/* Sider (keep as is) */}
            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={240}>
                {/* ... Sider content ... */}
                <div style={{ height: 40, margin: 12, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, textAlign: 'center', lineHeight: '40px', color: 'white', fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                    {collapsed ? 'VSA' : displayedTeamName}
                    {!collapsed && <DownOutlined style={{ marginLeft: 8, fontSize: 12 }} />}
                </div>

                <Menu theme="dark" selectedKeys={getSelectedKeys()} mode="inline" style={{ borderRight: 0 }}>
                    {/* Clicking Search in Sider can also open the header search input */}
                    <Menu.Item key="search-sider" icon={<SearchOutlined />} onClick={() => {
                        setIsSearchVisible(true);
                        if(searchInputRef.current) searchInputRef.current.focus();
                    }}>Search</Menu.Item>
                    <Menu.Item key="settings-main-menu" icon={<SettingOutlined />} onClick={showSettingsPanel}>
                        Settings
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.SubMenu key="team-folders" title="Team Folders" icon={<FolderOutlined />} >
                        <Menu.Item key="new-folder-item" icon={<FolderOutlined />}>New Folder</Menu.Item>
                    </Menu.SubMenu>

                    <Menu.Divider />
                    <Menu.Item key="shared-with-me" icon={<ShareAltOutlined />}>Shared with Me</Menu.Item>
                    <Menu.Item key="help-resources" icon={<QuestionCircleOutlined />}>Help and Resources</Menu.Item>
                </Menu>
                {!collapsed && userData && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#001529', color: 'white' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#6a1b9a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                            {displayedUsername ? displayedUsername.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <div style={{fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150}}>{displayedUsername}</div>
                            <div style={{fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150}}>{displayedEmail}</div>
                        </div>
                    </div>
                )}
            </Sider>

            <Layout className="site-layout">
                {/* Header (keep as is) */}
                <Header style={{ padding: '0 16px', background: 'var(--ant-layout-header-background, #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ant-border-color-split, #f0f0f0)' }}>
                    {/* ... Header content ... */}
                    {isSearchVisible ? (
                        <Input.Search
                            ref={searchInputRef}
                            placeholder="Search projects by name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onSearch={value => setSearchQuery(value)} // Optional: trigger search on enter/click icon
                            allowClear
                            style={{ flexGrow: 1, marginRight: 16 }}
                        />
                    ) : (
                        <div style={{display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {displayedTeamName} <DownOutlined style={{marginLeft: 8, fontSize: 12, cursor: 'pointer'}} />
                        </div>
                    )}
                    <Space size="middle" style={{ marginRight: screens.md ? 24 : 16 }}>
                        {!isSearchVisible && <Button type="primary" style={{backgroundColor: '#f89b29', borderColor: '#f89b29', fontWeight: 'bold'}}>UPGRADE ✨</Button>}

                        {isSearchVisible ? (
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    setIsSearchVisible(false);
                                    setSearchQuery(''); // Clear search query when closing
                                }}
                                style={{ fontSize: "20px", color: 'unset' }}
                                aria-label="Close search"
                            />
                        ) : (
                            <SearchOutlined
                                style={{fontSize: 20, cursor: 'pointer'}}
                                onClick={() => setIsSearchVisible(true)}
                                aria-label="Open search"
                            />
                        )}
                        <BellOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <SettingOutlined style={{fontSize: 20, cursor: 'pointer'}} onClick={showSettingsPanel} />
                        <UserOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <UsergroupAddOutlined style={{fontSize: 20, cursor: 'pointer'}} />
                        <DarkModeToggle />
                    </Space>
                </Header>

                <Content style={{ margin: '0 16px', padding: 24, minHeight: 280, background: 'var(--ant-layout-content-background, transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                            {userData?.workspace?.workspaceName || 'My Workspace'} <DownOutlined style={{ marginLeft: 8, fontSize: 16, cursor: 'pointer' }} />
                        </Title>
                        <Dropdown
                            overlay={filterMenuContent}
                            trigger={['click']}
                            open={filterVisible}
                            onOpenChange={setFilterVisible}
                        >
                            <Button>
                                <Space>
                                    <FilterOutlined />
                                    <span>Filters</span>
                                    {activeFilterCount > 0 && (
                                        <Badge count={activeFilterCount} size="small" offset={[0,-1]}/>
                                    )}
                                    <DownOutlined style={{ fontSize: 10 }}/>
                                </Space>
                            </Button>
                        </Dropdown>
                    </div>
                    <Space size="middle" style={{ marginBottom: 24 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={showCreateProjectModal} style={{fontWeight: 'bold'}} disabled={isLoadingUserData || !userData?.workspace}>
                            Create new
                        </Button>
                        {/* ... other buttons ... */}
                        <Button icon={<TranslationOutlined />} onClick={handleChangetoSummary}>Summary</Button>
                        <Button icon={<BarsOutlined />}>Repurpose</Button>
                        <Button icon={<BulbOutlined />}>Generate</Button>
                    </Space>

                    {/* Project List Display Logic (MODIFIED) */}
                    {isLoadingUserData && projects.length === 0 && !userError ? (
                        <Row gutter={[16, 24]} justify="center" style={{marginTop: 40}}>
                            <Col> <Spin tip="Loading projects..." /> </Col>
                        </Row>
                    ) : filteredProjects.length > 0 ? (
                        <Row gutter={[16, 24]}>
                            {filteredProjects.map((project) => (
                                <Col key={project.publicId} className="gutter-row" xs={24} sm={12} md={8} lg={6} xl={4}> {/* Changed key to publicId for better uniqueness */}
                                    <ProjectCard
                                        project={project}
                                        ownerName={displayedUsername}
                                        onClick={handleProjectCardClick}
                                        onRename={handleOpenRenameModal} // Pass rename handler
                                        onDelete={handleDeleteProjectClick} // Pass delete handler
                                    />
                                </Col>
                            ))}
                        </Row>
                    ) : (debouncedSearchQuery.trim() !== '' || activeFilterCount > 0) ? (
                        // ... (No projects match search/filter criteria)
                        <Row gutter={[16, 24]} justify="center" style={{marginTop: 40}}>
                            <Col style={{textAlign: 'center'}}>
                                <SearchOutlined style={{fontSize: 48, color: '#ccc', marginBottom: 16}}/>
                                <Text>No projects match your current search and filter criteria.</Text><br/>
                                {debouncedSearchQuery.trim() !== '' && <Text type="secondary" style={{display: 'block'}}>Try a different search term.</Text>}
                                {activeFilterCount > 0 && <Text type="secondary" style={{display: 'block'}}>Try adjusting or clearing your filters.</Text>}
                                {activeFilterCount > 0 && <Button type="link" onClick={clearAllFilters} style={{marginTop: 8}}>Clear All Filters</Button>}
                            </Col>
                        </Row>
                    ) : (
                        // ... (No projects found in workspace)
                        <Row gutter={[16, 24]} justify="center" style={{marginTop: 40}}>
                            <Col style={{textAlign: 'center'}}>
                                <PictureOutlined style={{fontSize: 48, color: '#ccc', marginBottom: 16}}/>
                                <Text>No projects found in your workspace.</Text><br/>
                                <Text type="secondary">Click "Create new" to get started.</Text>
                            </Col>
                        </Row>
                    )}
                </Content>
            </Layout>

            {/* Create Project Modal */}
            <Modal
                title="Create New Project"
                open={isCreateModalVisible}
                onCancel={handleCreateModalCancel}
                footer={[
                    <Button key="back" onClick={handleCreateModalCancel} disabled={isSubmittingProject}>Cancel</Button>,
                    <Button key="submit" type="primary" loading={isSubmittingProject} onClick={() => {
                        createForm.validateFields().then((values) => {
                            handleCreateProjectSubmit(values as { projectName: string; description: string });
                        }).catch((info) => { console.log('Validate Failed:', info); });
                    }}>Create</Button>,
                ]}
            >
                <Form form={createForm} layout="vertical" name="create_project_form" initialValues={{ description: '' }}>
                    <Form.Item name="projectName" label="Project Name" rules={[{ required: true, message: 'Please enter a project name!' }]}>
                        <Input placeholder="e.g., My Awesome Video"/>
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <Input.TextArea rows={4} placeholder="A short description of your project" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Rename Project Modal (NEW) */}
            <Modal
                title="Rename Project"
                open={isRenameModalVisible}
                onCancel={handleRenameModalCancel}
                footer={[
                    <Button key="back" onClick={handleRenameModalCancel} disabled={isProjectActionLoading}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isProjectActionLoading}
                        onClick={() => {
                            renameForm.validateFields().then((values) => {
                                handleRenameProjectSubmit(values as { newName: string });
                            }).catch((info) => { console.log('Validate Failed:', info); });
                        }}
                    >
                        Accept
                    </Button>,
                ]}
            >
                <Form form={renameForm} layout="vertical" name="rename_project_form">
                    <Form.Item
                        name="newName"
                        label="New Project Name"
                        rules={[{ required: true, message: 'Please enter the new project name!' }]}
                    >
                        <Input placeholder="Enter new project name" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Settings Drawer (keep as is) */}
            <Drawer
                title="Account Settings"
                // ... (rest of the Drawer props and content)
                placement="right"
                onClose={closeSettingsPanel}
                open={isSettingsPanelVisible}
                width={screens.xs ? '90%' : 360}
            >
                {userData ? (
                    <>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Card>
                                <Meta
                                    avatar={
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'white', marginRight: 16 }}>
                                            {displayedUsername.charAt(0).toUpperCase()}
                                        </div>
                                    }
                                    title={<Title level={5} style={{ margin: 0 }}>{displayedUsername}</Title>}
                                    description={<Text type="secondary">{displayedEmail}</Text>}
                                />
                            </Card>

                            {/* MODIFIED STORAGE USAGE CARD START */}
                            <Card title={<Space><DatabaseOutlined /> Storage Usage</Space>}>
                                {(() => {
                                    const storageLimitBytes = 100 * 1024 * 1024; // 100 MB in bytes
                                    const usedBytes = totalStorageUsedBytes;
                                    const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
                                    const limitMB = (storageLimitBytes / (1024 * 1024)).toFixed(0);
                                    const percentUsed = Math.min((usedBytes / storageLimitBytes) * 100, 100); // Cap at 100%

                                    return (
                                        <>
                                            <Progress
                                                percent={percentUsed}
                                                strokeColor={percentUsed > 80 ? (percentUsed > 95 ? '#ff4d4f' : '#faad14') : '#1890ff'} // Red if >95%, Orange if >80%, else Blue
                                                showInfo={false} // We'll show custom info below
                                                style={{ marginBottom: 8 }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong>{usedMB} MB / {limitMB} MB used</Text>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                </Text>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                                                This reflects the size of video files associated with your projects.
                                                Limit: 100 MB.
                                            </Text>
                                        </>
                                    );
                                })()}
                            </Card>
                            {/* MODIFIED STORAGE USAGE CARD END */}


                            <Card title={<Space><UserSwitchOutlined /> Account Actions</Space>}>
                                <Button type="dashed" block danger onClick={() => {
                                    closeSettingsPanel();
                                    Swal.fire({
                                        title: 'Are you sure?',
                                        text: "You will be logged out!",
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonColor: '#d33',
                                        cancelButtonColor: '#3085d6',
                                        confirmButtonText: 'Yes, log me out!'
                                    }).then((result) => {
                                        if (result.isConfirmed) {
                                            dispatch(logoutUser());
                                            navigate('/login');
                                            localStorage.removeItem("accessToken"); // Already handled by logoutUser typically
                                            Swal.fire('Logged Out!', 'You have been successfully logged out.', 'success');
                                        }
                                    })
                                }}>
                                    Log Out
                                </Button>
                            </Card>
                        </Space>
                    </>
                ) : (
                    <Spin tip="Loading account details..." />
                )}
            </Drawer>
        </Layout>
    );
};

export default NewHomePage;