import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Layout, Button, Input, Select, Space, Slider,
    Typography, Grid, theme, Drawer, Upload, Tabs, Avatar, Tooltip, Dropdown,
    ConfigProvider, Switch, Card, Progress,
    message, List, UploadProps, Modal, Radio, Checkbox, Spin
} from 'antd';
// Moveable is no longer needed here as it's used only within the new components.
// import Moveable from 'react-moveable';

import { useVideoEditorLogic } from './Logic/useVideoEditorLogic';
import { useExportModalLogic } from './Logic/useExportModalLogic';
import { useSubtitleLanguageLogic } from './Logic/useSubtitleLanguageLogic';
import { formatTime, parseTimecodeToSeconds } from './utils'; // formatTime is still needed for modal

// Import your new components
import { EditorPanels } from './EditorPanels';
import { EditorPreviewArea } from './EditorPreviewArea';
import { EditorTimeline } from './EditorTimeline';

// Import directly used components from ./components
import { MainMenu } from './MainMenu';
import { PropertiesPanel } from './PropertiesPanel'; // This one is still directly used for the right sider

import type { VideoEditorLogic, SubtitleEntry, MediaAsset } from './types';

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

import './videoeditor.css';

const { Header, Sider, Content, Footer } = Layout;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
// Dragger is now in EditorPreviewArea, no longer needed here
// const { Dragger } = Upload;


const VideoEditor: React.FC<{ projectId: string }> = ({ projectId }) => {
    const logic: VideoEditorLogic = useVideoEditorLogic(projectId);
    const screens = useBreakpoint();
    const { token } = theme.useToken();
    const iconSiderWidth = 60;
    const contextualPanelWidth = 350; // Width for the left contextual panel

    const {
        selectedVideoSecureUrl,
        handleExtractAudio,
        isExtractingAudio,
        audioExtractionProgress,
        ffmpegLoaded,
    } = logic; // Destructure directly from logic as these are core editor features

    // --- Logic for getFirstVideoAssetDuration (needed by Export Modal) ---
    const getFirstVideoAssetDuration = useCallback(() => {
        const firstVideoAsset = logic.projectState.mediaAssets.find(
            asset => asset.type.startsWith('video/') && asset.secureUrl
        );
        if (firstVideoAsset?.secureUrl) {
            const mediaElement = logic.mediaElementsRef.current?.[firstVideoAsset.id] as HTMLVideoElement;
            if (mediaElement && mediaElement.duration && isFinite(mediaElement.duration)) {
                return mediaElement.duration;
            }
        }
        return logic.projectState.totalDuration; // Fallback
    }, [logic.projectState.mediaAssets, logic.projectState.totalDuration, logic.mediaElementsRef]);


    // --- Use newly created custom hooks ---
    const exportModalLogic = useExportModalLogic(logic, getFirstVideoAssetDuration);
    const subtitleLangLogic = useSubtitleLanguageLogic(); // Used by EditorPanels

    // Removed srtUploadButtonProps and activeSubtitleInList as they are now internal to EditorPanels

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: { colorPrimary: '#7B61FF', motion: false }
            }}
        >
            <Layout className="video-editor-layout" style={{ minHeight: '100vh', overflow: 'hidden' }}>
                {!screens.xs && (
                    <Sider
                        collapsed={true}
                        width={iconSiderWidth}
                        collapsedWidth={iconSiderWidth}
                        theme="dark"
                        className="icon-sider"
                        style={{ zIndex: 3, height: '100vh' }}
                    >
                        <div
                            style={{
                                height: 56,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 8
                            }}
                        >
                            <Button
                                type="text"
                                icon={<LeftOutlined />}
                                style={{color: token.colorTextSecondary}}
                                disabled // Left arrow is disabled in original code
                            />
                        </div>
                        <MainMenu
                            selectedKey={logic.selectedMenuKey}
                            onClick={logic.handleMenuClick}
                            mode="inline"
                        />
                        <div style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center' }}>
                            <Tooltip placement="right" title="Settings (Placeholder)">
                                <Button
                                    type="text"
                                    shape="circle"
                                    icon={<SettingOutlined />}
                                    disabled
                                    style={{color: token.colorTextSecondary}}
                                />
                            </Tooltip>
                        </div>
                    </Sider>
                )}
                {(logic.selectedMenuKey !== 'settings_footer' && !screens.xs) && (
                    <Sider
                        width={contextualPanelWidth}
                        theme="dark"
                        className="contextual-sider"
                        style={{ height: '100vh', overflow: 'hidden', zIndex: 2 }}
                    >
                        <div className="contextual-panel-content-area">
                            <EditorPanels
                                selectedMenuKey={logic.selectedMenuKey}
                                logic={logic}
                                screens={screens}
                                subtitleLangLogic={subtitleLangLogic}
                            />
                        </div>
                    </Sider>
                )}

                <Layout
                    style={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        paddingBottom: 180 // Accounts for the fixed height footer
                    }}
                >
                    <Header
                        style={{
                            padding: '0 16px 0 20px',
                            height: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 1,
                            flexShrink: 0
                        }}
                    >
                        <Space size="middle">
                            {screens.xs && (
                                <Button
                                    type="text"
                                    icon={<MenuOutlined />}
                                    onClick={logic.showMobileDrawer}
                                    style={{ color: token.colorText }}
                                />
                            )}
                            {!screens.xs && (
                                <Space align="center">
                                    <Input
                                        variant='borderless'
                                        value={logic.projectState.projectName}
                                        onChange={e => logic.setProjectState(p => ({ ...p, projectName: e.target.value }))}
                                        style={{ fontWeight: 500, color: token.colorText, width: '150px', fontSize: '14px' }}
                                    />
                                    <Select
                                        size="small"
                                        value={`${logic.projectState.canvasDimensions.width}x${logic.projectState.canvasDimensions.height}`}
                                        onChange={(value) => {
                                            const [widthStr, heightStr] = value.split('x');
                                            const width = parseInt(widthStr, 10);
                                            const height = parseInt(heightStr, 10);
                                            if (!isNaN(width) && !isNaN(height)) {
                                                logic.setProjectState(prev => ({ ...prev, canvasDimensions: { width, height } }));
                                            }
                                        }}
                                        options={[
                                            { value: '1280x720', label: '1280x720 (16:9)' },
                                            { value: '1920x1080', label: '1920x1080 (16:9)' },
                                            { value: '1080x1920', label: '1080x1920 (9:16)' },
                                            { value: '1080x1080', label: '1080x1080 (1:1)' },
                                        ]}
                                        style={{width: 140}}
                                    />
                                </Space>
                            )}
                        </Space>
                        <Button onClick={exportModalLogic.showExportModal} icon={<DownloadOutlined />}>
                            Export Options
                        </Button>
                        <Space size="middle" style={{marginRight:'30px'}}>
                            <Button
                                type="primary"
                                size="small"
                                onClick={logic.handleBurnSubtitlesWithFFmpeg}
                                disabled={
                                    logic.isBurningSubtitles ||
                                    !logic.projectState.subtitles ||
                                    logic.projectState.subtitles.length === 0 ||
                                    !logic.selectedVideoSecureUrl ||
                                    !logic.ffmpegLoaded
                                }
                                loading={logic.isBurningSubtitles}
                            >
                                {logic.isBurningSubtitles ? `Burning... ${logic.burningProgress}%` : 'Burn Subtitles'}
                            </Button>
                        </Space>
                    </Header>
                    {/* Export Modal (remains here as it's a root-level modal and depends on main logic) */}
                    <Modal
                        title="Export Project Settings"
                        open={exportModalLogic.isExportModalVisible}
                        onOk={exportModalLogic.handleExportModalOk}
                        onCancel={exportModalLogic.handleExportModalCancel}
                        okText="Start Export"
                        cancelText="Cancel"
                        confirmLoading={exportModalLogic.currentOperationInProgress}
                        width={600}
                        maskClosable={!exportModalLogic.currentOperationInProgress}
                        keyboard={!exportModalLogic.currentOperationInProgress}
                    >
                        <Spin
                            spinning={exportModalLogic.currentOperationInProgress}
                            tip={
                                exportModalLogic.isExporting ? `Exporting... ${exportModalLogic.exportProgress}%` :
                                    (logic.isDesaturating ? `Processing... ${logic.desaturationProgress}%` : 'Processing...')
                            }
                        >
                            {exportModalLogic.currentOperationInProgress && (
                                <Progress
                                    percent={exportModalLogic.currentProgressValue}
                                    status={exportModalLogic.operationIsDone ? "success" : "active"}
                                    style={{ marginBottom: 20 }}
                                    showInfo={true}
                                />
                            )}
                            <Space
                                direction="vertical"
                                size="large"
                                style={{ width: '100%', marginTop: exportModalLogic.currentOperationInProgress ? 8 : 20 }}
                            >
                                <Card size="small" title="Timing">
                                    <Space align="start" style={{ width: '100%' }} >
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <Text>Start</Text>
                                            <Input
                                                value={formatTime(exportModalLogic.exportStartTime)}
                                                onChange={(e) => exportModalLogic.handleTimeInputChange(e.target.value, 'start')}
                                                style={{ textAlign: 'center', fontFamily: 'monospace', margin: '8px 0' }}
                                                placeholder="MM:SS.mmm"
                                                disabled={exportModalLogic.currentOperationInProgress}
                                            />
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => exportModalLogic.handleTimeInputChange('00:00.000', 'start')}
                                                disabled={exportModalLogic.currentOperationInProgress}
                                            >
                                                Set to video start
                                            </Button>
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <Text>End</Text>
                                            <Input
                                                value={formatTime(exportModalLogic.exportEndTime)}
                                                onChange={(e) => exportModalLogic.handleTimeInputChange(e.target.value, 'end')}
                                                style={{ textAlign: 'center', fontFamily: 'monospace', margin: '8px 0' }}
                                                placeholder="MM:SS.mmm"
                                                disabled={exportModalLogic.currentOperationInProgress}
                                            />
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => exportModalLogic.handleTimeInputChange(formatTime(exportModalLogic.currentVideoAssetDuration), 'end')}
                                                disabled={exportModalLogic.currentOperationInProgress}
                                            >
                                                Set to video end
                                            </Button>
                                        </div>
                                    </Space>
                                    <Text type="secondary" style={{display: 'block', textAlign: 'center', marginTop: '8px'}}>
                                        Selected duration: {formatTime(Math.max(0, exportModalLogic.exportEndTime - exportModalLogic.exportStartTime))}
                                    </Text>
                                </Card>

                                <Card size="small" title="Video Options">
                                    <Checkbox
                                        checked={exportModalLogic.removeColorOnExport}
                                        onChange={(e) => exportModalLogic.setRemoveColorOnExport(e.target.checked)}
                                        disabled={exportModalLogic.currentOperationInProgress}
                                    >
                                        Remove Color (Desaturate Video Segment)
                                    </Checkbox>
                                    <Text type="secondary" style={{ display: 'block', marginLeft: 24, marginTop: 4 }}>
                                        Exports the selected video segment in black and white. This will re-encode the segment.
                                    </Text>
                                </Card>

                                <Card size="small" title="Snapshot & Animation Options (from original video)">
                                    <div>
                                        <Text strong>Image type:</Text>
                                        <Radio.Group
                                            onChange={(e) => exportModalLogic.setSelectedImageType(e.target.value)}
                                            value={exportModalLogic.selectedImageType}
                                            style={{ marginLeft: 8 }}
                                            optionType="button"
                                            buttonStyle="solid"
                                            disabled={exportModalLogic.currentOperationInProgress || exportModalLogic.removeColorOnExport}
                                        >
                                            <Radio.Button value="default">Default</Radio.Button>
                                            <Radio.Button value="webp">WEBP</Radio.Button>
                                        </Radio.Group>
                                    </div>
                                    <div style={{marginTop: 16}}>
                                        <Text strong>GIF type:</Text>
                                        <Radio.Group
                                            onChange={(e) => exportModalLogic.setSelectedGifType(e.target.value)}
                                            value={exportModalLogic.selectedGifType}
                                            style={{ marginLeft: 8 }}
                                            optionType="button"
                                            buttonStyle="solid"
                                            disabled={exportModalLogic.currentOperationInProgress || exportModalLogic.removeColorOnExport}
                                        >
                                            <Radio.Button value="webp">WEBP</Radio.Button>
                                            <Radio.Button value="gif">GIF</Radio.Button>
                                        </Radio.Group>
                                    </div>
                                    {exportModalLogic.removeColorOnExport && (
                                        <Text type="secondary" style={{display: 'block', marginTop: 8}}>
                                            Snapshots and animations are disabled when "Remove Color" is selected,
                                            as the desaturated segment is the primary output.
                                        </Text>
                                    )}
                                </Card>
                            </Space>
                        </Spin>
                    </Modal>

                    <Layout
                        style={{
                            flexGrow: 1,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'row',
                            marginRight: screens.xs ? 0 : '10px' // Margin for the main content area
                        }}
                    >
                        {/* Central Preview Area */}
                        <EditorPreviewArea logic={logic} />

                        {/* Right Properties Panel */}
                        {(logic.editorState === 'editor' || logic.isTranscribing) && !screens.xs && (
                            <Sider
                                width={340}
                                theme="dark"
                                className="properties-sider"
                                style={{
                                    height: '100%',
                                    overflow: 'auto',
                                    flexShrink: 0,
                                    padding: '16px',
                                    marginRight: '-15px' // This was likely to hide the scrollbar, keep it.
                                }}
                            >
                                <PropertiesPanel
                                    selectedClip={logic.selectedClip}
                                    currentTime={logic.currentTime}
                                    updateSelectedClipProperty={logic.updateSelectedClipProperty}
                                    updateSelectedClipText={logic.updateSelectedClipText}
                                    addOrUpdateKeyframe={logic.addOrUpdateKeyframe}
                                    onDeleteClip={logic.handleDeleteClip}
                                    subtitleFontFamily={logic.projectState.subtitleFontFamily}
                                    updateSubtitleFontFamily={logic.updateSubtitleFontFamily}
                                    subtitleFontSize={logic.projectState.subtitleFontSize}
                                    updateSubtitleFontSize={logic.updateSubtitleFontSize}
                                    subtitleTextAlign={logic.projectState.subtitleTextAlign as 'left' | 'center' | 'right'}
                                    updateSubtitleTextAlign={logic.updateSubtitleTextAlign}
                                    isSubtitleBold={logic.projectState.isSubtitleBold}
                                    toggleSubtitleBold={logic.toggleSubtitleBold}
                                    isSubtitleItalic={logic.projectState.isSubtitleItalic}
                                    toggleSubtitleItalic={logic.toggleSubtitleItalic}
                                    isSubtitleUnderlined={logic.projectState.isSubtitleUnderlined}
                                    toggleSubtitleUnderlined={logic.toggleSubtitleUnderlined}
                                    subtitleColor={logic.projectState.subtitleColor}
                                    updateSubtitleColor={logic.updateSubtitleColor}
                                    subtitleBackgroundColor={logic.projectState.subtitleBackgroundColor}
                                    updateSubtitleBackgroundColor={logic.updateSubtitleBackgroundColor}
                                    selectedVideoSecureUrl={selectedVideoSecureUrl}
                                    handleExtractAudio={handleExtractAudio}
                                    isExtractingAudio={isExtractingAudio}
                                    audioExtractionProgress={audioExtractionProgress}
                                    ffmpegLoaded={ffmpegLoaded}
                                />
                            </Sider>
                        )}
                    </Layout>

                    {/* Timeline Footer */}
                    {(logic.editorState === 'editor' || logic.isTranscribing) && (
                        <EditorTimeline logic={logic} screens={screens} />
                    )}
                </Layout>

                {/* Mobile Drawer (remains here as it's a root-level drawer for mobile main menu) */}
                <Drawer
                    title="Menu"
                    placement="left"
                    closable={true}
                    onClose={logic.closeMobileDrawer}
                    open={logic.mobileDrawerVisible && screens.xs}
                    width={250}
                    bodyStyle={{ padding: 0, background: '#1f1f1f' }}
                    headerStyle={{ background: '#1f1f1f', borderBottom: `1px solid #303030` }}
                    zIndex={1050}
                >
                    <MainMenu
                        selectedKey={logic.selectedMenuKey}
                        onClick={(e) => { logic.handleMenuClick(e); logic.closeMobileDrawer(); }}
                        mode="vertical"
                    />
                </Drawer>
            </Layout>
        </ConfigProvider>
    );
};

export default VideoEditor;