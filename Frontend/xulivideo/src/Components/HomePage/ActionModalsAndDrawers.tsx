// src/Components/VideoPage/ActionModalsAndDrawers.tsx
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
import { Project, UserDTO, plans, formatPrice, formatStorageFromMB } from './utils';
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
                                                                                  screens
                                                                              }) => {
    const displayedUsername = userData?.username || 'User';
    const displayedEmail = userData?.email || 'email@example.com';

    return (
        <>
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
                                .then((values: { projectName: string; description: string }) => {
                                    handleCreateProjectSubmit(values);
                                })
                                .catch((info: any) => { console.log('Validate Failed:', info); });
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
                                .then((values: { newName: string }) => {
                                    handleRenameProjectSubmit(values);
                                })
                                .catch((info: any) => { console.log('Validate Failed:', info); });
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
                                            disabled={plan.key === "FREE"}
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
        </>
    );
};