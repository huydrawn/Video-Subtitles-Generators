// src/Hooks/Logic/PlaybackController.ts

import { RefObject, Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { EditorProjectState } from '../../Components/VideoPage/types';
import { PLAYBACK_RATES } from '../constants';

type MediaElementsRefValue = { [key: string]: HTMLVideoElement | HTMLImageElement };

export class PlaybackController {
    private setProjectState: Dispatch<SetStateAction<EditorProjectState>>;
    private setCurrentTime: Dispatch<SetStateAction<number>>;
    private mediaElementsRef: RefObject<MediaElementsRefValue>;
    private drawFrame: (time: number, projectState: EditorProjectState, mediaElements: MediaElementsRefValue | null) => void;
    // The main animationFrameRef is now managed in useVideoEditorLogic.
    // This ref is for PlaybackController's own timing.
    private lastUpdateTimeRef: RefObject<number>;
    // private ownAnimationFrameRef: RefObject<number | null>; // If needed for other controller-specific animations

    constructor(
        setProjectState: Dispatch<SetStateAction<EditorProjectState>>,
        setCurrentTime: Dispatch<SetStateAction<number>>,
        mediaElementsRef: RefObject<MediaElementsRefValue>,
        drawFrame: (time: number, projectState: EditorProjectState, mediaElements: MediaElementsRefValue | null) => void,
        _animationFrameRef_mainLoop: RefObject<number | null>, // Main loop's rAF ID, managed by useVideoEditorLogic
        lastUpdateTimeRef: RefObject<number>
    ) {
        this.setProjectState = setProjectState;
        this.setCurrentTime = setCurrentTime;
        this.mediaElementsRef = mediaElementsRef;
        this.drawFrame = drawFrame;
        // this.ownAnimationFrameRef = animationFrameRef; // If this controller had its OWN separate animations
        this.lastUpdateTimeRef = lastUpdateTimeRef;
    }

    public handlePlayPause(
        currentTime: number,
        currentProjectState: EditorProjectState,
        _currentEditorState: 'initial' | 'uploading' | 'transcribing' | 'editor'
        // renderLoopCallback is no longer needed here to start the loop,
        // as the main useEffect in useVideoEditorLogic handles it.
    ): void {
        const nextIsPlaying = !currentProjectState.isPlaying;
        let timeToStartFrom = currentTime;

        if (currentTime >= currentProjectState.totalDuration && currentProjectState.totalDuration > 0 && nextIsPlaying) {
            timeToStartFrom = 0;
            this.setCurrentTime(0); // No flushSync needed unless subsequent logic immediately depends on it before re-render
        }

        this.setProjectState(prev => ({ ...prev, isPlaying: nextIsPlaying }));

        // Update lastUpdateTimeRef when play/pause state changes to ensure correct delta time calculation.
        if (this.lastUpdateTimeRef.current !== null) {
            this.lastUpdateTimeRef.current = Date.now();
        }

        const mediaElements = this.mediaElementsRef.current;
        if (!mediaElements) {
            console.warn("Media elements ref is null in handlePlayPause.");
        }

        currentProjectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const isSubtitleClip = clip.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === clip.id);
                if (clip.type === 'video' && !isSubtitleClip && mediaElements) {
                    const element = mediaElements[clip.id];
                    if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                        const clipTime = Math.max(0, timeToStartFrom - clip.startTime);
                        const isActiveAtNewTime = timeToStartFrom >= clip.startTime && timeToStartFrom < clip.endTime;

                        if (element.duration !== undefined && clipTime >= 0 && clipTime <= element.duration + 0.1) {
                            if (Math.abs(element.currentTime - clipTime) > 0.05) {
                                try {
                                    element.currentTime = clipTime;
                                } catch (e) { console.warn(`Error setting currentTime for ${clip.id} during play/pause sync:`, e); }
                            }
                        }

                        if (nextIsPlaying) {
                            if (isActiveAtNewTime && element.paused) {
                                element.play().catch(e => console.warn("Autoplay prevented for clip " + clip.id + ":", e));
                            } else if (!isActiveAtNewTime && !element.paused) {
                                element.pause();
                            }
                        } else { // When pausing
                            if (!element.paused) {
                                element.pause();
                            }
                        }
                    }
                }
            });
        });

        // If pausing, draw the current frame immediately.
        // The main animation loop (managed by useEffect in useVideoEditorLogic) will stop separately.
        if (!nextIsPlaying) {
            console.log(`PlayPause: Drawing frame at ${timeToStartFrom} after pausing.`);
            // Pass currentProjectState directly, as it might not have updated from setProjectState yet
            // However, isPlaying would be the critical part, which is `nextIsPlaying = false`.
            // Create a temporary state for drawing if necessary.
            const stateForDraw = { ...currentProjectState, isPlaying: false };
            this.drawFrame(timeToStartFrom, stateForDraw, this.mediaElementsRef.current);
        }
        // Starting the animation loop is handled by the useEffect in useVideoEditorLogic
        // reacting to projectState.isPlaying changing to true.
    }

    public handleTimelineSeek(
        time: number,
        currentProjectState: EditorProjectState,
    ): void {
        const newTime = Math.max(0, Math.min(time, currentProjectState.totalDuration || 0));

        flushSync(() => {
            this.setCurrentTime(newTime);
        });

        if (this.lastUpdateTimeRef.current !== null) {
            this.lastUpdateTimeRef.current = Date.now();
        }

        const mediaElements = this.mediaElementsRef.current;
        if (!mediaElements) {
            console.warn("Media elements ref is null in handleTimelineSeek.");
        }

        currentProjectState.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const isSubtitleClip = clip.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === clip.id);
                if (clip.type === 'video' && !isSubtitleClip && mediaElements) {
                    const element = mediaElements[clip.id];
                    if (element instanceof HTMLVideoElement && element.readyState >= element.HAVE_METADATA) {
                        const clipTime = Math.max(0, newTime - clip.startTime);
                        const isActive = newTime >= clip.startTime && newTime < clip.endTime;

                        if (element.duration !== undefined && clipTime >= 0 && clipTime <= element.duration + 0.1) {
                            if (Math.abs(element.currentTime - clipTime) > 0.05) {
                                try {
                                    element.currentTime = clipTime;
                                } catch (e) {
                                    console.warn(`Error setting currentTime for ${clip.id} during seek:`, e);
                                }
                            }
                        }

                        if (currentProjectState.isPlaying) {
                            if (isActive && element.paused) {
                                element.play().catch(e => console.warn("Seek play prevented for " + clip.id + ":", e));
                            } else if (!isActive && !element.paused) {
                                element.pause();
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
        // The state passed to drawFrame should reflect the newTime.
        // currentProjectState might not yet reflect the newTime if setCurrentTime hasn't fully propagated.
        // However, drawFrame uses the `time` argument directly for its logic.
        this.drawFrame(newTime, currentProjectState, this.mediaElementsRef.current);
    }

    public toggleMutePreview(): void {
        this.setProjectState(prev => ({ ...prev, isPreviewMuted: !prev.isPreviewMuted }));
    }

    public handlePlaybackRateChange(rate: number): void {
        if (PLAYBACK_RATES.includes(rate)) {
            this.setProjectState(prev => ({ ...prev, playbackRate: rate }));
        }
    }

    public renderLoop(
        currentTimeVal: number, // Current editor time from useVideoEditorLogic's state
        currentProjectState: EditorProjectState, // Current project state from useVideoEditorLogic
        currentEditorState: 'initial' | 'uploading' | 'transcribing' | 'editor',
        scheduleNextFrame: () => void // Callback to schedule the next rAF call
    ): void {
        const now = Date.now();
        const lastUpdate = this.lastUpdateTimeRef.current === null ? now : this.lastUpdateTimeRef.current;

        const deltaTime = currentProjectState.isPlaying
            ? ((now - lastUpdate) / 1000) * currentProjectState.playbackRate
            : 0;

        let newEditorTime = currentTimeVal;

        if (currentProjectState.isPlaying && deltaTime > 0) {
            newEditorTime = Math.min(currentProjectState.totalDuration, currentTimeVal + deltaTime);
            newEditorTime = Math.max(0, newEditorTime); // Ensure not negative

            if (newEditorTime !== currentTimeVal) {
                this.setCurrentTime(newEditorTime); // This updates state in useVideoEditorLogic
            }

            const mediaElements = this.mediaElementsRef.current;
            if (mediaElements) {
                currentProjectState.tracks.forEach(track => {
                    track.clips.forEach(clip => {
                        if (clip.type === 'video' && mediaElements[clip.id] instanceof HTMLVideoElement) {
                            const element = mediaElements[clip.id] as HTMLVideoElement;
                            const clipTimeOffset = Math.max(0, newEditorTime - clip.startTime);
                            const isActive = newEditorTime >= clip.startTime && newEditorTime < clip.endTime;

                            if (isActive && element.readyState >= element.HAVE_METADATA && element.duration !== undefined && clipTimeOffset <= element.duration + 0.1) {
                                if (Math.abs(element.currentTime - clipTimeOffset) > 0.1 || (element.paused && currentProjectState.isPlaying) ) {
                                    try {
                                        element.currentTime = clipTimeOffset;
                                        if (element.paused && currentProjectState.isPlaying) {
                                            element.play().catch(e => console.warn(`RenderLoop: Error re-playing ${clip.id}`, e));
                                        }
                                    } catch (e) { /* ignore */ }
                                }
                            }
                        }
                    });
                });
            }

            if (newEditorTime >= currentProjectState.totalDuration && currentProjectState.totalDuration > 0 && currentProjectState.isPlaying) {
                console.log("RenderLoop: Reached end of total duration.");
                flushSync(() => {
                    this.setProjectState(prev => ({ ...prev, isPlaying: false }));
                    // Ensure time is exactly at duration end, or 0 if duration is 0.
                    this.setCurrentTime(currentProjectState.totalDuration > 0 ? currentProjectState.totalDuration : 0);
                });

                const mediaElements = this.mediaElementsRef.current;
                if (mediaElements) {
                    Object.values(mediaElements).forEach(el => {
                        if (el instanceof HTMLVideoElement && !el.paused) el.pause();
                    });
                }
                // Draw the final frame.
                this.drawFrame(currentProjectState.totalDuration > 0 ? currentProjectState.totalDuration : 0,
                    {...currentProjectState, isPlaying: false}, // Pass updated isPlaying state
                    mediaElements);
                // Loop will be stopped by useVideoEditorLogic's useEffect reacting to isPlaying: false.
                // Do NOT call scheduleNextFrame here.
                return;
            }
        }

        this.lastUpdateTimeRef.current = now;
        // Draw the current frame. currentProjectState here has the isPlaying status from before this tick.
        // If isPlaying changed in this tick (e.g. end of duration), drawFrame needs the new state.
        // newEditorTime is the most up-to-date time for this frame.
        this.drawFrame(newEditorTime, currentProjectState, this.mediaElementsRef.current);

        // If still playing and in editor mode, call the scheduler for the next frame.
        // The scheduler itself contains the requestAnimationFrame call.
        if (currentProjectState.isPlaying && currentEditorState === 'editor') {
            scheduleNextFrame();
        }
        // If not playing, the main useEffect in useVideoEditorLogic handles cancelling any outstanding rAF.
    }
}