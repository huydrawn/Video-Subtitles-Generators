// src/Components/VideoPage/index.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import { loadStripe } from '@stripe/stripe-js';

import { useLocation, useNavigate } from 'react-router-dom';
import {
    Layout, Menu, Input, Row, Col, Card, Space, Grid, Button,
    Typography, Dropdown, Spin, Modal, Form, Drawer, DatePicker,
    Radio, Divider, Badge, Progress, Alert
} from 'antd';
import {
    SearchOutlined, FolderOutlined, SettingOutlined, ShareAltOutlined,
    QuestionCircleOutlined, UserOutlined, PlusOutlined, DownOutlined,
    EllipsisOutlined, TranslationOutlined, BarsOutlined, BulbOutlined,
    BellOutlined, UsergroupAddOutlined, SunOutlined, MoonOutlined,
    PictureOutlined, DatabaseOutlined, UserSwitchOutlined, CloseOutlined,
    FilterOutlined, EditOutlined, DeleteOutlined, CrownOutlined,
    RocketOutlined, StarOutlined, ShoppingCartOutlined, CheckOutlined,
    StopOutlined
} from '@ant-design/icons';
import * as DarkReader from 'darkreader';
import axios from 'axios'; // Đảm bảo đã import axios

// --- Redux Imports ---
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../Store';
import {
    fetchUserData,
    createProject,
    renameProject,
    deleteProject,
    clearError,
    logoutUser
} from '../../Store/useSlice';

// --- Dayjs Imports and Configuration ---
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
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// --- Custom Hook: useDebounce ---
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

// Interfaces
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
        duration: number;
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
    status: string; // Represents the current plan/tier, e.g., "FREE", "BASIC", "PRO"
    workspace: Workspace | null;
}

// --- Helper function to format bytes ---
const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- Helper function to format storage from MB ---
const formatStorageFromMB = (mb: number): string => {
    if (mb < 1024) {
        return `${mb.toFixed(1).replace(/\.0$/, '')} MB`;
    }
    return `${(mb / 1024).toFixed(1).replace(/\.0$/, '')} GB`;
};

// --- Dark Mode Toggle Component ---
const DarkModeToggle = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            return false;
        }
        const persisted = localStorage.getItem('darkModeEnabled');
        try {
            return persisted ? JSON.parse(persisted) : DarkReader.isEnabled();
        } catch (error) {
            return DarkReader.isEnabled();
        }
    });

    useEffect(() => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            return;
        }
        const currentlyEnabled = DarkReader.isEnabled();
        if (isDarkMode && !currentlyEnabled) {
            try { DarkReader.enable({ brightness: 100, contrast: 90, sepia: 10 }); }
            catch (error) { setIsDarkMode(false); }
        } else if (!isDarkMode && currentlyEnabled) {
            try { DarkReader.disable(); }
            catch (error) { setIsDarkMode(true); }
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') { return; }
        const newState = !isDarkMode;
        try {
            if (newState) DarkReader.enable({ brightness: 100, contrast: 90, sepia: 10 });
            else DarkReader.disable();
            setIsDarkMode(newState);
            localStorage.setItem('darkModeEnabled', JSON.stringify(newState));
        } catch (error) { setIsDarkMode(isDarkMode); }
    };

    if (typeof DarkReader.enable !== 'function') return null;

    return (
        <Button
            type="text"
            shape="circle"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleDarkMode}
            style={{ fontSize: "20px", color: 'unset' }}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        />
    );
};

// --- Project Card Component ---
const ProjectCard: React.FC<{
    project: Project;
    ownerName: string;
    onClick: (project: Project) => void;
    onRename: (project: Project) => void;
    onDelete: (project: Project) => void;
}> = ({ project, ownerName, onClick, onRename, onDelete }) => {
    const { projectName, updatedAt, video } = project;
    const thumbnailUrl = video?.thumbnailUrl;
    const formatDate = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleDateString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric'
            });
        }
        catch (e) { return 'Invalid Date'; }
    };
    let durationString = '';
    if (video?.duration) {
        const totalSeconds = Math.round(video.duration);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        durationString = `${minutes}:${seconds}`;
    }
    const dimensionsString = video?.width && video?.height ? `${video.width}x${video.height}` : '';

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
            onClick={() => onClick(project)}
        >
            <div style={{
                width: '100%',
                paddingTop: '56.25%', // 16:9 Aspect Ratio
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
                    <PictureOutlined style={{
                        fontSize: 48,
                        color: '#ccc',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }} />
                )}
            </div>
            <div style={{ padding: '0 8px 8px 8px' }}>
                <Text
                    strong
                    ellipsis={{ tooltip: projectName }}
                    style={{ fontSize: 14, display: 'block', marginBottom: 4 }}
                >
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
                zIndex: 10,
            }}>
                <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
                    <Button
                        type="text"
                        shape="circle"
                        icon={<EllipsisOutlined style={{ fontSize: 18, color: '#333' }} />}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        aria-label="Project options"
                    />
                </Dropdown>
            </div>
        </Card>
    );
};

// --- Plan Data ---
const plans = [
    {
        key: "FREE", title: "Free", priceInCents: 0, storageLimitMb: 100,
        icon: <StopOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />, color: '#8c8c8c',
    },
    {
        key: "BASIC", title: "Basic", priceInCents: 200, storageLimitMb: 200, // Example value
        icon: <StarOutlined style={{ fontSize: 24, color: '#1890ff' }} />, color: '#1890ff',
    },
    {
        key: "PRO", title: "Pro", priceInCents: 500, storageLimitMb: 500,
        icon: <RocketOutlined style={{ fontSize: 24, color: '#52c41a' }} />, color: '#52c41a',
    },
    {
        key: "PREMIUM", title: "Premium", priceInCents: 1000, storageLimitMb: 1024,
        icon: <CrownOutlined style={{ fontSize: 24, color: '#faad14' }} />, color: '#faad14',
    },
];

const formatPrice = (priceInCents: number) => {
    if (priceInCents === 0) return "Free";
    return `$${(priceInCents / 100.0).toFixed(2)}`;
};

// --- NewHomePage Component ---
const NewHomePage: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const dispatch = useDispatch<AppDispatch>();

    const {
        userData, projects, isLoading: isLoadingUserData,
        isSubmitting: isSubmittingProject, isProjectActionLoading,
        error: userError
    } = useSelector((state: RootState) => state.user);

    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [createForm] = Form.useForm();
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [renameForm] = Form.useForm();
    const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const searchInputRef = useRef<any>(null);
    const [filterVisible, setFilterVisible] = useState(false);
    const [dateFilterRange, setDateFilterRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [durationFilter, setDurationFilter] = useState<string | null>(null);

    const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);
    const [selectedAccountTier, setSelectedAccountTier] = useState<string>(
        // Default to the first paid plan, or basic, or finally free if others don't exist
        plans.find(p => p.key !== "FREE" && p.key !== userData?.status)?.key ||
        plans.find(p => p.key !== "FREE")?.key ||
        plans[1]?.key ||
        plans[0].key
    );
    const [stripeLoading, setStripeLoading] = useState(false);
    const [stripeError, setStripeError] = useState<string | null>(null);

    useEffect(() => {
        if (isSearchVisible && searchInputRef.current) searchInputRef.current.focus();
    }, [isSearchVisible]);

    useEffect(() => {
        // Update default selected tier when userData is loaded, if not already set to a specific paid plan
        if (userData?.status) {
            const firstPaidPlanNotCurrent = plans.find(p => p.key !== "FREE" && p.key !== userData.status);
            if (firstPaidPlanNotCurrent) {
                setSelectedAccountTier(firstPaidPlanNotCurrent.key);
            } else {
                // If all paid plans are the current plan, or no other paid plans, default to a sensible choice
                const basicPlan = plans.find(p => p.key === "BASIC");
                if (basicPlan && basicPlan.key !== userData.status) {
                    setSelectedAccountTier(basicPlan.key);
                } else if (plans.length > 1 && plans[1].key !== "FREE" && plans[1].key !== userData.status) {
                    setSelectedAccountTier(plans[1].key);
                }
            }
        }
    }, [userData?.status]);


    const handleDateFilterChange = (dates: any) => setDateFilterRange(dates);
    const handleDurationFilterChange = (e: RadioChangeEvent) => setDurationFilter(e.target.value);
    const clearAllFilters = () => { setDateFilterRange(null); setDurationFilter(null); };
    const activeFilterCount = useMemo(() =>
            (dateFilterRange?.[0] || dateFilterRange?.[1] ? 1 : 0) + (durationFilter ? 1 : 0),
        [dateFilterRange, durationFilter]
    );

    const filteredProjects = useMemo(() => {
        let tempProjects = projects;
        if (debouncedSearchQuery.trim()) {
            tempProjects = tempProjects.filter(p =>
                p.projectName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }
        if (dateFilterRange && (dateFilterRange[0] || dateFilterRange[1])) {
            const [start, end] = dateFilterRange;
            tempProjects = tempProjects.filter(p => {
                const pDate = dayjs(p.updatedAt);
                if (!pDate.isValid()) return false;
                let match = true;
                if (start) match = match && pDate.isSameOrAfter(start, 'day');
                if (end) match = match && pDate.isSameOrBefore(end, 'day');
                return match;
            });
        }
        if (durationFilter) {
            tempProjects = tempProjects.filter(p => {
                const d = p.video?.duration;
                if (typeof d !== 'number') return false;
                if (durationFilter === 'under_1m') return d < 60;
                if (durationFilter === '1m_to_3m') return d >= 60 && d <= 180;
                if (durationFilter === 'over_3m') return d > 180;
                return true;
            });
        }
        return tempProjects;
    }, [projects, debouncedSearchQuery, dateFilterRange, durationFilter]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        // Note: The following Axios interceptor setup was commented out in the original code.
        // If a global interceptor is not configured elsewhere, specific calls like the one
        // in handleCreateStripeSession will need to add the Authorization header manually.
        /*
        const api = axios.create();
        api.interceptors.request.use(
            config => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            error => {
                return Promise.reject(error);
            }
        );
        */

        if (!token) {
            Swal.fire({ icon: 'warning', title: 'Not Logged In', timer: 2000 })
                .then(() => navigate('/login'));
            return;
        }
        if (!userData && !isLoadingUserData && !userError) {
            dispatch(fetchUserData())
                .unwrap()
                .catch((err: any) => {
                    const msg = err?.message || "Error fetching user data";
                    const redirect = msg.includes("expired") || msg.includes("Unauthorized");
                    Swal.fire({
                        icon: redirect ? 'warning' : 'error',
                        title: redirect ? 'Session Expired' : 'Fetch Failed',
                        text: msg
                    }).then(() => { if (redirect) { dispatch(logoutUser()); navigate('/login'); } });
                });
        }
    }, [dispatch, navigate, userData, isLoadingUserData, userError]);

    const totalStorageUsedBytes = useMemo(() =>
            projects.reduce((acc, p) => acc + (p.video?.bytes || 0), 0),
        [projects]
    );

    const showCreateProjectModal = () => {
        if (!userData?.workspace?.publicId) {
            Swal.fire('Error', 'Workspace information missing.', 'error'); return;
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
        const wsId = userData?.workspace?.publicId;
        if (!wsId) {
            Swal.fire('Error', 'Workspace information missing.', 'error');
            handleCreateModalCancel(); return;
        }
        dispatch(createProject({ workspacePublicId: wsId, ...values }))
            .unwrap()
            .then(p => {
                Swal.fire('Success!', `Project "${p.projectName}" created.`, 'success');
                handleCreateModalCancel();
            })
            .catch(err => {
                const errorMsg = err?.message || "Failed to create project.";
                Swal.fire('Creation Failed', errorMsg, 'error')
                    .then(() => {
                        if (errorMsg.includes("Unauthorized")) {
                            dispatch(logoutUser()); navigate('/login');
                        }
                    });
            });
    };

    const handleOpenRenameModal = (project: Project) => {
        if (!userData?.workspace?.publicId) {
            Swal.fire('Error', 'Workspace information missing.', 'error'); return;
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
            Swal.fire('Error', 'Required information missing.', 'error');
            handleRenameModalCancel(); return;
        }
        dispatch(renameProject({
            workspacePublicId: userData.workspace.publicId,
            projectPublicId: editingProject.publicId,
            newName: values.newName
        })).unwrap()
            .then(p => {
                Swal.fire('Success!', `Project renamed to "${p.projectName}".`, 'success');
                handleRenameModalCancel();
            })
            .catch(err => {
                const errorMsg = err?.message || "Failed to rename project.";
                Swal.fire('Rename Failed', errorMsg, 'error')
                    .then(() => {
                        if (errorMsg.includes("Unauthorized")) {
                            dispatch(logoutUser()); navigate('/login');
                        }
                    });
            });
    };

    const handleDeleteProjectClick = (project: Project) => {
        if (!userData?.workspace?.publicId) {
            Swal.fire('Error', 'Workspace information missing.', 'error'); return;
        }
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete "${project.projectName}". This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then(res => {
            if (res.isConfirmed) {
                dispatch(deleteProject({
                    workspacePublicId: userData.workspace!.publicId,
                    projectPublicId: project.publicId
                })).unwrap()
                    .then(() => Swal.fire('Deleted!', `Project "${project.projectName}" deleted.`, 'success'))
                    .catch(err => {
                        const errorMsg = err?.message || "Failed to delete project.";
                        Swal.fire('Deletion Failed', errorMsg, 'error')
                            .then(() => {
                                if (errorMsg.includes("Unauthorized")) {
                                    dispatch(logoutUser()); navigate('/login');
                                }
                            });
                    });
            }
        });
    };

    const showSettingsPanel = () => setIsSettingsPanelVisible(true);
    const closeSettingsPanel = () => setIsSettingsPanelVisible(false);

    const handleOpenUpgradeModal = () => {
        // userId from Redux store (userData.userId) should be preferred if available
        // localStorage.getItem('userId') might be stale or from a different context.
        if (!userData?.userId) {
            Swal.fire('User Info Not Loaded', 'User ID not found. Please wait or log in again.', 'info');
            return;
        }
        setStripeError(null);
        setIsUpgradeModalVisible(true);
    };

    const handleUpgradeModalCancel = () => {
        setIsUpgradeModalVisible(false);
        setStripeError(null);
    };

    // =========================================================================
    // FUNCTION TO BE MODIFIED: handleCreateStripeSession
    // =========================================================================
    const handleCreateStripeSession = async () => {
        setStripeLoading(true);
        setStripeError(null);

        // Get access token from localStorage
        const token = localStorage.getItem('accessToken');
        if (!token) {
            Swal.fire('Authentication Error', 'Access token not found. Please log in again.', 'error');
            setStripeError("Access token not found. Please log in.");
            setStripeLoading(false);
            return;
        }

        // Lấy userId từ Redux store (hoặc localStorage as fallback, though less ideal)
        // Backend is expected to use userId from the token (@AuthenticationPrincipal)
        // let userIdForStripe = localStorage.getItem('userId'); // Original logic
        // if (!userIdForStripe) {
        //     if (userData?.userId) {
        //         userIdForStripe = String(userData.userId);
        //     } else {
        //         Swal.fire('User Info Error', "User information unavailable. Cannot proceed.", 'error');
        //         setStripeError("User information unavailable.");
        //         setStripeLoading(false);
        //         return;
        //     }
        // }
        // Since backend uses @AuthenticationPrincipal, userId is not explicitly sent in body.

        if (!selectedAccountTier || selectedAccountTier === "FREE") {
            Swal.fire('Selection Error', "Please select a paid tier to upgrade.", 'warning');
            setStripeError("Please select a paid tier.");
            setStripeLoading(false);
            return;
        }

        if (selectedAccountTier === userData?.status) {
            Swal.fire('Selection Error', "This is already your current plan.", 'info');
            setStripeError("This is your current plan.");
            setStripeLoading(false);
            return;
        }

        // Stripe Public Key - Nên lấy từ biến môi trường
        const STRIPE_PUBLIC_KEY = "pk_test_51RUKZgGaUh9IGwfbS09HU1ky834bsak1hu0m2Tu5Bn07tB3cWfCxKKTmaAFrhqnqBsUciaq2w8TbcJws7v5NMcki00if2pPDoC";

        try {
            // Bước 1: Gọi API backend để tạo Checkout Session
            const backendResponse = await axios.post(
                "http://localhost:8080/api/payments/create-checkout-session",
                {
                    accountTier: selectedAccountTier,
                    successUrl: `${window.location.origin}/paymentsuccess?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/payment-cancel`,
                },
                { // Axios config object to include headers
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const sessionId = backendResponse.data.sessionId;
            const message = backendResponse.data.message;

            if (message && !sessionId) { // Backend might return a message if no payment needed (e.g., already on a higher free tier)
                Swal.fire('Information', message, 'info');
                setIsUpgradeModalVisible(false);
                setStripeLoading(false);
                // Potentially refresh user data if the plan was updated directly by backend
                dispatch(fetchUserData());
                return;
            }

            if (!sessionId) {
                throw new Error("Session ID not received from backend.");
            }
            console.log("Session ID from backend:", sessionId);


            // Bước 2: Khởi tạo Stripe.js và chuyển hướng đến trang Checkout của Stripe
            // @ts-ignore
            const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
            if (!stripe) {
                throw new Error("Stripe.js has not loaded correctly. Ensure it's included in your public/index.html or loaded dynamically.");
            }

            const { error: stripeRedirectError } = await stripe.redirectToCheckout({ sessionId });

            if (stripeRedirectError) {
                console.error("Stripe redirectToCheckout error:", stripeRedirectError);
                throw stripeRedirectError;
            }
            // If redirectToCheckout is successful, the user is redirected.
            // setStripeLoading(false) is not needed here.

        } catch (err: any) {
            console.error("Error in handleCreateStripeSession:", err);
            let errorMessageToShow = "An unknown error occurred during the payment process.";

            if (axios.isAxiosError(err)) {
                if (err.response) {
                    // Log the full error response for debugging
                    console.error("Backend error response:", err.response);
                    errorMessageToShow = err.response.data?.message || err.response.data?.error || `Server error: ${err.response.status}`;
                    if (err.response.status === 401 || err.response.status === 403) {
                        errorMessageToShow = `Authentication/Authorization failed: ${errorMessageToShow}. Please log in again.`;
                        // Optionally, trigger logout
                        // dispatch(logoutUser()); navigate('/login');
                    }
                } else if (err.request) {
                    errorMessageToShow = "Network error. Please check your connection and if the server is running.";
                } else {
                    errorMessageToShow = `Request setup error: ${err.message}`;
                }
            } else if (err.message) { // Error from Stripe.js or other JS error
                errorMessageToShow = err.message;
            }

            setStripeError(errorMessageToShow);
            Swal.fire('Error', errorMessageToShow, 'error');
            setStripeLoading(false);
        }
    };
    // =========================================================================
    // END OF MODIFIED FUNCTION
    // =========================================================================


    const handleChangetoSummary = () => navigate('/summary');
    const handleProjectCardClick = (project: Project) => {
        const { video, projectId, publicId } = project;
        const navState: any = { projectId, publicId };
        if (video) {
            if (video.secureUrl) navState.initialVideoUrl = video.secureUrl;
            if (typeof video.width === 'number' && typeof video.height === 'number') {
                navState.videoWidth = video.width;
                navState.videoHeight = video.height;
            }
        }
        navigate('/videoeditor', { state: navState });
    };
    const getSelectedKeys = () => ['new-folder-item']; // Example

    // --- Render Logic ---
    if (isLoadingUserData && !userData && !userError) {
        return (
            <Layout style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Loading your workspace..." />
            </Layout>
        );
    }
    if (userError && !isLoadingUserData && !userData) {
        return (
            <Layout style={{
                minHeight: '100vh', padding: 24, textAlign: 'center',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}>
                <Title level={3} type="danger">Oops! Something went wrong.</Title>
                <Text type="secondary" style={{ marginBottom: 16 }}>{userError}</Text>
                <Space>
                    <Button type="primary" onClick={() => dispatch(fetchUserData())} loading={isLoadingUserData}>
                        Retry
                    </Button>
                    <Button onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>
                        Go to Login
                    </Button>
                </Space>
            </Layout>
        );
    }
    if (!userData && !isLoadingUserData) {
        // This case might be hit if token exists but fetchUserData leads to no user data without an error.
        // Or if the initial check for token in useEffect fails and navigation to /login is pending.
        // Displaying a loading or redirecting message might be better than "Unable to load workspace"
        // if the navigate('/login') from useEffect is about to happen.
        // For now, keeping original logic.
        return (
            <Layout style={{
                minHeight: '100vh', padding: 24, textAlign: 'center',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}>
                <Title level={3}>Unable to load workspace</Title>
                <Text type="secondary" style={{ marginBottom: 16 }}>
                    Please try logging in again or contact support.
                </Text>
                <Button type="primary" onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>
                    Go to Login
                </Button>
            </Layout>
        );
    }

    const displayedUsername = userData?.username || 'User';
    const displayedEmail = userData?.email || 'email@example.com';
    const displayedTeamName = userData?.workspace?.workspaceName || `${displayedUsername}'s Workspace`;

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
                            onClick={() => setDurationFilter(null)}
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
        <Layout style={{ minHeight: '100vh' }}>
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
                {!collapsed && userData && (
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
                            {displayedUsername ? displayedUsername.charAt(0).toUpperCase() : '?'}
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
                        <SettingOutlined style={{ fontSize: 20, cursor: 'pointer' }} onClick={showSettingsPanel} />
                        <UserOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                        <UsergroupAddOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                        <DarkModeToggle />
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
                            {userData?.workspace?.workspaceName || 'My Workspace'}
                            <DownOutlined style={{ marginLeft: 8, fontSize: 16, cursor: 'pointer' }} />
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
                                        <Badge count={activeFilterCount} size="small" offset={[0, -1]} />
                                    )}
                                    <DownOutlined style={{ fontSize: 10 }} />
                                </Space>
                            </Button>
                        </Dropdown>
                    </div>
                    <Space size="middle" style={{ marginBottom: 24 }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showCreateProjectModal}
                            style={{ fontWeight: 'bold' }}
                            disabled={isLoadingUserData || !userData?.workspace}
                        >
                            Create new
                        </Button>
                        <Button icon={<TranslationOutlined />} onClick={handleChangetoSummary}>Summary</Button>
                        <Button icon={<BarsOutlined />}>Repurpose</Button>
                        <Button icon={<BulbOutlined />}>Generate</Button>
                    </Space>

                    {isLoadingUserData && projects.length === 0 && !userError ? (
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
            </Layout>

            {/* Create Project Modal */}
            <Modal
                title="Create New Project"
                open={isCreateModalVisible}
                onCancel={handleCreateModalCancel}
                footer={[
                    <Button key="back" onClick={handleCreateModalCancel} disabled={isSubmittingProject}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isSubmittingProject}
                        onClick={() => {
                            createForm.validateFields()
                                .then((values) => {
                                    handleCreateProjectSubmit(values as { projectName: string; description: string });
                                })
                                .catch((info) => { console.log('Validate Failed:', info); });
                        }}
                    >
                        Create
                    </Button>,
                ]}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    name="create_project_form"
                    initialValues={{ description: '' }}
                >
                    <Form.Item
                        name="projectName"
                        label="Project Name"
                        rules={[{ required: true, message: 'Please enter a project name!' }]}
                    >
                        <Input placeholder="e.g., My Awesome Video" />
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <Input.TextArea rows={4} placeholder="A short description of your project" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Rename Project Modal */}
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
                            renameForm.validateFields()
                                .then((values) => {
                                    handleRenameProjectSubmit(values as { newName: string });
                                })
                                .catch((info) => { console.log('Validate Failed:', info); });
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

            {/* Settings Drawer */}
            <Drawer
                title="Account Settings"
                placement="right"
                onClose={closeSettingsPanel}
                open={isSettingsPanelVisible}
                width={screens.xs ? '90%' : 380}
            >
                {userData ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Card>
                            <Meta
                                avatar={
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        backgroundColor: '#1890ff', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: 24, color: 'white', marginRight: 16
                                    }}>
                                        {displayedUsername.charAt(0).toUpperCase()}
                                    </div>
                                }
                                title={<Title level={5} style={{ margin: 0 }}>{displayedUsername}</Title>}
                                description={<Text type="secondary">{displayedEmail}</Text>}
                            />
                        </Card>

                        <Card title={<Space><DatabaseOutlined /> Storage Usage</Space>}>
                            {(() => {
                                const currentPlanKey = userData?.status || "FREE";
                                const currentPlan = plans.find(p => p.key === currentPlanKey) || plans[0];
                                const storageLimitBytes = currentPlan.storageLimitMb * 1024 * 1024;

                                const usedBytes = totalStorageUsedBytes;
                                const usedMB = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
                                const limitMB = currentPlan.storageLimitMb;
                                const percentUsed = storageLimitBytes > 0 ? Math.min((usedBytes / storageLimitBytes) * 100, 100) : 0;
                                return (
                                    <>
                                        <Progress
                                            percent={percentUsed}
                                            strokeColor={
                                                percentUsed > 95 ? '#ff4d4f' : (percentUsed > 80 ? '#faad14' : '#1890ff')
                                            }
                                            showInfo={false}
                                            style={{ marginBottom: 8 }}
                                        />
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', marginBottom: 8
                                        }}>
                                            <Text strong>{formatStorageFromMB(usedMB)} / {formatStorageFromMB(limitMB)} used</Text>
                                        </div>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: '12px', display: 'block', marginTop: 4, marginBottom: 16 }}
                                        >
                                            Current limit for your {currentPlan.title} plan. Upgrade for more storage and features!
                                        </Text>
                                        <Button
                                            type="primary"
                                            icon={<ShoppingCartOutlined />}
                                            onClick={() => { closeSettingsPanel(); handleOpenUpgradeModal();}}
                                            block
                                            style={{ backgroundColor: '#f89b29', borderColor: '#f89b29' }}
                                        >
                                            Upgrade Plan
                                        </Button>
                                    </>
                                );
                            })()}
                        </Card>

                        <Card title={<Space><UserSwitchOutlined /> Account Actions</Space>}>
                            <Button
                                type="dashed"
                                block
                                danger
                                onClick={() => {
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
                                            Swal.fire('Logged Out!', 'You have been successfully logged out.', 'success');
                                        }
                                    })
                                }}>
                                Log Out
                            </Button>
                        </Card>
                    </Space>
                ) : (
                    <Spin tip="Loading account details..." />
                )}
            </Drawer>

            {/* Stripe Upgrade Modal */}
            <Modal
                title={
                    <div style={{ textAlign: 'center', marginBottom: 0 }}>
                        <Title level={3} style={{ margin: 0 }}>Upgrade Your Plan</Title>
                        <Text type="secondary">Choose the plan that best suits your needs.</Text>
                    </div>
                }
                open={isUpgradeModalVisible}
                onCancel={handleUpgradeModalCancel}
                width={screens.xs ? '95%' : (screens.sm ? 700 : 900)}
                footer={null}
                centered
            >
                <Spin spinning={stripeLoading} tip="Processing...">
                    <div style={{ padding: '24px 0' }}>
                        {stripeError && (
                            <Alert
                                message={stripeError}
                                type="error"
                                showIcon
                                style={{ marginBottom: 24 }}
                                closable
                                onClose={() => setStripeError(null)}
                            />
                        )}
                        <Radio.Group
                            value={selectedAccountTier}
                            onChange={(e) => setSelectedAccountTier(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <Row gutter={[16, 16]} justify="center">
                                {plans.map(plan => (
                                    <Col key={plan.key} xs={24} sm={12} md={plans.length > 3 ? 6 : (24 / Math.max(1, plans.length))}>
                                        <Radio.Button
                                            value={plan.key}
                                            style={{
                                                display: 'block', height: 'auto', padding: 0,
                                                border: 0, borderRadius: 8
                                            }}
                                            disabled={plan.key === "FREE"} // Cannot select FREE as an upgrade target
                                        >
                                            <Card
                                                hoverable={plan.key !== "FREE"}
                                                className={plan.key === "FREE" ? "free-plan-card-disabled" : ""}
                                                style={{
                                                    textAlign: 'center',
                                                    border: selectedAccountTier === plan.key ?
                                                        `2px solid ${plan.color}` : '1px solid #f0f0f0',
                                                    boxShadow: selectedAccountTier === plan.key ?
                                                        `0 0 0 3px ${plan.color}40` : 'none',
                                                    borderRadius: 8,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    padding: '20px 10px',
                                                    opacity: plan.key === "FREE" ? 0.7 : 1,
                                                    cursor: plan.key === "FREE" ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                <div>
                                                    <div style={{
                                                        fontSize: 28, color: plan.color, marginBottom: 10
                                                    }}>
                                                        {plan.icon}
                                                    </div>
                                                    <Title level={4} style={{ color: plan.color, marginBottom: 5 }}>
                                                        {plan.title}
                                                    </Title>
                                                    <Title level={3} style={{
                                                        margin: '0 0 10px 0', fontWeight: 600
                                                    }}>
                                                        {formatPrice(plan.priceInCents)}
                                                        {plan.priceInCents > 0 && (
                                                            <Text style={{ fontSize: 14, fontWeight: 'normal' }}>
                                                                / month
                                                            </Text>
                                                        )}
                                                    </Title>
                                                    <Divider style={{ margin: '10px 0' }} />
                                                    <Space
                                                        direction="vertical"
                                                        size="small"
                                                        style={{ minHeight: 60, alignItems: 'center' }}
                                                    >
                                                        <Text strong style={{ fontSize: 16 }}>
                                                            {formatStorageFromMB(plan.storageLimitMb)} Storage
                                                        </Text>
                                                        {plan.key === "FREE" && <Text type="secondary" style={{ fontSize: 12 }}>Basic Features</Text>}
                                                        {plan.key === "BASIC" && <Text type="secondary" style={{ fontSize: 12 }}>More Features</Text>}
                                                        {plan.key === "PRO" && <Text type="secondary" style={{ fontSize: 12 }}>Advanced Tools</Text>}
                                                        {plan.key === "PREMIUM" && <Text type="secondary" style={{ fontSize: 12 }}>All Access</Text>}
                                                    </Space>
                                                </div>
                                                {userData?.status === plan.key && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <Badge
                                                            count="Current Plan"
                                                            style={{ backgroundColor: plan.color, color: 'white' }}
                                                        />
                                                    </div>
                                                )}
                                            </Card>
                                        </Radio.Button>
                                    </Col>
                                ))}
                            </Row>
                        </Radio.Group>

                        <div style={{ textAlign: 'center', marginTop: 32 }}>
                            <Button
                                type="primary"
                                size="large"
                                icon={<ShoppingCartOutlined />}
                                onClick={handleCreateStripeSession}
                                loading={stripeLoading}
                                disabled={
                                    !selectedAccountTier ||
                                    selectedAccountTier === "FREE" ||
                                    selectedAccountTier === userData?.status ||
                                    stripeLoading
                                }
                                style={{
                                    minWidth: 220, backgroundColor: '#f89b29',
                                    borderColor: '#f89b29', fontWeight: 'bold'
                                }}
                            >
                                {stripeLoading ? "Processing..." :
                                    (!selectedAccountTier || selectedAccountTier === "FREE") ? "Select a Paid Plan" :
                                        (selectedAccountTier === userData?.status) ? "This is your current plan" :
                                            `Upgrade to ${plans.find(p => p.key === selectedAccountTier)?.title || 'Plan'}`
                                }
                            </Button>
                        </div>
                        <Text
                            type="secondary"
                            style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}
                        >
                            You'll be redirected to Stripe's secure checkout.
                        </Text>
                    </div>
                </Spin>
            </Modal>
        </Layout>
    );
};

export default NewHomePage;