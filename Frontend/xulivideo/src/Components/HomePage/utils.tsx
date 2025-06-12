// src/Components/HomePage/VideoPage.utils.ts (đổi tên từ utils.tsx)
import React, { useState, useEffect } from 'react';
import {
    Card, Menu, Dropdown, Button, Typography,
} from 'antd'; // Thêm Card vào import
import {
    EditOutlined, DeleteOutlined, EllipsisOutlined, PictureOutlined, SunOutlined, MoonOutlined,
    StopOutlined, StarOutlined, RocketOutlined, CrownOutlined // Import thêm các icon cho plans
} from '@ant-design/icons';
import * as DarkReader from 'darkreader';

// CHỈNH SỬA Ở ĐÂY
const { Text } = Typography;
const { Meta } = Card; // Meta thuộc về Card, không phải Typography


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
export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- Helper function to format storage from MB ---
export const formatStorageFromMB = (mb: number): string => {
    if (mb < 1024) {
        return `${mb.toFixed(1).replace(/\.0$/, '')} MB`;
    }
    return `${(mb / 1024).toFixed(1).replace(/\.0$/, '')} GB`;
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
export const plans = [
    {
        key: "FREE", title: "Free", priceInCents: 0, storageLimitMb: 100,
        icon: React.createElement(StopOutlined, { style: { fontSize: 24, color: '#8c8c8c' } }), color: '#8c8c8c',
    },
    {
        key: "BASIC", title: "Basic", priceInCents: 200, storageLimitMb: 200,
        icon: React.createElement(StarOutlined, { style: { fontSize: 24, color: '#1890ff' } }), color: '#1890ff',
    },
    {
        key: "PRO", title: "Pro", priceInCents: 500, storageLimitMb: 500,
        icon: React.createElement(RocketOutlined, { style: { fontSize: 24, color: '#52c41a' } }), color: '#52c41a',
    },
    {
        key: "PREMIUM", title: "Premium", priceInCents: 1000, storageLimitMb: 1024,
        icon: React.createElement(CrownOutlined, { style: { fontSize: 24, color: '#faad14' } }), color: '#faad14',
    },
];

export const formatPrice = (priceInCents: number) => {
    if (priceInCents === 0) return "Free";
    return `$${(priceInCents / 100.0).toFixed(2)}`;
};