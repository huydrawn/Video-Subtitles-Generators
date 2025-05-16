import React, { useState } from 'react';
import {
    Typography, Space, Row, Col, InputNumber, Slider, Switch, Select, Button,
    ColorPicker, Divider, Tooltip, Segmented, Card, Input,
    message,
    theme
} from 'antd';
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
    CustomerServiceOutlined, DownloadOutlined
} from '@ant-design/icons';
// Import required types
import type { Clip, VideoEditorLogic, Keyframe } from './types';
// Import necessary helpers
import { formatTime, interpolateValue } from './useVideoEditorLogic'; // Ensure interpolateValue is also imported
import './videoeditor.css';

const { Title, Text } = Typography;
const { Option } = Select;

// Reusable Section Header Component (Updated to accept style prop)
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
    // --- Props for Subtitle Font ---
    subtitleFontFamily: string;
    updateSubtitleFontFamily: VideoEditorLogic['updateSubtitleFontFamily'];
    subtitleFontSize: number;
    updateSubtitleFontSize: VideoEditorLogic['updateSubtitleFontSize'];
    // --- Props for Subtitle Alignment ---
    subtitleTextAlign: 'left' | 'center' | 'right';
    updateSubtitleTextAlign: VideoEditorLogic['updateSubtitleTextAlign'];
    // --- ADDED Props for Subtitle Text Styles --- <--- ADDED HERE
    isSubtitleBold: boolean;
    toggleSubtitleBold: VideoEditorLogic['toggleSubtitleBold'];
    isSubtitleItalic: boolean;
    toggleSubtitleItalic: VideoEditorLogic['toggleSubtitleItalic'];
    isSubtitleUnderlined: boolean;
    toggleSubtitleUnderlined: VideoEditorLogic['toggleSubtitleUnderlined'];
    // ---------------------------------------------
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = React.memo(({
                                                                               selectedClip,
                                                                               currentTime,
                                                                               updateSelectedClipProperty,
                                                                               updateSelectedClipText,
                                                                               addOrUpdateKeyframe,
                                                                               onDeleteClip,
                                                                               // --- Receive new props ---
                                                                               subtitleFontFamily,
                                                                               updateSubtitleFontFamily,
                                                                               subtitleFontSize,
                                                                               updateSubtitleFontSize,
                                                                               subtitleTextAlign,
                                                                               updateSubtitleTextAlign,
                                                                               // --- Receive new style props --- <--- ADDED HERE
                                                                               isSubtitleBold,
                                                                               toggleSubtitleBold,
                                                                               isSubtitleItalic,
                                                                               toggleSubtitleItalic,
                                                                               isSubtitleUnderlined,
                                                                               toggleSubtitleUnderlined,
                                                                               // ---------------------------
                                                                           }) => {
    const { token } = theme.useToken();
    const [aspectRatioLocked, setAspectRatioLocked] = useState(true);

    // Show placeholder if no clip is selected
    // Note: This means subtitle settings will *only* show when *some* clip is selected.
    // If you wanted subtitle settings to be visible even when no clip is selected,
    // the logic here would need to be adjusted (e.g., return a minimal panel if selectedClip is null,
    // or always render the full panel but disable clip-specific controls).
    // For now, we follow the existing structure where the panel is hidden if no clip is selected.
    if (!selectedClip) {
        return (
            <div style={{
                padding: 16, height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: token.colorBgContainer,
                color: token.colorTextSecondary
            }}>
                <Text type="secondary">Select an item on the timeline</Text>
            </div>
        );
    }

    // Get current interpolated values for display (These are for regular clips, not subtitles)
    // Subtitle font size/family/alignment/styles are not animated currently, so we use the direct state values
    const currentPosition = interpolateValue(selectedClip.keyframes?.position, currentTime, selectedClip.position);
    const currentScale = interpolateValue(selectedClip.keyframes?.scale, currentTime, selectedClip.scale);
    const currentRotation = interpolateValue(selectedClip.keyframes?.rotation, currentTime, selectedClip.rotation);

    // Existing Handlers (Position, Zoom, Rotate) - Keep these
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

    // Placeholder handlers for features not being implemented in this change
    const handlePlaceholderFeature = (name: string) => {
        // message.info(`${name} clicked (Not Implemented)`); // Reduce spam
        console.log(`${name} clicked (Not Implemented)`);
    };

    const handleColorChange = (color: any) => handlePlaceholderFeature(`Color Change to ${color.toHexString()}`);
    const handleBackgroundChange = (color: any) => handlePlaceholderFeature(`Background Change to ${color.toHexString()}`);
    const handleBackgroundPattern = () => handlePlaceholderFeature('Background Pattern');
    const handleWrapFill = (mode: 'wrap' | 'fill') => handlePlaceholderFeature(`${mode} Background`);
    const handleOpacityChange = (value: number | null) => handlePlaceholderFeature(`Opacity Change to ${value}`);
    const handleCornersChange = (value: number | null) => handlePlaceholderFeature(`Corners Change to ${value}`);
    const handlePaddingChange = (value: number | null) => handlePlaceholderFeature(`Padding Change to ${value}`);
    const handleDropShadowColorChange = (color: any) => handlePlaceholderFeature(`Drop Shadow Color Change to ${color.toHexString()}`);
    const handleDropShadowPattern = () => handlePlaceholderFeature('Drop Shadow Pattern');
    const handleDropShadowBlurChange = (value: number | null) => handlePlaceholderFeature(`Drop Shadow Blur Change to ${value}`);
    const handleDropShadowDistanceChange = (value: number | null) => handlePlaceholderFeature(`Drop Shadow Distance Change to ${value}`);
    const handleDropShadowRotationChange = (value: number | null) => handlePlaceholderFeature(`Drop Shadow Rotation Change to ${value}`);
    const handleTextOutlineChange = (value: string | null) => handlePlaceholderFeature(`Text Outline Change to ${value}`);
    const handleTextOutlineColorChange = (color: any) => handlePlaceholderFeature(`Text Outline Color Change to ${color.toHexString()}`);
    const handleTextOutlinePattern = () => handlePlaceholderFeature('Text Outline Pattern');

    // Handler for font family - already implemented
    const handleFontFamilyChange = (value: string) => {
        updateSubtitleFontFamily(value); // Call the prop handler
        // message.info(`Subtitle font changed to ${value}`); // Reduce spam
    };

    // Handler for font size - already implemented
    const handleFontSizeChange = (value: number | null) => {
        if (value === null || isNaN(value)) return;
        updateSubtitleFontSize(value); // Call the prop handler
    };

    // Handler for Text Alignment - already implemented
    const handleTextAlignChange = (value: any) => { // Segmented value can be any, cast it
        updateSubtitleTextAlign(value as 'left' | 'center' | 'right');
        // message.info(`Subtitle alignment changed to ${value}`); // Reduce spam
    };

    // Placeholder handlers for text styles not implemented in this change
    const handleTextStyleChange = (style: string) => handlePlaceholderFeature(`Text Style Toggle ${style}`);
    const handleTextCaseChange = (textCase: string) => handlePlaceholderFeature(`Text Case Change to ${textCase}`);
    const handleLineHeightChange = (value: string) => handlePlaceholderFeature(`Line Height Change to ${value}`);
    const handleRotateAlternatingLinesToggle = (checked: boolean) => handlePlaceholderFeature(`Rotate Alternating Lines Toggle ${checked}`);


    // --- JSX Structure based on Screenshots ---
    return (
        // Add a class to the main content div for CSS scrolling and padding
        <div className="properties-panel-content" style={{ backgroundColor: 'white'  }}> {/* Padding moved to CSS */}
            {/* Panel Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Text strong style={{ fontSize: 16 }}>Edit</Text>
                </Col>
                <Col>
                    <Space>
                        {/* Placeholder Button */}
                        <Button size="small" icon={<PlusOutlined />} disabled />
                        {/* Delete Button - Keep existing functionality */}
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={onDeleteClip} />
                    </Space>
                </Col>
            </Row>

            {/* --- Preset Styles Section --- */}
            <div id="section-presets">
                <SectionHeader title="Preset Styles" />
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    {/* Custom Preset Card */}
                    <Col span={12}>
                        <Card hoverable size="small" bodyStyle={{ padding: 8, textAlign: 'center' }} onClick={() => handlePlaceholderFeature('Custom Preset')}>
                            {/* Apply current font family and size */}
                            <div style={{ background: token.colorBgElevated, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderRadius: 4, fontFamily: subtitleFontFamily, fontSize: `${subtitleFontSize * 0.5}px` /* Scale down for card preview */ }}>
                                <Text strong style={{ color: token.colorTextSecondary }}>Your subtitles here</Text>
                            </div>
                            <Text>Custom</Text>
                        </Card>
                    </Col>
                    {/* Default Preset Card */}
                    <Col span={12}>
                        <Card hoverable size="small" bodyStyle={{ padding: 8, textAlign: 'center' }} onClick={() => handlePlaceholderFeature('Default Preset')}>
                            {/* Apply current font family and size */}
                            <div style={{ background: token.colorBgElevated, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderRadius: 4, fontFamily: subtitleFontFamily, fontSize: `${subtitleFontSize * 0.5}px` /* Scale down for card preview */ }}>
                                <Text strong style={{ color: '#00FFFF' /* Screenshot color */ }}>Your subtitles <span style={{color: token.colorPrimary /* Example primary color */}}>here</span></Text>
                            </div>
                            <Text>Default</Text>
                        </Card>
                    </Col>
                </Row>
            </div>


            {/* --- Font Section --- */}
            {/* Assuming this section controls the global subtitle font based on request */}
            <div id="section-font">
                <SectionHeader title="Font" />
                <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={14}>
                        {/* Font Family Select - Connected to state and handler */}
                        <Select size="small" style={{ width: '100%' }}
                                value={subtitleFontFamily}
                                onChange={handleFontFamilyChange}
                        >
                            {/* Add more font options */}
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
                        {/* Font Size Input - Connected to state and handler */}
                        <InputNumber
                            size="small"
                            style={{ width: '100%' }}
                            value={subtitleFontSize} // <-- Bind value to state prop
                            onChange={handleFontSizeChange} // <-- Use the actual handler
                            min={1} // Minimum sensible font size
                            max={100} // Maximum sensible font size
                            controls={false}
                        />
                    </Col>
                </Row>
                {/* --- ADDED: Bold, Italic, Underline buttons and Alignment --- <--- MODIFIED HERE */}
                <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={10}> {/* Adjusted span for alignment + style buttons */}
                        <Space size={0}> {/* Use size 0 for minimal spacing between buttons */}
                            {/* Bold Button */}
                            <Tooltip title="Bold">
                                <Button
                                    size="small"
                                    type={isSubtitleBold ? 'primary' : 'default'}
                                    onClick={toggleSubtitleBold}
                                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                >
                                    <Text strong style={{ fontSize: '14px', color: isSubtitleBold ? token.colorTextLightSolid : token.colorText }}>B</Text>
                                </Button>
                            </Tooltip>
                            {/* Italic Button */}
                            <Tooltip title="Italic">
                                <Button
                                    size="small"
                                    type={isSubtitleItalic ? 'primary' : 'default'}
                                    onClick={toggleSubtitleItalic}
                                    style={{ borderRadius: 0 }}
                                >
                                    <Text italic style={{ fontSize: '14px', color: isSubtitleItalic ? token.colorTextLightSolid : token.colorText }}>I</Text>
                                </Button>
                            </Tooltip>
                            {/* Underline Button */}
                            <Tooltip title="Underline">
                                <Button
                                    size="small"
                                    type={isSubtitleUnderlined ? 'primary' : 'default'}
                                    onClick={toggleSubtitleUnderlined}
                                    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                >
                                    <Text underline style={{ fontSize: '14px', color: isSubtitleUnderlined ? token.colorTextLightSolid : token.colorText }}>U</Text>
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                    <Col span={14}> {/* Adjusted span for alignment + style buttons */}
                        {/* Placeholder Alignment Segmented --> ENABLED AND CONNECTED */} {/* <--- MODIFIED */}
                        <Segmented
                            size="small"
                            block
                            options={[
                                { label: <Tooltip title="Align Left"><AlignLeftOutlined /></Tooltip>, value: 'left' },
                                { label: <Tooltip title="Align Center"><AlignCenterOutlined /></Tooltip>, value: 'center' },
                                { label: <Tooltip title="Align Right"><AlignRightOutlined /></Tooltip>, value: 'right' },
                            ]}
                            value={subtitleTextAlign} // <--- BIND TO STATE PROP
                            onChange={handleTextAlignChange} // <--- USE ACTUAL HANDLER
                            // disabled // REMOVED disabled prop <--- MODIFIED
                        />
                    </Col>
                </Row>
                {/* --- END ADDED Buttons --- */}
                <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={8}><Button block size="small" icon={<Tooltip title="Text Transform?"><span style={{fontFamily:'serif', fontWeight:'bold', fontSize:16}}>T</span></Tooltip>} onClick={()=>handlePlaceholderFeature('Text Transform')} disabled /></Col>
                    <Col span={8}><Button block size="small" icon={<Tooltip title="Character/Word Spacing?"><SwapOutlined rotate={90} /></Tooltip>} onClick={()=>handlePlaceholderFeature('Character/Word Spacing')} disabled /></Col>
                    <Col span={8}><Button block size="small" icon={<Tooltip title="Download Font?"><DownloadOutlined /></Tooltip>} onClick={()=>handlePlaceholderFeature('Download Font')} disabled /></Col>
                </Row>
            </div>

            {/* --- Line Height Section --- */}
            <div id="section-lineheight">
                <SectionHeader title="Line Height" />
                <Row gutter={8} align="middle">
                    <Col span={18}>
                        {/* Placeholder Line Height Select */}
                        <Select size="small" style={{ width: '100%' }} value="1.2" onChange={handleLineHeightChange} disabled>
                            <Option value="1">1x</Option>
                            <Option value="1.2">1.2x</Option>
                            <Option value="1.5">1.5x</Option>
                            <Option value="2">2x</Option>
                        </Select>
                    </Col>
                    <Col span={6}>
                        {/* Placeholder Toggle */}
                        <Switch size="small" checked={false} onChange={handleRotateAlternatingLinesToggle} style={{float: 'right'}} disabled />
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Text type="secondary" style={{fontSize: 11, display: 'block', textAlign: 'right', marginTop: 4}}>Rotate alternating lines</Text>
                    </Col>
                </Row>
            </div>

            {/* --- Color Section --- */}
            <Divider style={{margin: '24px 0 16px 0'}} />
            <div id="section-color">
                <SectionHeader title="Color" />
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        {/* Placeholder Color Picker Input */}
                        <Input addonBefore="#" value="FFFFFF" readOnly size="small" onClick={() => handlePlaceholderFeature('Color Picker Input')} disabled />
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}>
                        {/* Placeholder Color Swatch / Picker Trigger */}
                        <ColorPicker
                            defaultValue="#FFFFFF"
                            size="small"
                            onChange={handleColorChange}
                            disabled // Placeholder
                        />
                    </Col>
                    <Col span={6}><ResetButton onClick={() => handleColorChange({toHexString: () => '#FFFFFF'})} disabled={true}/></Col>
                </Row>
                {/* Placeholder Color Presets */}
                <Row gutter={[8,8]} style={{marginTop: 8}}>
                    <Col span={3}><div className="color-preset" style={{background: '#000000'}} onClick={()=>handleColorChange({toHexString:()=>'#000000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FFFFFF'}} onClick={()=>handleColorChange({toHexString:()=>'#FFFFFF'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FF0000'}} onClick={()=>handleColorChange({toHexString:()=>'#FF0000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FFC000'}} onClick={()=>handleColorChange({toHexString:()=>'#FFC000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#00FF00'}} onClick={()=>handleColorChange({toHexString:()=>'#00FF00'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#0000FF'}} onClick={()=>handleColorChange({toHexString:()=>'#0000FF'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#800080'}} onClick={()=>handleColorChange({toHexString:()=>'#800080'})}></div></Col>
                </Row>
            </div>

            {/* --- Background Section --- */}
            <div id="section-background">
                <SectionHeader title="Background" />
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        {/* Placeholder Background Color Picker Input */}
                        <Input addonBefore="#" value="EEEEEE" readOnly size="small" onClick={() => handlePlaceholderFeature('Background Picker Input')} disabled />
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}>
                        {/* Placeholder Color Swatch / Picker Trigger */}
                        <ColorPicker
                            defaultValue="#EEEEEE"
                            size="small"
                            onChange={handleBackgroundChange}
                            disabled // Placeholder
                        />
                    </Col>
                    <Col span={6}>
                        <Button size="small" icon={<BackgroundIcon />} onClick={handleBackgroundPattern} style={{marginRight: 4}} disabled />
                        <ResetButton onClick={() => handleBackgroundChange({toHexString: () => '#EEEEEE'})} disabled={true}/>
                    </Col>
                </Row>
                {/* Placeholder Background Presets */}
                <Row gutter={[8,8]} style={{marginTop: 8, marginBottom: 16}}>
                    <Col span={3}><div className="color-preset" style={{background: '#000000'}} onClick={()=>handleBackgroundChange({toHexString:()=>'#000000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FFFFFF'}} onClick={()=>handleBackgroundChange({toHexString:()=>'#FFFFFF'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FF0000'}} onClick={()=>handleBackgroundChange({toHexString:()=>'#FF0000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FFC000'}} onClick={()=>handleBackgroundChange({toHexString:()=>'#FFC000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#00FF00'}} onClick={()=>handleBackgroundChange({toHexString:()=>'#00FF00'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#0000FF'}} onClick={()=>handleBackgroundChange({toHexString:()=>'#0000FF'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#800080'}} onClick={()=>handleBackgroundChange({toHexString:()=>'#800080'})}></div></Col>
                </Row>
                <Row gutter={8}>
                    <Col span={12}>
                        {/* Placeholder Wrap Button */}
                        <Button block onClick={() => handleWrapFill('wrap')} disabled>Wrap</Button>
                    </Col>
                    <Col span={12}>
                        {/* Placeholder Fill Button */}
                        <Button block onClick={() => handleWrapFill('fill')} disabled>Fill</Button>
                    </Col>
                </Row>
            </div>


            {/* --- Opacity Section --- */}
            <div id="section-opacity">
                <SectionHeader title="Opacity" />
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        {/* Placeholder Opacity Slider */}
                        <Slider min={0} max={100} step={1} value={80} onChange={handleOpacityChange} tooltip={{ formatter: v => `${v}%` }} disabled />
                    </Col>
                    <Col flex="60px">
                        {/* Placeholder Opacity Input */}
                        <InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={100} step={1} value={80} onChange={handleOpacityChange} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handleOpacityChange(100)} disabled={true}/></Col>
                </Row>
            </div>

            {/* --- Corners Section --- */}
            <div id="section-corners">
                <SectionHeader title="Corners" />
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        {/* Placeholder Corners Slider */}
                        <Slider min={0} max={50} step={1} value={15} onChange={handleCornersChange} tooltip={{ formatter: v => `${v}%` }} disabled />
                    </Col>
                    <Col flex="60px">
                        {/* Placeholder Corners Input */}
                        <InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={50} step={1} value={15} onChange={handleCornersChange} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handleCornersChange(0)} disabled={true}/></Col>
                </Row>
            </div>

            {/* --- Padding Section --- */}
            <div id="section-padding">
                <SectionHeader title="Padding" />
                <Row gutter={8} align="middle">
                    <Col flex="auto">
                        {/* Placeholder Padding Slider */}
                        <Slider min={0} max={50} step={1} value={10} onChange={handlePaddingChange} tooltip={{ formatter: v => `${v}%` }} disabled />
                    </Col>
                    <Col flex="60px">
                        {/* Placeholder Padding Input */}
                        <InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={50} step={1} value={10} onChange={handlePaddingChange} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handlePaddingChange(0)} disabled={true}/></Col>
                </Row>
            </div>

            {/* --- Border Section --- */}
            <Divider style={{margin: '24px 0 16px 0'}} />
            <div id="section-border">
                <SectionHeader title="Border" />
                {/* Content of Border section */}

                {/* --- Drop Shadow Section (within Border) --- */}
                <SectionHeader title="Drop Shadow" />
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        {/* Placeholder Drop Shadow Color Picker Input */}
                        <Input addonBefore="#" value="AB5ABD" readOnly size="small" onClick={() => handlePlaceholderFeature('Drop Shadow Color Input')} disabled />
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}>
                        {/* Placeholder Color Swatch / Picker Trigger */}
                        <ColorPicker
                            defaultValue="#AB5ABD"
                            size="small"
                            onChange={handleDropShadowColorChange}
                            disabled // Placeholder
                        />
                    </Col>
                    <Col span={6}>
                        <Button size="small" icon={<BackgroundIcon />} onClick={handleDropShadowPattern} style={{marginRight: 4}} disabled />
                        <ResetButton onClick={() => handleDropShadowColorChange({toHexString: () => '#AB5ABD'})} disabled={true}/>
                    </Col>
                </Row>
                {/* Placeholder Drop Shadow Presets */}
                <Row gutter={[8,8]} style={{marginTop: 8, marginBottom: 16}}>
                    <Col span={3}><div className="color-preset" style={{background: '#000000'}} onClick={()=>handleDropShadowColorChange({toHexString:()=>'#000000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FFFFFF'}} onClick={()=>handleDropShadowColorChange({toHexString:()=>'#FFFFFF'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FF0000'}} onClick={()=>handleDropShadowColorChange({toHexString:()=>'#FF0000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#FFC000'}} onClick={()=>handleDropShadowColorChange({toHexString:()=>'#FFC000'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#00FF00'}} onClick={()=>handleDropShadowColorChange({toHexString:()=>'#00FF00'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#0000FF'}} onClick={()=>handleDropShadowColorChange({toHexString:()=>'#0000FF'})}></div></Col>
                    <Col span={3}><div className="color-preset" style={{background: '#800080'}} onClick={()=>handleDropShadowColorChange({toHexString:()=>'#800080'})}></div></Col>
                </Row>
                {/* Drop Shadow Blur */}
                <Row gutter={8} align="middle">
                    <Col flex="auto"><Text type="secondary" style={{fontSize: 12}}>Blur</Text></Col>
                    <Col flex="auto">
                        {/* Placeholder Blur Slider */}
                        <Slider min={0} max={100} step={1} value={10} onChange={handleDropShadowBlurChange} tooltip={{ formatter: v => `${v}%` }} disabled />
                    </Col>
                    <Col flex="60px">
                        {/* Placeholder Blur Input */}
                        <InputNumber size="small" suffix="%" style={{ width: '100%' }} min={0} max={100} step={1} value={10} onChange={handleDropShadowBlurChange} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handleDropShadowBlurChange(0)} disabled={true}/></Col>
                </Row>
                {/* Drop Shadow Distance */}
                <Row gutter={8} align="middle">
                    <Col flex="auto"><Text type="secondary" style={{fontSize: 12}}>Distance</Text></Col>
                    <Col flex="auto">
                        {/* Placeholder Distance Slider */}
                        <Slider min={0} max={10} step={0.01} value={0.08} onChange={handleDropShadowDistanceChange} tooltip={{ open: false }} disabled />
                    </Col>
                    <Col flex="60px">
                        {/* Placeholder Distance Input */}
                        <InputNumber size="small" style={{ width: '100%' }} min={0} max={10} step={0.01} value={0.08} onChange={handleDropShadowDistanceChange} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handleDropShadowDistanceChange(0)} disabled={true}/></Col>
                </Row>
                {/* Drop Shadow Rotation */}
                <Row gutter={8} align="middle">
                    <Col flex="auto"><Text type="secondary" style={{fontSize: 12}}>Rotation</Text></Col>
                    <Col flex="auto">
                        {/* Placeholder Rotation Slider */}
                        <Slider min={0} max={360} step={1} value={45} onChange={handleDropShadowRotationChange} tooltip={{ formatter: v => `${v}°` }} disabled />
                    </Col>
                    <Col flex="60px">
                        {/* Placeholder Rotation Input */}
                        <InputNumber size="small" suffix="°" style={{ width: '100%' }} min={0} max={360} step={1} value={45} onChange={handleDropShadowRotationChange} controls={false} disabled />
                    </Col>
                    <Col flex="24px" style={{ textAlign: 'right' }}><ResetButton onClick={() => handleDropShadowRotationChange(0)} disabled={true}/></Col>
                </Row>

                {/* --- Text Outline Section (within Border) --- */}
                <SectionHeader title="Text Outline" style={{marginTop: 24}}/>
                <Row gutter={8} align="middle">
                    <Col span={14}>
                        {/* Placeholder Text Outline Select */}
                        <Select size="small" style={{ width: '100%' }} value="None" onChange={handleTextOutlineChange} disabled>
                            <Option value="None">None</Option>
                            <Option value="Color">Color</Option>
                            <Option value="Gradient">Gradient</Option>
                        </Select>
                    </Col>
                    <Col span={4} style={{ textAlign: 'center' }}>
                        {/* Placeholder Color Swatch / Picker Trigger (only active if Outline is Color/Gradient) */}
                        <ColorPicker
                            defaultValue="#000000"
                            size="small"
                            onChange={handleTextOutlineColorChange}
                            disabled={true} // Disabled unless Outline is Color/Gradient
                        />
                    </Col>
                    <Col span={6}>
                        <Button size="small" icon={<BackgroundIcon />} onClick={handleTextOutlinePattern} style={{marginRight: 4}} disabled={true} />
                        <ResetButton onClick={() => handleTextOutlineChange('None')} />
                    </Col>
                </Row>
                {/* Placeholder Text Outline Presets (Could add a row similar to Color/Background if needed) */}
            </div>

            {/* --- Existing Position Section (Keep, integrate into new layout) --- */}
            <Divider style={{margin: '24px 0 16px 0'}} />
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


            {/* --- Existing Zoom Section (Keep, integrate into new layout) --- */}
            <div id="section-zoom">
                <SectionHeader title="Zoom"> <ResetButton onClick={handleResetZoom} /></SectionHeader>
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
            </div>


            {/* --- Existing Aspect Ratio Section (Keep, integrate into new layout) --- */}
            <div id="section-aspectratio">
                <SectionHeader title="Aspect Ratio" />
                <Segmented
                    options={['Unlocked', 'Locked']}
                    value={aspectRatioLocked ? 'Locked' : 'Unlocked'}
                    onChange={(value) => setAspectRatioLocked(value === 'Locked')}
                    block size="small"
                    disabled // Placeholder
                />
            </div>


            {/* --- Existing Rotate Section (Keep, integrate into new layout) --- */}
            <div id="section-rotate">
                <SectionHeader title="Rotate"> <ResetButton onClick={handleResetRotation} /></SectionHeader>
                <Row gutter={[4, 4]} align="middle" style={{ marginBottom: 8 }}>
                    {/* Placeholder Rotate Presets */}
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


            {/* --- Placeholder AI Tools Section (Keep, integrate into new layout) --- */}
            <Divider style={{margin: '24px 0 16px 0'}} />
            <div id="section-aitools">
                <SectionHeader title="AI Tools" />
                <Row gutter={[8, 8]}>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Smart Cut") }}><Space align="start"><ThunderboltOutlined style={{color: token.colorWarning}}/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Smart Cut<ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} /></Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Remove Silences</Text></div></Space></Card></Col>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Find Scenes") }}><Space align="start"><SearchOutlined/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Find Scenes</Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Split by scene</Text></div></Space></Card></Col>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Stabilize") }}><Space align="start"><ExpandOutlined style={{color: token.colorWarning}}/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Stabilize<ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} /></Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Remove shaking</Text></div></Space></Card></Col>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Eye Contact") }}><Space align="start"><EyeContactIcon style={{color: token.colorWarning}}/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Eye Contact<ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} /></Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Correct eye gaze</Text></div></Space></Card></Col>
                </Row>
            </div>


            {/* --- Placeholder Audio Section (Keep, integrate into new layout) --- */}
            <Divider style={{margin: '24px 0 16px 0'}} />
            <div id="section-audio">
                <SectionHeader title="Audio" />
                <Row gutter={[8, 8]}>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Clean Audio") }}><Space align="start"><AudioFilled style={{color: token.colorWarning}}/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Clean Audio<ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} /></Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Remove noise</Text></div></Space></Card></Col>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Add Waveform") }}><Space align="start"><CustomerServiceOutlined style={{color: token.colorWarning}}/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Add Waveform<ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} /></Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Add audio visualize</Text></div></Space></Card></Col>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Enhance Voice") }}><Space align="start"><SoundOutlined style={{color: token.colorWarning}}/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Enhance Voice<ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} /></Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Fix voice quality</Text></div></Space></Card></Col>
                    <Col span={12}><Card size="small" hoverable onClick={()=>{ handlePlaceholderFeature("Split Voice") }}><Space align="start"><ForkOutlined style={{color: token.colorWarning}}/><div style={{ lineHeight: 1.3 }}><Text strong style={{ fontSize: 13 }}>Split Voice<ThunderboltOutlined style={{ marginLeft: 4, color: token.colorWarning }} /></Text><Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Separate voi...</Text></div></Space></Card></Col>
                </Row>
            </div>


            {/* --- Placeholder Volume Section (Keep, integrate into new layout) --- */}
            <Divider style={{margin: '24px 0 16px 0'}} />
            <div id="section-volume">
                <SectionHeader title="Volume"><ResetButton disabled /></SectionHeader>
                <Slider defaultValue={100} disabled />
            </div>


            {/* --- Text Specific Section (Keep, integrate into new layout) --- */}
            {selectedClip.type === 'text' && (
                <>
                    <Divider style={{margin: '24px 0 16px 0'}} />
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

            {/* Add some padding at the bottom to ensure the last section isn't cut off */}
            <div style={{ height: 40 }}></div>

        </div>
    );
});