// src/Hooks/Logic/UploadManager.ts

import { Dispatch, SetStateAction, RefObject } from 'react';
import { message } from 'antd';
import type { AxiosProgressEvent } from 'axios';
import axios from "axios";
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from "sockjs-client";
import type { EditorProjectState } from "../../Components/VideoPage/types"; // Import other types

// Define EditorState locally to match useVideoEditorLogic.ts
// This is the type this manager will work with for its setEditorState.
type ManagerEditorState = 'initial' | 'uploading' | 'transcribing' | 'processing_video' | 'editor';

type ProjectState = EditorProjectState;
type OnProcessMediaFinishCallback = (file: File, secureUrl: string, originalFileName: string) => void;

export class UploadManager {
    private setProjectState: Dispatch<SetStateAction<ProjectState>>;
    // setEditorState now uses the locally defined ManagerEditorState
    private setEditorState: Dispatch<SetStateAction<ManagerEditorState>>;
    private uploadUrl: string;
    private websocketEndpoint: string;
    private uploadStartTimeRef: RefObject<number | null>;
    private stompClientRef: RefObject<Client | null>;
    private stompSubscriptionRef: RefObject<StompSubscription | null>;
    private onProcessMediaFinish: OnProcessMediaFinishCallback;

    constructor(
        setProjectState: Dispatch<SetStateAction<ProjectState>>,
        setEditorState: Dispatch<SetStateAction<ManagerEditorState>>, // Type updated here
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
        if (!files || files.length === 0) { event.target.value = ''; return; }
        const file = files[0];
        const originalFileName = file.name;

        // --- NEW: Add the desired prefix to the filename for logging ---
        const simulatedLocalPath = `C:\\Users\\ADMIN\\Videos\\${originalFileName}`;
        console.log(`User selected local file: ${simulatedLocalPath} (Type: ${file.type}, Size: ${file.size} bytes)`);
        console.warn("Note: The path above is simulated. Browsers do not allow access to the full local file path for security reasons.");
        // --- END NEW ---

        if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
            message.error(`${originalFileName} is not a supported video or image file.`);
            event.target.value = ''; return;
        }

        // All calls to setEditorState must use values from ManagerEditorState
        this.setEditorState('uploading'); // 'uploading' is in ManagerEditorState
        const uploadTaskId = `upload-task-${Date.now()}`;
        this.uploadStartTimeRef.current = Date.now();
        this.setProjectState(prev => ({ ...prev, uploadProgress: 0, uploadingFile: originalFileName, currentUploadTaskId: uploadTaskId, uploadTimeRemaining: '00:00', }));
        const formData = new FormData();
        formData.append('file', file);
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            message.error('Access token is missing! Cannot proceed with upload.');
            event.target.value = ''; this.resetUploadState(); this.setEditorState('initial'); return;
        }
        try {
            const response = await axios.post(this.uploadUrl, formData, {
                headers: {Authorization: `Bearer ${accessToken}`},
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    const loaded = progressEvent.loaded ?? 0; const total = progressEvent.total ?? 1;
                    const percent = Math.round((loaded * 100) / total);
                    const now = Date.now(); const startTime = this.uploadStartTimeRef.current;
                    let timeRemainingFormatted = 'Estimating...';
                    if (startTime !== null && loaded > 0 && total > 0 && percent < 100) {
                        const elapsedMs = now - startTime; const speedBytesPerMs = loaded / elapsedMs;
                        if (speedBytesPerMs > 0) {
                            const remainingBytes = total - loaded; const remainingMs = remainingBytes / speedBytesPerMs;
                            const totalSecondsLeft = Math.max(0, Math.round(remainingMs / 1000));
                            const minutes = Math.floor(totalSecondsLeft / 60).toString().padStart(2, '0');
                            const seconds = (totalSecondsLeft % 60).toString().padStart(2, '0');
                            timeRemainingFormatted = `${minutes}:${seconds}`;
                        } else { timeRemainingFormatted = 'Stalled'; }
                    } else if (percent === 100) { timeRemainingFormatted = 'Processing...'; }
                    this.setProjectState(prev => ({ ...prev, uploadProgress: percent, uploadTimeRemaining: timeRemainingFormatted, }));
                }
            });
            const taskId = response.data;
            if (!taskId || typeof taskId !== 'string') {
                message.error("Upload completed, but failed to initiate server processing.");
                this.resetUploadState(); this.setEditorState('editor'); return;
            }
            this.setProjectState(prev => ({...prev, currentUploadTaskId: taskId, uploadTimeRemaining: 'Waiting for server...'}));
            const client = new Client({ webSocketFactory: () => new SockJS(this.websocketEndpoint), reconnectDelay: 5000, heartbeatIncoming: 4000, heartbeatOutgoing: 4000, debug: (str) => { console.log('STOMP DEBUG:', str); }, });
            this.stompClientRef.current = client;
            client.onConnect = (_frame) => {
                const topic = `/topic/progress/${taskId}`;
                const subscription = client.subscribe(topic, (stompMessage: IMessage) => {
                    try {
                        const data = JSON.parse(stompMessage.body);
                        if (data && typeof data.progress === 'number') this.setProjectState(prev => ({...prev, uploadProgress: data.progress, uploadingFile: `Processing: ${originalFileName}`}));
                        if (data.status === 'complete') {
                            if (data.result && data.result.secureUrl) {
                                this.onProcessMediaFinish(file, data.result.secureUrl, originalFileName);
                                message.success(`${originalFileName} processed successfully.`);
                            } else message.error(`Processing for ${originalFileName} finished, but key data is missing.`);
                            this.resetUploadState(); this.setEditorState('editor'); this.cleanupWebSocket();
                        } else if (data.status === 'error') {
                            message.error(`Error processing ${originalFileName} on server: ${data.message || 'Unknown error'}`);
                            this.resetUploadState(); this.setEditorState('editor'); this.cleanupWebSocket();
                        }
                    } catch (e) {
                        message.error(`Error handling server update for ${originalFileName}.`);
                        this.resetUploadState(); this.setEditorState('editor'); this.cleanupWebSocket();
                    }
                });
                this.stompSubscriptionRef.current = subscription;
            };
            client.onStompError = (_frame) => { message.error('WebSocket communication error during server processing.'); this.resetUploadState(); this.setEditorState('editor'); this.cleanupWebSocket(); };
            client.onWebSocketError = (_event) => { message.error('WebSocket connection to server failed.'); this.resetUploadState(); this.setEditorState('editor'); this.cleanupWebSocket(); };
            client.activate();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown upload error';
            message.error(`Upload of ${originalFileName} failed: ${errorMessage}`);
            this.resetUploadState(); this.setEditorState('initial');
        } finally { event.target.value = ''; }
    };

    private resetUploadState(): void {
        this.setProjectState(prev => ({ ...prev, uploadProgress: 0, uploadingFile: null, uploadTimeRemaining: '00:00', }));
        this.uploadStartTimeRef.current = null;
    }

    private cleanupWebSocket(): void {
        if (this.stompSubscriptionRef.current) {
            try { this.stompSubscriptionRef.current.unsubscribe(); } catch (e) { console.warn("Error unsubscribing STOMP:", e); }
            this.stompSubscriptionRef.current = null;
        }
        if (this.stompClientRef.current?.active) {
            this.stompClientRef.current.deactivate().catch(e => console.warn("Error deactivating STOMP:", e));
        }
        this.stompClientRef.current = null;
    }
}