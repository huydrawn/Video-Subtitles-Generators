import React, { useState, useEffect } from 'react';
import {
    Layout,
    Typography, Button, Card, Table, Select, Input, Space, Tag,
    ConfigProvider, Spin, Alert, message // Import `message` for Ant Design notifications
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    PlusOutlined, EditOutlined, StopOutlined, UnlockOutlined, // New icons for Ban/Unban
} from '@ant-design/icons';

import Sidebar from './Sidebar'; // Adjust path for Sidebar component if needed
import apiService from '../../Services/apiService'; // Import the apiService
import Swal from 'sweetalert2'; // Import SweetAlert2

const { Sider, Content } = Layout;
const { Title, Text, Link } = Typography;
const { Search } = Input;

// Định nghĩa interface cho AccountTier con
interface AccountTier {
    name: string;
    storageLimitMb: number;
    priceInCents: number;
    formattedPrice: string;
}

// Định nghĩa interface mới cho UserData từ API
interface UserData {
    userId: number;
    username: string;
    email: string;
    createdAt: string; // Sẽ parse thành Date object để hiển thị
    updatedAt: string;
    // IMPORTANT: Ensure 'BLOCKED' is included as a possible status from backend
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';
    workspace: any | null; // Có thể là object hoặc null
    accountTier: AccountTier;
    roleName: string; // This is what we'll use for the new condition
}

// Giao diện cho dữ liệu hiển thị trong bảng (bao gồm 'key' cho Ant Design)
interface UserTableDataItem extends UserData {
    key: number; // Ant Design Table requires a unique 'key' for each row
}

function UserManagement() {
    const [showingCount, setShowingCount] = useState<number>(10);
    const [users, setUsers] = useState<UserTableDataItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [adminUserId, setAdminUserId] = useState<string | null>(null); // State to store admin's userId

    // Effect to get the current admin's userId from localStorage
    useEffect(() => {
        const id = localStorage.getItem('userId');
        if (id) {
            setAdminUserId(id);
        } else {
            // Handle case where adminUserId is not found (e.g., redirect to login)
            console.error("Admin user ID not found in localStorage. User might not be logged in or token is missing.");
            // You might want to show an error or redirect here
        }
    }, []);

    // useEffect để fetch dữ liệu khi component mount
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                // Using apiService to fetch data
                const response = await apiService.get<UserData[]>('/users/list');
                const data: UserData[] = response.data; // Axios wraps the actual data in .data

                // Map dữ liệu để thêm trường 'key' mà Ant Design Table yêu cầu
                const mappedData: UserTableDataItem[] = data.map(user => ({
                    ...user,
                    key: user.userId, // Sử dụng userId làm key duy nhất
                }));
                setUsers(mappedData);
            } catch (err: any) {
                console.error("Failed to fetch users:", err);
                let errorMessage = "Failed to load user data.";
                if (err.response) {
                    // Server responded with a status other than 2xx
                    errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
                } else if (err.request) {
                    // Request was made but no response received
                    errorMessage = "Network error: No response from server. Is the backend running?";
                } else {
                    // Something else happened while setting up the request
                    errorMessage = `An unexpected error occurred: ${err.message}`;
                }
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []); // [] ensures useEffect runs only once after the initial render

    // --- Function to handle Ban/Unban ---
    const handleBanUnban = async (targetUserId: number, currentStatus: UserData['status']) => {
        if (!adminUserId) {
            message.error("Administrator ID is missing. Cannot perform this action.");
            return;
        }

        const action = currentStatus === 'ACTIVE' ? 'Ban' : 'Unban';
        // Assuming 'ACTIVE' is the status after unban
        const newStatus: UserData['status'] = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

        Swal.fire({
            title: `${action} User`,
            text: `Are you sure you want to ${action.toLowerCase()} user ${targetUserId}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: `Yes, ${action.toLowerCase()} it!`
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    let response;
                    // Ensure userId is passed as a query parameter as your backend expects @RequestParam
                    const params = { userId: targetUserId };

                    if (action === 'Ban') {
                        response = await apiService.put(`/users/ban`, null, { params });
                    } else {
                        response = await apiService.put(`/users/unban`, null, { params });
                    }

                    if (response.status === 200) {
                        message.success(`User ${targetUserId} has been ${action.toLowerCase()}ed successfully.`);
                        // Update the local state immediately
                        setUsers(prevUsers =>
                            prevUsers.map(user =>
                                user.userId === targetUserId ? { ...user, status: newStatus } : user
                            )
                        );
                    } else {
                        message.warning(response.data?.message || `Failed to ${action.toLowerCase()} user.`);
                    }
                } catch (err: any) {
                    console.error(`${action} user failed:`, err);
                    let errorMessage = `Failed to ${action.toLowerCase()} user.`;
                    if (err.response) {
                        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
                    } else if (err.request) {
                        errorMessage = "Network error: No response from server.";
                    }
                    message.error(errorMessage);
                }
            }
        });
    };
    // --- End Function to handle Ban/Unban ---


    // Define table columns
    const columns: ColumnsType<UserTableDataItem> = [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            sorter: (a, b) => a.username.localeCompare(b.username),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            sorter: (a, b) => a.email.localeCompare(b.email),
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (createdAt: string) => {
                const dateObj = new Date(createdAt);
                return (
                    <Space direction="vertical" size={0}>
                        <Text>{dateObj.toLocaleDateString()}</Text>
                        <Text type="secondary" style={{ fontSize: '0.75rem' }}>
                            {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </Space>
                );
            },
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: UserTableDataItem['status']) => {
                let color = '';
                switch (status) {
                    case 'ACTIVE':
                        color = '#4caf50'; // Green
                        break;
                    case 'INACTIVE':
                        color = '#9e9e9e'; // Grey
                        break;
                    case 'SUSPENDED':
                        color = '#f44336'; // Red
                        break;
                    case 'BLOCKED': // Handle new BLOCKED status
                        color = '#f44336'; // Red, same as SUSPENDED or distinct if preferred
                        break;
                    default:
                        color = '#9e9e9e';
                }
                return (
                    <Tag style={{ backgroundColor: color, color: '#fff', borderRadius: 4, padding: '4px 8px', fontWeight: 'bold' }}>
                        {status}
                    </Tag>
                );
            },
            sorter: (a, b) => a.status.localeCompare(b.status),
        },
        {
            title: 'Account Tier',
            dataIndex: 'accountTier',
            key: 'accountTier',
            render: (accountTier: AccountTier) => (
                <Text>{accountTier.formattedPrice}</Text>
            ),
            sorter: (a, b) => a.accountTier.priceInCents - b.accountTier.priceInCents,
        },
        {
            title: 'Role Name',
            dataIndex: 'roleName',
            key: 'roleName',
            render: (roleName: string) => {
                let color = '';
                switch (roleName) {
                    case 'ADMIN':
                        color = '#1890ff';
                        break;
                    case 'USER':
                        color = '#52c41a';
                        break;
                    default:
                        color = '#2f54eb';
                }
                return (
                    <Tag style={{ backgroundColor: color, color: '#fff', borderRadius: 4, padding: '4px 8px', fontWeight: 'bold' }}>
                        {roleName}
                    </Tag>
                );
            },
            sorter: (a, b) => a.roleName.localeCompare(b.roleName),
        },
        {
            title: 'Action',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" icon={<EditOutlined style={{ color: '#4caf50' }} />} />

                    {/* Conditional Ban/Unban Button - ONLY RENDER FOR 'USER' ROLE */}
                    {record.roleName === 'USER' ? (
                        record.status === 'ACTIVE' ? (
                            <Button
                                type="link"
                                icon={<StopOutlined style={{ color: '#f44336' }} />} // Red for Ban
                                onClick={() => handleBanUnban(record.userId, record.status)}
                                title="Ban User"
                            />
                        ) : (record.status === 'BLOCKED' || record.status === 'SUSPENDED' || record.status === 'INACTIVE') ? (
                            <Button
                                type="link"
                                icon={<UnlockOutlined style={{ color: '#00bcd4' }} />} // Cyan for Unban
                                onClick={() => handleBanUnban(record.userId, record.status)}
                                title="Unban User"
                            />
                        ) : (
                            // Fallback for other statuses but still a 'USER' role
                            <Button type="link" icon={<StopOutlined style={{ color: '#cccccc' }} />} disabled title="Action Not Available" />
                        )
                    ) : (
                        // If roleName is NOT 'USER' (e.g., 'ADMIN'), render nothing or a placeholder
                        <></> // Render an empty fragment to hide the buttons
                    )}
                </Space>
            ),
        },
    ];

    // For row selection (checkboxes)
    const rowSelection = {
        onChange: (selectedRowKeys: React.Key[], selectedRows: UserTableDataItem[]) => {
            console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
        },
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#42a5f5',
                    colorInfo: '#42a5f5',
                },
                components: {
                    Menu: {
                        darkItemBg: '#212a45',
                        darkSubMenuItemBg: '#212a45',
                        darkItemSelectedBg: '#313e61',
                        darkItemSelectedColor: '#fff',
                        darkItemHoverBg: '#313e61',
                        darkItemColor: '#c9d1d9',
                        darkItemHoverColor: '#fff',
                    },
                },
            }}
        >
            <Layout style={{ minHeight: '100vh' }}>
                <Sider
                    width={240}
                    style={{ background: '#212a45', borderRight: '1px solid rgba(0, 0, 0, 0.12)' }}
                >
                    <Sidebar />
                </Sider>
                <Layout>
                    <Content style={{ background: '#f0f2f5', padding: 24 }}>
                        {/* Header Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <Title level={4} style={{ margin: 0, fontWeight: 'bold' }}>
                                    User List
                                </Title>
                                <Text type="secondary">
                                    Home / User List
                                </Text>
                            </div>
                            <Button type="primary" icon={<PlusOutlined />}>
                                Add New User
                            </Button>
                        </div>

                        {/* Search and Filter Section */}
                        <Card bordered={false} style={{ marginBottom: 24, borderRadius: 8, boxShadow: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Select
                                    value={showingCount}
                                    onChange={(value) => setShowingCount(value)}
                                    style={{ width: 120 }}
                                >
                                    <Select.Option value={10}>Showing 10</Select.Option>
                                    <Select.Option value={25}>Showing 25</Select.Option>
                                    <Select.Option value={50}>Showing 50</Select.Option>
                                </Select>
                                <Search
                                    placeholder="Search"
                                    onSearch={(value) => console.log('Search:', value)}
                                    style={{ width: 250 }}
                                    enterButton
                                />
                            </div>
                        </Card>

                        {/* Table Section */}
                        <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
                            {loading ? (
                                <Space size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                                    <Spin size="large" />
                                    <Text>Loading users...</Text>
                                </Space>
                            ) : error ? (
                                <Alert message="Error" description={error} type="error" showIcon />
                            ) : (
                                <Table
                                    columns={columns}
                                    dataSource={users.slice(0, showingCount)}
                                    pagination={false}
                                    rowSelection={{ type: 'checkbox', ...rowSelection }}
                                />
                            )}
                        </Card>
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
}

export default UserManagement;