// src/Hooks/Logic/PlaybackController.ts

import { RefObject, Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { EditorProjectState, EditorStatus, Track, Clip } from '../../Components/VideoPage/types';
import { PLAYBACK_RATES } from '../constants';

type MediaElementsRefValue = { [key: string]: HTMLVideoElement | HTMLImageElement };

// Define a minimum delta time for a state update to be considered significant.
// This helps prevent overly frequent updates for very small time changes.
// 0.001 seconds = 1 millisecond. Adjust if needed.
const MIN_SIGNIFICANT_DELTA_TIME = 0.001;


export class PlaybackController {
    private setProjectState: Dispatch<SetStateAction<EditorProjectState>>;
    private setCurrentTime: Dispatch<SetStateAction<number>>;
    private mediaElementsRef: RefObject<MediaElementsRefValue>;
    private drawFrame: (time: number, projectState: EditorProjectState, mediaElements: MediaElementsRefValue | null) => void;
    private lastUpdateTimeRef: RefObject<number>;

    constructor(
        setProjectState: Dispatch<SetStateAction<EditorProjectState>>,
        setCurrentTime: Dispatch<SetStateAction<number>>,
        mediaElementsRef: RefObject<MediaElementsRefValue>,
        drawFrame: (time: number, projectState: EditorProjectState, mediaElements: MediaElementsRefValue | null) => void,
        _animationFrameRef_mainLoop: RefObject<number | null>, // Unused
        lastUpdateTimeRef: RefObject<number>
    ) {
        this.setProjectState = setProjectState;
        this.setCurrentTime = setCurrentTime;
        this.mediaElementsRef = mediaElementsRef;
        this.drawFrame = drawFrame;
        this.lastUpdateTimeRef = lastUpdateTimeRef;
    }

    public handlePlayPause(
        currentTime: number,
        currentProjectState: EditorProjectState,
        currentEditorState: EditorStatus
    ): void {
        if (currentEditorState !== 'editor') {
            console.warn(`Play/Pause action ignored. Editor state is: ${currentEditorState}`);
            if (currentProjectState.isPlaying) {
                flushSync(() => {
                    this.setProjectState(prev => ({ ...prev, isPlaying: false }));
                });
            }
            return;
        }

        const nextIsPlaying = !currentProjectState.isPlaying;
        let timeToStartFrom = currentTime;
        const projectTotalDuration = Number.isFinite(currentProjectState.totalDuration) && currentProjectState.totalDuration > 0
            ? currentProjectState.totalDuration
            : 0;


        if (timeToStartFrom >= projectTotalDuration && projectTotalDuration > 0 && nextIsPlaying) {
            timeToStartFrom = 0;
            flushSync(() => {
                this.setCurrentTime(0);
            });
        }

        flushSync(() => {
            this.setProjectState(prev => ({ ...prev, isPlaying: nextIsPlaying }));
        });

        this.lastUpdateTimeRef.current = Date.now();
        const stateAfterPlayPause: EditorProjectState = { ...currentProjectState, isPlaying: nextIsPlaying };
        const mediaElements = this.mediaElementsRef.current;

        if (!mediaElements) {
            console.warn("Media elements ref is null in handlePlayPause.");
            return;
        }

        currentProjectState.tracks.forEach((track: Track) => {
            track.clips.forEach((clip: Clip) => {
                const isSubtitleClip = clip.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === clip.id);
                if (clip.type === 'video' && !isSubtitleClip) {
                    const element = mediaElements[clip.id];
                    if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                        const clipInnerTime = Math.max(0, timeToStartFrom - clip.startTime);
                        const isActiveAtTargetTime = timeToStartFrom >= clip.startTime && timeToStartFrom < clip.endTime;

                        if (element.duration !== undefined && clipInnerTime >= 0 && clipInnerTime <= element.duration + 0.1) {
                            if (Math.abs(element.currentTime - clipInnerTime) > 0.01) {
                                try {
                                    element.currentTime = clipInnerTime;
                                } catch (e) { console.warn(`Error setting currentTime for ${clip.id} during play/pause:`, e); }
                            }
                        }

                        if (nextIsPlaying) {
                            if (isActiveAtTargetTime && element.paused) {
                                element.play().catch(e => console.warn("Autoplay prevented for clip " + clip.id + ":", e));
                            } else if (!isActiveAtTargetTime && !element.paused) {
                                element.pause();
                            }
                            if (element.playbackRate !== stateAfterPlayPause.playbackRate) {
                                element.playbackRate = stateAfterPlayPause.playbackRate;
                            }
                        } else {
                            if (!element.paused) {
                                element.pause();
                            }
                        }
                    }
                }
            });
        });
    }

    public handleTimelineSeek(
        time: number,
        currentProjectState: EditorProjectState,
    ): void {
        const projectTotalDuration = Number.isFinite(currentProjectState.totalDuration) ? currentProjectState.totalDuration : 0;
        const newTime = Math.max(0, Math.min(time, projectTotalDuration));

        flushSync(() => {
            this.setCurrentTime(newTime);
        });

        this.lastUpdateTimeRef.current = Date.now();
        const mediaElements = this.mediaElementsRef.current;

        if (!mediaElements) {
            console.warn("Media elements ref is null in handleTimelineSeek.");
            this.drawFrame(newTime, currentProjectState, null);
            return;
        }

        currentProjectState.tracks.forEach((track: Track) => {
            track.clips.forEach((clip: Clip) => {
                const isSubtitleClip = clip.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === clip.id);
                if (clip.type === 'video' && !isSubtitleClip) {
                    const element = mediaElements[clip.id];
                    if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                        const clipInnerTime = Math.max(0, newTime - clip.startTime);
                        const isActiveAtNewTime = newTime >= clip.startTime && newTime < clip.endTime;

                        if (element.duration !== undefined && clipInnerTime >= 0 && clipInnerTime <= element.duration + 0.1) {
                            if (Math.abs(element.currentTime - clipInnerTime) > 0.05) {
                                try {
                                    element.currentTime = clipInnerTime;
                                } catch (e) {
                                    console.warn(`Error setting currentTime for ${clip.id} during seek:`, e);
                                }
                            }
                        }

                        if (currentProjectState.isPlaying) {
                            if (isActiveAtNewTime && element.paused) {
                                element.play().catch(e => console.warn("Seek play prevented for " + clip.id + ":", e));
                            } else if (!isActiveAtNewTime && !element.paused) {
                                element.pause();
                            }
                            if (element.playbackRate !== currentProjectState.playbackRate) {
                                element.playbackRate = currentProjectState.playbackRate;
                            }
                        } else {
                            if (!element.paused) {
                                element.pause();
                            }
                        }
                    }
                }
            });
        });
        this.drawFrame(newTime, currentProjectState, this.mediaElementsRef.current);
    }

    public toggleMutePreview(): void {
        this.setProjectState(prev => ({ ...prev, isPreviewMuted: !prev.isPreviewMuted }));
    }

    public handlePlaybackRateChange(rate: number, currentProjectState: EditorProjectState): void {
        if (PLAYBACK_RATES.includes(rate) && Number.isFinite(rate)) { // Ensure rate is finite
            flushSync(() => {
                this.setProjectState(prev => ({ ...prev, playbackRate: rate }));
            });

            const mediaElements = this.mediaElementsRef.current;
            if (mediaElements && currentProjectState.isPlaying) {
                const currentTime = this.getCurrentTimeValue();
                currentProjectState.tracks.forEach((track: Track) => {
                    track.clips.forEach((clip: Clip) => {
                        if (clip.type === 'video' && mediaElements[clip.id] instanceof HTMLVideoElement) {
                            const element = mediaElements[clip.id] as HTMLVideoElement;
                            const isActive = currentTime >= clip.startTime && currentTime < clip.endTime;
                            if (!element.paused && isActive) {
                                element.playbackRate = rate;
                            }
                        }
                    });
                });
            }
            this.lastUpdateTimeRef.current = Date.now();
        } else {
            console.warn(`Invalid playback rate: ${rate}`);
        }
    }

    private getCurrentTimeValue(): number {
        let time = 0;
        this.setCurrentTime(prevTime => {
            time = prevTime;
            return prevTime;
        });
        return time;
    }

    public renderLoop(
        currentTimeVal: number,
        currentProjectState: EditorProjectState,
        currentEditorState: EditorStatus,
        scheduleNextFrame: () => void
    ): void {
        if (currentEditorState !== 'editor' || !currentProjectState.isPlaying) {
            if (currentProjectState.isPlaying && currentEditorState !== 'editor') {
                console.warn(`RenderLoop: isPlaying is true but editorState is ${currentEditorState}. Forcing pause.`);
                flushSync(() => {
                    this.setProjectState(prev => ({ ...prev, isPlaying: false }));
                });
            }
            return;
        }

        const now = Date.now();
        const lastUpdate = this.lastUpdateTimeRef.current ?? now;

        // --- Start Sanity Checks ---
        let saneTotalDuration = currentProjectState.totalDuration;
        if (!Number.isFinite(saneTotalDuration) || saneTotalDuration < 0) {
            console.warn(`RenderLoop: projectState.totalDuration is invalid (${currentProjectState.totalDuration}). Corrected to 0.`);
            saneTotalDuration = 0;
        }

        let sanePlaybackRate = currentProjectState.playbackRate;
        if (!Number.isFinite(sanePlaybackRate) || sanePlaybackRate <= 0) { // Added check for sanePlaybackRate <=0
            console.warn(`RenderLoop: projectState.playbackRate is invalid or non-positive (${currentProjectState.playbackRate}). Corrected to 1.`);
            sanePlaybackRate = 1;
        }

        if (!Number.isFinite(currentTimeVal)) {
            console.error(`RenderLoop: currentTimeVal (${currentTimeVal}) is not finite. Forcing pause and resetting time to 0.`);
            flushSync(() => {
                this.setProjectState(prev => ({ ...prev, isPlaying: false, playbackRate: sanePlaybackRate, totalDuration: saneTotalDuration }));
                this.setCurrentTime(0);
            });
            this.lastUpdateTimeRef.current = now;
            const stateAtError = { ...currentProjectState, isPlaying: false, playbackRate: sanePlaybackRate, totalDuration: saneTotalDuration };
            this.drawFrame(0, stateAtError, this.mediaElementsRef.current);
            return;
        }
        // --- End Sanity Checks ---

        const deltaTime = ((now - lastUpdate) / 1000) * sanePlaybackRate;
        let newEditorTime = currentTimeVal;

        // Only advance time if deltaTime is positive and significant
        if (Number.isFinite(deltaTime) && deltaTime > 0) { // Check deltaTime > 0 to prevent issues if time goes backward or stalls
            newEditorTime = currentTimeVal + deltaTime;

            // Intermediate check for newEditorTime finiteness before clamping
            if (!Number.isFinite(newEditorTime)) {
                console.error(`RenderLoop: newEditorTime became non-finite (${newEditorTime}) before clamping. currentTimeVal: ${currentTimeVal}, deltaTime: ${deltaTime}, sanePlaybackRate: ${sanePlaybackRate}`);
                flushSync(() => {
                    this.setProjectState(prev => ({ ...prev, isPlaying: false, playbackRate: sanePlaybackRate, totalDuration: saneTotalDuration }));
                    this.setCurrentTime(0);
                });
                this.lastUpdateTimeRef.current = now;
                this.drawFrame(0, { ...currentProjectState, isPlaying: false, playbackRate: sanePlaybackRate, totalDuration: saneTotalDuration }, this.mediaElementsRef.current);
                return;
            }

            newEditorTime = Math.max(0, Math.min(newEditorTime, saneTotalDuration)); // Clamp time

            // Update currentTime state only if the change is significant enough
            if (Number.isFinite(newEditorTime) && Math.abs(newEditorTime - currentTimeVal) >= MIN_SIGNIFICANT_DELTA_TIME) {
                this.setCurrentTime(newEditorTime);
            } else if (!Number.isFinite(newEditorTime)) {
                // This case should ideally be caught by the check above, but as a safeguard:
                console.error(`RenderLoop: newEditorTime became non-finite (${newEditorTime}) after clamping. Forcing pause.`);
                flushSync(() => {
                    this.setProjectState(prev => ({ ...prev, isPlaying: false, playbackRate: sanePlaybackRate, totalDuration: saneTotalDuration }));
                    this.setCurrentTime(saneTotalDuration > 0 ? Math.min(currentTimeVal, saneTotalDuration) : 0); // Try to set to a safe value
                });
                this.lastUpdateTimeRef.current = now;
                this.drawFrame(saneTotalDuration > 0 ? Math.min(currentTimeVal, saneTotalDuration) : 0, { ...currentProjectState, isPlaying: false, playbackRate: sanePlaybackRate, totalDuration: saneTotalDuration }, this.mediaElementsRef.current);
                return;
            }
            // If the change is not significant, newEditorTime still holds the calculated time for this frame's drawing logic,
            // but currentTime state (and subsequent effects depending on it) won't update.
        }


        const mediaElements = this.mediaElementsRef.current;
        if (mediaElements) {
            currentProjectState.tracks.forEach((track: Track) => {
                track.clips.forEach((clip: Clip) => {
                    if (clip.type === 'video') {
                        const element = mediaElements[clip.id] as HTMLVideoElement;
                        if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                            // Use newEditorTime for calculations within this frame, regardless of whether setCurrentTime was called
                            const clipInnerTime = Math.max(0, newEditorTime - clip.startTime);
                            const isActive = newEditorTime >= clip.startTime && newEditorTime < clip.endTime;

                            if (isActive) {
                                if (element.paused) {
                                    element.play().catch(e => console.warn(`RenderLoop: Error re-playing ${clip.id}`, e));
                                }
                                // Adjust video element's currentTime if significantly out of sync
                                if (Math.abs(element.currentTime - clipInnerTime) > 0.15) { // 150ms threshold for desync
                                    try { element.currentTime = clipInnerTime; } catch (e) { /* ignore, common during seeks or rapid changes */ }
                                }
                                if (element.playbackRate !== sanePlaybackRate) {
                                    element.playbackRate = sanePlaybackRate;
                                }
                            } else {
                                if (!element.paused) { element.pause(); }
                            }
                        }
                    }
                });
            });
        }

        const stateForDrawAndEndCheck = { ...currentProjectState, playbackRate: sanePlaybackRate, totalDuration: saneTotalDuration };

        if (saneTotalDuration > 0 && Number.isFinite(newEditorTime) && newEditorTime >= saneTotalDuration) {
            const finalTime = saneTotalDuration; // Play up to the exact duration
            const finalState = { ...stateForDrawAndEndCheck, isPlaying: false };

            flushSync(() => {
                this.setProjectState(finalState);
                this.setCurrentTime(finalTime);
            });

            const finalMediaElements = this.mediaElementsRef.current;
            if (finalMediaElements) {
                Object.values(finalMediaElements).forEach(el => {
                    if (el instanceof HTMLVideoElement && !el.paused) el.pause();
                });
            }

            this.drawFrame(finalTime, finalState, finalMediaElements);
            this.lastUpdateTimeRef.current = now;
            return;
        }

        this.lastUpdateTimeRef.current = now;
        // Always draw with the calculated newEditorTime for this frame
        this.drawFrame(newEditorTime, stateForDrawAndEndCheck, mediaElements);

        scheduleNextFrame();
    }
}