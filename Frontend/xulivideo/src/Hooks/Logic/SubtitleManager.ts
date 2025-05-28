
import { Dispatch, SetStateAction } from 'react';
import { message } from 'antd';
import axios from "axios";
import type {
    EditorProjectState,
    SrtSegment,
    SubtitleEntry,
    Track,
    Clip,
    SubtitleTextAlign
} from '../../Components/VideoPage/types'; // Điều chỉnh đường dẫn nếu cần
import {
    parseTimecodeToSeconds,
    calculateTotalDuration,
    formatTimeToAss,
    convertColorToAss,
    getAssAlignment
} from '../../Components/VideoPage/utils'; // Điều chỉnh đường dẫn nếu cần


type ManagerEditorState = 'initial' | 'uploading' | 'transcribing' | 'processing_video' | 'editor';
type ProjectState = EditorProjectState;
type DrawFrameFunc = (time: number, projectState: EditorProjectState, mediaElements: { [key: string]: HTMLVideoElement | HTMLImageElement }) => void;

// === THAY ĐỔI: Định nghĩa kiểu cho callback tiến trình ===
type TranscriptionProgressCallback = (progress: number, fileName?: string) => void;
// === KẾT THÚC THAY ĐỔI ===

export class SubtitleManager {
    setProjectState: Dispatch<SetStateAction<ProjectState>>;
    setEditorState: Dispatch<SetStateAction<ManagerEditorState>>;
    private setSelectedMenuKey: Dispatch<SetStateAction<string>>;
    private drawFrame: DrawFrameFunc;
    private parseTimecodeToSecondsUtil: (timecode: string) => number;
    private calculateTotalDurationUtil: (tracks: Track[]) => number;
    private transcriptionUrl: string;
    // === THAY ĐỔI: Thêm thuộc tính cho callback ===
    private onProgress: TranscriptionProgressCallback;
    // === KẾT THÚC THAY ĐỔI ===

    constructor(
        setProjectState: Dispatch<SetStateAction<ProjectState>>,
        setEditorState: Dispatch<SetStateAction<ManagerEditorState>>,
        setSelectedMenuKey: Dispatch<SetStateAction<string>>,
        drawFrame: DrawFrameFunc,
        parseTimecodeToSecondsUtil: (timecode: string) => number,
        calculateTotalDurationUtil: (tracks: Track[]) => number,
        transcriptionUrl: string,
        // === THAY ĐỔI: Thêm tham số callback vào constructor ===
        onProgressCallback: TranscriptionProgressCallback
        // === KẾT THÚC THAY ĐỔI ===
    ) {
        this.setProjectState = setProjectState;
        this.setEditorState = setEditorState;
        this.setSelectedMenuKey = setSelectedMenuKey;
        this.drawFrame = drawFrame;
        this.parseTimecodeToSecondsUtil = parseTimecodeToSecondsUtil;
        this.calculateTotalDurationUtil = calculateTotalDurationUtil;
        this.transcriptionUrl = transcriptionUrl;
        // === THAY ĐỔI: Lưu callback ===
        this.onProgress = onProgressCallback;
        // === KẾT THÚC THAY ĐỔI ===
    }

    public handleUploadSrt = (file: File, _currentProjectState: ProjectState): void => {
        console.log("SubtitleManager: Handling SRT/VTT upload:", file.name);
        message.info(`Processing subtitle file: ${file.name}`);

        this.setProjectState(prev => ({
            ...prev,
            uploadProgress: 0,
            uploadingFile: `Parsing subtitles: ${file.name}`,
            currentUploadTaskId: `subtitle-parse-${Date.now()}`,
            uploadTimeRemaining: '...',
        }));
        this.setEditorState('uploading'); // Vẫn dùng setEditorState cho upload file srt

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
            this.setProjectState(prev => ({
                ...prev, subtitles: subtitles, totalDuration: this.calculateTotalDurationUtil(prev.tracks),
                selectedClipId: null, uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00',
            }));
            if (subtitles.length > 0) message.success(`Successfully loaded ${subtitles.length} subtitle entries.`);
            else message.warning("No valid subtitle entries found in the file.");

            this.setEditorState('editor'); // Trả về editor state sau khi parse xong
            this.setSelectedMenuKey('subtitles');
        };
        reader.onerror = (_e) => {
            message.error("Failed to read subtitle file.");
            this.setProjectState(prev => ({ ...prev, uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00' }));
            this.setEditorState('editor');
            this.setSelectedMenuKey('subtitles');
        };
        reader.readAsText(file);
    }

    public handleStartFromScratch = async (
        selectedClip: Clip | null,
        selectedVideoSecureUrl: string | null,
        currentTime: number,
        currentProjectState: ProjectState
    ): Promise<void> => {
        if (!selectedClip || selectedClip.type !== 'video' || !selectedVideoSecureUrl) {
            message.info("No video clip selected for transcription. Starting with an empty subtitle entry.");
            this.setSelectedMenuKey('subtitles');
            if (currentProjectState.subtitles.length === 0) {
                this.setProjectState(prev => ({ ...prev, subtitles: [{ id: `subtitle-${Date.now()}`, startTime: currentTime, endTime: currentTime + 3, text: "" }], selectedClipId: null, }));
            } else {
                this.setProjectState(prev => ({ ...prev, selectedClipId: null }));
            }
            return;
        }
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            message.error('Access token is missing! Cannot start transcription.');
            this.setSelectedMenuKey('subtitles'); return;
        }

        const fileNameForTranscription = selectedClip.name || 'Selected Video';
        message.info(`Starting transcription for ${fileNameForTranscription}...`);

        // Không set projectState cho uploadProgress, uploadingFile, currentUploadTaskId ở đây nữa
        // vì chúng ta đã có state riêng isTranscribing, transcriptionProgress, transcribingFileName trong useVideoEditorLogic
        this.setSelectedMenuKey('subtitles');

        // === THAY ĐỔI: Gọi callback tiến trình ===
        this.onProgress(0, fileNameForTranscription); // Khởi tạo
        console.log("Progress: 0% - Khởi tạo");
        this.onProgress(5, fileNameForTranscription);  // Chuẩn bị
        console.log("Progress: 5% - Chuẩn bị gửi yêu cầu đến API");
        // === KẾT THÚC THAY ĐỔI ===

        try {
            // === THAY ĐỔI: Gọi callback tiến trình ===
            this.onProgress(15, fileNameForTranscription); // Đang gửi
            console.log("Progress: 15% - Đang gửi yêu cầu transcribe");
            // === KẾT THÚC THAY ĐỔI ===

            const response = await axios.post<SrtSegment[]>(this.transcriptionUrl, { url: selectedVideoSecureUrl, language: 'en' }, { headers: { Authorization: `Bearer ${accessToken}` }, });

            // === THAY ĐỔI: Gọi callback tiến trình ===
            this.onProgress(60, fileNameForTranscription); // Nhận phản hồi
            console.log("Progress: 60% - Nhận phản hồi thành công");
            // === KẾT THÚC THAY ĐỔI ===

            console.log("Dữ liệu SRT thô từ API:", response.data);

            const srtSegments = response.data;
            if (srtSegments && srtSegments.length > 0) {
                const subtitles: SubtitleEntry[] = srtSegments.map((segment, index) => ({ id: `subtitle-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`, startTime: this.parseTimecodeToSecondsUtil(segment.start), endTime: this.parseTimecodeToSecondsUtil(segment.end), text: segment.text }));

                // === THAY ĐỔI: Gọi callback tiến trình ===
                this.onProgress(75, fileNameForTranscription); // Xử lý phụ đề
                console.log("Progress: 75% - Xử lý phụ đề");
                // === KẾT THÚC THAY ĐỔI ===
                console.log("Phụ đề đã xử lý:", subtitles);

                this.setProjectState(prev => ({
                    ...prev,
                    subtitles: subtitles,
                    selectedClipId: null,
                }));
                message.success(`Transcription complete! Loaded ${subtitles.length} subtitle entries.`);
            } else {
                message.warning("Transcription completed, but no subtitle entries were returned.");
                this.setProjectState(prev => ({ ...prev }));
            }
            // === THAY ĐỔI: Gọi callback tiến trình ===
            this.onProgress(100, fileNameForTranscription); // Hoàn tất
            console.log("Progress: 100% - Hoàn tất");
            // === KẾT THÚC THAY ĐỔI ===
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown transcription error';
            message.error(`Transcription failed: ${errorMessage}`);
            console.error("Lỗi phiên âm:", error);
            this.setProjectState(prev => ({ ...prev }));
            // === THAY ĐỔI: Gọi callback với giá trị âm để báo lỗi và reset ===
            this.onProgress(-1, fileNameForTranscription); // Báo lỗi
            // === KẾT THÚC THAY ĐỔI ===
        } finally {
            // Không cần this.setEditorState('editor') ở đây nữa
            this.setSelectedMenuKey('subtitles');
        }
    }

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
        const eventLines = subtitles.map(sub => {
            const start = formatTimeToAss(sub.startTime);
            const end = formatTimeToAss(sub.endTime);
            const text = sub.text.replace(/\n/g, '\\N'); // ASS uses \N for newlines
            return `Dialogue: ${start},${end},Default,${text}`;
        }).join('\n');
        const events = `[Events]\n${eventsFormat}\n${eventLines}\n`;
        return `${scriptInfo}\n${styles}\n${events}`;
    }
}