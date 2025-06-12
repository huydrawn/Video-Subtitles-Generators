// src/Components/HomePage/UserPageContainer.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

import { useLocation, useNavigate } from 'react-router-dom'; // <--- Đảm bảo import này đúng
import { Layout, Spin, Typography, Button, Space, Grid, Form } from 'antd';
import type { Dayjs } from 'dayjs';
import type { RadioChangeEvent } from 'antd/es/radio';

// Redux Imports
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

// Dayjs Configuration
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useDebounce, Project, UserDTO, plans } from './utils';
import { NavigationAndToolbar } from './NavigationAndToolbar';
import { ProjectListSection } from './ProjectListSection';
import { ActionModalsAndDrawers } from './ActionModalsAndDrawers';

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// --- ĐẢM BẢO CÁC ĐƯỜNG DẪN IMPORT NÀY CHÍNH XÁC VỚI CẤU TRÚC THƯ MỤC CỦA BẠN ---

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const UserPageContainer: React.FC = () => {
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const dispatch = useDispatch<AppDispatch>();

    const {
        userData, projects, isLoading: isLoadingUserData,
        isSubmitting: isSubmittingProject, isProjectActionLoading,
        error: userError
    } = useSelector((state: RootState) => state.user);

    const [collapsed, setCollapsed] = useState(false);

    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [createForm] = Form.useForm();

    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [renameForm] = Form.useForm();

    const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);
    const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);

    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const searchInputRef = useRef<any>(null);

    const [filterVisible, setFilterVisible] = useState(false);
    const [dateFilterRange, setDateFilterRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [durationFilter, setDurationFilter] = useState<string | null>(null);

    const [selectedAccountTier, setSelectedAccountTier] = useState<string>(() => {
        return plans.find(p => p.key !== "FREE" && p.key !== userData?.status)?.key ||
            plans.find(p => p.key !== "FREE")?.key ||
            plans[1]?.key ||
            plans[0].key;
    });
    const [stripeLoading, setStripeLoading] = useState(false);
    const [stripeError, setStripeError] = useState<string | null>(null);

    useEffect(() => {
        if (isSearchVisible && searchInputRef.current) searchInputRef.current.focus();
    }, [isSearchVisible]);

    useEffect(() => {
        if (userData?.status) {
            const firstPaidPlanNotCurrent = plans.find(p => p.key !== "FREE" && p.key !== userData.status);
            if (firstPaidPlanNotCurrent) {
                setSelectedAccountTier(firstPaidPlanNotCurrent.key);
            } else {
                const basicPlan = plans.find(p => p.key === "BASIC");
                if (basicPlan && basicPlan.key !== userData.status) {
                    setSelectedAccountTier(basicPlan.key);
                } else if (plans.length > 1 && plans[1].key !== "FREE" && plans[1].key !== userData.status) {
                    setSelectedAccountTier(plans[1].key);
                }
            }
        }
    }, [userData?.status]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
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

    const displayedUsername = userData?.username || 'User';
    const displayedEmail = userData?.email || 'email@example.com';
    const displayedTeamName = userData?.workspace?.workspaceName || `${displayedUsername}'s Workspace`;

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

    const handleCreateStripeSession = async () => {
        setStripeLoading(true);
        setStripeError(null);

        const token = localStorage.getItem('accessToken');
        if (!token) {
            Swal.fire('Authentication Error', 'Access token not found. Please log in again.', 'error');
            setStripeError("Access token not found. Please log in.");
            setStripeLoading(false);
            return;
        }

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

        const STRIPE_PUBLIC_KEY = "pk_test_51RUKZgGaUh9IGwfbS09HU1ky834bsak1hu0m2Tu5Bn07tB3cWfCxKKTmaAFrhqnqBsUciaq2w8TbcJws7v5NMcki00if2pPDoC";

        try {
            const backendResponse = await axios.post(
                "http://localhost:8080/api/payments/create-checkout-session",
                {
                    accountTier: selectedAccountTier,
                    successUrl: `${window.location.origin}/paymentsuccess?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/payment-cancel`,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const sessionId = backendResponse.data.sessionId;
            const message = backendResponse.data.message;

            if (message && !sessionId) {
                Swal.fire('Information', message, 'info');
                setIsUpgradeModalVisible(false);
                setStripeLoading(false);
                dispatch(fetchUserData());
                return;
            }

            if (!sessionId) {
                throw new Error("Session ID not received from backend.");
            }

            // @ts-ignore
            const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
            if (!stripe) {
                throw new Error("Stripe.js has not loaded correctly.");
            }

            const { error: stripeRedirectError } = await stripe.redirectToCheckout({ sessionId });

            if (stripeRedirectError) {
                console.error("Stripe redirectToCheckout error:", stripeRedirectError);
                throw stripeRedirectError;
            }

        } catch (err: any) {
            console.error("Error in handleCreateStripeSession:", err);
            let errorMessageToShow = "An unknown error occurred during the payment process.";

            if (axios.isAxiosError(err)) {
                if (err.response) {
                    errorMessageToShow = err.response.data?.message || err.response.data?.error || `Server error: ${err.response.status}`;
                    if (err.response.status === 401 || err.response.status === 403) {
                        errorMessageToShow = `Authentication/Authorization failed: ${errorMessageToShow}. Please log in again.`;
                    }
                } else if (err.request) {
                    errorMessageToShow = "Network error. Please check your connection and if the server is running.";
                } else {
                    errorMessageToShow = `Request setup error: ${err.message}`;
                }
            } else if (err.message) {
                errorMessageToShow = err.message;
            }

            setStripeError(errorMessageToShow);
            Swal.fire('Error', errorMessageToShow, 'error');
            setStripeLoading(false);
        }
    };

    const handleDateFilterChange = (dates: any) => setDateFilterRange(dates);
    const handleDurationFilterChange = (e: RadioChangeEvent) => setDurationFilter(e.target.value);
    const clearAllFilters = () => { setDateFilterRange(null); setDurationFilter(null); };

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

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <NavigationAndToolbar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                isSearchVisible={isSearchVisible}
                setIsSearchVisible={setIsSearchVisible}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchInputRef={searchInputRef}
                showSettingsPanel={showSettingsPanel}
                handleOpenUpgradeModal={handleOpenUpgradeModal}
                displayedTeamName={displayedTeamName}
                displayedUsername={displayedUsername}
                displayedEmail={displayedEmail}
                activeFilterCount={activeFilterCount}
                filterVisible={filterVisible}
                setFilterVisible={setFilterVisible}
                dateFilterRange={dateFilterRange}
                handleDateFilterChange={handleDateFilterChange}
                durationFilter={durationFilter}
                handleDurationFilterChange={handleDurationFilterChange}
                clearAllFilters={clearAllFilters}
                screens={screens}
            />

            <Layout className="site-layout">
                <ProjectListSection
                    filteredProjects={filteredProjects}
                    displayedUsername={displayedUsername}
                    handleProjectCardClick={handleProjectCardClick}
                    handleOpenRenameModal={handleOpenRenameModal}
                    handleDeleteProjectClick={handleDeleteProjectClick}
                    showCreateProjectModal={showCreateProjectModal}
                    isLoadingProjects={isLoadingUserData || isSubmittingProject || isProjectActionLoading}
                    hasUserData={!!userData?.workspace}
                    debouncedSearchQuery={debouncedSearchQuery}
                    activeFilterCount={activeFilterCount}
                    displayedTeamName={displayedTeamName}
                    handleChangetoSummary={handleChangetoSummary}
                    clearAllFilters={clearAllFilters}
                />
            </Layout>

            <ActionModalsAndDrawers
                isCreateModalVisible={isCreateModalVisible}
                handleCreateModalCancel={handleCreateModalCancel}
                createForm={createForm}
                handleCreateProjectSubmit={handleCreateProjectSubmit}
                isSubmittingProject={isSubmittingProject}
                isRenameModalVisible={isRenameModalVisible}
                handleRenameModalCancel={handleRenameModalCancel}
                editingProject={editingProject}
                renameForm={renameForm}
                handleRenameProjectSubmit={handleRenameProjectSubmit}
                isProjectActionLoading={isProjectActionLoading}
                isSettingsPanelVisible={isSettingsPanelVisible}
                closeSettingsPanel={closeSettingsPanel}
                userData={userData}
                totalStorageUsedBytes={totalStorageUsedBytes}
                handleOpenUpgradeModal={handleOpenUpgradeModal}
                dispatch={dispatch}
                logoutUser={logoutUser}
                navigate={navigate}
                isUpgradeModalVisible={isUpgradeModalVisible}
                handleUpgradeModalCancel={handleUpgradeModalCancel}
                selectedAccountTier={selectedAccountTier}
                setSelectedAccountTier={setSelectedAccountTier}
                handleCreateStripeSession={handleCreateStripeSession}
                stripeLoading={stripeLoading}
                stripeError={stripeError}
                setStripeError={setStripeError}
                screens={screens}
            />
        </Layout>
    );
};

export default UserPageContainer;