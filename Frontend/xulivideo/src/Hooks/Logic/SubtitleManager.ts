// src/Hooks/Logic/SubtitleManager.ts

import { Dispatch, SetStateAction, RefObject } from 'react';
import { message } from 'antd';
import axios from "axios";
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from "sockjs-client";
import type {
    EditorProjectState,
    EditorStatus,
    SubtitleEntry,
    Track,
    Clip,
    SubtitleTextAlign
} from '../../Components/VideoPage/types'; // Adjust path if needed
import {
    parseTimecodeToSeconds,
    calculateTotalDuration,
    formatTimeToAss,
    convertColorToAss,
    getAssAlignment
} from '../../Components/VideoPage/utils'; // <-- Đảm bảo đường dẫn này đúng và chứa các hàm trên


type ProjectState = EditorProjectState;
type DrawFrameFunc = (time: number, projectState: EditorProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }) => void;

type TranscriptionProgressCallback = (progress: number, fileName?: string, subtitles?: SubtitleEntry[]) => void;

interface SrtSegment {
    start: string;
    end: string;
    text: string;
}

export interface TranscriptionOptions {
    language: string;
    translate: boolean;
}

export class SubtitleManager {
    setProjectState: Dispatch<SetStateAction<ProjectState>>;
    setEditorState: Dispatch<SetStateAction<EditorStatus>>;
    private setSelectedMenuKey: Dispatch<SetStateAction<string>>;
    private drawFrame: DrawFrameFunc;
    private parseTimecodeToSecondsUtil: (timecode: string) => number;
    private calculateTotalDurationUtil: (tracks: Track[]) => number;
    private transcriptionUrl: string;
    private onProgress: TranscriptionProgressCallback;
    private websocketEndpoint: string;
    private stompClientRef: RefObject<Client | null>;
    private stompSubscriptionRef: RefObject<StompSubscription | null>;

    constructor(
        setProjectState: Dispatch<SetStateAction<ProjectState>>,
        setEditorState: Dispatch<SetStateAction<EditorStatus>>,
        setSelectedMenuKey: Dispatch<SetStateAction<string>>,
        drawFrame: DrawFrameFunc,
        parseTimecodeToSecondsUtil: (timecode: string) => number,
        calculateTotalDurationUtil: (tracks: Track[]) => number,
        transcriptionUrl: string,
        onProgressCallback: TranscriptionProgressCallback,
        websocketEndpoint: string,
        stompClientRef: RefObject<Client | null>,
        stompSubscriptionRef: RefObject<StompSubscription | null>
    ) {
        this.setProjectState = setProjectState;
        this.setEditorState = setEditorState;
        this.setSelectedMenuKey = setSelectedMenuKey;
        this.drawFrame = drawFrame;
        this.parseTimecodeToSecondsUtil = parseTimecodeToSecondsUtil;
        this.calculateTotalDurationUtil = calculateTotalDurationUtil;
        this.transcriptionUrl = transcriptionUrl;
        this.onProgress = onProgressCallback;
        this.websocketEndpoint = websocketEndpoint;
        this.stompClientRef = stompClientRef;
        this.stompSubscriptionRef = stompSubscriptionRef;
    }

    private cleanupWebSocket(): void {
        if (this.stompSubscriptionRef.current) {
            try {
                this.stompSubscriptionRef.current.unsubscribe();
            } catch (e) {
                console.warn("Error unsubscribing STOMP for transcription:", e);
            }
            this.stompSubscriptionRef.current = null;
        }
        if (this.stompClientRef.current?.active) {
            this.stompClientRef.current.deactivate().catch(e => console.warn("Error deactivating STOMP for transcription:", e));
        }
        this.stompClientRef.current = null;
    }

    public handleUploadSrt = (file: File, _currentProjectState: ProjectState): void => {
        console.log("SubtitleManager: Handling SRT/VTT upload:", file.name);
        message.info(`Processing subtitle file: ${file.name}`);
        this.onProgress(0, `Parsing: ${file.name}`);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            let subtitles: SubtitleEntry[] = [];
            if (!text) { message.error("Subtitle file is empty."); }
            else {
                try {
                    text.split(/\r?\n\r?\n/).forEach(block => {
                        const lines = block.trim().split(/\r?\n/);
                        let timecodeLine = null; let textLinesStart = -1;
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            if (line.includes('-->') && line.match(/(\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3}\s*-->\s*(\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3}/)) {
                                timecodeLine = line; textLinesStart = i + 1; break;
                            }
                            if (timecodeLine === null && /^\d+$/.test(line.trim())) { continue; }
                            if (timecodeLine === null && line.trim() === 'WEBVTT') { continue; }
                        }
                        if (timecodeLine && textLinesStart !== -1 && lines.length >= textLinesStart) {
                            const timeMatch = timecodeLine.match(/((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{3})/);
                            if (timeMatch && timeMatch.length === 3) {
                                const subtitleText = lines.slice(textLinesStart).join('\n').trim();
                                const cleanedText = subtitleText.replace(/<[^>]*>/g, '').trim();
                                if (cleanedText) {
                                    const formatForParsing = (tc: string) => tc.split(':').length === 2 ? `00:${tc}` : tc;
                                    const startTime = this.parseTimecodeToSecondsUtil(formatForParsing(timeMatch[1]));
                                    const endTime = this.parseTimecodeToSecondsUtil(formatForParsing(timeMatch[2]));
                                    subtitles.push({ id: `subtitle-${Date.now()}-${subtitles.length}-${Math.random().toString(36).substring(2, 5)}`, startTime, endTime, text: cleanedText });
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error("Error parsing subtitle file:", error);
                    message.error("Failed to parse subtitle file.");
                    subtitles = [];
                }
            }

            if (subtitles.length > 0) message.success(`Successfully parsed ${subtitles.length} subtitle entries from file.`);
            else message.warning("No valid subtitle entries found in the file.");

            this.onProgress(100, file.name, subtitles);
            this.setSelectedMenuKey('subtitles');
        };
        reader.onerror = (_e) => {
            message.error("Failed to read subtitle file.");
            this.onProgress(-1, file.name);
            this.setSelectedMenuKey('subtitles');
        };
        reader.readAsText(file);
    }

    public handleStartFromScratch = async (
        selectedClip: Clip | null,
        selectedVideoSecureUrl: string | null,
        _currentTime: number,
        _currentProjectState: ProjectState,
        transcriptionOptions: TranscriptionOptions
    ): Promise<void> => {
        if (!selectedClip || selectedClip.type !== 'video' || !selectedVideoSecureUrl) {
            message.error("No video selected or video URL is missing. Cannot start transcription.");
            this.onProgress(-1, selectedClip?.name || "Selected Video");
            this.setSelectedMenuKey('subtitles');
            this.setEditorState('editor');
            return;
        }

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            message.error('Authentication required. Please log in to use transcription services.');
            this.onProgress(-1, selectedClip.name || "Selected Video");
            this.setSelectedMenuKey('subtitles');
            this.setEditorState('editor');
            return;
        }

        const fileNameForTranscription = selectedClip.name || 'Selected Video';
        const operationType = transcriptionOptions.translate ? "Translation" : "Transcription";

        message.info(`Initiating ${operationType} for: ${fileNameForTranscription}...`);
        this.setSelectedMenuKey('subtitles');
        this.setEditorState('transcribing');

        try {
            const transcriptionRequestPayload = {
                url: selectedVideoSecureUrl,
                language: transcriptionOptions.language,
                translate: transcriptionOptions.translate,
            };

            const response = await axios.post<string>(this.transcriptionUrl, transcriptionRequestPayload, {
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            });

            const taskId = response.data;
            if (!taskId || typeof taskId !== 'string') {
                message.error(`${operationType} initiated, but failed to get a valid task ID.`);
                this.onProgress(-1, fileNameForTranscription);
                this.setEditorState('editor');
                return;
            }
            console.log(`Received taskId for ${operationType}: ${taskId}`);
            this.cleanupWebSocket();

            const client = new Client({
                webSocketFactory: () => new SockJS(this.websocketEndpoint),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (str) => { console.log(`STOMP DEBUG (${operationType} - ${taskId}):`, str); },
                onConnect: (_frame) => {
                    console.log(`STOMP connected for ${operationType} task ${taskId}. Subscribing...`);
                    const topic = `/topic/progress/${taskId}`;
                    const subscription = client.subscribe(topic, (stompMessage: IMessage) => {
                        try {
                            const data = JSON.parse(stompMessage.body);
                            const serverProgress = typeof data.progress === 'number' ? data.progress : -1;

                            if (data.status === 'complete') {
                                const srtSegments = data.result as SrtSegment[];
                                let parsedSubtitles: SubtitleEntry[] = [];

                                if (srtSegments && Array.isArray(srtSegments)) {
                                    parsedSubtitles = srtSegments.map((segment, index) => ({
                                        id: `subtitle-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
                                        startTime: this.parseTimecodeToSecondsUtil(segment.start),
                                        endTime: this.parseTimecodeToSecondsUtil(segment.end),
                                        text: segment.text
                                    }));
                                }

                                this.onProgress(100, fileNameForTranscription, parsedSubtitles);

                                if (parsedSubtitles.length > 0) {
                                    message.success(data.message || `${operationType} complete! ${parsedSubtitles.length} entries processed.`);
                                } else {
                                    message.warning(data.message || `${operationType} complete, but no subtitles returned or result format is incorrect.`);
                                }

                                this.setEditorState('editor');
                                this.cleanupWebSocket();

                            } else if (data.status === 'error') {
                                message.error(data.message || `${operationType} error for ${fileNameForTranscription}: ${data.error || 'Unknown server error'}`);
                                this.onProgress(-1, fileNameForTranscription);
                                this.setEditorState('editor');
                                this.cleanupWebSocket();
                            } else if (data.status === 'progress' && serverProgress >= 0) {
                                console.log(`[Server Progress Update] ${fileNameForTranscription}: ${serverProgress}% (message: ${data.message || ''})`);
                                // Call onProgress for animated progress bar
                                this.onProgress(serverProgress, fileNameForTranscription);
                            }

                        } catch (e: any) {
                            message.error(`Error handling server update for ${fileNameForTranscription}: ${e.message}`);
                            this.onProgress(-1, fileNameForTranscription);
                            this.setEditorState('editor');
                            this.cleanupWebSocket();
                        }
                    });
                    this.stompSubscriptionRef.current = subscription;
                    console.log(`Subscribed to ${topic}`);
                },
                onStompError: (_frame) => {
                    message.error(`WebSocket STOMP error during ${operationType} for task ${taskId}.`);
                    this.onProgress(-1, fileNameForTranscription);
                    this.setEditorState('editor');
                    this.cleanupWebSocket();
                },
                onWebSocketError: (_event) => {
                    message.error(`WebSocket connection for ${operationType} (task ${taskId}) failed.`);
                    this.onProgress(-1, fileNameForTranscription);
                    this.setEditorState('editor');
                    this.cleanupWebSocket();
                },
            });
            this.stompClientRef.current = client;
            client.activate();

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || `Unknown ${operationType} error`;
            message.error(`${operationType} request failed: ${errorMessage}`);
            console.error(`${operationType} initiation error:`, error);
            this.onProgress(-1, fileNameForTranscription);
            this.setEditorState('editor');
            this.cleanupWebSocket();
        }
    }

    // --- CÁC HÀM CẬP NHẬT SUBTITLE STYLE - ĐÃ SỬA ĐỔI ĐỂ GỌI drawFrame VÀ generateAssContent VỚI STATE MỚI NHẤT ---

    public updateSubtitleFontFamily(font: string, currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        console.log("Subtitle font family updated to:", font);
        this.setProjectState(prev => {
            const newState = { ...prev, subtitleFontFamily: font };
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated font family:\n", updatedAssContent);
            return newState;
        });
    }

    public updateSubtitleFontSize(size: number, currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        console.log("Subtitle font size updated to:", size);
        this.setProjectState(prev => {
            const newState = { ...prev, subtitleFontSize: size };
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated font size:\n", updatedAssContent);
            return newState;
        });
    }

    public updateSubtitleTextAlign(align: SubtitleTextAlign, currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        console.log("Subtitle text alignment updated to:", align);
        this.setProjectState(prev => {
            const newState = { ...prev, subtitleTextAlign: align };
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated text alignment:\n", updatedAssContent);
            return newState;
        });
    }

    public toggleSubtitleBold(currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => {
            const newState = { ...prev, isSubtitleBold: !prev.isSubtitleBold };
            console.log("Subtitle bold toggled. New state:", newState.isSubtitleBold);
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated bold state:\n", updatedAssContent);
            return newState;
        });
    }

    public toggleSubtitleItalic(currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => {
            const newState = { ...prev, isSubtitleItalic: !prev.isSubtitleItalic };
            console.log("Subtitle italic toggled. New state:", newState.isSubtitleItalic);
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated italic state:\n", updatedAssContent);
            return newState;
        });
    }

    public toggleSubtitleUnderlined(currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => {
            const newState = { ...prev, isSubtitleUnderlined: !prev.isSubtitleUnderlined };
            console.log("Subtitle underlined toggled. New state:", newState.isSubtitleUnderlined);
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated underline state:\n", updatedAssContent);
            return newState;
        });
    }

    public updateSubtitleColor(color: string, currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        console.log("Subtitle text color updated to:", color);
        this.setProjectState(prev => {
            const newState = { ...prev, subtitleColor: color };
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated text color:\n", updatedAssContent);
            return newState;
        });
    }

    public updateSubtitleBackgroundColor(color: string, currentTime: number, _staleProjectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        console.log("Subtitle background color updated to:", color);
        this.setProjectState(prev => {
            const newState = { ...prev, subtitleBackgroundColor: color };
            this.drawFrame(currentTime, newState, mediaElements);
            const updatedAssContent = this.generateAssContent(newState);
            console.log("Generated ASS with updated background color:\n", updatedAssContent);
            return newState;
        });
    }

    // --- HÀM TẠO ASS CONTENT - KHÔNG THAY ĐỔI VÌ NÓ ĐÃ SỬ DỤNG projectState ĐƯỢC TRUYỀN VÀO ---
    public generateAssContent(projectState: ProjectState): string {
        const {
            canvasDimensions, subtitles, subtitleFontFamily, subtitleFontSize, subtitleColor,
            subtitleBackgroundColor, isSubtitleBold, isSubtitleItalic, isSubtitleUnderlined, subtitleTextAlign
        } = projectState;

        // --- DEBUGGING LOGS: Kiểm tra giá trị của projectState tại thời điểm này ---
        console.log("--- generateAssContent Debug (Final State for ASS Generation) ---");
        console.log("projectState.subtitleColor:", subtitleColor);
        console.log("projectState.subtitleBackgroundColor:", subtitleBackgroundColor);
        console.log("projectState.isSubtitleBold:", isSubtitleBold);
        console.log("projectState.isSubtitleItalic:", isSubtitleItalic);
        console.log("projectState.isSubtitleUnderlined:", isSubtitleUnderlined);
        console.log("projectState.subtitleTextAlign:", subtitleTextAlign);
        console.log("--- End Debug ---");

        // Các giá trị mặc định và hằng số cho ASS
        const defaultStrikeOut = 0;
        const defaultScaleX = 100;
        const defaultScaleY = 100;
        const defaultSpacing = 0;
        const defaultAngle = 0;
        const defaultMarginL = 10;
        const defaultMarginR = 10;
        const defaultMarginV = 10;
        const defaultEncoding = 1; // 1 for ANSI, 0 for Shift-JIS, etc.

        // [Script Info] Section
        const scriptInfo = `[Script Info]\n` +
            `Title: ${projectState.projectName || 'Untitled Project'}\n` +
            `Original Script: Generated by Video Editor\n` +
            `ScriptType: v4.00+\n` +
            `PlayResX: ${canvasDimensions.width}\n` +
            `PlayResY: ${canvasDimensions.height}\n` +
            `WrapStyle: 0\n` +
            `Collisions: Normal\n` +
            `Timer: 100.0000\n`;

        // [V4+ Styles] Section
        const assPrimaryColour = convertColorToAss(subtitleColor);
        const assSecondaryColour = assPrimaryColour; // Can be different for karaoke effects
        const assOutlineColour = '&H00000000'; // Black outline for readability. Có thể làm cho nó configurable nếu muốn

        const bold = isSubtitleBold ? -1 : 0;
        const italic = isSubtitleItalic ? -1 : 0;
        const underline = isSubtitleUnderlined ? -1 : 0;
        const alignment = getAssAlignment(subtitleTextAlign);

        let effectiveBorderStyle;
        let assBackColour; // This will be the shadow color if BorderStyle=1, or box background color if BorderStyle=3
        let effectiveOutline; // Thickness of the outline in pixels
        let effectiveShadow; // Depth of the shadow in pixels

        // Determine if an opaque background is desired based on subtitleBackgroundColor
        const isOpaqueBackgroundDesired = subtitleBackgroundColor && subtitleBackgroundColor.toLowerCase() !== '#00000000' && subtitleBackgroundColor.toLowerCase() !== 'transparent';


        if (isOpaqueBackgroundDesired) {
            // Use BorderStyle 3 for an opaque box background
            effectiveBorderStyle = 3;
            assBackColour = convertColorToAss(subtitleBackgroundColor); // This is the box's color
            effectiveOutline = 0; // Outline property is ignored with BorderStyle 3
            effectiveShadow = 0; // Shadow property is ignored with BorderStyle 3
        } else {
            // Use BorderStyle 1 for outline + shadow effect (default if no opaque background)
            effectiveBorderStyle = 1;
            assBackColour = '&H00000000'; // This is the shadow color (black for shadows). Có thể làm cho nó configurable nếu muốn
            effectiveOutline = 2; // Default outline thickness (e.g., 2 pixels). Có thể làm cho nó configurable nếu muốn
            effectiveShadow = 0; // Default shadow depth (e.g., 0 for no shadow, or 2 for a slight shadow). Có thể làm cho nó configurable nếu muốn
        }

        const stylesFormat = "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding";

        const defaultStyle = `Style: Default,${subtitleFontFamily},${subtitleFontSize},` +
            `${assPrimaryColour},${assSecondaryColour},${assOutlineColour},${assBackColour},` +
            `${bold},${italic},${underline},${defaultStrikeOut},` +
            `${defaultScaleX},${defaultScaleY},${defaultSpacing},${defaultAngle},` +
            `${effectiveBorderStyle},${effectiveOutline},${effectiveShadow},${alignment},` +
            `${defaultMarginL},${defaultMarginR},${defaultMarginV},${defaultEncoding}`;

        const styles = `[V4+ Styles]\n${stylesFormat}\n${defaultStyle}\n`;

        // [Events] Section
        const eventsFormat = "Format: Layer, Start, End, Style, Actor, MarginL, MarginR, MarginV, Effect, Text";
        const eventLines = subtitles && subtitles.length > 0
            ? subtitles.map(sub => {
                const start = formatTimeToAss(sub.startTime);
                const end = formatTimeToAss(sub.endTime);
                const text = sub.text.replace(/\n/g, '\\N'); // Replace newlines with ASS newline character
                return `Dialogue: 0,${start},${end},Default,,${defaultMarginL},${defaultMarginR},${defaultMarginV},,${text}`;
            }).join('\n')
            : "";

        const events = `[Events]\n${eventsFormat}\n${eventLines}\n`;

        return `${scriptInfo}\n${styles}\n${events}`;
    }
}