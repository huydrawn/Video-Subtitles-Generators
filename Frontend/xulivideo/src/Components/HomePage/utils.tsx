// src/Components/VideoPage/utils.ts

import React, { useState, useEffect } from 'react';
import {
    Card, Menu, Dropdown, Button, Typography,
} from 'antd';
import {
    EditOutlined, DeleteOutlined, EllipsisOutlined, PictureOutlined, SunOutlined, MoonOutlined,
    StopOutlined, StarOutlined, RocketOutlined, CrownOutlined
} from '@ant-design/icons';
import * as DarkReader from 'darkreader';

const { Text } = Typography;
const { Meta } = Card;

// --- Custom Hook: useDebounce ---
export function useDebounce<T>(value: T, delay: number): T {
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

// --- Interfaces ---
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
    status: string; // Represents the current plan/tier, e.g., "FREE", "BASIC", "PRO" (should match AccountTierDTO.name)
    workspace: Workspace | null;
    accountTier: AccountTierDTO;
}

// MỚI: Định nghĩa kiểu dữ liệu cho AccountTierDTO từ backend
export interface AccountTierDTO {
    name: string; // Tên của gói (ví dụ: "FREE", "BASIC", "PRO", "PREMIUM")
    storageLimitMb: number;
    priceInCents: number;
    formattedPrice: string; // Giá đã định dạng từ backend
}

// MỚI: Interface cho dữ liệu gói đã được bổ sung thông tin hiển thị UI
export interface DisplayPlan extends AccountTierDTO {
    title: string; // Tên thân thiện với người dùng (ví dụ: "Free", "Basic")
    color: string; // Màu sắc cho các phần tử UI
    icon: React.ReactNode; // Icon cho các phần tử UI
}


// --- Helper function to format bytes ---
export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- Helper function to format storage from MB ---
export const formatStorageFromMB = (mb: number | undefined): string => { // Thêm undefined vào kiểu
    if (typeof mb === 'undefined' || mb === null) return "N/A"; // Xử lý undefined/null
    if (mb < 1024) {
        return `${mb.toFixed(1).replace(/\.0$/, '')} MB`;
    }
    return `${(mb / 1024).toFixed(1).replace(/\.0$/, '')} GB`;
};

// --- Helper function to format price (sử dụng này hoặc formattedPrice từ backend) ---
export const formatPrice = (priceInCents: number | undefined): string => { // Thêm undefined vào kiểu
    if (typeof priceInCents === 'undefined' || priceInCents === null) return "N/A";
    if (priceInCents === 0) return "Miễn phí"; // Đổi "Free" thành "Miễn phí" cho tiếng Việt
    return `$${(priceInCents / 100.0).toFixed(2)}`;
};


// --- Dark Mode Toggle Component ---
export const DarkModeToggle = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof DarkReader.enable !== 'function' || typeof DarkReader.disable !== 'function') {
            return false;
        }
        const persisted = localStorage.getItem('darkModeEnabled');
        try {
            return persisted ? JSON.parse(persisted) : DarkReader.isEnabled();
        } catch (error) {
            // Fallback if parsing fails or DarkReader issues
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
            catch (error) { console.error("Error enabling DarkReader:", error); setIsDarkMode(false); }
        } else if (!isDarkMode && currentlyEnabled) {
            try { DarkReader.disable(); }
            catch (error) { console.error("Error disabling DarkReader:", error); setIsDarkMode(true); }
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
        } catch (error) {
            console.error("Error toggling DarkReader:", error);
            setIsDarkMode(isDarkMode); // Revert if there's an error
        }
    };

    if (typeof DarkReader.enable !== 'function') return null; // Render nothing if DarkReader is not available

    return (
        <Button
            type="text"
            shape="circle"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleDarkMode}
            style={{ fontSize: "20px", color: 'unset' }}
            aria-label={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
        />
    );
};

// --- Project Card Component ---
export const ProjectCard: React.FC<{
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
        catch (e) { return 'Ngày không hợp lệ'; }
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
                Chỉnh sửa chi tiết
            </Menu.Item>
            <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={() => onDelete(project)}>
                Xóa dự án
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
                    {projectName || 'Dự án không có tiêu đề'}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {ownerName}, {formatDate(updatedAt)}
                </Text>
                {durationString && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Thời lượng: {durationString}
                    </Text>
                )}
                {dimensionsString && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Kích thước: {dimensionsString}
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
                        aria-label="Tùy chọn dự án"
                    />
                </Dropdown>
            </div>
        </Card>
    );
};


// MỚI: Hàm trợ giúp để bổ sung các thuộc tính UI vào dữ liệu gói từ backend
export const getDisplayPlans = (backendTiers: AccountTierDTO[]): DisplayPlan[] => {
    const tierDisplayMapping: { [key: string]: { title: string; color: string; icon: React.ReactNode } } = {
        "FREE": { title: "Miễn phí", color: '#bfbfbf', icon: <StopOutlined /> },
        "BASIC": { title: "Cơ bản", color: '#1890ff', icon: <StarOutlined /> },
        "PRO": { title: "Pro", color: '#a0d911', icon: <RocketOutlined /> },
        "PREMIUM": { title: "Premium", color: '#faad14', icon: <CrownOutlined /> },
    };

    return backendTiers.map(tier => ({
        ...tier,
        title: tierDisplayMapping[tier.name]?.title || tier.name,
        color: tierDisplayMapping[tier.name]?.color || '#9254de', // Màu mặc định nếu không khớp
        icon: tierDisplayMapping[tier.name]?.icon || <StarOutlined />, // Icon mặc định
    })).sort((a, b) => { // Sắp xếp để duy trì thứ tự nhất quán trong UI
        const order = ["FREE", "BASIC", "PRO", "PREMIUM"];
        return order.indexOf(a.name) - order.indexOf(b.name);
    });
};