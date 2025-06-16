import React from 'react';
import { Card, Space, Typography, Progress } from 'antd';
import type { ThemeConfig } from 'antd'; // For themeToken type

const { Title, Text } = Typography;

// Define a more specific type for theme.token if possible, or use a general one.
// Assuming theme.useToken() returns an object with a 'token' property.
// For example, if using antd's ThemeConfig:
type AntdToken = ThemeConfig['token'];


export interface OperationProgressDisplayProps {
    isActive: boolean;
    progress: number;
    titleText: string; // Main title text for the operation
    statusTextWhileInProgress?: string; // Detailed status text shown when progress < 100
    statusTextWhenDone?: string;     // Detailed status text shown when progress === 100
    fileName?: string | null;
    timeRemaining?: string; // e.g., "00:00"
    themeToken: AntdToken; // Pass the theme token for styling
    detailIcon?: React.ReactNode; // Icon for the detail line (e.g., file icon or operation type icon)
}

export const OperationProgressDisplay: React.FC<OperationProgressDisplayProps> = ({
                                                                                      isActive,
                                                                                      progress,
                                                                                      titleText,
                                                                                      statusTextWhileInProgress,
                                                                                      statusTextWhenDone,
                                                                                      fileName,
                                                                                      timeRemaining,
                                                                                      themeToken,
                                                                                      detailIcon,
                                                                                  }) => {
    if (!isActive) return null;

    const displayProgress = Math.round(progress);
    let currentStatusText = titleText; // Default to titleText

    if (displayProgress === 100 && statusTextWhenDone) {
        currentStatusText = statusTextWhenDone;
    } else if (statusTextWhileInProgress) {
        // Only override titleText if statusTextWhileInProgress is provided
        currentStatusText = statusTextWhileInProgress;
    }


    const showLowerDetailedSection = !!(fileName || timeRemaining || detailIcon);

    return (
        <Card bordered={false} style={{ marginBottom: 16, marginTop: 16 }}>
            <Space
                direction="vertical"
                align="center"
                style={{ width: '100%', paddingBottom: showLowerDetailedSection ? 16 : 0 }}
            >
                <Title level={5} style={{ margin: 0 }}>{currentStatusText}</Title>
                <Progress
                    percent={displayProgress}
                    size="small"
                    showInfo={true}
                    style={{ width: '100%' }}
                />
            </Space>
            {showLowerDetailedSection && (
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
                        {timeRemaining && (
                            <span style={{
                                color: 'white',
                                fontSize: 12,
                                backgroundColor: '#1a1a1a',
                                padding: '2px 6px',
                                borderRadius: 4,
                                minWidth: 40,
                                textAlign: 'center',
                            }}>
                                {timeRemaining}
                            </span>
                        )}
                        <div style={{
                            flexGrow: 1,
                            backgroundColor: '#555',
                            height: 5,
                            borderRadius: 2.5,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                backgroundColor: themeToken?.colorPrimary, // Use themeToken
                                height: '100%',
                                width: `${displayProgress}%`,
                                transition: 'width 0.05s linear',
                            }}></div>
                        </div>
                        <span style={{
                            fontSize: 12,
                            color: '#ccc',
                            minWidth: 40,
                            textAlign: 'right',
                        }}>
                            {displayProgress}%
                        </span>
                    </div>
                    {/* Only show filename line if filename and icon are provided, and not yet 100% */}
                    {fileName && detailIcon && displayProgress < 100 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {detailIcon}
                            <Text type="secondary" ellipsis style={{ flexGrow: 1, color: '#ccc' }}>
                                {fileName}
                            </Text>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};