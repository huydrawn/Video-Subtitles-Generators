import React, { useState } from 'react';
import {
    Typography, Space, Row, Col, InputNumber, Slider, Switch, Select, Button,
    ColorPicker, Divider, Tooltip, Segmented, Card, Input,
    message,
    theme,
    Progress,
    Modal,
    Tabs,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
    PlusOutlined, DeleteOutlined,
    AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, VerticalAlignTopOutlined,
    VerticalAlignMiddleOutlined, VerticalAlignBottomOutlined, PicCenterOutlined,
    RotateLeftOutlined, RotateRightOutlined, SwapOutlined,
    ThunderboltOutlined, AudioOutlined as AudioToolIcon, EyeOutlined as EyeContactIcon, SearchOutlined,
    SoundOutlined, ForkOutlined, AudioFilled,
    ReloadOutlined, MinusOutlined, MoreOutlined, QuestionCircleOutlined,
    ExpandOutlined,
    UserOutlined,
    ScissorOutlined,
    DragOutlined,
    SecurityScanOutlined,
    BorderOutlined,
    BgColorsOutlined as BackgroundIcon,
    EditOutlined,
    CustomerServiceOutlined, DownloadOutlined,
    AudioOutlined, // For detach button
    CrownFilled, // Added for Crop button icon
    UploadOutlined, // Added for Upload button in modal
    FileImageOutlined, // Added for media item placeholder in modal
    FileTextOutlined, // Added for document icon in modal
    VideoCameraOutlined, // Added for video icon in modal
    StarFilled, // Added for star icon in modal
    PlayCircleFilled, // For Trim Modal Play button
    ZoomInOutlined, // For Trim Modal Zoom
    ZoomOutOutlined, // For Trim Modal Zoom
    CloseOutlined, // For Modal close
} from '@ant-design/icons';
// Import required types
import type { Clip, VideoEditorLogic, Keyframe } from './types';
// Import necessary helpers
import { formatTime, interpolateValue } from './utils';
import './PropertiesPanel.css'; // Import the CSS file

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// Reusable Section Header Component
const SectionHeader: React.FC<{ title: string; children?: React.ReactNode; style?: React.CSSProperties }> =
    ({ title, children, style }) => {
        const { token } = theme.useToken();
        return (
            <Row justify="space-between" align="middle" style={{ marginBottom: 8, marginTop: 16, ...style }}>
                <Col>
                    <Text strong style={{ color: token.colorTextSecondary, fontSize: 12, textTransform: 'uppercase' }}>
                        {title}
                    </Text>
                </Col>
                <Col>
                    <Space size="small">
                        {children}
                    </Space>
                </Col>
            </Row>
        );
    }

// Reusable Reset Button component
const ResetButton: React.FC<{ onClick?: () => void; disabled?: boolean }> = ({ onClick, disabled }) => {
    const { token } = theme.useToken();
    return (
        <Button type="link" size="small" onClick={onClick} style={{ padding: 0, height: 'auto', lineHeight: 1 }} disabled={disabled}>
            <Text type="secondary" style={{ fontSize: 11, color: token.colorTextSecondary }}>Reset</Text>
        </Button>
    );
}

interface PropertiesPanelProps {
    selectedClip: Clip | null;
    currentTime: number;
    updateSelectedClipProperty: VideoEditorLogic['updateSelectedClipProperty'];
    updateSelectedClipText: VideoEditorLogic['updateSelectedClipText'];
    addOrUpdateKeyframe: VideoEditorLogic['addOrUpdateKeyframe'];
    onDeleteClip: () => void;
    subtitleFontFamily: string;
    updateSubtitleFontFamily: VideoEditorLogic['updateSubtitleFontFamily'];
    subtitleFontSize: number;
    updateSubtitleFontSize: VideoEditorLogic['updateSubtitleFontSize'];
    subtitleTextAlign: 'left' | 'center' | 'right';
    updateSubtitleTextAlign: VideoEditorLogic['updateSubtitleTextAlign'];
    isSubtitleBold: boolean;
    toggleSubtitleBold: VideoEditorLogic['toggleSubtitleBold'];
    isSubtitleItalic: boolean;
    toggleSubtitleItalic: VideoEditorLogic['toggleSubtitleItalic'];
    isSubtitleUnderlined: boolean;
    toggleSubtitleUnderlined: VideoEditorLogic['toggleSubtitleUnderlined'];
    subtitleColor: string;
    updateSubtitleColor: VideoEditorLogic['updateSubtitleColor'];
    subtitleBackgroundColor: string;
    updateSubtitleBackgroundColor: VideoEditorLogic['updateSubtitleBackgroundColor'];
    selectedVideoSecureUrl: string | null;
    handleExtractAudio: VideoEditorLogic['handleExtractAudio'];
    isExtractingAudio: VideoEditorLogic['isExtractingAudio'];
    audioExtractionProgress: VideoEditorLogic['audioExtractionProgress'];
    ffmpegLoaded: VideoEditorLogic['ffmpegLoaded'];
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = React.memo(({
                                                                               selectedClip,
                                                                               currentTime,
                                                                               updateSelectedClipProperty,
                                                                               updateSelectedClipText,
                                                                               addOrUpdateKeyframe,
                                                                               onDeleteClip,
                                                                               subtitleFontFamily,
                                                                               updateSubtitleFontFamily,
                                                                               subtitleFontSize,
                                                                               updateSubtitleFontSize,
                                                                               subtitleTextAlign,
                                                                               updateSubtitleTextAlign,
                                                                               isSubtitleBold,
                                                                               toggleSubtitleBold,
                                                                               isSubtitleItalic,
                                                                               toggleSubtitleItalic,
                                                                               isSubtitleUnderlined,
                                                                               toggleSubtitleUnderlined,
                                                                               subtitleColor,
                                                                               updateSubtitleColor,
                                                                               subtitleBackgroundColor,
                                                                               updateSubtitleBackgroundColor,
                                                                               selectedVideoSecureUrl,
                                                                               handleExtractAudio,
                                                                               isExtractingAudio,
                                                                               audioExtractionProgress,
                                                                               ffmpegLoaded,
                                                                           }) => {
    const { token } = theme.useToken();
    const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [bgColorPickerOpen, setBgColorPickerOpen] = useState(false);
    const [isReplaceModalVisible, setIsReplaceModalVisible] = useState(false);
    const [isTrimModalVisible, setIsTrimModalVisible] = useState(false);
    const [trimStartTime, setTrimStartTime] = useState("01:32.532");
    const [trimEndTime, setTrimEndTime] = useState("03:53.489");
    const [trimZoomLevel, setTrimZoomLevel] = useState(50);

    if (!selectedClip) {
        return (
            <div style={{ padding: 16, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: token.colorBgContainer, color: token.colorTextSecondary }}>
                <Text type="secondary">Select an item on the timeline</Text>
            </div>
        );
    }

    const currentPosition = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
    const currentScale = interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
    const currentRotation = interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation);

    const handlePositionChange = (axis: 'x' | 'y', value: number | null) => {
        if (value === null || isNaN(value)) return;
        const currentPos = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
        const newPosition = axis === 'x' ? { x: value / 100, y: currentPos.y } : { x: currentPos.x, y: value / 100 };
        updateSelectedClipProperty({ position: newPosition });
    };

    const handleZoomChange = (value: number | null) => {
        if (value === null || isNaN(value)) return;
        updateSelectedClipProperty({ scale: { x: value / 100, y: value / 100 } });
    };

    const handleRotationChange = (value: number | null) => {
        if (value === null || isNaN(value)) return;
        updateSelectedClipProperty({ rotation: value });
    };

    const handleResetZoom = () => { handleZoomChange(100); }
    const handleResetRotation = () => { handleRotationChange(0); }

    const handlePlaceholderFeature = (name: string, ...args: any[]) => {
        message.info(`${name} feature is not implemented yet.`);
    };

    const handleSubtitleColorChange = (color: Color | null) => {
        if (color === null) return;
        updateSubtitleColor(color.toHexString());
    };

    const handleSubtitleBackgroundColorChange = (color: Color | null) => {
        if (color === null) return;
        updateSubtitleBackgroundColor(color.toRgbString());
    };

    const handleResetSubtitleColor = () => {
        updateSubtitleColor('#FFFFFF');
    };

    const handleResetSubtitleBackgroundColor = () => {
        updateSubtitleBackgroundColor('rgba(0, 0, 0, 0.7)');
    };

    const handleFontFamilyChange = (value: string) => {
        updateSubtitleFontFamily(value);
    };

    const handleFontSizeChange = (value: number | null) => {
        if (value === null || isNaN(value)) return;
        updateSubtitleFontSize(value);
    };

    const handleTextAlignChange = (value: any) => {
        updateSubtitleTextAlign(value as 'left' | 'center' | 'right');
    };

    const onDetachAudioClick = () => {
        if (selectedVideoSecureUrl) {
            handleExtractAudio(selectedVideoSecureUrl);
        } else {
            message.error("Please select a video clip with a valid source URL to detach audio.");
        }
    };
    const mockMediaItems = [
        { id: '1', type: 'doc', title: 'Báo cáo tiến độ dự án tháng 7.docx', duration: '03:53', imgSrc: 'https://via.placeholder.com/150/771796/000000?Text=Doc1', starred: false },
        { id: '2', type: 'video', title: 'sky video final cut.mp4', duration: '00:13', imgSrc: 'https://via.placeholder.com/150/24f355/FFFFFF?Text=Video1', starred: true },
        { id: '3', type: 'doc', title: 'Báo cáo tiến độ dự án tháng 6.docx', duration: '03:53', imgSrc: 'https://via.placeholder.com/150/d32776/000000?Text=Doc2', starred: false },
        { id: '4', type: 'video', title: 'Intro video product.mov', duration: '00:05', imgSrc: 'https://via.placeholder.com/150/f66b97/FFFFFF?Text=Video2', starred: false },
        { id: '5', type: 'image', title: 'Logo brand V2.png', duration: 'N/A', imgSrc: 'https://via.placeholder.com/150/56a8c2/FFFFFF?Text=Image1', starred: false },
        { id: '6', type: 'audio', title: 'Background music epic.mp3', duration: '02:45', imgSrc: 'https://via.placeholder.com/150/b0f7cc/000000?Text=Audio1', starred: true },
    ];


    return (
        <div className="properties-panel-content">
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Text strong style={{ fontSize: 16 }}>Edit</Text>
                </Col>
                <Col>
                    <Space>
                        <Button size="small" icon={<PlusOutlined />} disabled />
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={onDeleteClip} />
                    </Space>
                </Col>
            </Row>

            {selectedClip.type === 'video' && (
                <div id="section-detach-audio" style={{ marginBottom: 24 }} >
                    <SectionHeader title="Audio Tools" />
                    <Card size="small" style={{ backgroundColor: "white" }}>
                        <Row gutter={[16, 8]} align="middle">
                            <Col flex="auto">
                                <Button style={{ backgroundColor: "white" }}
                                        icon={<AudioOutlined />}
                                        onClick={onDetachAudioClick}
                                        disabled={!selectedVideoSecureUrl || isExtractingAudio || !ffmpegLoaded}
                                        loading={isExtractingAudio}
                                        block
                                >
                                    {isExtractingAudio ? `Extracting... ${audioExtractionProgress}%` : 'Detach Audio (MP3)'}
                                </Button>
                            </Col>
                        </Row>
                        {isExtractingAudio && (
                            <Progress
                                percent={audioExtractionProgress}
                                size="small"
                                style={{ marginTop: 8 }}
                                status={audioExtractionProgress === 100 ? "success" : "active"}
                            />
                        )}
                        {!ffmpegLoaded && <Text type="warning" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>FFmpeg is loading or not available.</Text>}
                    </Card>
                </div>
            )}


            <div id="section-presets">
                <SectionHeader title="Preset Styles" />
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                        <Card hoverable size="small" bodyStyle={{ padding: 8, textAlign: 'center' }} onClick={() => handlePlaceholderFeature('Custom Preset')}>
                            <div style={{ background: token.colorBgElevated, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderRadius: 4, fontFamily: subtitleFontFamily, fontSize: `${subtitleFontSize * 0.5}px` }}>
                                <Text strong style={{ color: token.colorTextSecondary }}>Your subtitles here</Text>
                            </div>
                            <Text>Custom</Text>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card hoverable size="small" bodyStyle={{ padding: 8, textAlign: 'center' }} onClick={() => handlePlaceholderFeature('Default Preset')}>
                            <div style={{ background: token.colorBgElevated, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderRadius: 4, fontFamily: subtitleFontFamily, fontSize: `${subtitleFontSize * 0.5}px` }}>
                                <Text strong style={{ color: '#00FFFF' }}>Your subtitles <span style={{ color: token.colorPrimary }}>here</span></Text>
                            </div>
                            <Text>Default</Text>
                        </Card>
                    </Col>
                </Row>
            </div>

            <div id="section-font">
                <SectionHeader title="Font" />
                <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={14}>
                        <Select size="small" style={{ width: '100%' }}
                                value={subtitleFontFamily}
                                onChange={handleFontFamilyChange}
                        >
                            <Option value="Arial, sans-serif">Arial</Option>
                            <Option value="Verdana, sans-serif">Verdana</Option>
                            <Option value="Tahoma, sans-serif">Tahoma</Option>
                            <Option value="Georgia, serif">Georgia</Option>
                            <Option value="Times New Roman, serif">Times New Roman</Option>
                            <Option value="Courier New, monospace">Courier New</Option>
                            <Option value="Lucida Sans Unicode, Lucida Grande, sans-serif">Lucida Sans Unicode</Option>
                            <Option value="Impact, sans-serif">Impact</Option>
                            <Option value="Montserrat, sans-serif">Montserrat</Option>
                            <Option value="Roboto, sans-serif">Roboto</Option>
                        </Select>
                    </Col>
                    <Col span={10}>
                        <InputNumber
                            size="small"
                            style={{ width: '100%' }}
                            value={subtitleFontSize}
                            onChange={handleFontSizeChange}
                            min={1}
                            max={100}
                            controls={false}
                        />
                    </Col>
                </Row>
                <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={10}>
                        <Space size={0}>
                            <Tooltip title="Bold">
                                <Button
                                    size="small"
                                    type={isSubtitleBold ? 'primary' : 'default'}
                                    onClick={() => toggleSubtitleBold()}
                                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                >
                                    <Text strong style={{ fontSize: '14px', color: isSubtitleBold ? token.colorTextLightSolid : token.colorText }}>B</Text>
                                </Button>
                            </Tooltip>
                            <Tooltip title="Italic">
                                <Button
                                    size="small"
                                    type={isSubtitleItalic ? 'primary' : 'default'}
                                    onClick={() => toggleSubtitleItalic()}
                                    style={{ borderRadius: 0 }}
                                >
                                    <Text italic style={{ fontSize: '14px', color: isSubtitleItalic ? token.colorTextLightSolid : token.colorText }}>I</Text>
                                </Button>
                            </Tooltip>
                            <Tooltip title="Underline">
                                <Button
                                    size="small"
                                    type={isSubtitleUnderlined ? 'primary' : 'default'}
                                    onClick={() => toggleSubtitleUnderlined()}
                                    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                >
                                    <Text underline style={{ fontSize: '14px', color: isSubtitleUnderlined ? token.colorTextLightSolid : token.colorText }}>U</Text>
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                    <Col span={14}>
                        <Segmented
                            size="small"
                            block
                            options={[
                                { label: <Tooltip title="Align Left"><AlignLeftOutlined /></Tooltip>, value: 'left' },
                                { label: <Tooltip title="Align Center"><AlignCenterOutlined /></Tooltip>, value: 'center' },
                                { label: <Tooltip title="Align Right"><AlignRightOutlined /></Tooltip>, value: 'right' },
                            ]}
                            value={subtitleTextAlign}
                            onChange={handleTextAlignChange}
                        />
                    </Col>
                </Row>
                <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={8}><Button block size="small" icon={<Tooltip title="Text Transform?"><span style={{ fontFamily: 'serif', fontWeight: 'bold', fontSize: 16 }}>T</span></Tooltip>} onClick={() => handlePlaceholderFeature('Text Transform')} disabled /></Col>
                    <Col span={8}><Button block size="small" icon={<Tooltip title="Character/Word Spacing?"><SwapOutlined rotate={90} /></Tooltip>} onClick={() => handlePlaceholderFeature('Character/Word Spacing')} disabled /></Col>
                    <Col span={8}><Button block size="small" icon={<Tooltip title="Download Font?"><DownloadOutlined /></Tooltip>} onClick={() => handlePlaceholderFeature('Download Font')} disabled /></Col>
                </Row>
            </div>

            <div id="section-lineheight">
                <SectionHeader title="Line Height" />
                <Row gutter={8} align="middle">
                    <Col span={18}>
                        <Select size="small" style={{ width: '100%' }} value="1.2" onChange={(v) => handlePlaceholderFeature('Line Height Change', v)} disabled>
                            <Option value="1">1x</Option>
                            <Option value="1.2">1.2x</Option>
                            <Option value="1.5">1.5x</Option>
                            <Option value="2">2x</Option>
                        </Select>
                    </Col>
                    <Col span={6}>
                        <Switch size="small" checked={false} onChange={(c) => handlePlaceholderFeature('Rotate Alternating Lines Toggle', c)} style={{ float: 'right' }} disabled />
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'right', marginTop: 4 }}>Rotate alternating lines</Text>
                    </Col>
                </Row>
            </div>

            <Divider style={{ margin: '24px 0 16px 0' }} />
            <div id="section-color">
                <SectionHeader title="Color" />
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        <Input
                            addonBefore="#"
                            value={subtitleColor.replace('#', '').toUpperCase()}
                            readOnly
                            size="small"
                            onClick={() => setColorPickerOpen(true)}
                        />
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}>
                        <ColorPicker
                            value={subtitleColor}
                            size="small"
                            onChange={handleSubtitleColorChange}
                            open={colorPickerOpen}
                            onOpenChange={setColorPickerOpen}
                            panelRender={(panel) => (
                                <div onMouseDown={(e) => e.preventDefault()}>{panel}</div>
                            )}
                        />
                    </Col>
                    <Col span={6}><ResetButton onClick={handleResetSubtitleColor} disabled={subtitleColor === '#FFFFFF'} /></Col>
                </Row>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                    <Col span={3}><div className="color-preset" style={{ background: '#000000' }} onClick={() => updateSubtitleColor('#000000')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#FFFFFF' }} onClick={() => updateSubtitleColor('#FFFFFF')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#FF0000' }} onClick={() => updateSubtitleColor('#FF0000')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#FFC000' }} onClick={() => updateSubtitleColor('#FFC000')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#00FF00' }} onClick={() => updateSubtitleColor('#00FF00')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#0000FF' }} onClick={() => updateSubtitleColor('#0000FF')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#800080' }} onClick={() => updateSubtitleColor('#800080')}></div></Col>
                </Row>
            </div>

            <div id="section-background">
                <SectionHeader title="Background" />
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        <Input
                            addonBefore="#"
                            value={subtitleBackgroundColor.startsWith('#') ? subtitleBackgroundColor.replace('#', '').toUpperCase() : subtitleBackgroundColor}
                            readOnly
                            size="small"
                            onClick={() => setBgColorPickerOpen(true)}
                        />
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}>
                        <ColorPicker
                            value={subtitleBackgroundColor}
                            size="small"
                            onChange={handleSubtitleBackgroundColorChange}
                            open={bgColorPickerOpen}
                            onOpenChange={setBgColorPickerOpen}
                            panelRender={(panel) => (
                                <div onMouseDown={(e) => e.preventDefault()}>{panel}</div>
                            )}
                        />
                    </Col>
                    <Col span={6}>
                        <Button size="small" icon={<BackgroundIcon />} onClick={() => handlePlaceholderFeature('Background Pattern')} style={{ marginRight: 4 }} disabled />
                        <ResetButton onClick={handleResetSubtitleBackgroundColor} disabled={subtitleBackgroundColor === 'rgba(0, 0, 0, 0.7)' || subtitleBackgroundColor === '#000000'} />
                    </Col>
                </Row>
                <Row gutter={[8, 8]} style={{ marginTop: 8, marginBottom: 16 }}>
                    <Col span={3}><div className="color-preset" style={{ background: '#000000' }} onClick={() => updateSubtitleBackgroundColor('#000000')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#FFFFFF' }} onClick={() => updateSubtitleBackgroundColor('#FFFFFF')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#FF0000' }} onClick={() => updateSubtitleBackgroundColor('#FF0000')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#FFC000' }} onClick={() => updateSubtitleBackgroundColor('#FFC000')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#00FF00' }} onClick={() => updateSubtitleBackgroundColor('#00FF00')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#0000FF' }} onClick={() => updateSubtitleBackgroundColor('#0000FF')}></div></Col>
                    <Col span={3}><div className="color-preset" style={{ background: '#800080' }} onClick={() => updateSubtitleBackgroundColor('#800080')}></div></Col>
                </Row>
                <Row gutter={8}>
                    <Col span={12}>
                        <Button block onClick={() => handlePlaceholderFeature('Wrap Background', 'wrap')} disabled>Wrap</Button>
                    </Col>
                    <Col span={12}>
                        <Button block onClick={() => handlePlaceholderFeature('Fill Background', 'fill')} disabled>Fill</Button>
                    </Col>
                </Row>
            </div>

            <div id="section-opacity">
                <SectionHeader title="Opacity" />
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        <Slider min={0} max={100} step={1} defaultValue={80} onChange={(v) => handlePlaceholderFeature('Opacity Change', v)} tooltip={{ formatter: (v) => `${v}%` }} disabled />
                    </Col>
                    <Col flex="60px">
                        <InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={100} step={1} defaultValue={80} onChange={(v) => handlePlaceholderFeature('Opacity Change', v)} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handlePlaceholderFeature('Reset Opacity')} disabled={true} /></Col>
                </Row>
            </div>

            <div id="section-corners">
                <SectionHeader title="Corners" />
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        <Slider min={0} max={50} step={1} defaultValue={15} onChange={(v) => handlePlaceholderFeature('Corners Change', v)} tooltip={{ formatter: (v) => `${v}%` }} disabled />
                    </Col>
                    <Col flex="60px">
                        <InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={50} step={1} defaultValue={15} onChange={(v) => handlePlaceholderFeature('Corners Change', v)} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handlePlaceholderFeature('Reset Corners')} disabled={true} /></Col>
                </Row>
            </div>

            <div id="section-padding">
                <SectionHeader title="Padding" />
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        <Slider min={0} max={50} step={1} defaultValue={10} onChange={(v) => handlePlaceholderFeature('Padding Change', v)} tooltip={{ formatter: (v) => `${v}%` }} disabled />
                    </Col>
                    <Col flex="60px">
                        <InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={50} step={1} defaultValue={10} onChange={(v) => handlePlaceholderFeature('Padding Change', v)} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handlePlaceholderFeature('Reset Padding')} disabled={true} /></Col>
                </Row>
            </div>

            <div id="section-border">
                <SectionHeader title="Border" />
                <SectionHeader title="Drop Shadow" />
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        <Input addonBefore="#" value="AB5ABD" readOnly size="small" onClick={() => handlePlaceholderFeature('Drop Shadow Color Input')} disabled />
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}>
                        <ColorPicker defaultValue="#AB5ABD" size="small" onChange={(c) => handlePlaceholderFeature('Drop Shadow Color Change', c)} disabled />
                    </Col>
                    <Col span={6}>
                        <Button size="small" icon={<BackgroundIcon />} onClick={() => handlePlaceholderFeature('Drop Shadow Pattern')} style={{ marginRight: 4 }} disabled />
                        <ResetButton onClick={() => handlePlaceholderFeature('Reset Drop Shadow Color')} disabled={true} />
                    </Col>
                </Row>
                <Row gutter={[8, 8]} style={{ marginTop: 8, marginBottom: 16 }}>
                    {['#000000', '#FFFFFF', '#FF0000', '#FFC000', '#00FF00', '#0000FF', '#800080'].map(color => (
                        <Col span={3} key={color}><div className="color-preset" style={{ background: color }} onClick={() => handlePlaceholderFeature('Drop Shadow Color Preset', color)}></div></Col>
                    ))}
                </Row>
                <Row gutter={8} align="middle">
                    <Col flex="auto"><Text type="secondary" style={{ fontSize: 12 }}>Blur</Text></Col>
                    <Col flex="auto"><Slider min={0} max={100} step={1} defaultValue={10} onChange={(v) => handlePlaceholderFeature('Drop Shadow Blur Change', v)} tooltip={{ formatter: (v) => `${v}%` }} disabled /></Col>
                    <Col flex="60px"><InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={100} step={1} defaultValue={10} onChange={(v) => handlePlaceholderFeature('Drop Shadow Blur Change', v)} controls={false} disabled /></Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handlePlaceholderFeature('Reset Drop Shadow Blur')} disabled={true} /></Col>
                </Row>
                <Row gutter={8} align="middle">
                    <Col flex="auto"><Text type="secondary" style={{ fontSize: 12 }}>Distance</Text></Col>
                    <Col flex="auto"><Slider min={0} max={10} step={0.01} defaultValue={0.08} onChange={(v) => handlePlaceholderFeature('Drop Shadow Distance Change', v)} tooltip={{ open: false }} disabled /></Col>
                    <Col flex="60px"><InputNumber size="small" style={{ width: '100%' }} min={0} max={10} step={0.01} defaultValue={0.08} onChange={(v) => handlePlaceholderFeature('Drop Shadow Distance Change', v)} controls={false} disabled /></Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handlePlaceholderFeature('Reset Drop Shadow Distance')} disabled={true} /></Col>
                </Row>
                <Row gutter={8} align="middle">
                    <Col flex="auto"><Text type="secondary" style={{ fontSize: 12 }}>Rotation</Text></Col>
                    <Col flex="auto"><Slider min={0} max={360} step={1} defaultValue={45} onChange={(v) => handlePlaceholderFeature('Drop Shadow Rotation Change', v)} tooltip={{ formatter: (v) => `${v}°` }} disabled /></Col>
                    <Col flex="60px"><InputNumber size="small" suffix="°" style={{ width: '100%' }} min={0} max={360} step={1} defaultValue={45} onChange={(v) => handlePlaceholderFeature('Drop Shadow Rotation Change', v)} controls={false} disabled /></Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handlePlaceholderFeature('Reset Drop Shadow Rotation')} disabled={true} /></Col>
                </Row>

                <SectionHeader title="Text Outline" style={{ marginTop: 24 }} />
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        <Select size="small" style={{ width: '100%' }} defaultValue="None" onChange={(v) => handlePlaceholderFeature('Text Outline Change', v)} disabled>
                            <Option value="None">None</Option><Option value="Color">Color</Option><Option value="Gradient">Gradient</Option>
                        </Select>
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}><ColorPicker defaultValue="#000000" size="small" onChange={(c) => handlePlaceholderFeature('Text Outline Color Change', c)} disabled={true} /></Col>
                    <Col span={6}>
                        <Button size="small" icon={<BackgroundIcon />} onClick={() => handlePlaceholderFeature('Text Outline Pattern')} style={{ marginRight: 4 }} disabled={true} />
                        <ResetButton onClick={() => handlePlaceholderFeature('Reset Text Outline')} disabled={true} />
                    </Col>
                </Row>
            </div>


            {/* --- MEDIA ACTIONS SECTION --- */}
            <div id="section-media-actions" style={{ marginTop: 24, marginBottom: 16 }}>
                <Row gutter={[8, 8]}>
                    <Col span={12}>
                        <Button
                            icon={<ReloadOutlined />}
                            className="media-action-button"
                            onClick={() => setIsReplaceModalVisible(true)}
                            block
                        >
                            Replace
                        </Button>
                    </Col>
                    <Col span={12}>
                        <Button
                            icon={<CrownFilled />}
                            className="media-action-button"
                            onClick={() => handlePlaceholderFeature('Crop Media')}
                            block
                        >
                            Crop
                        </Button>
                    </Col>
                </Row>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                    <Col span={12}>
                        <Button
                            icon={<ScissorOutlined />}
                            className="media-action-button"
                            onClick={() => setIsTrimModalVisible(true)}
                            block
                        >
                            Trim
                        </Button>
                    </Col>
                </Row>
            </div>


            <Divider style={{ margin: '24px 0 16px 0' }} />
            <div id="section-position">
                <SectionHeader title="Position" />
                <Row gutter={8} align="middle">
                    <Col span={10}>
                        <InputNumber
                            size="small" prefix="X" suffix="%" style={{ width: '100%' }}
                            value={Math.round(currentPosition.x * 1000) / 10}
                            onChange={(v) => handlePositionChange('x', v)} step={0.1} controls={false}
                        />
                    </Col>
                    <Col span={10}>
                        <InputNumber
                            size="small" prefix="Y" suffix="%" style={{ width: '100%' }}
                            value={Math.round(currentPosition.y * 1000) / 10}
                            onChange={(v) => handlePositionChange('y', v)} step={0.1} controls={false}
                        />
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                        <Tooltip title="Add Position Keyframe">
                            <Button size="small" shape="circle" type="text" icon={<PlusOutlined />} onClick={() => addOrUpdateKeyframe('position')} />
                        </Tooltip>
                    </Col>
                </Row>
            </div>

            <div id="section-zoom">
                <SectionHeader title="Zoom"> <ResetButton onClick={handleResetZoom} /></SectionHeader>
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        <Slider
                            min={1} max={400} step={1}
                            value={Math.round(currentScale.x * 100)}
                            onChange={handleZoomChange}
                            tooltip={{ formatter: (v) => `${v}%` }}
                        />
                    </Col>
                    <Col flex="60px">
                        <InputNumber
                            size="small" suffix="%" style={{ width: '100%' }}
                            min={1} max={400} step={1}
                            value={Math.round(currentScale.x * 100)}
                            onChange={handleZoomChange} controls={false}
                        />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}>
                        <Tooltip title="Add Zoom/Scale Keyframe">
                            <Button size="small" shape="circle" type="text" icon={<PlusOutlined />} onClick={() => addOrUpdateKeyframe('scale')} />
                        </Tooltip>
                    </Col>
                </Row>
            </div>

            <div id="section-aspectratio">
                <SectionHeader title="Aspect Ratio" />
                <Segmented
                    options={['Unlocked', 'Locked']}
                    value={aspectRatioLocked ? 'Locked' : 'Unlocked'}
                    onChange={(value) => setAspectRatioLocked(value === 'Locked')}
                    block size="small"
                    disabled
                />
            </div>

            <div id="section-rotate">
                <SectionHeader title="Rotate"> <ResetButton onClick={handleResetRotation} /></SectionHeader>
                <Row gutter={[4, 4]} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={6}> <Button block icon={<RotateLeftOutlined />} onClick={() => handlePlaceholderFeature('Rotate Left')} disabled /> </Col>
                    <Col span={6}> <Button block icon={<SwapOutlined />} onClick={() => handlePlaceholderFeature('Horizontal Flip')} disabled /> </Col>
                    <Col span={6}> <Button block icon={<SwapOutlined rotate={90} />} onClick={() => handlePlaceholderFeature('Vertical Flip')} disabled /> </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                        <Tooltip title="Add Rotation Keyframe">
                            <Button size="small" shape="circle" type="text" icon={<PlusOutlined />} onClick={() => addOrUpdateKeyframe('rotation')} />
                        </Tooltip>
                    </Col>
                </Row>
                <InputNumber
                    size="small" suffix="°" style={{ width: '100%' }}
                    value={Math.round(currentRotation)}
                    onChange={handleRotationChange} step={1}
                    controls={false}
                />
            </div>


            <Divider style={{ margin: '24px 0 16px 0' }} />


            <Divider style={{ margin: '24px 0 16px 0' }} />
            <div id="section-volume">
                <SectionHeader title="Volume"><ResetButton disabled /></SectionHeader>
                <Slider defaultValue={100} disabled />
            </div>

            {selectedClip.type === 'text' && (
                <>
                    <Divider style={{ margin: '24px 0 16px 0' }} />
                    <div id="section-textinput">
                        <SectionHeader title="Text" />
                        <Input.TextArea
                            value={selectedClip.source as string}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSelectedClipText(e.target.value)}
                            rows={3}
                            style={{ background: token.colorBgElevated, color: token.colorTextBase, borderColor: token.colorBorder }}
                        />
                    </div>
                </>
            )}
            <div style={{ height: 40 }}></div>

            {/* Replace Media Modal */}
            <Modal
                title="Replace"
                open={isReplaceModalVisible}
                onCancel={() => setIsReplaceModalVisible(false)}
                footer={null}
                width={720}
                className="replace-media-modal"
                destroyOnClose
                bodyStyle={{ padding: 0 }}
            >
                <Tabs defaultActiveKey="1">
                    <TabPane tab="MY MEDIA" key="1">
                        <div className="replace-media-modal-body">
                            <div className="upload-button-container">
                                <Button icon={<UploadOutlined />}>Upload file</Button>
                            </div>
                            <Input.Search
                                placeholder="Search..."
                                onSearch={(value) => console.log("Search MY MEDIA:", value)}
                                style={{ marginBottom: 16 }}
                            />
                            <div className="media-grid-container">
                                <Row gutter={[16, 16]}>
                                    {mockMediaItems.map(item => (
                                        <Col xs={24} sm={12} md={8} key={item.id}>
                                            <Card hoverable className="media-item-card" onClick={() => {
                                                console.log('Selected media to replace with:', item.title);
                                                setIsReplaceModalVisible(false);
                                                message.success(`Selected ${item.title} for replacement.`);
                                            }}>
                                                <div className="media-thumbnail">
                                                    {item.imgSrc ? <img src={item.imgSrc} alt={item.title} /> : <FileImageOutlined />}
                                                    {item.duration !== 'N/A' && <span className="media-duration">{item.duration}</span>}
                                                </div>
                                                <div className="media-title">
                                                    {item.type === 'doc' && <FileTextOutlined />}
                                                    {item.type === 'video' && <VideoCameraOutlined />}
                                                    {item.type === 'image' && <FileImageOutlined />}
                                                    {item.type === 'audio' && <AudioOutlined />}
                                                    <Tooltip title={item.title} placement="bottomLeft">
                                                            <span style={{ marginLeft: 4, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {item.title}
                                                            </span>
                                                    </Tooltip>
                                                    {item.starred && <StarFilled className="media-star-icon" />}
                                                </div>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        </div>
                    </TabPane>
                    <TabPane tab="STOCK LIBRARY" key="2">
                        <div className="replace-media-modal-body">
                            <Input.Search
                                placeholder="Search Stock Library..."
                                onSearch={(value) => console.log("Search STOCK LIBRARY:", value)}
                                style={{ marginBottom: 16 }}
                            />
                            <Text style={{ display: 'block', textAlign: 'center', color: '#888888' }}>Stock Library Content (Not Implemented)</Text>
                        </div>
                    </TabPane>
                    <TabPane tab="BRAND KIT" key="3">
                        <div className="replace-media-modal-body">
                            <Text style={{ display: 'block', textAlign: 'center', color: '#888888' }}>Brand Kit Content (Not Implemented)</Text>
                        </div>
                    </TabPane>
                </Tabs>
            </Modal>

            {/* Trim Video Modal */}
            <Modal
                open={isTrimModalVisible}
                onCancel={() => setIsTrimModalVisible(false)}
                footer={null}
                width="90vw"
                className="trim-video-modal"
                title={null}
                closable={false}
                destroyOnClose
                centered
                bodyStyle={{ padding: 0, height: '85vh', display: 'flex', flexDirection: 'column' }}
            >
                <div className="trim-modal-header">
                    <div>
                        <Title level={4} style={{ margin: 0, color: 'white' }}>Trim Video</Title>
                        <Text style={{ color: '#a0a0a0' }}>Drag the ends of the video to adjust the start and end times of the video layer.</Text>
                    </div>
                    <Button type="text" icon={<CloseOutlined />} onClick={() => setIsTrimModalVisible(false)} className="trim-modal-close-btn" />
                </div>

                <div className="trim-modal-video-preview">
                    <img src="https://via.placeholder.com/800x450/181818/FFFFFF?text=Video+Preview+Area" alt="Video Preview" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}}/>
                </div>

                <div className="trim-modal-timeline-controls">
                    <div className="trim-timeline-top-row">
                        <Button type="text" icon={<PlayCircleFilled style={{fontSize: '28px'}}/>} className="trim-play-btn" />
                        <div className="trim-timeline-time-markers">
                            <Text className="time-marker">:15</Text>
                            <Text className="time-marker">:30</Text>
                            <Text className="time-marker">:45</Text>
                            <Text className="time-marker">1:00</Text>
                            <Text className="time-marker">1:15</Text>
                            <Text className="time-marker">1:30</Text>
                            <Text className="time-marker">1:45</Text>
                            <Text className="time-marker">2:00</Text>
                            <Text className="time-marker">2:15</Text>
                            <Text className="time-marker">2:30</Text>
                            <Text className="time-marker">2:45</Text>
                            <Text className="time-marker">3:00</Text>
                        </div>
                        <div className="trim-zoom-controls">
                            <Button type="text" icon={<ZoomOutOutlined />} />
                            <Slider
                                min={0}
                                max={100}
                                value={trimZoomLevel}
                                onChange={setTrimZoomLevel}
                                style={{width: 100, margin: '0 8px'}}
                                tooltip={{open: false}}
                            />
                            <Button type="text" icon={<ZoomInOutlined />} />
                        </div>
                        <Button className="fit-to-screen-btn">Fit To Screen</Button>
                    </div>

                    <div className="trim-timeline-visual-container">
                        <div className="trim-timeline-ruler-track"></div>
                        <div className="trim-playhead" style={{ left: '30%' }}> {/* Example position, make dynamic */}
                            <div className="trim-playhead-line"></div>
                            <div className="trim-playhead-thumb"></div>
                        </div>
                        <div className="trim-timeline-bar">
                            <div className="trim-waveform-placeholder">
                                {Array.from({length: 40}).map((_, i) => <div key={i} className="trim-frame-item"></div>)}
                            </div>
                            {/* Example positions, make these dynamic based on actual trim times and zoom */}
                            <div className="trim-handle trim-handle-start" style={{ left: '20%' }}></div>
                            <div className="trim-selection" style={{ left: '20%', width: '50%' }}></div>
                            <div className="trim-handle trim-handle-end" style={{ left: '70%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="trim-modal-footer-controls">
                    <Row justify="space-between" align="bottom" style={{width: '100%'}}>
                        <Col>
                            <Space direction="vertical" align="center" size={2}>
                                <Text className="trim-time-label">Start</Text>
                                <Input readOnly value={trimStartTime} className="trim-time-input" />
                                <Button type="link" className="trim-set-time-btn">Set to current time</Button>
                            </Space>
                        </Col>
                        <Col>
                            <Space direction="vertical" align="center" size={2}>
                                <Text className="trim-time-label">End</Text>
                                <Input readOnly value={trimEndTime} className="trim-time-input" />
                                <Button type="link" className="trim-set-time-btn">Set to current time</Button>
                            </Space>
                        </Col>
                        <Col>
                            <Button type="primary" className="trim-action-btn" onClick={() => {
                                message.success(`Trimmed from ${trimStartTime} to ${trimEndTime}`);
                                setIsTrimModalVisible(false);
                            }}>
                                Trim
                            </Button>
                        </Col>
                    </Row>
                </div>
            </Modal>
        </div>
    );
});