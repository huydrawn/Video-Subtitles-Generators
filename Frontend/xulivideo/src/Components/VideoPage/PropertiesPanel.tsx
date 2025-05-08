import React, { useState } from 'react';
import {
    Typography, Space, Row, Col, InputNumber, Slider, Switch, Select, Button,
    ColorPicker, Divider, Tooltip, Segmented, Card, Input, // <--- Added Input
    message // <--- Added message
} from 'antd';
import { theme } from 'antd';
import {
    PlusOutlined, DeleteOutlined,
    AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, VerticalAlignTopOutlined,
    VerticalAlignMiddleOutlined, VerticalAlignBottomOutlined, PicCenterOutlined,
    RotateLeftOutlined, RotateRightOutlined, SwapOutlined,
    ThunderboltOutlined, AudioOutlined as AudioToolIcon, EyeOutlined as EyeContactIcon, SearchOutlined,
    SoundOutlined, ForkOutlined, AudioFilled,
    ReloadOutlined, MinusOutlined, MoreOutlined, QuestionCircleOutlined,
    ExpandOutlined, // <--- Added ExpandOutlined
    UserOutlined, // <--- Added UserOutlined
    ScissorOutlined, // <--- Added ScissorOutlined
    DragOutlined, // <--- Added DragOutlined
    SecurityScanOutlined, // <--- Added SecurityScanOutlined
    BorderOutlined, // <--- Added BorderOutlined
    BgColorsOutlined as BackgroundIcon // <--- Added BackgroundIcon alias
} from '@ant-design/icons';
import type { Clip, VideoEditorLogic, Keyframe } from './types';
import { formatTime } from './useVideoEditorLogic';

const { Title, Text } = Typography; // Removed Paragraph as it wasn't used
const { Option } = Select;

// Helper function (can be moved to utils)
const interpolateValue = (kfs: Keyframe[] | undefined, time: number, defaultValue: any): any => {
    if (!kfs || kfs.length === 0) return defaultValue;
    const sortedKfs = [...kfs].sort((a, b) => a.time - b.time);
    if (time <= sortedKfs[0].time) return sortedKfs[0].value;
    if (time >= sortedKfs[sortedKfs.length - 1].time) return sortedKfs[sortedKfs.length - 1].value;
    let prevKf = sortedKfs[0]; let nextKf = sortedKfs[sortedKfs.length - 1];
    for (let i = 0; i < sortedKfs.length - 1; i++) { if (sortedKfs[i].time <= time && sortedKfs[i + 1].time >= time) { prevKf = sortedKfs[i]; nextKf = sortedKfs[i + 1]; break; } }
    const timeDiff = nextKf.time - prevKf.time; if (timeDiff === 0) return prevKf.value;
    const factor = (time - prevKf.time) / timeDiff; const pVal = prevKf.value; const nVal = nextKf.value;
    if (typeof pVal === 'number' && typeof nVal === 'number') { return pVal + (nVal - pVal) * factor; }
    else if (typeof pVal === 'object' && typeof nVal === 'object' && pVal !== null && nVal !== null && 'x' in pVal && 'y' in pVal && 'x' in nVal && 'y' in nVal) { const p = pVal as { x: number, y: number }; const n = nVal as { x: number, y: number }; return { x: p.x + (n.x - p.x) * factor, y: p.y + (n.y - p.y) * factor }; }
    return pVal;
};


// Section Header Component
const SectionHeader: React.FC<{ title: string; children?: React.ReactNode; onCollapse?: () => void; collapsible?: boolean }> =
    ({ title, children, onCollapse, collapsible = true }) => {
        const { token } = theme.useToken();
        return (
            <Row justify="space-between" align="middle" style={{ marginBottom: 8, marginTop: 16 }}>
                <Col>
                    <Text strong style={{ color: token.colorTextSecondary, fontSize: 12, textTransform: 'uppercase' }}>
                        {title}
                    </Text>
                </Col>
                <Col>
                    <Space size="small">
                        {children}
                        {collapsible && (
                            <Button
                                type="text"
                                size="small"
                                icon={<MinusOutlined />} // Or dynamic icon based on collapsed state
                                onClick={onCollapse}
                                style={{ color: token.colorTextSecondary }}
                            />
                        )}
                    </Space>
                </Col>
            </Row>
        );
    }

// AI/Audio Tool Card Component
const ToolCard: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; onClick?: () => void; premium?: boolean }> =
    ({ icon, title, subtitle, onClick, premium }) => {
        const { token } = theme.useToken();
        return (
            <Card
                size="small"
                hoverable
                onClick={onClick}
                bodyStyle={{ padding: '8px 10px' }}
                style={{ background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}` }}
            >
                <Space align="start">
                    {icon}
                    <div style={{ lineHeight: 1.3 }}>
                        <Text strong style={{ fontSize: 13 }}>
                            {title}{premium && <ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} />}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            {subtitle}
                        </Text>
                    </div>
                </Space>
            </Card>
        );
    }


interface PropertiesPanelProps {
    selectedClip: Clip | null;
    currentTime: number;
    updateSelectedClipProperty: VideoEditorLogic['updateSelectedClipProperty'];
    updateSelectedClipText: VideoEditorLogic['updateSelectedClipText'];
    addOrUpdateKeyframe: VideoEditorLogic['addOrUpdateKeyframe'];
    onDeleteClip: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = React.memo(({
                                                                               selectedClip,
                                                                               currentTime,
                                                                               updateSelectedClipProperty,
                                                                               updateSelectedClipText,
                                                                               addOrUpdateKeyframe,
                                                                               onDeleteClip
                                                                           }) => {
    const { token } = theme.useToken();
    const [aspectRatioLocked, setAspectRatioLocked] = useState(true);

    // Show placeholder if no clip is selected
    if (!selectedClip) {
        return (
            <div style={{
                padding: 16, height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: token.colorBgContainer
            }}>
                <Text type="secondary">Select an item on the timeline</Text>
            </div>
        );
    }

    // Get current interpolated values for display
    const currentPosition = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
    const currentScale = interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
    const currentRotation = interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation);

    // --- Handlers ---
    const handlePositionChange = (axis: 'x' | 'y', value: number | null) => {
        if (value === null || isNaN(value)) return;
        const currentVal = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
        updateSelectedClipProperty({ position: { ...currentVal, [axis]: value / 100 } });
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

    // Placeholder handlers for preset buttons
    const handlePositionPreset = (preset: string) => { message.info(`Position Preset: ${preset} (Not Implemented)`); };
    const handleRotatePreset = (preset: string) => { message.info(`Rotate Preset: ${preset} (Not Implemented)`); };


    return (
        <div className="properties-panel-content" style={{ background: token.colorBgContainer }}>
            {/* Panel Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Text strong style={{ fontSize: 16 }}>Edit</Text>
                </Col>
                <Col>
                    <Space>
                        <Button size="small" icon={<PlusOutlined />} disabled />
                    </Space>
                </Col>
            </Row>

            {/* --- Standard Actions --- */}
            <Row gutter={8} style={{ marginBottom: 16 }}>
                <Col span={12}><Button block icon={<ScissorOutlined />} disabled>Crop</Button></Col>
                <Col span={12}><Button block danger icon={<DeleteOutlined />} onClick={onDeleteClip}>Delete</Button></Col>
            </Row>
            <Row gutter={8} style={{ marginBottom: 20 }}>
                <Col span={12}><Button block icon={<ExpandOutlined />} disabled>Resize Project</Button></Col>
                <Col span={12}><Button block icon={<UserOutlined />} disabled>Speaker Focus</Button></Col>
            </Row>


            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* --- Position Section --- */}
                <SectionHeader title="Position" collapsible={true} />
                {/* Simplified Position Presets for example */}
                <Row gutter={[4, 4]} style={{ marginBottom: 12 }}>
                    <Col span={8}><Button block icon={<AlignLeftOutlined rotate={-45} />} onClick={() => handlePositionPreset('top-left')} disabled /></Col>
                    <Col span={8}><Button block icon={<VerticalAlignTopOutlined />} onClick={() => handlePositionPreset('top-center')} disabled /></Col>
                    <Col span={8}><Button block icon={<AlignRightOutlined rotate={45}/>} onClick={() => handlePositionPreset('top-right')} disabled /></Col>
                    <Col span={8}><Button block icon={<AlignLeftOutlined />} onClick={() => handlePositionPreset('mid-left')} disabled /></Col>
                    <Col span={8}><Button block icon={<PicCenterOutlined />} onClick={() => handlePositionPreset('mid-center')} disabled /></Col>
                    <Col span={8}><Button block icon={<AlignRightOutlined />} onClick={() => handlePositionPreset('mid-right')} disabled /></Col>
                    {/* Add bottom row if needed */}
                </Row>
                <Row gutter={8} align="middle">
                    <Col span={10}>
                        <InputNumber
                            size="small" prefix="X" suffix="%" style={{ width: '100%' }}
                            value={parseFloat((currentPosition.x * 100).toFixed(1))}
                            onChange={(v) => handlePositionChange('x', v)} step={0.1} controls={false}
                        />
                    </Col>
                    <Col span={10}>
                        <InputNumber
                            size="small" prefix="Y" suffix="%" style={{ width: '100%' }}
                            value={parseFloat((currentPosition.y * 100).toFixed(1))}
                            onChange={(v) => handlePositionChange('y', v)} step={0.1} controls={false}
                        />
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                        <Tooltip title="Add Position Keyframe">
                            <Button size="small" shape="circle" type="text" icon={<PlusOutlined />} onClick={() => addOrUpdateKeyframe('position')} />
                        </Tooltip>
                    </Col>
                </Row>

                {/* --- Zoom Section --- */}
                <SectionHeader title="Zoom" collapsible={true}>
                    <Button type="link" size="small" onClick={handleResetZoom} style={{ padding: 0 }}>Reset</Button>
                </SectionHeader>
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        <Slider
                            min={1} max={400} step={1}
                            value={Math.round(currentScale.x * 100)}
                            onChange={handleZoomChange}
                            tooltip={{ formatter: v => `${v}%` }}
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

                {/* --- Aspect Ratio Section --- */}
                <SectionHeader title="Aspect Ratio" collapsible={false} />
                <Segmented
                    options={['Unlocked', 'Locked']}
                    value={aspectRatioLocked ? 'Locked' : 'Unlocked'}
                    onChange={(value) => setAspectRatioLocked(value === 'Locked')}
                    block size="small"
                />

                {/* --- Rotate Section --- */}
                <SectionHeader title="Rotate" collapsible={true}>
                    <Button type="link" size="small" onClick={handleResetRotation} style={{ padding: 0 }}>Reset</Button>
                </SectionHeader>
                <Row gutter={[4, 4]} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={6}> <Button block icon={<RotateLeftOutlined />} onClick={() => handleRotatePreset('left')} disabled /> </Col>
                    <Col span={6}> <Button block icon={<SwapOutlined />} onClick={() => handleRotatePreset('h-flip')} disabled /> </Col>
                    <Col span={6}> <Button block icon={<SwapOutlined rotate={90} />} onClick={() => handleRotatePreset('v-flip')} disabled /> </Col>
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
                    // You might need controls={false} depending on AntD version and style preference
                    controls={false}
                />

                {/* --- AI Tools Section --- */}
                <Divider/>
                <SectionHeader title="AI Tools" collapsible={true} />
                <Row gutter={[8, 8]}>
                    <Col span={12}><ToolCard icon={<ThunderboltOutlined/>} title="Smart Cut" subtitle="Remove Silences" premium onClick={()=>{ message.info("Smart Cut Clicked (Not Implemented)") }} /></Col>
                    <Col span={12}><ToolCard icon={<SearchOutlined/>} title="Find Scenes" subtitle="Split by scene" onClick={()=>{ message.info("Find Scenes Clicked (Not Implemented)") }} /></Col>
                    <Col span={12}><ToolCard icon={<ExpandOutlined/>} title="Stabilize" subtitle="Remove shaking" premium onClick={()=>{ message.info("Stabilize Clicked (Not Implemented)") }} /></Col>
                    <Col span={12}><ToolCard icon={<EyeContactIcon/>} title="Eye Contact" subtitle="Correct eye gaze" premium onClick={()=>{ message.info("Eye Contact Clicked (Not Implemented)") }} /></Col>
                </Row>

                {/* --- Audio Section --- */}
                <Divider/>
                <SectionHeader title="Audio" collapsible={true} />
                <Row gutter={[8, 8]}>
                    <Col span={12}><ToolCard icon={<AudioFilled/>} title="Clean Audio" subtitle="Remove noise" premium onClick={()=>{ message.info("Clean Audio Clicked (Not Implemented)") }} /></Col>
                    <Col span={12}><ToolCard icon={<AudioToolIcon/>} title="Add Waveform" subtitle="Add audio visualize" premium onClick={()=>{ message.info("Add Waveform Clicked (Not Implemented)") }} /></Col>
                    <Col span={12}><ToolCard icon={<SoundOutlined/>} title="Enhance Voice" subtitle="Fix voice quality" premium onClick={()=>{ message.info("Enhance Voice Clicked (Not Implemented)") }} /></Col>
                    <Col span={12}><ToolCard icon={<ForkOutlined/>} title="Split V..." subtitle="Separate voi..." premium onClick={()=>{ message.info("Split Voice Clicked (Not Implemented)") }} /></Col>
                </Row>

                {/* --- Volume Section Placeholder --- */}
                <Divider/>
                <SectionHeader title="Volume" collapsible={true}>
                    <Button type="link" size="small" disabled>Reset</Button>
                </SectionHeader>
                <Slider defaultValue={100} disabled />

                {/* --- Text Specific Section --- */}
                {selectedClip.type === 'text' && (
                    <>
                        <Divider />
                        <SectionHeader title="Text" collapsible={false}/>
                        {/* <--- FIXED: Use Input.TextArea ---> */}
                        <Input.TextArea
                            value={selectedClip.source as string}
                            // <--- FIXED: Add correct type for event --->
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSelectedClipText(e.target.value)}
                            rows={3}
                            style={{ background: token.colorBgElevated, color: token.colorTextBase, borderColor: token.colorBorder }}
                        />
                    </>
                )}

                {/* Optional: Timing Section */}
                {/*
                <Divider />
                <SectionHeader title="Timing Info" collapsible={true}/>
                <Row gutter={8}>
                    <Col span={12}><Input size="small" addonBefore="Start" value={formatTime(selectedClip.startTime)} disabled /></Col>
                    <Col span={12}><Input size="small" addonBefore="End" value={formatTime(selectedClip.endTime)} disabled /></Col>
                </Row>
                <Row><Col span={24}><Input size="small" addonBefore="Duration" value={formatTime(selectedClip.duration)} disabled /></Col></Row>
                */}

            </Space>
        </div>
    );
});