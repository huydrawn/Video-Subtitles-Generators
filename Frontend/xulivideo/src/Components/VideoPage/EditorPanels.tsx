import React, { useRef, useState } from 'react';
import {
    Layout, Button, Input, Select, Space, Slider,
    Typography, Grid, theme, Drawer, Upload, Tabs, Avatar, Tooltip, Dropdown,
    ConfigProvider, Switch, Card, Progress,
    message, List, UploadProps, Modal, Radio, Checkbox, Spin
} from 'antd';
import {
    VideoCameraOutlined, FontSizeOutlined, AudioOutlined, AppstoreOutlined,
    MenuOutlined, ShareAltOutlined, DownloadOutlined, UserOutlined, SettingOutlined,
    PauseOutlined, FileImageOutlined,
    PlayCircleOutlined, SplitCellsOutlined, UndoOutlined, RedoOutlined, ZoomInOutlined,
    ZoomOutOutlined, InboxOutlined, CameraOutlined, CaretDownOutlined,
    AudioMutedOutlined, PlusOutlined,
    FullscreenOutlined,
    LockOutlined, EyeOutlined,
    DragOutlined, BgColorsOutlined as TranslationOutlinedIcon, LeftOutlined, DeleteOutlined, FileTextOutlined, QuestionCircleOutlined,
    BarsOutlined,
    EnterOutlined,
} from '@ant-design/icons';

// Assuming these are in the same components folder
import { TextPanel } from './TextPanel';
// PropertiesPanel is a separate Sider, not part of *these* panels.
// MainMenu is for the main layout Sider, not these contextual panels.

import { useSubtitleLanguageLogic } from './Logic/useSubtitleLanguageLogic'; // Adjust path if needed
import type { VideoEditorLogic, SubtitleEntry, MediaAsset } from './types'; // Adjust path if needed
import { formatTime } from './utils'; // Adjust path if needed

const { Title, Text, Paragraph } = Typography;

// --- Helper Components (internal to this file) ---

const TranscriptionProgressIndicator: React.FC<{
    progress: number;
    fileName: string | null;
    themeToken: ReturnType<typeof theme.useToken>['token'];
    isTranscribingActive: boolean;
}> = ({ progress, fileName, themeToken, isTranscribingActive }) => {
    if (!isTranscribingActive) return null;

    let statusText = "Transcribing...";
    if (progress < 5) statusText = "Initializing...";
    else if (progress < 15) statusText = "Preparing Request...";
    else if (progress < 60) statusText = "Sending Request...";
    else if (progress < 75) statusText = "Processing Response...";
    else if (progress < 100) statusText = "Finalizing Subtitles...";
    else if (progress === 100) statusText = "Transcription Complete!";

    return (
        <Card bordered={false} style={{ marginBottom: 16, marginTop: 16 }}>
            <Space
                direction="vertical"
                align="center"
                style={{ width: '100%', paddingBottom: 16 }}
            >
                <Title level={5} style={{ margin: 0 }}>{statusText}</Title>
                <Progress
                    percent={Math.round(progress)}
                    size="small"
                    showInfo={true}
                    style={{ width: '100%' }}
                />
            </Space>
            <div style={{
                backgroundColor: '#2c2c2c',
                padding: '12px 16px',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                }}>
                    <div style={{
                        flexGrow: 1,
                        backgroundColor: '#555',
                        height: 5,
                        borderRadius: 2.5,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            backgroundColor: themeToken.colorPrimary,
                            height: '100%',
                            width: `${progress}%`,
                            transition: 'width 0.05s linear',
                        }}></div>
                    </div>
                    <span style={{
                        fontSize: 12,
                        color: '#ccc',
                        minWidth: 40,
                        textAlign: 'right',
                    }}>
                        {Math.round(progress)}%
                    </span>
                </div>
                {fileName && progress < 100 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TranslationOutlinedIcon style={{ color: themeToken.colorPrimary }} />
                        <Text type="secondary" ellipsis style={{ flexGrow: 1, color: '#ccc' }}>
                            {fileName}
                        </Text>
                    </div>
                )}
            </div>
        </Card>
    );
};

const MediaPanelContent: React.FC<{
    logic: VideoEditorLogic;
    screens: any; // Antd Grid screens breakpoint object
}> = ({ logic, screens }) => {
    const { token } = theme.useToken();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleAddMediaClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Title level={5} style={{ margin: '0 0 16px 0' }}>Media</Title>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="video/*,image/*"
                multiple={true}
                onChange={logic.handleManualMediaUpload}
            />
            {logic.uploadingFile ? (
                <Card bordered={false} style={{ marginBottom: 16 }}>
                    <Space
                        direction="vertical"
                        align="center"
                        style={{ width: '100%', paddingBottom: 16 }}
                    >
                        <Title level={5} style={{ margin: 0 }}>Uploading...</Title>
                        <Progress
                            percent={logic.uploadProgress}
                            size="small"
                            showInfo={true}
                            style={{ width: '100%' }}
                        />
                    </Space>
                    <div style={{
                        backgroundColor: '#2c2c2c',
                        padding: '12px 16px',
                        borderRadius: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                            <span style={{
                                color: 'white',
                                fontSize: 12,
                                backgroundColor: '#1a1a1a',
                                padding: '2px 6px',
                                borderRadius: 4,
                                minWidth: 40,
                                textAlign: 'center',
                            }}>
                                {logic.projectState.uploadTimeRemaining || '00:00'}
                            </span>
                            <div style={{
                                flexGrow: 1,
                                backgroundColor: '#555',
                                height: 5,
                                borderRadius: 2.5,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    backgroundColor: token.colorPrimary,
                                    height: '100%',
                                    width: `${logic.uploadProgress}%`,
                                    transition: 'width 0.1s ease-in-out',
                                }}></div>
                            </div>
                            <span style={{ fontSize: 12, color: '#ccc', minWidth: 40, textAlign: 'right' }}>
                                {Math.round(logic.uploadProgress)}%
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileTextOutlined style={{ color: token.colorPrimary }} />
                            <Text type="secondary" ellipsis style={{ flexGrow: 1, color: '#ccc' }}>
                                {typeof logic.uploadingFile === 'string'
                                    ? logic.uploadingFile
                                    : logic.uploadingFile?.name || 'Unknown file'}
                            </Text>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card
                    hoverable
                    style={{ marginBottom: 16, cursor: 'pointer' }}
                    onClick={handleAddMediaClick}
                >
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <InboxOutlined style={{ fontSize: 30, color: token.colorPrimary }} />
                        <Title level={5} style={{ margin: '8px 0 4px 0' }}>Upload Media</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Drag and drop or click to upload videos or images
                        </Text>
                    </div>
                </Card>
            )}
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {logic.projectState.mediaAssets.length > 0 ? (
                    <List
                        itemLayout="horizontal"
                        dataSource={logic.projectState.mediaAssets}
                        renderItem={(item: MediaAsset) => (
                            <List.Item
                                key={item.id}
                                actions={[
                                    <Button
                                        key="add"
                                        size="small"
                                        icon={<PlusOutlined />}
                                        onClick={() => console.log("Add asset to timeline (placeholder)")}
                                    />,
                                    <Button
                                        key="delete"
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() => console.log("Delete asset (placeholder)")}
                                    />,
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Avatar
                                            src={item.type.startsWith('image') ? item.secureUrl : undefined}
                                            icon={
                                                item.type.startsWith('video') ? <VideoCameraOutlined /> :
                                                    (item.type.startsWith('image') ? <FileImageOutlined /> : <FileImageOutlined />)
                                            }
                                        />
                                    }
                                    title={<Text ellipsis>{item.name}</Text>}
                                    description={
                                        <Text type="secondary" style={{fontSize: 12}}>
                                            {item.type.split('/')[0]}
                                        </Text>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                ) : (
                    !logic.uploadingFile && (
                        <div style={{ textAlign: 'center', marginTop: 40 }}>
                            <Text type="secondary">No media assets added yet.</Text>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

// Main component for Editor Panels (Left Contextual Sider Content)
interface EditorPanelsProps {
    selectedMenuKey: string;
    logic: VideoEditorLogic;
    screens: any; // Antd Grid screens breakpoint object
    subtitleLangLogic: ReturnType<typeof useSubtitleLanguageLogic>;
}

export const EditorPanels: React.FC<EditorPanelsProps> = ({ selectedMenuKey, logic, screens, subtitleLangLogic }) => {
    const { token } = theme.useToken();
    const [hoveredSubtitleGapIndex, setHoveredSubtitleGapIndex] = useState<number | null>(null);

    const srtUploadButtonProps: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.srt,.vtt',
        showUploadList: false,
        customRequest: (options: any) => {
            if (options.file) {
                logic.handleUploadSrt(options.file as File)
                    .then(() => {
                        options.onSuccess?.({}, new XMLHttpRequest());
                    })
                    .catch((err) => {
                        options.onError?.(err instanceof Error ? err : new Error("SRT processing failed"));
                    });
            } else {
                options.onError?.(new Error("No file provided"));
            }
        },
        beforeUpload: (file: File) => {
            const isSrtOrVtt = file.name.endsWith('.srt') || file.name.endsWith('.vtt');
            if (!isSrtOrVtt) {
                message.error(`${file.name} is not an SRT or VTT file`);
            }
            return isSrtOrVtt || Upload.LIST_IGNORE;
        },
    };

    const activeSubtitleInList = logic.projectState.subtitles.find(sub =>
        logic.currentTime >= sub.startTime && logic.currentTime < sub.endTime
    );

    return (
        <>
            {selectedMenuKey === 'media' && (
                <MediaPanelContent logic={logic} screens={screens} />
            )}
            {selectedMenuKey === 'text' && (
                <TextPanel onAddTextClip={logic.handleAddTextClip} />
            )}
            {selectedMenuKey === 'subtitles' && (
                <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {logic.isTranscribing ? (
                        <TranscriptionProgressIndicator
                            progress={logic.transcriptionProgress}
                            fileName={logic.transcribingFileName}
                            themeToken={token}
                            isTranscribingActive={logic.isTranscribing}
                        />
                    ) : (
                        <>
                            {logic.projectState.subtitles && logic.projectState.subtitles.length > 0 ? (
                                <>
                                    <div style={{marginBottom: 12, display: 'flex', flexDirection: 'column'}}>
                                        <Title level={5} style={{ margin: '0 0 8px 0' }}>Subtitles</Title>
                                        <div style={{
                                            marginBottom: 16,
                                            padding: '8px 0',
                                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                                            borderBottom: `1px solid ${token.colorBorderSecondary}`
                                        }}>
                                            <div style={{ marginBottom: 12 }}>
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                                                >
                                                    Font Family
                                                </Text>
                                                <Select
                                                    value={logic.projectState.subtitleFontFamily}
                                                    onChange={logic.updateSubtitleFontFamily}
                                                    style={{ width: '100%' }}
                                                    size="small"
                                                    options={[
                                                        { value: 'Arial, sans-serif', label: 'Arial' },
                                                        { value: 'Verdana, sans-serif', label: 'Verdana' },
                                                        { value: 'Tahoma, sans-serif', label: 'Tahoma' },
                                                        { value: 'Georgia, serif', label: 'Georgia' },
                                                        { value: 'Times New Roman, serif', label: 'Times New Roman' },
                                                        { value: 'Courier New, monospace', label: 'Courier New' },
                                                        { value: 'Lucida Sans Unicode, Lucida Grande, sans-serif', label: 'Lucida Sans' }
                                                    ]}
                                                />
                                            </div>
                                            <div>
                                                <Space
                                                    size="small"
                                                    style={{
                                                        width: '100%',
                                                        justifyContent: 'space-between',
                                                        marginBottom: 4
                                                    }}
                                                >
                                                    <Text type="secondary" style={{ fontSize: 12 }}>Font Size</Text>
                                                    <Text strong style={{ fontSize: 12 }}>
                                                        {logic.projectState.subtitleFontSize}
                                                    </Text>
                                                </Space>
                                                <Slider
                                                    min={10} max={100} step={1}
                                                    value={logic.projectState.subtitleFontSize}
                                                    onChange={logic.updateSubtitleFontSize}
                                                    tooltip={{ open: false }}
                                                    style={{ margin: '0px 0 8px 0', padding: 0 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                                        <List
                                            itemLayout="vertical"
                                            dataSource={logic.projectState.subtitles}
                                            split={false}
                                            renderItem={(item: SubtitleEntry, index: number) => {
                                                const nextItem = logic.projectState.subtitles[index + 1];
                                                const canMerge = !!nextItem;
                                                const isThisGapHovered = hoveredSubtitleGapIndex === index;

                                                return (
                                                    <React.Fragment key={`${item.id}-frag`}>
                                                        <List.Item
                                                            className={
                                                                `subtitle-list-item ${activeSubtitleInList?.id === item.id ? 'active' : ''}`
                                                            }
                                                            onClick={() => logic.handleTimelineSeek(item.startTime)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                borderBottom: 'none',
                                                                padding: '8px 16px',
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                fontSize: '12px',
                                                                color: token.colorTextSecondary,
                                                                marginBottom: 4
                                                            }}>
                                                                <span>{formatTime(item.startTime).slice(0, -1)}</span>
                                                                <span>{formatTime(item.endTime).slice(0, -1)}</span>
                                                            </div>
                                                            <div style={{
                                                                fontSize: '14px',
                                                                color: token.colorText,
                                                                whiteSpace: 'pre-wrap',
                                                                fontFamily: logic.projectState.subtitleFontFamily
                                                            }}>
                                                                {item.text}
                                                            </div>
                                                        </List.Item>

                                                        {index < logic.projectState.subtitles.length - 1 && (
                                                            <div
                                                                style={{
                                                                    height: '25px',
                                                                    position: 'relative',
                                                                    margin: '0 16px',
                                                                }}
                                                                onMouseEnter={() => setHoveredSubtitleGapIndex(index)}
                                                                onMouseLeave={() => setHoveredSubtitleGapIndex(null)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {isThisGapHovered ? (
                                                                    <Space
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: '50%',
                                                                            left: '50%',
                                                                            transform: 'translate(-50%, -50%)',
                                                                            backgroundColor: token.colorBgElevated,
                                                                            padding: '2px 6px',
                                                                            borderRadius: token.borderRadiusSM,
                                                                            boxShadow: token.boxShadowTertiary,
                                                                            zIndex: 5,
                                                                        }}
                                                                    >
                                                                        {canMerge && (
                                                                            <Button
                                                                                type="text"
                                                                                size="small"
                                                                                style={{
                                                                                    fontSize: '11px',
                                                                                    padding: '0 5px',
                                                                                    color: token.colorTextSecondary
                                                                                }}
                                                                                icon={
                                                                                    <BarsOutlined
                                                                                        rotate={90}
                                                                                        style={{ fontSize: '11px', marginRight: '3px' }}
                                                                                    />
                                                                                }
                                                                                onClick={() => {
                                                                                    logic.handleMergeSubtitles(item.id);
                                                                                    setHoveredSubtitleGapIndex(null);
                                                                                }}
                                                                            >
                                                                                Merge Lines
                                                                            </Button>
                                                                        )}
                                                                    </Space>
                                                                ) : (
                                                                    <div style={{
                                                                        height: '1px',
                                                                        backgroundColor: token.colorBorderSecondary,
                                                                        position: 'absolute',
                                                                        top: '50%', left: 0, right: 0,
                                                                        transform: 'translateY(-50%)'
                                                                    }} />
                                                                )}
                                                            </div>
                                                        )}
                                                        {index === logic.projectState.subtitles.length - 1 && (
                                                            <div style={{
                                                                height: '1px',
                                                                backgroundColor: token.colorBorderSecondary,
                                                                margin: '8px 16px 0 16px'
                                                            }} />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Title level={5} style={{ margin: '0 0 16px 0' }}>Add Subtitles</Title>
                                    <Upload {...srtUploadButtonProps}>
                                        <Card hoverable style={{ marginBottom: 16, cursor: 'pointer' }}>
                                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                                <InboxOutlined style={{ fontSize: 30, color: token.colorPrimary }} />
                                                <Title level={5} style={{ margin: '8px 0 4px 0' }}>
                                                    Upload SRT / VTT
                                                </Title>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Use a subtitle file
                                                </Text>
                                            </div>
                                        </Card>
                                    </Upload>

                                    <div style={{
                                        opacity: logic.isTranscribing ? 0.5 : 1,
                                        pointerEvents: logic.isTranscribing ? 'none' : 'auto'
                                    }}>
                                        <Card bodyStyle={{ padding: 0 }}>
                                            <div style={{ padding: '16px' }}>
                                                <div style={{ marginBottom: '20px' }}>
                                                    <Space align="center"  style={{ width: '100%', marginBottom: '8px' }}>
                                                        <Text style={{ color: token.colorText }}>Original language</Text>
                                                        <Tooltip title="Select the original language of the video or choose auto-detect.">
                                                            <QuestionCircleOutlined
                                                                style={{ color: token.colorTextSecondary, cursor: 'pointer' }}
                                                            />
                                                        </Tooltip>
                                                    </Space>
                                                    <Select
                                                        placeholder="Auto detect"
                                                        style={{ width: '100%' }}
                                                        options={subtitleLangLogic.availableLanguages}
                                                        loading={subtitleLangLogic.languagesLoading}
                                                        disabled={
                                                            logic.isTranscribing ||
                                                            subtitleLangLogic.languagesLoading ||
                                                            !logic.selectedVideoSecureUrl
                                                        }
                                                        value={subtitleLangLogic.selectedOriginalLanguage}
                                                        onChange={(value) => subtitleLangLogic.setSelectedOriginalLanguage(value)}
                                                        showSearch
                                                        filterOption={(input, option) =>
                                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                        }
                                                        notFoundContent={
                                                            subtitleLangLogic.languagesLoading ? <Spin size="small" /> : "No languages found"
                                                        }
                                                    />
                                                    {!logic.selectedVideoSecureUrl && (
                                                        <Text type="danger" style={{fontSize: 12, display: 'block', marginTop: 4}}>
                                                            Select a video clip first.
                                                        </Text>
                                                    )}
                                                </div>
                                                <Button
                                                    type="primary"
                                                    block
                                                    style={{
                                                        marginBottom: '12px',
                                                        backgroundColor: '#18D2D3',
                                                        borderColor: '#18D2D3',
                                                        color: '#000000'
                                                    }}
                                                    onClick={() => {
                                                        if (!logic.selectedVideoSecureUrl) {
                                                            message.error("Please select a video clip from the timeline first.");
                                                            return;
                                                        }
                                                        const langToUse = subtitleLangLogic.selectedOriginalLanguage === 'vi' ?
                                                            'vi' : (subtitleLangLogic.selectedOriginalLanguage || 'auto');
                                                        logic.handleStartFromScratch({ language: langToUse, translate: false });
                                                    }}
                                                    disabled={logic.isTranscribing || !logic.selectedVideoSecureUrl}
                                                >
                                                    Auto Subtitle
                                                </Button>
                                                <Button
                                                    type="primary"
                                                    block
                                                    style={{
                                                        backgroundColor: '#18D2D3',
                                                        borderColor: '#18D2D3',
                                                        color: '#000000'
                                                    }}
                                                    onClick={() => {
                                                        if (!logic.selectedVideoSecureUrl) {
                                                            message.error("Please select a video clip from the timeline first.");
                                                            return;
                                                        }
                                                        logic.handleStartFromScratch({ language: 'en', translate: true });
                                                    }}
                                                    disabled={logic.isTranscribing || !logic.selectedVideoSecureUrl}
                                                >
                                                    Translate
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
            {!(selectedMenuKey === 'media' ||
                selectedMenuKey === 'text' ||
                selectedMenuKey === 'subtitles') && (
                <div style={{ padding: 16, textAlign: 'center' }}>
                    <Text type="secondary">Select a tool</Text>
                </div>
            )}
        </>
    );
};