// src/hooks/logic/SubtitleManager.ts

import { Dispatch, SetStateAction } from 'react'; // useMemo is no longer needed in the class
import { message, Upload } from 'antd';
// Import UploadChangeParam
import axios from "axios";
import type {
    EditorProjectState,
    SrtSegment,
    SubtitleEntry,
    ClipType,
    Track,
    Clip
} from '../../Components/VideoPage/types'; // Assuming types are imported
import { parseTimecodeToSeconds, calculateTotalDuration } from '../../Components/VideoPage/utils'; // Import utilities
import {
    DEFAULT_SUBTITLE_FONT_SIZE, DEFAULT_SUBTITLE_TEXT_ALIGN,
    SUBTITLE_FILL_COLOR, SUBTITLE_BACKGROUND_COLOR // Import constants
} from '../constants';

type EditorState = 'initial' | 'uploading' | 'transcribing' | 'editor';
type ProjectState = EditorProjectState;
type DrawFrameFunc = (time: number, projectState: EditorProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }) => void;

export class SubtitleManager {
    // Properties now store the values passed via the constructor
    setProjectState: Dispatch<SetStateAction<ProjectState>>;
    setEditorState: Dispatch<SetStateAction<EditorState>>;
    private setSelectedMenuKey: Dispatch<SetStateAction<string>>;
    private drawFrame: DrawFrameFunc; // Pass the drawing function
    private parseTimecodeToSeconds: (timecode: string) => number;
    private calculateTotalDuration: (tracks: Track[]) => number;
    private transcriptionUrl: string;


    constructor(
        // Accept necessary dependencies via constructor
        setProjectState: Dispatch<SetStateAction<ProjectState>>,
        setEditorState: Dispatch<SetStateAction<EditorState>>,
        setSelectedMenuKey: Dispatch<SetStateAction<string>>,
        drawFrame: DrawFrameFunc,
        parseTimecodeToSeconds: (timecode: string) => number,
        calculateTotalDuration: (tracks: Track[]) => number,
        transcriptionUrl: string
    ) {
        // Assign dependencies to instance properties
        this.setProjectState = setProjectState;
        this.setEditorState = setEditorState;
        this.setSelectedMenuKey = setSelectedMenuKey;
        this.drawFrame = drawFrame;
        this.parseTimecodeToSeconds = parseTimecodeToSeconds;
        this.calculateTotalDuration = calculateTotalDuration;
        this.transcriptionUrl = transcriptionUrl;
        // Remove projectState and currentTime as stored properties if they are passed to methods
    }

    // Pass current state, time, and mediaElementsRef.current to methods that need them
    public handleUploadSrt = (file: File, currentProjectState: ProjectState): void => {
        console.log("SubtitleManager: Handling SRT/VTT upload:", file.name);
        message.info(`Processing subtitle file: ${file.name}`);

        // Use the setter passed in the constructor
        this.setProjectState(prev => ({
            ...prev,
            uploadProgress: 0,
            uploadingFile: `Parsing subtitles: ${file.name}`,
            currentUploadTaskId: `subtitle-parse-${Date.now()}`,
            uploadTimeRemaining: '...',
        }));
        this.setEditorState('uploading'); // Use the setter

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
                            if (line.includes('-->') && line.match(/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/)) { timecodeLine = line; textLinesStart = i + 1; break; }
                            if (timecodeLine === null && /^\d+$/.test(line.trim())) { continue; }
                            if (timecodeLine === null && line.trim() === 'WEBVTT') { continue; }
                        }
                        if (timecodeLine && textLinesStart !== -1 && lines.length > textLinesStart) {
                            const timeMatch = timecodeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
                            if (timeMatch && timeMatch.length === 3) {
                                const subtitleText = lines.slice(textLinesStart).join('\n').trim();
                                const cleanedText = subtitleText.replace(/<[^>]*>/g, '').trim();

                                if (cleanedText) {
                                    const startTime = this.parseTimecodeToSeconds(timeMatch[1]); // Use passed utility
                                    const endTime = this.parseTimecodeToSeconds(timeMatch[2]); // Use passed utility
                                    subtitles.push({ id: `subtitle-${Date.now()}-${subtitles.length}-${Math.random().toString(36).substring(2, 5)}`, startTime, endTime, text: cleanedText });
                                }
                            }
                        }
                    });
                    console.log(`Parsed ${subtitles.length} subtitle entries.`);
                } catch (error) {
                    console.error("Error parsing subtitle file:", error);
                    message.error("Failed to parse subtitle file.");
                    subtitles = [];
                }
            }

            // Use the setter passed in the constructor
            this.setProjectState(prev => ({
                ...prev,
                subtitles: subtitles,
                totalDuration: this.calculateTotalDuration(prev.tracks), // Use passed utility
                selectedClipId: null,
                uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00',
            }));

            if (subtitles.length > 0) {
                message.success(`Successfully loaded ${subtitles.length} subtitle entries.`);
            } else {
                message.warning("No valid subtitle entries found in the file.");
            }

            // Use the setters passed in the constructor
            this.setEditorState('editor');
            this.setSelectedMenuKey('subtitles');
            // Draw frame after state update (useEffect watching state/time will trigger it)
        };
        reader.onerror = (e) => {
            console.error("Error reading subtitle file:", e);
            message.error("Failed to read subtitle file.");
            // Use the setters passed in the constructor
            this.setProjectState(prev => ({ ...prev, uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00' }));
            this.setEditorState('editor');
            this.setSelectedMenuKey('subtitles');
        };
        reader.readAsText(file);
    }

    public handleStartFromScratch = async (
        selectedClip: Clip | null, // Pass selected clip
        selectedVideoSecureUrl: string | null, // Pass derived URL
        currentTime: number, // Pass current time
        currentProjectState: ProjectState // Pass current state
    ): Promise<void> => {
        console.log("SubtitleManager: handleStartFromScratch called");

        if (!selectedClip || selectedClip.type !== 'video' || !selectedVideoSecureUrl) {
            console.log("No transcribable video selected for 'Start from Scratch'.");
            message.info("No video clip selected for transcription. Starting with an empty subtitle entry.");

            this.setEditorState('editor'); // Use the setter
            this.setSelectedMenuKey('subtitles'); // Use the setter

            if (currentProjectState.subtitles.length === 0) {
                console.log("Adding initial empty subtitle entry.");
                this.setProjectState(prev => ({ // Use the setter
                    ...prev,
                    subtitles: [{ id: `subtitle-${Date.now()}`, startTime: currentTime, endTime: currentTime + 3, text: "" }],
                    selectedClipId: null,
                }));
            } else {
                console.log("Existing subtitles found, not adding empty entry.");
                this.setProjectState(prev => ({ ...prev, selectedClipId: null })); // Use the setter
            }
            return;
        }

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            message.error('Access token is missing! Cannot start transcription.');
            this.setEditorState('editor'); // Use the setter
            this.setSelectedMenuKey('subtitles'); // Use the setter
            return;
        }

        console.log(`Attempting transcription for video: ${selectedVideoSecureUrl}`);
        message.info(`Starting transcription for ${selectedClip.name || 'selected video'}...`);

        this.setEditorState('transcribing'); // Use the setter
        this.setProjectState(prev => ({ // Use the setter
            ...prev,
            uploadProgress: 0,
            uploadingFile: `Transcribing: ${selectedClip.name || 'Selected Video'}`,
            currentUploadTaskId: `transcription-task-${Date.now()}`,
            uploadTimeRemaining: 'N/A',
        }));
        this.setSelectedMenuKey('subtitles'); // Use the setter


        try {
            const response = await axios.post<SrtSegment[]>(this.transcriptionUrl, {
                url: selectedVideoSecureUrl,
                language: 'en'
            }, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            const srtSegments = response.data;
            console.log("Transcription API response:", srtSegments);

            if (srtSegments && srtSegments.length > 0) {
                const subtitles: SubtitleEntry[] = srtSegments.map((segment, index) => ({
                    id: `subtitle-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
                    startTime: this.parseTimecodeToSeconds(segment.start),
                    endTime: this.parseTimecodeToSeconds(segment.end),
                    text: segment.text
                }));

                console.log(`Successfully transcribed and parsed ${subtitles.length} subtitle entries.`);

                this.setProjectState(prev => ({ // Use the setter
                    ...prev,
                    subtitles: subtitles,
                    selectedClipId: null,
                    uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00',
                }));
                message.success(`Transcription complete! Loaded ${subtitles.length} subtitle entries.`);
            } else {
                message.warning("Transcription completed, but no subtitle entries were returned.");
                this.setProjectState(prev => ({ // Use the setter
                    ...prev,
                    uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00',
                }));
            }

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown transcription error';
            console.error('❌ Transcription API failed:', errorMessage);
            message.error(`Transcription failed: ${errorMessage}`);

            this.setProjectState(prev => ({ // Use the setter
                ...prev,
                uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00',
            }));

        } finally {
            this.setEditorState('editor'); // Use the setter
            this.setProjectState(prev => ({ // Use the setter
                ...prev,
                currentUploadTaskId: null,
            }));
            this.setSelectedMenuKey('subtitles'); // Use the setter
        }
    }

    // --- Subtitle Style Handlers ---
    // These methods now accept necessary state/time/mediaElements to call drawFrame correctly
    public updateSubtitleFontFamily(font: string, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleFontFamily: font })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, subtitleFontFamily: font }, mediaElements); // Pass updated state for immediate redraw
    }

    public updateSubtitleFontSize(size: number, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleFontSize: size })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, subtitleFontSize: size }, mediaElements);
    }

    public updateSubtitleTextAlign(align: 'left' | 'center' | 'right', currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleTextAlign: align })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, subtitleTextAlign: align }, mediaElements);
    }

    public toggleSubtitleBold(currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, isSubtitleBold: !prev.isSubtitleBold })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, isSubtitleBold: !projectState.isSubtitleBold }, mediaElements);
    }

    public toggleSubtitleItalic(currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, isSubtitleItalic: !prev.isSubtitleItalic })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, isSubtitleItalic: !projectState.isSubtitleItalic }, mediaElements);
    }

    public toggleSubtitleUnderlined(currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, isSubtitleUnderlined: !prev.isSubtitleUnderlined })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, isSubtitleUnderlined: !projectState.isSubtitleUnderlined }, mediaElements);
    }

    public updateSubtitleColor(color: string, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleColor: color })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, subtitleColor: color }, mediaElements);
    }

    public updateSubtitleBackgroundColor(color: string, currentTime: number, projectState: ProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }): void {
        this.setProjectState(prev => ({ ...prev, subtitleBackgroundColor: color })); // Use the setter
        this.drawFrame(currentTime, { ...projectState, subtitleBackgroundColor: color }, mediaElements);
    }

    // Remove getDraggerProps from the class
    // It will be created in the main hook using useMemo and depend on this SubtitleManager instance
}