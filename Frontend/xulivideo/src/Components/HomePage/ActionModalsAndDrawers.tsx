import React from 'react';
import {
    Modal, Form, Input, Button, Drawer, Space, Card, Progress, Radio, Alert, Row, Col, Badge, Typography, Divider, Spin
} from 'antd';
import {
    DatabaseOutlined, UserSwitchOutlined, ShoppingCartOutlined,
    CrownOutlined, RocketOutlined, StarOutlined, StopOutlined
} from '@ant-design/icons';
import Swal from 'sweetalert2';

// Redux Imports
import { AppDispatch } from '../../Store';
import { logoutUser } from '../../Store/useSlice';
import { useNavigate } from 'react-router-dom';

// Shared Utilities & Interfaces
import { Project, UserDTO, DisplayPlan, formatPrice, formatStorageFromMB } from './utils';
const { Meta } = Card;
const { Title, Text } = Typography

interface ActionModalsAndDrawersProps {
    // Create Project Modal Props
    isCreateModalVisible: boolean;
    handleCreateModalCancel: () => void;
    createForm: any; // Ant Design Form instance
    handleCreateProjectSubmit: (values: { projectName: string; description: string }) => Promise<void>;
    isSubmittingProject: boolean;

    // Rename Project Modal Props
    isRenameModalVisible: boolean;
    handleRenameModalCancel: () => void;
    editingProject: Project | null;
    renameForm: any; // Ant Design Form instance
    handleRenameProjectSubmit: (values: { newName: string }) => Promise<void>;
    isProjectActionLoading: boolean;

    // Settings Drawer Props
    isSettingsPanelVisible: boolean;
    closeSettingsPanel: () => void;
    userData: UserDTO | null;
    totalStorageUsedBytes: number;
    handleOpenUpgradeModal: () => void;
    dispatch: AppDispatch;
    logoutUser: typeof logoutUser; // Pass the actual thunk
    navigate: ReturnType<typeof useNavigate>; // Pass navigate directly for logout action

    // Upgrade Modal Props
    isUpgradeModalVisible: boolean;
    handleUpgradeModalCancel: () => void;
    selectedAccountTier: string;
    setSelectedAccountTier: (tier: string) => void;
    handleCreateStripeSession: () => Promise<void>;
    stripeLoading: boolean;
    stripeError: string | null;
    setStripeError: (error: string | null) => void; // Allow clearing error from within this component

    screens: { [key: string]: boolean };

    // PROP MỚI: Định nghĩa các gói tài khoản từ backend (đã bổ sung thông tin hiển thị)
    accountTiers: DisplayPlan[];
}

export const ActionModalsAndDrawers: React.FC<ActionModalsAndDrawersProps> = ({
                                                                                  // Create
                                                                                  isCreateModalVisible, handleCreateModalCancel, createForm,
                                                                                  handleCreateProjectSubmit, isSubmittingProject,
                                                                                  // Rename
                                                                                  isRenameModalVisible, handleRenameModalCancel, editingProject,
                                                                                  renameForm, handleRenameProjectSubmit, isProjectActionLoading,
                                                                                  // Settings
                                                                                  isSettingsPanelVisible, closeSettingsPanel, userData, totalStorageUsedBytes,
                                                                                  handleOpenUpgradeModal, dispatch, logoutUser, navigate,
                                                                                  // Upgrade
                                                                                  isUpgradeModalVisible, handleUpgradeModalCancel, selectedAccountTier,
                                                                                  setSelectedAccountTier, handleCreateStripeSession, stripeLoading, stripeError, setStripeError,
                                                                                  screens,
                                                                                  accountTiers
                                                                              }) => {
    const displayedUsername = userData?.username || 'Người dùng';
    const displayedEmail = userData?.email || 'email@example.com';

    // Tìm thông tin hiển thị của gói hiện tại
    const currentDisplayPlan = accountTiers.find(p => p.name === userData?.status);

    return (
        <>
            {/* Create Project Modal */}
            <Modal
                title="Tạo dự án mới"
                open={isCreateModalVisible}
                onCancel={handleCreateModalCancel}
                footer={[
                    <Button key="back" onClick={handleCreateModalCancel} disabled={isSubmittingProject}>
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isSubmittingProject}
                        onClick={() => {
                            createForm.validateFields()
                                .then((values: { projectName: string; description: string }) => {
                                    handleCreateProjectSubmit(values);
                                })
                                .catch((info: any) => { console.log('Xác thực thất bại:', info); });
                        }}
                    >
                        Tạo
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
                        label="Tên dự án"
                        rules={[{ required: true, message: 'Vui lòng nhập tên dự án!' }]}
                    >
                        <Input placeholder="ví dụ: Video tuyệt vời của tôi" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả (Tùy chọn)">
                        <Input.TextArea rows={4} placeholder="Mô tả ngắn gọn về dự án của bạn" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Rename Project Modal */}
            <Modal
                title="Đổi tên dự án"
                open={isRenameModalVisible}
                onCancel={handleRenameModalCancel}
                footer={[
                    <Button key="back" onClick={handleRenameModalCancel} disabled={isProjectActionLoading}>
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isProjectActionLoading}
                        onClick={() => {
                            renameForm.validateFields()
                                .then((values: { newName: string }) => {
                                    handleRenameProjectSubmit(values);
                                })
                                .catch((info: any) => { console.log('Xác thực thất bại:', info); });
                        }}
                    >
                        Chấp nhận
                    </Button>,
                ]}
            >
                <Form form={renameForm} layout="vertical" name="rename_project_form">
                    <Form.Item
                        name="newName"
                        label="Tên dự án mới"
                        rules={[{ required: true, message: 'Vui lòng nhập tên dự án mới!' }]}
                    >
                        <Input placeholder="Nhập tên dự án mới" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Settings Drawer */}
            <Drawer
                title="Cài đặt tài khoản"
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

                        <Card title={<Space><DatabaseOutlined /> Sử dụng bộ nhớ</Space>}>
                            {(() => {
                                // Lấy giới hạn bộ nhớ trực tiếp từ userData.accountTier
                                const limitMB = userData?.accountTier?.storageLimitMb || 0; // <--- Đã sửa ở đây
                                const storageLimitBytes = limitMB * 1024 * 1024; // Chuyển đổi giới hạn sang bytes

                                const usedBytes = totalStorageUsedBytes;
                                const usedMB = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));

                                // Tính toán phần trăm sử dụng, đảm bảo không chia cho 0
                                const percentUsed = limitMB > 0 ? Math.min((usedBytes / storageLimitBytes) * 100, 100) : 0;

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
                                            {/* HIỂN THỊ GIÁ TRỊ GIỚI HẠN GÓI Ở ĐÂY */}
                                            <Text strong>{formatStorageFromMB(usedMB)} / {formatStorageFromMB(limitMB)} đã sử dụng</Text>
                                        </div>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: '12px', display: 'block', marginTop: 4, marginBottom: 16 }}
                                        >
                                            Giới hạn hiện tại cho gói {currentDisplayPlan?.title || 'Miễn phí'} của bạn. Nâng cấp để có thêm bộ nhớ và tính năng!
                                        </Text>
                                        <Button
                                            type="primary"
                                            icon={<ShoppingCartOutlined />}
                                            onClick={() => { closeSettingsPanel(); handleOpenUpgradeModal();}}
                                            block
                                            style={{ backgroundColor: '#f89b29', borderColor: '#f89b29' }}
                                        >
                                            Nâng cấp gói
                                        </Button>
                                    </>
                                );
                            })()}
                        </Card>

                        <Card title={<Space><UserSwitchOutlined /> Hành động tài khoản</Space>}>
                            <Button
                                type="dashed"
                                block
                                danger
                                onClick={() => {
                                    closeSettingsPanel();
                                    Swal.fire({
                                        title: 'Bạn có chắc không?',
                                        text: "Bạn sẽ bị đăng xuất!",
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonColor: '#d33',
                                        cancelButtonColor: '#3085d6',
                                        confirmButtonText: 'Có, đăng xuất!'
                                    }).then((result) => {
                                        if (result.isConfirmed) {
                                            dispatch(logoutUser());
                                            navigate('/login');
                                            Swal.fire('Đã đăng xuất!', 'Bạn đã đăng xuất thành công.', 'success');
                                        }
                                    })
                                }}>
                                Đăng xuất
                            </Button>
                        </Card>
                    </Space>
                ) : (
                    <Spin tip="Đang tải chi tiết tài khoản..." />
                )}
            </Drawer>

            {/* Stripe Upgrade Modal */}
            <Modal
                title={
                    <div style={{ textAlign: 'center', marginBottom: 0 }}>
                        <Title level={3} style={{ margin: 0 }}>Nâng cấp gói của bạn</Title>
                        <Text type="secondary">Chọn gói phù hợp nhất với nhu cầu của bạn.</Text>
                    </div>
                }
                open={isUpgradeModalVisible}
                onCancel={handleUpgradeModalCancel}
                width={screens.xs ? '95%' : (screens.sm ? 700 : 900)}
                footer={null}
                centered
            >
                <Spin spinning={stripeLoading} tip="Đang xử lý...">
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
                                {accountTiers.map(plan => (
                                    <Col key={plan.name} xs={24} sm={12} md={accountTiers.length > 3 ? 6 : (24 / Math.max(1, accountTiers.length))}>
                                        <Radio.Button
                                            value={plan.name}
                                            style={{
                                                display: 'block', height: 'auto', padding: 0,
                                                border: 0, borderRadius: 8
                                            }}
                                            disabled={plan.name === "FREE"}
                                        >
                                            <Card
                                                hoverable={plan.name !== "FREE"}
                                                className={plan.name === "FREE" ? "free-plan-card-disabled" : ""}
                                                style={{
                                                    textAlign: 'center',
                                                    border: selectedAccountTier === plan.name ?
                                                        `2px solid ${plan.color}` : '1px solid #f0f0f0',
                                                    boxShadow: selectedAccountTier === plan.name ?
                                                        `0 0 0 3px ${plan.color}40` : 'none',
                                                    borderRadius: 8,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    padding: '20px 10px',
                                                    opacity: plan.name === "FREE" ? 0.7 : 1,
                                                    cursor: plan.name === "FREE" ? 'not-allowed' : 'pointer',
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
                                                                / tháng
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
                                                            {formatStorageFromMB(plan.storageLimitMb)} Bộ nhớ
                                                        </Text>
                                                        {plan.name === "FREE" && <Text type="secondary" style={{ fontSize: 12 }}>Tính năng cơ bản</Text>}
                                                        {plan.name === "BASIC" && <Text type="secondary" style={{ fontSize: 12 }}>Nhiều tính năng hơn</Text>}
                                                        {plan.name === "PRO" && <Text type="secondary" style={{ fontSize: 12 }}>Công cụ nâng cao</Text>}
                                                        {plan.name === "PREMIUM" && <Text type="secondary" style={{ fontSize: 12 }}>Truy cập toàn bộ</Text>}
                                                    </Space>
                                                </div>
                                                {userData?.status === plan.name && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <Badge
                                                            count="Gói hiện tại"
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
                                {stripeLoading ? "Đang xử lý..." :
                                    (!selectedAccountTier || selectedAccountTier === "FREE") ? "Chọn gói trả phí" :
                                        (selectedAccountTier === userData?.status) ? "Đây là gói hiện tại của bạn" :
                                            `Nâng cấp lên ${accountTiers.find(p => p.name === selectedAccountTier)?.title || 'Gói'}`
                                }
                            </Button>
                        </div>
                        <Text
                            type="secondary"
                            style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}
                        >
                            Bạn sẽ được chuyển hướng đến trang thanh toán an toàn của Stripe.
                        </Text>
                    </div>
                </Spin>
            </Modal>
        </>
    );
};