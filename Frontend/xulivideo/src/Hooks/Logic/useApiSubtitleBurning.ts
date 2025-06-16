import { useState, useRef, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import Swal from 'sweetalert2'; // Import SweetAlert2

// Import types and manager
import type { EditorProjectState, VideoClip, MediaAsset } from '../../Components/VideoPage/types'; // Adjust path as necessary, ensure VideoClip and MediaAsset types are exported if needed for clarity
import type { SubtitleManager } from './SubtitleManager'; // Adjust path as necessary

interface UseApiSubtitleBurningProps {
    currentPublicId: string;
    projectState: EditorProjectState; // projectState được truyền vào làm prop
    subtitleManager: SubtitleManager;
    websocketEndpoint: string;
    addSubtitleApiUrl: string; // The URL for the POST request, e.g., "http://localhost:8080/test/{publicProjectId}/subtitles"
    setProjectState: React.Dispatch<React.SetStateAction<EditorProjectState>>;
    selectedVideoSecureUrl: string | null; // Đường dẫn an toàn của video hiện đang được chọn/xem
}

export const useApiSubtitleBurning = ({
                                          currentPublicId,
                                          projectState, // Vẫn nhận projectState qua props
                                          subtitleManager,
                                          websocketEndpoint,
                                          addSubtitleApiUrl,
                                          setProjectState,
                                          selectedVideoSecureUrl, // Đường dẫn của video đang được chọn
                                      }: UseApiSubtitleBurningProps) => {
    const [isApiBurningSubtitles, setIsApiBurningSubtitles] = useState(false);
    const [apiBurningProgress, setApiBurningProgress] = useState(0);

    const apiStompClientRef = useRef<Client | null>(null);
    const apiStompSubscriptionRef = useRef<StompSubscription | null>(null);

    // Dùng useRef để lưu trữ projectState mới nhất
    // Điều này đảm bảo rằng các hàm bên trong useCallback (như callAddSubtitleApi)
    // luôn truy cập được giá trị projectState hiện tại nhất mà không cần
    // projectState trong dependency array của useCallback (giúp tránh re-render không cần thiết)
    const latestProjectStateRef = useRef<EditorProjectState>(projectState);

    useEffect(() => {
        // Cập nhật ref mỗi khi projectState từ props thay đổi
        latestProjectStateRef.current = projectState;
    }, [projectState]); // Chạy lại mỗi khi projectState thay đổi

    useEffect(() => {
        return () => {
            if (apiStompSubscriptionRef.current) {
                try {
                    apiStompSubscriptionRef.current.unsubscribe();
                } catch (e) {
                    console.warn("Error unsubscribing API STOMP on cleanup:", e);
                }
                apiStompSubscriptionRef.current = null;
            }
            if (apiStompClientRef.current?.active) {
                try {
                    apiStompClientRef.current.deactivate();
                } catch (e) {
                    console.warn("Error deactivating API STOMP on cleanup:", e);
                }
                apiStompClientRef.current = null;
            }
        };
    }, []);

    const callAddSubtitleApi = useCallback(async () => {
        // Lấy projectState mới nhất từ ref
        const currentProjectState = latestProjectStateRef.current;

        if (!currentPublicId) {
            message.error("Project ID is missing. Cannot add subtitles via API.");
            console.error("callAddSubtitleApi: currentPublicId is null.");
            return;
        }
        if (currentProjectState.subtitles.length === 0) { // Sử dụng currentProjectState
            message.warning("No subtitles to add. Please add or upload subtitles first.");
            console.warn("callAddSubtitleApi: currentProjectState.subtitles is empty.");
            return;
        }
        if (isApiBurningSubtitles) {
            message.warning("Subtitle burning via API is already in progress.");
            console.warn("callAddSubtitleApi: API subtitle burning already in progress.");
            return;
        }

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            message.error('Authentication required. Please log in.');
            console.error("callAddSubtitleApi: Access token is missing.");
            return;
        }

        setIsApiBurningSubtitles(true);
        setApiBurningProgress(0);
        console.log("Starting API call to add subtitles to video...");
        message.info("Generating ASS content and preparing for API call...");

        try {
            // 2. Generate ASS content từ currentProjectState (giá trị mới nhất)
            const assContent = subtitleManager.generateAssContent(currentProjectState);
            console.log("Generated ASS content. Length:", assContent.length, "bytes.");

            // --- THÊM DÒNG NÀY ĐỂ IN RA NỘI DUNG FILE ASS ---
            console.log("--- Generated ASS Subtitle Content (before sending to API) ---");
            console.log(assContent);
            console.log("------------------------------------------------------------------");
            // --------------------------------------------------

            // 3. Create a Blob (which acts like a File) from the ASS content
            const subtitleBlob = new Blob([assContent], { type: 'text/plain' });
            const subtitleFile = new File([subtitleBlob], 'generated_subtitles.ass', { type: 'text/plain' });

            // 4. Prepare FormData for the API call
            const formData = new FormData();
            formData.append('file', subtitleFile);

            // Bổ sung currentPublicId vào URL
            const apiUrlWithProjectId = addSubtitleApiUrl.replace('{publicProjectId}', currentPublicId);

            console.log(`Sending ASS file to ${apiUrlWithProjectId} for project ${currentPublicId}...`);

            const response = await axios.post<{ url: string }>(apiUrlWithProjectId, formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const taskId = response.data.url;

            if (!taskId || typeof taskId !== 'string') {
                message.error("API call initiated, but failed to get a valid task ID for subtitle burning.");
                console.error("callAddSubtitleApi: Received invalid taskId from backend:", response.data);
                setIsApiBurningSubtitles(false);
                setApiBurningProgress(0);
                return;
            }

            console.log(`Received taskId for API subtitle burning: ${taskId}. Setting up WebSocket listener...`);
            message.info(`Server started processing subtitles. Task ID: ${taskId}`);

            // Cleanup any existing WebSocket connections before establishing a new one
            if (apiStompSubscriptionRef.current) {
                try { apiStompSubscriptionRef.current.unsubscribe(); } catch (e) { console.warn("Error unsubscribing old API STOMP:", e); }
                apiStompSubscriptionRef.current = null;
            }
            if (apiStompClientRef.current?.active) {
                try { apiStompClientRef.current.deactivate(); } catch (e) { console.warn("Error deactivating old API STOMP:", e); }
                apiStompClientRef.current = null;
            }

            const client = new Client({
                webSocketFactory: () => new SockJS(websocketEndpoint),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (str) => { /* console.log(`STOMP DEBUG (API Subtitle Burning - ${taskId}):`, str); */ },
                onConnect: (_frame) => {
                    console.log(`STOMP connected for API subtitle burning task ${taskId}. Subscribing to /topic/progress/${taskId}...`);
                    const topic = `/topic/progress/${taskId}`;
                    const subscription = client.subscribe(topic, (stompMessage: IMessage) => {
                        try {
                            const data = JSON.parse(stompMessage.body);
                            const serverProgress = typeof data.progress === 'number' ? data.progress : -1;

                            if (data.status === 'complete') {
                                const newVideoUrl = data.result;
                                if (newVideoUrl) {
                                    console.log(`--- API Subtitle Burning Complete ---`);
                                    console.log(`New video URL: ${newVideoUrl}`); // Yêu cầu in ra console đường dẫn mới

                                    // Thay thế message.success bằng SweetAlert2
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Thêm phụ đề thành công!',
                                        html: `Video đã được cập nhật với phụ đề mới.<br>Đường dẫn mới: <a href="${newVideoUrl}" target="_blank" rel="noopener noreferrer" style="word-break: break-all;">${newVideoUrl}</a>`,
                                        confirmButtonText: 'Đóng'
                                    });

                                    // Cập nhật URL video trong projectState
                                    setProjectState(prev => {
                                        // Xác định video gốc cần được cập nhật
                                        // Ưu tiên selectedVideoSecureUrl nếu có, nếu không, lấy secureUrl của clip video đầu tiên trong track đầu tiên
                                        // Đây là giả định rằng nếu không có video nào được chọn, thì video đầu tiên là mục tiêu.
                                        const targetOriginalUrl = selectedVideoSecureUrl || prev.tracks?.[0]?.clips?.find((c): c is VideoClip => c.type === 'video')?.secureUrl;

                                        if (!targetOriginalUrl) {
                                            console.warn("Could not determine original video URL to update in projectState. The new video URL will not be applied to the current project state.");
                                            return prev; // Trả về trạng thái cũ nếu không tìm thấy video mục tiêu
                                        }

                                        const updatedTracks = prev.tracks.map(track => ({
                                            ...track,
                                            clips: track.clips.map(clip => {
                                                // Chỉ cập nhật clip video có secureUrl khớp với targetOriginalUrl
                                                if (clip.type === 'video' && clip.secureUrl === targetOriginalUrl) {
                                                    return { ...clip, source: newVideoUrl, secureUrl: newVideoUrl };
                                                }
                                                return clip;
                                            })
                                        }));

                                        const updatedMediaAssets = prev.mediaAssets.map(asset => {
                                            // Chỉ cập nhật asset video có secureUrl khớp với targetOriginalUrl
                                            if (asset.type.startsWith('video/') && asset.secureUrl === targetOriginalUrl) {
                                                return { ...asset, secureUrl: newVideoUrl };
                                            }
                                            return asset;
                                        });

                                        return { ...prev, tracks: updatedTracks, mediaAssets: updatedMediaAssets,
                                            areSubtitlesVisibleOnCanvas: false,};
                                    });

                                } else {
                                    message.error("API subtitle burning complete, but new video URL is missing.");
                                    console.error("callAddSubtitleApi: 'complete' status received, but data.result (newVideoUrl) is null/undefined.");
                                }
                                setIsApiBurningSubtitles(false);
                                setApiBurningProgress(100);
                                if (apiStompSubscriptionRef.current) apiStompSubscriptionRef.current.unsubscribe();
                                if (apiStompClientRef.current?.active) apiStompClientRef.current.deactivate().catch(e => console.warn("Error deactivating STOMP on completion:", e));
                                apiStompClientRef.current = null;
                                apiStompSubscriptionRef.current = null;

                            } else if (data.status === 'error') {
                                console.error(`--- API Subtitle Burning Error ---`);
                                console.error(`Message: ${data.message || 'Unknown error'}. Details:`, data.error);
                                message.error(data.message || `API subtitle burning failed: ${data.error || 'Unknown error'}`);
                                setIsApiBurningSubtitles(false);
                                setApiBurningProgress(0);
                                if (apiStompSubscriptionRef.current) apiStompSubscriptionRef.current.unsubscribe();
                                if (apiStompClientRef.current?.active) apiStompClientRef.current.deactivate().catch(e => console.warn("Error deactivating STOMP on error:", e));
                                apiStompClientRef.current = null;
                                apiStompSubscriptionRef.current = null;

                            } else if (data.progress !== undefined) {
                                console.log(`API Subtitle Burning Progress: ${serverProgress}% - ${data.message || ''}`); // Yêu cầu in ra console tiến trình
                                setApiBurningProgress(serverProgress);
                            }

                        } catch (e: any) {
                            console.error(`Error handling API subtitle burning server update: ${e.message}. Raw data: ${stompMessage.body}`, e);
                            message.error(`Error processing server update for subtitle burning: ${e.message}`);
                            setIsApiBurningSubtitles(false);
                            setApiBurningProgress(0);
                            if (apiStompSubscriptionRef.current) apiStompSubscriptionRef.current.unsubscribe();
                            if (apiStompClientRef.current?.active) apiStompClientRef.current.deactivate().catch(e => console.warn("Error deactivating STOMP on message parse error:", e));
                            apiStompClientRef.current = null;
                            apiStompSubscriptionRef.current = null;
                        }
                    });
                    apiStompSubscriptionRef.current = subscription;
                    console.log(`Subscribed to ${topic}`);
                },
                onStompError: (_frame) => {
                    console.error(`WebSocket STOMP error during API subtitle burning for task ${taskId}.`, _frame);
                    message.error(`WebSocket STOMP error during API subtitle burning.`);
                    setIsApiBurningSubtitles(false);
                    setApiBurningProgress(0);
                    apiStompClientRef.current = null;
                    apiStompSubscriptionRef.current = null;
                },
                onWebSocketError: (_event) => {
                    console.error(`WebSocket connection for API subtitle burning (task ${taskId}) failed.`, _event);
                    message.error(`WebSocket connection for API subtitle burning failed.`);
                    setIsApiBurningSubtitles(false);
                    setApiBurningProgress(0);
                    apiStompClientRef.current = null;
                    apiStompSubscriptionRef.current = null;
                },
            });
            apiStompClientRef.current = client;
            client.activate();

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Unknown API subtitle burning error';
            console.error(`API Subtitle Burning request failed: ${errorMessage}`, error);
            message.error(`API subtitle burning request failed: ${errorMessage}`);
            setIsApiBurningSubtitles(false);
            setApiBurningProgress(0);
        }
    }, [
        currentPublicId,
        subtitleManager,
        websocketEndpoint,
        addSubtitleApiUrl,
        setProjectState,
        selectedVideoSecureUrl, // GIỮ LẠI dependency này vì nó quan trọng để xác định video cần cập nhật
        isApiBurningSubtitles // Vẫn cần isApiBurningSubtitles để kiểm tra điều kiện trùng lặp
    ]);

    return {
        isApiBurningSubtitles,
        apiBurningProgress,
        callAddSubtitleApi,
    };
};