// src/Hooks/Logic/MediaElementManager.ts

import { RefObject, Dispatch, SetStateAction } from 'react';
import type { EditorProjectState, Clip, Track, ThumbnailInfo } from '../../Components/VideoPage/types';
// calculateTotalDuration sẽ được truyền vào constructor
import { message } from 'antd';

type MediaElementsRefValue = { [key: string]: HTMLVideoElement | HTMLImageElement };
type GenerateThumbnailsFunc = (clipId: string, videoElement: HTMLVideoElement) => Promise<ThumbnailInfo[]>;

export class MediaElementManager {
    private mediaElementsRef: RefObject<MediaElementsRefValue>;
    private setProjectState: Dispatch<SetStateAction<EditorProjectState>>;
    private calculateTotalDuration: (tracks: Track[]) => number;
    private generateThumbnailsForClip: GenerateThumbnailsFunc;

    constructor(
        mediaElementsRef: RefObject<MediaElementsRefValue>,
        setProjectState: Dispatch<SetStateAction<EditorProjectState>>,
        calculateTotalDuration: (tracks: Track[]) => number,
        generateThumbnailsForClip: GenerateThumbnailsFunc
    ) {
        this.mediaElementsRef = mediaElementsRef;
        this.setProjectState = setProjectState;
        this.calculateTotalDuration = calculateTotalDuration;
        this.generateThumbnailsForClip = generateThumbnailsForClip;
    }

    public syncMediaElements(
        currentProjectState: EditorProjectState,
        mediaElements: MediaElementsRefValue, // This is mediaElementsRef.current
        currentTime: number,
    ): void {
        const currentClipIds = new Set(currentProjectState.tracks.flatMap(t => t.clips.map(c => c.id)));

        currentProjectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const isSubtitleClip = clip.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === clip.id);

                // Determine the source URL: prioritize secureUrl, then source (for blobs)
                const sourceToUse = clip.secureUrl || (typeof clip.source === 'string' ? clip.source : undefined);


                if (!isSubtitleClip && (clip.type === 'video' || clip.type === 'image') && sourceToUse && (sourceToUse.startsWith('blob:') || sourceToUse.startsWith('http'))) {
                    const existingElement = mediaElements[clip.id];

                    if (!existingElement ||
                        (clip.type === 'video' && !(existingElement instanceof HTMLVideoElement)) ||
                        (clip.type === 'image' && !(existingElement instanceof HTMLImageElement)) ||
                        (existingElement.src !== sourceToUse)
                    ) {
                        if (existingElement) {
                            if (existingElement instanceof HTMLVideoElement) {
                                existingElement.pause();
                                existingElement.removeAttribute('src');
                                existingElement.load();
                            }
                            if (existingElement.src && existingElement.src.startsWith('blob:')) {
                                URL.revokeObjectURL(existingElement.src);
                            }
                            if (existingElement.parentNode === document.body) existingElement.remove();
                            delete mediaElements[clip.id];
                            console.log(`Cleaned up old media element for ${clip.id}`);
                        }

                        if (clip.type === 'video') {
                            const video = document.createElement('video');
                            video.muted = currentProjectState.isPreviewMuted;
                            video.playbackRate = currentProjectState.playbackRate;
                            video.preload = 'metadata';
                            video.crossOrigin = 'anonymous'; // Important for external URLs and canvas
                            video.src = sourceToUse;
                            video.id = clip.id; // For thumbnail generation reference
                            video.style.cssText = `position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; top: -10px; left: -10px; overflow: hidden;`;

                            video.onloadedmetadata = async () => {
                                if (!this.mediaElementsRef.current || this.mediaElementsRef.current[clip.id] !== video || !currentClipIds.has(clip.id)) {
                                    if (video.parentNode === document.body) video.remove();
                                    return;
                                }

                                const actualDuration = video.duration;
                                const videoWidth = video.videoWidth;
                                const videoHeight = video.videoHeight;
                                console.log(`Video metadata loaded for ${clip.name || clip.id} (src: ${video.src.substring(0,60)}): dur=${actualDuration}, dim=${videoWidth}x${videoHeight}`);


                                const clipFromState = currentProjectState.tracks.flatMap(t => t.clips).find(c => c.id === clip.id);
                                if (!clipFromState) { if (video.parentNode === document.body) video.remove(); return; }

                                const needsMetaUpdate = (!clipFromState.originalWidth || !clipFromState.originalHeight || (clipFromState.duration !== actualDuration && !isNaN(actualDuration) && actualDuration > 0));
                                const needsThumbnails = clipFromState.type === 'video' && (!clipFromState.thumbnailUrls || clipFromState.thumbnailUrls.length === 0);

                                if (needsMetaUpdate || needsThumbnails) {
                                    let thumbnails = needsThumbnails ? [] : (clipFromState.thumbnailUrls || []);
                                    if (needsThumbnails && videoWidth > 0 && videoHeight > 0 && isFinite(actualDuration) && actualDuration > 0) {
                                        try {
                                            if (video.readyState < video.HAVE_CURRENT_DATA) {
                                                await new Promise<void>((resolveWait, rejectWait) => {
                                                    const canplayHandler = () => { video.removeEventListener('canplay', canplayHandler); video.removeEventListener('error', errorHandlerWait); resolveWait(); };
                                                    const errorHandlerWait = (e: Event) => { video.removeEventListener('canplay', canplayHandler); video.removeEventListener('error', errorHandlerWait); rejectWait(new Error(`Video error waiting for canplay: ${e.type}`)); };
                                                    video.addEventListener('canplay', canplayHandler, { once: true });
                                                    video.addEventListener('error', errorHandlerWait, { once: true });
                                                    setTimeout(() => { video.removeEventListener('canplay', canplayHandler); video.removeEventListener('error', errorHandlerWait); rejectWait(new Error("Timeout for canplay")); }, 5000);
                                                });
                                            }
                                            thumbnails = await this.generateThumbnailsForClip(clip.id, video);
                                        } catch (e) { console.error(`Thumbnail gen failed for ${clip.id}:`, e); thumbnails = []; }
                                    }

                                    this.setProjectState(prev => {
                                        let durationChanged = false;
                                        const updatedTracks = prev.tracks.map(t => ({
                                            ...t,
                                            clips: t.clips.map(c => {
                                                if (c.id === clip.id) {
                                                    let updatedClip = { ...c, originalWidth: videoWidth || c.originalWidth || 0, originalHeight: videoHeight || c.originalHeight || 0 };
                                                    if (c.type === 'video' && !isNaN(actualDuration) && actualDuration > 0) {
                                                        const newDuration = actualDuration;
                                                        durationChanged = durationChanged || (c.duration !== newDuration);
                                                        updatedClip = { ...updatedClip, duration: newDuration, endTime: c.startTime + newDuration };
                                                    }
                                                    if (thumbnails.length > 0 || needsThumbnails) { // Update if new thumbs or if generation was attempted
                                                        updatedClip = { ...updatedClip, thumbnailUrls: thumbnails };
                                                    }
                                                    return updatedClip;
                                                }
                                                return c;
                                            })
                                        }));
                                        const newTotalDuration = durationChanged ? this.calculateTotalDuration(updatedTracks) : prev.totalDuration;
                                        return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
                                    });
                                }
                                if (video.preload !== 'auto') video.preload = 'auto';

                                const activeClip = currentProjectState.tracks.flatMap(t => t.clips).find(c => c.id === clip.id && currentTime >= c.startTime && currentTime < c.endTime);
                                if (activeClip) {
                                    const clipTime = Math.max(0, currentTime - clip.startTime);
                                    if (video.readyState >= video.HAVE_CURRENT_DATA && Math.abs(video.currentTime - clipTime) > 0.05) {
                                        try { video.currentTime = clipTime; } catch (e) { console.warn(`Error setting currentTime on load for ${clip.id}:`, e); }
                                    }
                                }
                            };

                            video.onerror = (e) => {
                                console.error(`Error loading video: ${clip.name || clip.id}`, sourceToUse, e);
                                message.error(`Failed to load video: ${clip.name || clip.id}`);
                                this.setProjectState(prev => {
                                    const updatedTracks = prev.tracks.map(t => ({ ...t, clips: t.clips.filter(c => c.id !== clip.id) })).filter(track => track.clips.length > 0 || prev.tracks.length === 1);
                                    if (updatedTracks.length === 0) updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
                                    const newTotalDuration = this.calculateTotalDuration(updatedTracks);
                                    return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: prev.selectedClipId === clip.id ? null : prev.selectedClipId };
                                });
                                if (this.mediaElementsRef.current && this.mediaElementsRef.current[clip.id]) {
                                    const el = this.mediaElementsRef.current[clip.id];
                                    if (el.parentNode === document.body) el.remove();
                                    // No need to revoke http/https URLs
                                    delete this.mediaElementsRef.current[clip.id];
                                }
                            };
                            document.body.appendChild(video);
                            mediaElements[clip.id] = video;
                        } else if (clip.type === 'image') {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.src = sourceToUse;
                            img.style.cssText = `position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; top: -10px; left: -10px; overflow: hidden;`;

                            img.onload = () => {
                                if (!this.mediaElementsRef.current || this.mediaElementsRef.current[clip.id] !== img || !currentClipIds.has(clip.id)) {
                                    if (img.parentNode === document.body) img.remove(); return;
                                }
                                console.log(`Image loaded for ${clip.name || clip.id}: dims=${img.naturalWidth}x${img.naturalHeight}`);
                                this.setProjectState(prev => ({
                                    ...prev,
                                    tracks: prev.tracks.map(t => ({
                                        ...t,
                                        clips: t.clips.map(c => c.id === clip.id ? {
                                            ...c,
                                            originalWidth: img.naturalWidth || c.originalWidth || 0,
                                            originalHeight: img.naturalHeight || c.originalHeight || 0,
                                            thumbnailUrls: (c.thumbnailUrls && c.thumbnailUrls.length > 0 && c.source === img.src) ? c.thumbnailUrls : [{ time: 0, url: sourceToUse as string }]
                                        } : c)
                                    }))
                                }));
                            };
                            img.onerror = () => {
                                console.error(`Error loading image: ${clip.name || clip.id}`, sourceToUse);
                                message.error(`Failed to load image: ${clip.name || clip.id}`);
                                this.setProjectState(prev => {
                                    const updatedTracks = prev.tracks.map(t => ({ ...t, clips: t.clips.filter(c => c.id !== clip.id) })).filter(track => track.clips.length > 0 || prev.tracks.length === 1);
                                    if (updatedTracks.length === 0) updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
                                    const newTotalDuration = this.calculateTotalDuration(updatedTracks);
                                    return { // <--- LỆNH RETURN ĐÃ ĐƯỢC THÊM VÀO
                                        ...prev,
                                        tracks: updatedTracks,
                                        totalDuration: newTotalDuration,
                                        selectedClipId: prev.selectedClipId === clip.id ? null : prev.selectedClipId
                                    };
                                });
                                if (this.mediaElementsRef.current && this.mediaElementsRef.current[clip.id]) {
                                    const el = this.mediaElementsRef.current[clip.id];
                                    if (el.parentNode === document.body) el.remove();
                                    delete this.mediaElementsRef.current[clip.id];
                                }
                            };
                            document.body.appendChild(img);
                            mediaElements[clip.id] = img;
                        }
                    } else { // Element exists, update props
                        if (existingElement instanceof HTMLVideoElement) {
                            if (existingElement.muted !== currentProjectState.isPreviewMuted) existingElement.muted = currentProjectState.isPreviewMuted;
                            if (existingElement.playbackRate !== currentProjectState.playbackRate) existingElement.playbackRate = currentProjectState.playbackRate;
                        }
                    }
                } else if (clip.type === 'text' && !isSubtitleClip) {
                    if (mediaElements[clip.id]) {
                        const el = mediaElements[clip.id];
                        if (el && el.parentNode === document.body) el.remove();
                        delete mediaElements[clip.id];
                    }
                }
            });
        });

        // Cleanup elements no longer in currentClipIds or are subtitle clips
        Object.keys(mediaElements).forEach(id => {
            const clipInProject = currentProjectState.tracks.flatMap(t => t.clips).find(c => c.id === id);
            const isStillValidMediaClip = clipInProject && (clipInProject.type === 'video' || clipInProject.type === 'image') && !currentProjectState.subtitles.some(sub => sub.id === id);

            if (!isStillValidMediaClip) {
                const element = mediaElements[id];
                if (element) {
                    if (element instanceof HTMLVideoElement) {
                        element.pause();
                        element.removeAttribute('src');
                        element.load();
                    }
                    if (element.src && element.src.startsWith('blob:')) { // Only revoke blobs
                        URL.revokeObjectURL(element.src);
                    }
                    if (element.parentNode === document.body) element.remove();
                }
                delete mediaElements[id];
                console.log(`Removing orphaned/invalid media element ${id} during sync cleanup.`);
            }
        });
    }

    public cleanupMediaElements(mediaElements: MediaElementsRefValue): void {
        console.log("MediaElementManager: Cleaning up all media elements.");
        Object.values(mediaElements).forEach(el => {
            if (el instanceof HTMLVideoElement) {
                el.pause();
                el.removeAttribute('src');
                el.load();
            }
            if (el.src && el.src.startsWith('blob:')) { // Only revoke blobs
                try { URL.revokeObjectURL(el.src); }
                catch (e) { console.warn("Error revoking object URL in cleanupMediaElements:", e); }
            }
            if (el.parentNode === document.body) {
                el.remove();
            }
        });
        // Clear the passed ref's value (which is mediaElementsRef.current)
        // This should be done in the hook: mediaElementsRef.current = {};
    }
}