// src/Hooks/Logic/TimelineMoveableController.ts

import { RefObject, Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import Moveable from 'react-moveable';
import type { OnDragEnd, OnResize, OnResizeEnd } from 'react-moveable';
import type { EditorProjectState, Clip, Track } from '../../Components/VideoPage/types';
import { MIN_CLIP_DURATION } from '../constants'; // Import constant
import { calculateTotalDuration } from '../../Components/VideoPage/utils'; // Import utility

export class TimelineMoveableController {
    // FIX: Cập nhật kiểu để chấp nhận Moveable | null
    private moveableRef: RefObject<Moveable | null>;
    private setProjectState: Dispatch<SetStateAction<EditorProjectState>>;
    private calculateTotalDuration: (tracks: Track[]) => number;

    constructor(
        // FIX: Cập nhật kiểu tham số để chấp nhận Moveable | null
        moveableRef: RefObject<Moveable | null>,
        setProjectState: Dispatch<SetStateAction<EditorProjectState>>,
        calculateTotalDuration: (tracks: Track[]) => number
    ) {
        this.moveableRef = moveableRef;
        this.setProjectState = setProjectState;
        this.calculateTotalDuration = calculateTotalDuration;
    }

    // ... các phương thức onTimelineDragEnd, onTimelineResize, onTimelineResizeEnd ...
    // (Đảm bảo bạn đã sử dụng optional chaining `?.` khi truy cập `this.moveableRef.current`)
    // Ví dụ: `this.moveableRef.current?.updateRect();` - mã hiện tại của bạn đã làm đúng điều này.

    public onTimelineDragEnd = ({ target, isDrag, lastEvent }: OnDragEnd,
                                selectedClip: Clip | null, // Pass current selected clip
                                projectState: EditorProjectState, // Pass current project state
                                timelineZoom: number // Pass current zoom level
    ): void => {
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);

        if (!isDrag || !lastEvent?.beforeTranslate || !projectState.selectedClipId || selectedIsSubtitleClip) {
            if (selectedIsSubtitleClip) console.warn("Attempted to drag a subtitle clip.");
            if (target) {
                // Ensure target is an HTMLElement
                const targetElement = target as HTMLElement;
                const yTransform = targetElement.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
                // Remove translateX part if it exists, keep others (like translateY)
                targetElement.style.transform = targetElement.style.transform.replace(/translateX\([^)]+\)/, '').trim();
                if (!targetElement.style.transform.includes('translateY')) {
                    targetElement.style.transform += ` ${yTransform}`;
                }
            }
            return;
        }
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === projectState.selectedClipId);
        if (!clip) return;

        const deltaTime = lastEvent.beforeTranslate[0] / Math.max(1, timelineZoom);
        const newStartTime = Math.max(0, clip.startTime + deltaTime);

        // Do NOT reset transform here. Let React render the new state.
        // Moveable will automatically reset its internal transform after the event.
        // if (target) { // Check target exists before manipulating style
        //     const targetElement = target as HTMLElement;
        //     targetElement.style.transform = targetElement.style.transform.replace(/translateX\([^)]+\)/, '');
        // }

        // Use setProjectState with functional update for latest state
        this.setProjectState(prev => {
            // Find the track and clip index in the LATEST state
            const trackIndex = prev.tracks.findIndex(t => t.id === clip.trackId);
            if (trackIndex === -1) return prev; // Should not happen if clip was found

            const clipIndex = prev.tracks[trackIndex].clips.findIndex(c => c.id === clip.id);
            if (clipIndex === -1) return prev; // Should not happen

            const clipToUpdate = prev.tracks[trackIndex].clips[clipIndex];
            const calculatedNewStartTime = Math.max(0, clipToUpdate.startTime + deltaTime); // Use latest startTime

            // Clamp newStartTime so duration is never less than MIN_CLIP_DURATION
            const clampedNewStartTime = Math.min(calculatedNewStartTime, clipToUpdate.endTime - MIN_CLIP_DURATION);


            const updatedClip = {
                ...clipToUpdate,
                startTime: clampedNewStartTime,
                endTime: clampedNewStartTime + clipToUpdate.duration // End time moves with start
            };

            const updatedClips = [...prev.tracks[trackIndex].clips];
            updatedClips[clipIndex] = updatedClip;
            // Maintain sorted order in the track after drag
            updatedClips.sort((a, b) => a.startTime - b.startTime);

            const updatedTracks = [...prev.tracks];
            updatedTracks[trackIndex] = {
                ...updatedTracks[trackIndex],
                clips: updatedClips
            };

            const newTotalDuration = this.calculateTotalDuration(updatedTracks);
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
        });

        // Calling updateRect() inside flushSync might be necessary if Moveable doesn't pick up
        // the updated target position immediately from React's state change.
        // The current usage outside flushSync is usually fine if React updates happen quickly.
        // flushSync(() => { /* ... setProjectState ... */ this.moveableRef.current?.updateRect(); });
        this.moveableRef.current?.updateRect(); // Update Moveable after state change
    }

    // onTimelineResize happens during drag - just apply visual changes
    public onTimelineResize = ({ target, width, drag, direction }: OnResize,
                               projectState: EditorProjectState // Pass current state for subtitle check
    ): void => {
        // This event fires *during* the drag.
        // The target's width is updated by Moveable internally, and we also apply it here.
        // The target's position (translateX) is handled by Moveable's `drag` output.

        const clipId = target.id.replace('clip-', ''); // Assuming target ID format
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
        const isSubtitleClip = clip?.type === 'text' && projectState.subtitles.some(sub => sub.id === clipId);

        if (isSubtitleClip) {
            // Moveable might still fire events even if we returned early in dragStart/ResizeStart.
            // Ensure we don't apply changes to subtitles.
            console.warn(`Attempted to resize a subtitle clip (ID: ${clipId}).`);
            // Reset target style if it was manipulated
            const targetElement = target as HTMLElement;
            targetElement.style.width = '';
            const yTransform = targetElement.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
            targetElement.style.transform = targetElement.style.transform.replace(/translateX\([^)]+\)/, '').trim();
            if (!targetElement.style.transform.includes('translateY')) {
                targetElement.style.transform += ` ${yTransform}`;
            }
            return;
        }

        // Apply the width update *during* the resize event
        const targetElement = target as HTMLElement;
        targetElement.style.width = `${Math.max(1, width)}px`;

        // Moveable handles the position update (translateX) via `drag.beforeTranslate`
        // based on the `renderDirectly` prop if used, or internally.
        // No manual position update needed here.
    }

    public onTimelineResizeEnd = ({ target, isDrag, lastEvent }: OnResizeEnd,
                                  selectedClip: Clip | null, // Pass current selected clip
                                  projectState: EditorProjectState, // Pass current project state
                                  timelineZoom: number // Pass current zoom
    ): void => {
        const selectedIsSubtitleClip = selectedClip?.type === 'text' && projectState.subtitles.some(sub => sub.id === selectedClip.id);
        // Check if it was a valid drag end event on a selected non-subtitle clip
        if (!isDrag || !lastEvent?.drag || !projectState.selectedClipId || !selectedClip || selectedIsSubtitleClip) {
            if (selectedIsSubtitleClip) console.warn("Attempted to resize a subtitle clip.");
            // Reset target style if it was manipulated during the drag
            if (target) {
                const targetElement = target as HTMLElement;
                targetElement.style.width = '';
                const yTransform = targetElement.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
                targetElement.style.transform = yTransform; // Reset translateX/scale, keep translateY
            }
            return;
        }

        const clipId = projectState.selectedClipId; // Use selectedClipId from state
        const clip = projectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
        if (!clip) return; // Should not happen if selectedClip exists

        let newStartTime = clip.startTime;
        let newDuration = clip.duration;
        const pxPerSec = Math.max(1, timelineZoom);

        // Determine which handle was dragged based on direction
        if (lastEvent.direction[0] === -1) { // Left handle dragged
            const timeDelta = lastEvent.drag.translate[0] / pxPerSec;
            // Calculate potential new start time
            const potentialNewStartTime = clip.startTime + timeDelta;
            // The new start time must be at least MIN_CLIP_DURATION before the original end time
            newStartTime = Math.max(0, Math.min(potentialNewStartTime, clip.endTime - MIN_CLIP_DURATION));
            // Recalculate duration based on the new start time and the fixed end time
            newDuration = clip.endTime - newStartTime;

        } else if (lastEvent.direction[0] === 1) { // Right handle dragged
            // New duration is simply the final width converted to time
            const potentialNewDuration = lastEvent.width / pxPerSec;
            newDuration = Math.max(MIN_CLIP_DURATION, potentialNewDuration);
            // Start time remains the same
            newStartTime = clip.startTime;
        } else {
            // Should not happen for horizontal resize handles, but handle defensively
            console.warn("Unexpected resize direction:", lastEvent.direction);
            if (target) {
                const targetElement = target as HTMLElement;
                targetElement.style.width = '';
                const yTransform = targetElement.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
                targetElement.style.transform = yTransform;
            }
            return; // Exit if direction is not left/right
        }


        // Ensure the final duration is never less than MIN_CLIP_DURATION
        newDuration = Math.max(MIN_CLIP_DURATION, newDuration);
        const newEndTime = newStartTime + newDuration;

        // Reset target style set during onTimelineResize event
        if (target) {
            const targetElement = target as HTMLElement;
            targetElement.style.width = '';
            const yTransform = targetElement.style.transform.match(/translateY\([^)]+\)/)?.[0] || 'translateY(-50%)';
            targetElement.style.transform = yTransform; // Reset translateX/scale, keep translateY
        }


        // Use setProjectState with functional update for latest state
        this.setProjectState(prev => {
            // Find the track and clip index in the LATEST state
            const trackIndex = prev.tracks.findIndex(t => t.id === clip.trackId);
            if (trackIndex === -1) return prev; // Should not happen

            const clipIndex = prev.tracks[trackIndex].clips.findIndex(c => c.id === clip.id);
            if (clipIndex === -1) return prev; // Should not happen

            const clipToUpdate = prev.tracks[trackIndex].clips[clipIndex]; // Get latest clip state

            // Double-check logic based on LATEST clip state if needed,
            // but calculations above used the state *before* the drag started (`clip`),
            // which is standard for resize end (calculate delta from start).
            // The calculated newStartTime/newDuration should be based on the state *before* resize began.
            // So using the `newStartTime`, `newDuration`, `newEndTime` calculated outside the setState seems correct.


            const updatedClip = {
                ...clipToUpdate, // Spread latest properties
                startTime: newStartTime,
                endTime: newEndTime,
                duration: newDuration,
                // If video, potentially trim source start/end time if you support that
                // sourceStartTime: ..., sourceEndTime: ...
            };

            const updatedClips = [...prev.tracks[trackIndex].clips];
            updatedClips[clipIndex] = updatedClip;
            // Maintain sorted order in the track after resize (start time might change)
            updatedClips.sort((a, b) => a.startTime - b.startTime);

            const updatedTracks = [...prev.tracks];
            updatedTracks[trackIndex] = {
                ...updatedTracks[trackIndex],
                clips: updatedClips
            };

            const newTotalDuration = this.calculateTotalDuration(updatedTracks);
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration };
        });


        this.moveableRef.current?.updateRect(); // Update Moveable after state change

    }
}