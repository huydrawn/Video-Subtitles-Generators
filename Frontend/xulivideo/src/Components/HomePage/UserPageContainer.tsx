import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import introJs from 'intro.js'; // Import intro.js runtime value
import 'intro.js/introjs.css'; // Import CSS cho intro.js
import 'intro.js/themes/introjs-modern.css'; // Optional: for a modern theme

import { useNavigate } from 'react-router-dom';
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

// Import shared utilities and interfaces
import { useDebounce, Project, AccountTierDTO, getDisplayPlans, DisplayPlan } from './utils'; // Đảm bảo import DisplayPlan
// Import tách các component UI mới
import { SiderNavigation } from './SiderNavigation';
import { HeaderAndContent } from './HeaderAndContent';
import { ActionModalsAndDrawers } from './ActionModalsAndDrawers';

// Add these type definitions to correctly infer Intro.js types
type IntroJsInstance = ReturnType<typeof introJs>;
type IntroJsOptions = Parameters<IntroJsInstance['setOptions']>[0];
type IntroJsStep = NonNullable<IntroJsOptions['steps']>[number];
type IntroJsTooltipPosition = NonNullable<IntroJsStep['position']>;


dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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

    const [rawAccountTiers, setRawAccountTiers] = useState<AccountTierDTO[]>([]);
    const [isLoadingTiers, setIsLoadingTiers] = useState(true);
    const [tiersFetchError, setTiersFetchError] = useState<string | null>(null);

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

    const [selectedAccountTier, setSelectedAccountTier] = useState<string>('');

    const [stripeLoading, setStripeLoading] = useState(false);
    const [stripeError, setStripeError] = useState<string | null>(null);

    const displayPlans: DisplayPlan[] = useMemo(() => getDisplayPlans(rawAccountTiers), [rawAccountTiers]);

    useEffect(() => {
        if (isSearchVisible && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchVisible]);

    useEffect(() => {
        const fetchTiers = async () => {
            setIsLoadingTiers(true);
            setTiersFetchError(null);
            const token = localStorage.getItem('accessToken');

            if (!token) {
                setTiersFetchError("Không tìm thấy mã truy cập. Vui lòng đăng nhập lại.");
                setIsLoadingTiers(false);
                return;
            }

            try {
                const response = await axios.get<AccountTierDTO[]>("http://localhost:8080/api/account-tiers", {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                setRawAccountTiers(response.data);
                console.log("Fetched Account Tiers:", response.data); // IN DỮ LIỆU RA CONSOLE Ở ĐÂY
            } catch (err: any) {
                console.error("Không thể fetch account tiers:", err);
                let errorMsg = err.message || "Không thể tải chi tiết gói.";
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    errorMsg = "Phiên của bạn đã hết hạn hoặc không được ủy quyền. Vui lòng đăng nhập lại.";
                    dispatch(logoutUser());
                    navigate('/login');
                }
                setTiersFetchError(errorMsg);
            } finally {
                setIsLoadingTiers(false);
            }
        };
        fetchTiers();
    }, [dispatch, navigate]);


    useEffect(() => {
        if (!isLoadingTiers && displayPlans.length > 0 && userData?.status) {
            const firstPaidPlanNotCurrent = displayPlans.find(p => p.name !== "FREE" && p.name !== userData.status);
            if (firstPaidPlanNotCurrent) {
                setSelectedAccountTier(firstPaidPlanNotCurrent.name);
            } else {
                const basicPlan = displayPlans.find(p => p.name === "BASIC");
                if (basicPlan && basicPlan.name !== userData.status) {
                    setSelectedAccountTier(basicPlan.name);
                } else if (displayPlans.length > 1 && displayPlans[1].name !== "FREE" && displayPlans[1].name !== userData.status) {
                    setSelectedAccountTier(displayPlans[1].name);
                }
            }
        }
    }, [userData?.status, isLoadingTiers, displayPlans]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            Swal.fire({ icon: 'warning', title: 'Chưa đăng nhập', timer: 2000 })
                .then(() => navigate('/login'));
            return;
        }
        if (!userData && !isLoadingUserData && !userError) {
            dispatch(fetchUserData())
                .unwrap()
                .catch((err: any) => {
                    const msg = err?.message || "Lỗi khi lấy dữ liệu người dùng";
                    const redirect = msg.includes("expired") || msg.includes("Unauthorized");
                    Swal.fire({
                        icon: redirect ? 'warning' : 'error',
                        title: redirect ? 'Phiên hết hạn' : 'Fetch thất bại',
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

    const displayedUsername = userData?.username || 'Người dùng';
    const displayedEmail = userData?.email || 'email@example.com';
    const displayedTeamName = userData?.workspace?.workspaceName || `${displayedUsername}'s Workspace`;

    const showCreateProjectModal = () => {
        if (!userData?.workspace?.publicId) {
            Swal.fire('Lỗi', 'Thiếu thông tin không gian làm việc.', 'error'); return;
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
            Swal.fire('Lỗi', 'Thiếu thông tin không gian làm việc.', 'error');
            handleCreateModalCancel(); return;
        }
        dispatch(createProject({ workspacePublicId: wsId, ...values }))
            .unwrap()
            .then(p => {
                Swal.fire('Thành công!', `Dự án "${p.projectName}" đã được tạo.`, 'success');
                handleCreateModalCancel();
            })
            .catch(err => {
                const errorMsg = err?.message || "Không thể tạo dự án.";
                Swal.fire('Tạo thất bại', errorMsg, 'error')
                    .then(() => {
                        if (errorMsg.includes("Unauthorized")) {
                            dispatch(logoutUser()); navigate('/login');
                        }
                    });
            });
    };

    const handleOpenRenameModal = (project: Project) => {
        if (!userData?.workspace?.publicId) {
            Swal.fire('Lỗi', 'Thiếu thông tin không gian làm việc.', 'error'); return;
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
            Swal.fire('Lỗi', 'Thiếu thông tin yêu cầu.', 'error');
            handleRenameModalCancel(); return;
        }
        dispatch(renameProject({
            workspacePublicId: userData.workspace.publicId,
            projectPublicId: editingProject.publicId,
            newName: values.newName
        })).unwrap()
            .then(p => {
                Swal.fire('Thành công!', `Dự án đã đổi tên thành "${p.projectName}".`, 'success');
                handleRenameModalCancel();
            })
            .catch(err => {
                const errorMsg = err?.message || "Không thể đổi tên dự án.";
                Swal.fire('Đổi tên thất bại', errorMsg, 'error')
                    .then(() => {
                        if (errorMsg.includes("Unauthorized")) {
                            dispatch(logoutUser()); navigate('/login');
                        }
                    });
            });
    };

    const handleDeleteProjectClick = (project: Project) => {
        if (!userData?.workspace?.publicId) {
            Swal.fire('Lỗi', 'Thiếu thông tin không gian làm việc.', 'error'); return;
        }
        Swal.fire({
            title: 'Bạn có chắc không?',
            text: `Bạn sắp xóa "${project.projectName}". Thao tác này không thể hoàn tác.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Có, xóa nó!'
        }).then(res => {
            if (res.isConfirmed) {
                dispatch(deleteProject({
                    workspacePublicId: userData.workspace!.publicId,
                    projectPublicId: project.publicId
                })).unwrap()
                    .then(() => Swal.fire('Đã xóa!', `Dự án "${project.projectName}" đã bị xóa.`, 'success'))
                    .catch(err => {
                        const errorMsg = err?.message || "Không thể xóa dự án.";
                        Swal.fire('Xóa thất bại', errorMsg, 'error')
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
            Swal.fire('Thông tin người dùng chưa tải', 'Không tìm thấy ID người dùng. Vui lòng đợi hoặc đăng nhập lại.', 'info');
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
            Swal.fire('Lỗi xác thực', 'Không tìm thấy mã truy cập. Vui lòng đăng nhập lại.', 'error');
            setStripeError("Không tìm thấy mã truy cập. Vui lòng đăng nhập.");
            setStripeLoading(false);
            return;
        }

        if (!selectedAccountTier || selectedAccountTier === "FREE") {
            Swal.fire('Lỗi lựa chọn', "Vui lòng chọn một gói trả phí để nâng cấp.", 'warning');
            setStripeError("Vui lòng chọn một gói trả phí.");
            setStripeLoading(false);
            return;
        }

        if (selectedAccountTier === userData?.status) {
            Swal.fire('Lỗi lựa chọn', "Đây đã là gói hiện tại của bạn.", 'info');
            setStripeError("Đây là gói hiện tại của bạn.");
            setStripeLoading(false);
            return;
        }

        const STRIPE_PUBLIC_KEY = "pk_test_51RUKZgGaUh9IGwfbS09HU1ky834bsak1hu0m2Tu5Bn07tB3cWfCxKKTmaAFrhqnqBsUciaq2w8TbcJws7v5NMcki00if2pPDoC";

        try {
            const backendResponse = await axios.post(
                "http://localhost:8080/api/payments/create-checkout-session",
                {
                    accountTier: selectedAccountTier,
                    // UPDATED: Thêm newTier vào successUrl để PaymentSuccessPage có thể đọc được
                    successUrl: `${window.location.origin}/paymentsuccess?session_id={CHECKOUT_SESSION_ID}&newTier=${selectedAccountTier}`,
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
                Swal.fire('Thông tin', message, 'info');
                setIsUpgradeModalVisible(false);
                setStripeLoading(false);
                dispatch(fetchUserData()); // Fetch lại user data nếu có thông báo đặc biệt từ backend (vd: đã là gói cao nhất)
                return;
            }

            if (!sessionId) {
                throw new Error("Không nhận được Session ID từ backend.");
            }
            console.log("Session ID từ backend:", sessionId);

            // @ts-ignore
            const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
            if (!stripe) {
                throw new Error("Stripe.js chưa tải đúng cách.");
            }

            const { error: stripeRedirectError } = await stripe.redirectToCheckout({ sessionId });

            if (stripeRedirectError) {
                console.error("Lỗi redirectToCheckout của Stripe:", stripeRedirectError);
                throw stripeRedirectError;
            }

        } catch (err: any) {
            console.error("Lỗi trong handleCreateStripeSession:", err);
            let errorMessageToShow = "Đã xảy ra lỗi không xác định trong quá trình thanh toán.";

            if (axios.isAxiosError(err)) {
                if (err.response) {
                    errorMessageToShow = err.response.data?.message || err.response.data?.error || `Lỗi máy chủ: ${err.response.status}`;
                    if (err.response.status === 401 || err.response.status === 403) {
                        errorMessageToShow = `Xác thực/Ủy quyền thất bại: ${errorMessageToShow}. Vui lòng đăng nhập lại.`;
                    }
                } else if (err.request) {
                    errorMessageToShow = "Lỗi mạng. Vui lòng kiểm tra kết nối của bạn và nếu máy chủ đang chạy.";
                } else {
                    errorMessageToShow = `Lỗi thiết lập yêu cầu: ${err.message}`;
                }
            } else if (err.message) {
                errorMessageToShow = err.message;
            }

            setStripeError(errorMessageToShow);
            Swal.fire('Lỗi', errorMessageToShow, 'error');
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

    // --- Chức năng Tour Intro.js ---
    const startTour = () => {
        const steps: Partial<IntroJsStep>[] = [
            {
                element: '#sider-workspace-name',
                intro: 'Chào mừng bạn đến với không gian làm việc của mình! Đây là nơi bạn có thể quản lý và xem nhóm của mình.',
                position: 'right' as IntroJsTooltipPosition,
            },
            {
                element: '#sider-search-menu-item',
                intro: 'Sử dụng chức năng tìm kiếm để nhanh chóng tìm các dự án của bạn theo tên.',
                position: 'right' as IntroJsTooltipPosition,
            },
            {
                element: '#sider-settings-menu-item',
                intro: 'Truy cập cài đặt tài khoản và không gian làm việc của bạn tại đây, bao gồm cả mức sử dụng bộ nhớ và chi tiết gói.',
                position: 'right' as IntroJsTooltipPosition,
            },
            {
                element: '#header-upgrade-button',
                intro: 'Bạn đang tìm kiếm thêm dung lượng lưu trữ hoặc các tính năng nâng cao? Nâng cấp gói của bạn bất cứ lúc nào!',
                position: 'bottom' as IntroJsTooltipPosition,
            },
            {
                element: '#header-filters-dropdown',
                intro: 'Lọc dự án của bạn theo ngày, thời lượng video và nhiều hơn nữa để nhanh chóng tìm thấy những gì bạn cần.',
                position: 'bottom' as IntroJsTooltipPosition,
            },
            {
                element: '#content-create-new-button',
                intro: 'Bắt đầu một dự án video mới tại đây. Chỉ cần đặt tên và mô tả cho nó!',
                position: 'bottom' as IntroJsTooltipPosition,
            },
            {
                element: '#content-summary-button',
                intro: 'Nhận thông tin chi tiết và tóm tắt nhanh chóng về các dự án video của bạn.',
                position: 'bottom' as IntroJsTooltipPosition,
            },
            {
                element: '#content-guide-button',
                intro: 'Nhấp vào đây để bắt đầu tour hướng dẫn này và tìm hiểu thêm về giao diện người dùng.',
                position: 'bottom' as IntroJsTooltipPosition,
            },
            {
                element: '#content-generate-button',
                intro: 'Sử dụng các tính năng được hỗ trợ bởi AI để tạo nội dung cho các dự án của bạn.',
                position: 'bottom' as IntroJsTooltipPosition,
            },
        ];

        if (filteredProjects.length > 0) {
            const firstProjectCardElement = document.querySelector('.ant-card.ant-card-hoverable');
            steps.push({
                element: firstProjectCardElement ? (firstProjectCardElement as HTMLElement) : '#content-create-new-button',
                intro: 'Các dự án video của bạn được hiển thị tại đây. Nhấp vào một thẻ để mở trình chỉnh sửa video hoặc sử dụng menu tùy chọn để thực hiện các hành động khác.',
                position: 'top' as IntroJsTooltipPosition,
            });
        } else {
            const noProjectsElement = document.querySelector('.ant-row.ant-row-center');
            if (noProjectsElement) {
                steps.push({
                    element: noProjectsElement as HTMLElement,
                    intro: 'Chưa có dự án nào được tìm thấy trong không gian làm việc của bạn. Nhấp vào "Tạo mới" để bắt đầu!',
                    position: 'top' as IntroJsTooltipPosition,
                });
            } else {
                steps.push({
                    element: '#content-create-new-button',
                    intro: 'Chưa có dự án nào được tìm thấy. Nhấp vào "Tạo mới" để bắt đầu!',
                    position: 'bottom' as IntroJsTooltipPosition,
                });
            }
        }

        introJs()
            .setOptions({
                steps: steps,
                showProgress: true,
                showBullets: false,
                exitOnOverlayClick: false,
                exitOnEsc: true,
                overlayOpacity: 0.7,
                tooltipClass: 'custom-introjs-tooltip',
            })
            .start();
    };

    if ((isLoadingUserData && !userData && !userError) || isLoadingTiers) {
        return (
            <Layout style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Đang tải không gian làm việc của bạn..." />
            </Layout>
        );
    }
    if ((userError && !isLoadingUserData && !userData) || tiersFetchError) {
        return (
            <Layout style={{
                minHeight: '100vh', padding: 24, textAlign: 'center',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}>
                <Title level={3} type="danger">Rất tiếc! Đã xảy ra lỗi.</Title>
                <Text type="secondary" style={{ marginBottom: 16 }}>{userError || tiersFetchError}</Text>
                <Space>
                    <Button type="primary" onClick={() => { dispatch(fetchUserData()); /* Có thể re-fetch tiers ở đây nếu cần */ }} loading={isLoadingUserData}>
                        Thử lại
                    </Button>
                    <Button onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>
                        Đi tới Đăng nhập
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
                <Title level={3}>Không thể tải không gian làm việc</Title>
                <Text type="secondary" style={{ marginBottom: 16 }}>
                    Vui lòng thử đăng nhập lại hoặc liên hệ hỗ trợ.
                </Text>
                <Button type="primary" onClick={() => { dispatch(logoutUser()); navigate('/login'); }}>
                    Đi tới Đăng nhập
                </Button>
            </Layout>
        );
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <SiderNavigation
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                displayedTeamName={displayedTeamName}
                displayedUsername={displayedUsername}
                displayedEmail={displayedEmail}
                searchInputRef={searchInputRef}
                setIsSearchVisible={setIsSearchVisible}
                showSettingsPanel={showSettingsPanel}
            />

            <HeaderAndContent
                isSearchVisible={isSearchVisible}
                setIsSearchVisible={setIsSearchVisible}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchInputRef={searchInputRef}
                showSettingsPanel={showSettingsPanel}
                handleOpenUpgradeModal={handleOpenUpgradeModal}
                displayedTeamName={displayedTeamName}
                screens={screens}
                activeFilterCount={activeFilterCount}
                filterVisible={filterVisible}
                setFilterVisible={setFilterVisible}
                dateFilterRange={dateFilterRange}
                handleDateFilterChange={handleDateFilterChange}
                durationFilter={durationFilter}
                handleDurationFilterChange={handleDurationFilterChange}
                clearAllFilters={clearAllFilters}
                filteredProjects={filteredProjects}
                displayedUsername={displayedUsername}
                handleProjectCardClick={handleProjectCardClick}
                handleOpenRenameModal={handleOpenRenameModal}
                handleDeleteProjectClick={handleDeleteProjectClick}
                showCreateProjectModal={showCreateProjectModal}
                isLoadingProjects={isLoadingUserData || isSubmittingProject || isProjectActionLoading}
                hasUserData={!!userData?.workspace}
                debouncedSearchQuery={debouncedSearchQuery}
                handleChangetoSummary={handleChangetoSummary}
                startTour={startTour}
            />

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
                accountTiers={displayPlans}
            />
        </Layout>
    );
};

export default UserPageContainer;