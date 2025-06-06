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
} from '../../Components/VideoPage/utils'; // Adjust path if needed

type ProjectState = EditorProjectState;
type DrawFrameFunc = (time: number, projectState: EditorProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }) => void;

// MODIFIED: Add optional subtitles to the callback
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
    setProjectState: Dispatch<SetStateAction<ProjectState>>; // Still needed for other methods
    setEditorState: Dispatch<SetStateAction<EditorStatus>>;
    private setSelectedMenuKey: Dispatch<SetStateAction<string>>;
    private drawFrame: DrawFrameFunc;
    private parseTimecodeToSecondsUtil: (timecode: string) => number;
    private calculateTotalDurationUtil: (tracks: Track[]) => number;
    private transcriptionUrl: string;
    private onProgress: TranscriptionProgressCallback; // Uses modified type
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
        onProgressCallback: TranscriptionProgressCallback, // Uses modified type
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

            // MODIFICATION: Do not set project state here.
            // Instead, send subtitles back via onProgress.
            // this.setProjectState(prev => ({
            //     ...prev, subtitles: subtitles, totalDuration: this.calculateTotalDurationUtil(prev.tracks),
            //     selectedClipId: null,
            // }));

            if (subtitles.length > 0) message.success(`Successfully parsed ${subtitles.length} subtitle entries from file.`);
            else message.warning("No valid subtitle entries found in the file.");

            // MODIFICATION: Pass subtitles array with 100% progress
            this.onProgress(100, file.name, subtitles);
            this.setSelectedMenuKey('subtitles');
        };
        reader.onerror = (_e) => {
            message.error("Failed to read subtitle file.");
            this.onProgress(-1, file.name); // No subtitles on error
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

                                // MODIFICATION: Call onProgress(100, ..., parsedSubtitles)
                                // Do NOT set project state here for subtitles.
                                this.onProgress(100, fileNameForTranscription, parsedSubtitles);

                                if (parsedSubtitles.length > 0) {
                                    message.success(data.message || `${operationType} complete! ${parsedSubtitles.length} entries processed.`);
                                } else {
                                    message.warning(data.message || `${operationType} complete, but no subtitles returned or result format is incorrect.`);
                                }

                                this.setEditorState('editor'); // This is fine here.
                                this.cleanupWebSocket(); // This is fine here.

                            } else if (data.status === 'error') {
                                message.error(data.message || `${operationType} error for ${fileNameForTranscription}: ${data.error || 'Unknown server error'}`);
                                this.onProgress(-1, fileNameForTranscription); // No subtitles on error
                                this.setEditorState('editor');
                                this.cleanupWebSocket();
                            } else if (data.status === 'progress' && serverProgress >= 0) {
                                console.log(`[Server Progress Update] ${fileNameForTranscription}: ${serverProgress}% (message: ${data.message || ''})`);
                                // No need to call this.onProgress with intermediate server values if client handles 0-50, then 50-100 logic.
                            }

                        } catch (e: any) {
                            message.error(`Error handling server update for ${fileNameForTranscription}: ${e.message}`);
                            this.onProgress(-1, fileNameForTranscription); // No subtitles on error
                            this.setEditorState('editor');
                            this.cleanupWebSocket();
                        }
                    });
                    this.stompSubscriptionRef.current = subscription;
                    console.log(`Subscribed to ${topic}`);
                },
                onStompError: (_frame) => {
                    message.error(`WebSocket STOMP error during ${operationType} for task ${taskId}.`);
                    this.onProgress(-1, fileNameForTranscription); // No subtitles on error
                    this.setEditorState('editor');
                    this.cleanupWebSocket();
                },
                onWebSocketError: (_event) => {
                    message.error(`WebSocket connection for ${operationType} (task ${taskId}) failed.`);
                    this.onProgress(-1, fileNameForTranscription); // No subtitles on error
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
            this.onProgress(-1, fileNameForTranscription); // No subtitles on error
            this.setEditorState('editor');
            this.cleanupWebSocket();
        }
    }

    // ... (rest of the SubtitleManager methods: updateSubtitleFontFamily, etc. remain the same) ...
    public updateSubtitleFontFamily(font: string, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleFontFamily: font }));
        this.drawFrame(currentTime, { ...projectState, subtitleFontFamily: font }, mediaElements);
    }

    public updateSubtitleFontSize(size: number, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleFontSize: size }));
        this.drawFrame(currentTime, { ...projectState, subtitleFontSize: size }, mediaElements);
    }

    public updateSubtitleTextAlign(align: SubtitleTextAlign, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleTextAlign: align }));
        this.drawFrame(currentTime, { ...projectState, subtitleTextAlign: align }, mediaElements);
    }

    public toggleSubtitleBold(currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, isSubtitleBold: !prev.isSubtitleBold }));
        this.drawFrame(currentTime, { ...projectState, isSubtitleBold: !projectState.isSubtitleBold }, mediaElements);
    }

    public toggleSubtitleItalic(currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, isSubtitleItalic: !prev.isSubtitleItalic }));
        this.drawFrame(currentTime, { ...projectState, isSubtitleItalic: !projectState.isSubtitleItalic }, mediaElements);
    }

    public toggleSubtitleUnderlined(currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, isSubtitleUnderlined: !prev.isSubtitleUnderlined }));
        this.drawFrame(currentTime, { ...projectState, isSubtitleUnderlined: !projectState.isSubtitleUnderlined }, mediaElements);
    }

    public updateSubtitleColor(color: string, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleColor: color }));
        this.drawFrame(currentTime, { ...projectState, subtitleColor: color }, mediaElements);
    }

    public updateSubtitleBackgroundColor(color: string, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleBackgroundColor: color }));
        this.drawFrame(currentTime, { ...projectState, subtitleBackgroundColor: color }, mediaElements);
    }

    public generateAssContent(projectState: ProjectState): string {
        const {
            canvasDimensions, subtitles, subtitleFontFamily, subtitleFontSize, subtitleColor,
            subtitleBackgroundColor, isSubtitleBold, isSubtitleItalic, isSubtitleUnderlined, subtitleTextAlign
        } = projectState;
        // If subtitles are empty, still generate the rest of the ASS structure
        const scriptInfo = `[Script Info]\nTitle: ${projectState.projectName || 'Untitled Project'}\nScriptType: v4.00+\nPlayResX: ${canvasDimensions.width}\nPlayResY: ${canvasDimensions.height}\nCollisions: Normal\nWrapStyle: 0\n`;
        const assPrimaryColour = convertColorToAss(subtitleColor);
        const assBackColour = convertColorToAss(subtitleBackgroundColor);
        const bold = isSubtitleBold ? -1 : 0;
        const italic = isSubtitleItalic ? -1 : 0;
        const underline = isSubtitleUnderlined ? -1 : 0;
        const alignment = getAssAlignment(subtitleTextAlign);
        const stylesFormat = "Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, Bold, Italic, Underline, Alignment";
        const defaultStyle = `Style: Default,${subtitleFontFamily},${subtitleFontSize},${assPrimaryColour},${assBackColour},${bold},${italic},${underline},${alignment}`;
        const styles = `[V4+ Styles]\n${stylesFormat}\n${defaultStyle}\n`;
        const eventsFormat = "Format: Start, End, Style, Text";
        const eventLines = subtitles && subtitles.length > 0
            ? subtitles.map(sub => {
                const start = formatTimeToAss(sub.startTime);
                const end = formatTimeToAss(sub.endTime);
                const text = sub.text.replace(/\n/g, '\\N');
                return `Dialogue: ${start},${end},Default,${text}`;
            }).join('\n')
            : ""; // Empty string if no subtitles
        const events = `[Events]\n${eventsFormat}\n${eventLines}\n`;
        return `${scriptInfo}\n${styles}\n${events}`;
    }
}