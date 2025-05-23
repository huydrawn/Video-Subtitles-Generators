// src/Hooks/Logic/UploadManager.ts
import { Dispatch, SetStateAction, RefObject } from 'react';
import { message } from 'antd';
// import type { UploadProps } from 'antd'; // Không cần thiết nếu không dùng Upload component trực tiếp ở đây
import type { AxiosProgressEvent } from 'axios';
import axios from "axios"; // Đảm bảo import axios
import { Client, IMessage, StompSubscription } from '@stomp/stompjs'; // Đảm bảo import Stomp types
import SockJS from "sockjs-client"; // Đảm bảo import SockJS
// import { PREVIEW_ZOOM_FIT_MODE, PREVIEW_ZOOM_FILL_MODE } from '../constants'; // Không cần thiết ở đây
import { EditorProjectState } from "../../Components/VideoPage/types"; // Đường dẫn có thể cần điều chỉnh

type EditorState = 'initial' | 'uploading' | 'transcribing' | 'editor';
type ProjectState = EditorProjectState; // Alias for clarity

// SỬA Ở ĐÂY: Cập nhật kiểu OnProcessMediaFinishCallback
type OnProcessMediaFinishCallback = (file: File, secureUrl: string, originalFileName: string) => void;


export class UploadManager {
    private setProjectState: Dispatch<SetStateAction<ProjectState>>;
    private setEditorState: Dispatch<SetStateAction<EditorState>>;
    private uploadUrl: string;
    private websocketEndpoint: string;
    private uploadStartTimeRef: RefObject<number | null>;
    private stompClientRef: RefObject<Client | null>;
    private stompSubscriptionRef: RefObject<StompSubscription | null>;
    private onProcessMediaFinish: OnProcessMediaFinishCallback;

    constructor(
        setProjectState: Dispatch<SetStateAction<ProjectState>>,
        setEditorState: Dispatch<SetStateAction<EditorState>>,
        uploadUrl: string,
        websocketEndpoint: string,
        uploadStartTimeRef: RefObject<number | null>,
        stompClientRef: RefObject<Client | null>,
        stompSubscriptionRef: RefObject<StompSubscription | null>,
        onProcessMediaFinish: OnProcessMediaFinishCallback
    ) {
        this.setProjectState = setProjectState;
        this.setEditorState = setEditorState;
        this.uploadUrl = uploadUrl;
        this.websocketEndpoint = websocketEndpoint;
        this.uploadStartTimeRef = uploadStartTimeRef;
        this.stompClientRef = stompClientRef;
        this.stompSubscriptionRef = stompSubscriptionRef;
        this.onProcessMediaFinish = onProcessMediaFinish;
    }

    public handleManualMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            event.target.value = '';
            return;
        }

        const file = files[0];
        const originalFileName = file.name; // Lưu tên file gốc
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            message.error(`${file.name} is not a supported video or image file.`);
            event.target.value = '';
            return;
        }

        this.setEditorState('uploading');
        const uploadTaskId = `upload-task-${Date.now()}`;
        this.uploadStartTimeRef.current = Date.now();

        this.setProjectState(prev => ({
            ...prev,
            uploadProgress: 0,
            uploadingFile: originalFileName, // Sử dụng tên file gốc
            currentUploadTaskId: uploadTaskId,
            uploadTimeRemaining: '00:00',
        }));

        const formData = new FormData();
        formData.append('file', file);

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            message.error('Access token is missing!');
            event.target.value = '';
            this.resetUploadState();
            this.setEditorState('initial');
            return;
        }

        try {
            const response = await axios.post(this.uploadUrl, formData, {
                headers: {Authorization: `Bearer ${accessToken}`},
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    const uploaded = progressEvent.loaded ?? 0;
                    const total = progressEvent.total ?? 1;
                    const percent = Math.round((uploaded * 100) / total);
                    const now = Date.now();
                    const startTime = this.uploadStartTimeRef.current;
                    let timeRemainingFormatted = '00:00';
                    if (startTime !== null && uploaded > 0 && total > 0 && percent < 100) {
                        const elapsed = now - startTime;
                        const estimatedTotalTime = (elapsed / uploaded) * total;
                        const timeLeft = Math.max(0, estimatedTotalTime - elapsed);
                        const totalSeconds = Math.max(0, Math.round(timeLeft / 1000));
                        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
                        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
                        timeRemainingFormatted = `${minutes}:${seconds}`;
                    }
                    this.setProjectState(prev => ({
                        ...prev,
                        uploadProgress: percent,
                        uploadTimeRemaining: timeRemainingFormatted,
                    }));
                }
            });

            const taskId = response.data;
            if (!taskId) {
                console.error("Backend did not return a task ID after upload.");
                message.error("Upload failed to initiate processing.");
                this.resetUploadState();
                this.setEditorState('initial');
                return;
            }
            console.log('✅ Upload initiated. Task ID:', taskId);
            this.setProjectState(prev => ({...prev, currentUploadTaskId: taskId}));

            const client = new Client({
                webSocketFactory: () => new SockJS(this.websocketEndpoint),
                reconnectDelay: 5000, heartbeatIncoming: 4000, heartbeatOutgoing: 4000,
            });
            this.stompClientRef.current = client;

            client.onConnect = (frame) => {
                console.log('🚀 Connected to WebSocket for task', taskId, frame);
                const topic = `/topic/progress/${taskId}`;
                const subscription = client.subscribe(topic, (wsMessage: IMessage) => { // đổi tên biến để tránh trùng
                    try {
                        const data = JSON.parse(wsMessage.body); // sử dụng wsMessage
                        console.log('📨 WS Message for task', taskId, ':', data);
                        if (data && typeof data.progress === 'number') {
                            this.setProjectState(prev => ({...prev, uploadProgress: data.progress}));
                        }
                        if (data.status === 'complete') {
                            console.log('✅ Backend processing complete for task', taskId);
                            if (data.result && data.result.secureUrl) {
                                console.log('🎥 Media secure URL:', data.result.secureUrl);
                                // SỬA Ở ĐÂY: Truyền originalFileName
                                this.onProcessMediaFinish(file, data.result.secureUrl, originalFileName);
                                this.resetUploadState();
                                this.setEditorState('editor');
                            } else {
                                console.error('❌ Backend processing complete but secureUrl is missing:', data);
                                this.resetUploadState();
                                this.setEditorState('editor');
                            }
                            this.cleanupWebSocket();
                        } else if (data.status === 'error') {
                            console.error('❌ Backend processing error for task', taskId, ':', data.message || 'Unknown error');
                            this.resetUploadState();
                            this.setEditorState('editor');
                            this.cleanupWebSocket();
                        }
                    } catch (e) {
                        console.error('❌ Error processing WebSocket message for task', taskId, ':', e);
                        this.resetUploadState();
                        this.setEditorState('editor');
                        this.cleanupWebSocket();
                    }
                });
                this.stompSubscriptionRef.current = subscription;
            };

            client.onStompError = (frame) => {
                console.error('❌ STOMP error for task', taskId, ':', frame);
                message.error('WebSocket STOMP error during processing.');
                this.resetUploadState();
                this.setEditorState('editor');
                this.cleanupWebSocket();
            };

            client.onWebSocketError = (event) => {
                console.error('❌ WebSocket failed for task', taskId, ':', event);
                message.error('WebSocket connection failed during processing.');
                this.resetUploadState();
                this.setEditorState('editor');
                this.cleanupWebSocket();
            };

            client.activate();

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown upload error';
            console.error('❌ HTTP Upload failed:', errorMessage);
            message.error(`Upload failed: ${errorMessage}`);
            this.resetUploadState();
            this.setEditorState('initial');
        } finally {
            event.target.value = '';
        }
    };

    private resetUploadState(): void {
        this.setProjectState(prev => ({
            ...prev,
            uploadProgress: 0,
            uploadingFile: null,
            currentUploadTaskId: null,
            uploadTimeRemaining: '00:00',
        }));
        this.uploadStartTimeRef.current = null;
    }

    private cleanupWebSocket(): void {
        if (this.stompSubscriptionRef.current) {
            this.stompSubscriptionRef.current.unsubscribe();
            this.stompSubscriptionRef.current = null;
        }
        if (this.stompClientRef.current && this.stompClientRef.current.active) {
            this.stompClientRef.current.deactivate();
        }
        this.stompClientRef.current = null;
    }
}