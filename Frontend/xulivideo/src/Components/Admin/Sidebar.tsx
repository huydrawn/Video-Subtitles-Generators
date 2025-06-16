import React from 'react'; // Không cần useState nữa vì không có submenu để quản lý trạng thái mở
import { Menu, Typography } from 'antd'; // Không cần Tag, Space nữa vì không còn badge
import {
    UserOutlined,      // Icon cho User Management
    EyeOutlined,       // Eye icon at top right (giữ lại cho logo area)
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Text } = Typography;

// Định nghĩa kiểu cho các mục menu
type MenuItem = Required<MenuProps>['items'][number];

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
    type?: 'group',
): MenuItem {
    return {
        key,
        icon,
        children,
        label,
        type,
    } as MenuItem;
}

// Chỉ có một mục menu duy nhất: User Management
const items: MenuItem[] = [
    getItem('User Management', 'user-management', <UserOutlined />),
];

function Sidebar() {
    // Không cần state openKeys và hàm onOpenChange nữa vì không có submenu
    // const [openKeys, setOpenKeys] = useState(['dashboard']);
    // const onOpenChange = (keys: string[]) => {
    //     setOpenKeys(keys);
    // };

    return (
        <div style={{ background: '#212a45', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top Logo and Eye Icon */}
            <div style={{
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)' // Đường kẻ dưới logo
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* Placeholder for ADMINDEK logo - you'd replace this with an actual image */}
                    <span style={{ fontSize: 24, marginRight: 8 }}>▲</span> {/* Simple triangle placeholder */}
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>ADMINDESK</Text>
                </div>
                <EyeOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
            </div>

            {/* Navigation Menu */}
            <Menu
                mode="inline"
                theme="dark" // Đặt theme là dark để có màu nền tối
                items={items} // Chỉ còn một mục "User Management"
                defaultSelectedKeys={['user-management']} // Chọn mục "User Management" mặc định
                // Không cần defaultOpenKeys, openKeys, onOpenChange nữa
                style={{ background: 'transparent', borderRight: 0, flexGrow: 1, paddingTop: 16 }} // Đặt background trong suốt để dùng màu của Sider
            />
        </div>
    );
}

export default Sidebar;