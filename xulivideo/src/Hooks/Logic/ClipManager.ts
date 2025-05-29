// src/Hooks/Logic/ClipManager.ts

import { Dispatch, SetStateAction, RefObject } from 'react';
import { flushSync } from 'react-dom';
import type {EditorProjectState, Clip, Track, Keyframe, ClipType} from '../../Components/VideoPage/types';
import { calculateTotalDuration, interpolateValue } from '../../Components/VideoPage/utils'; // Import utilities
import { DEFAULT_CLIP_DURATION, MIN_CLIP_DURATION } from '../constants'; // Import constants
import { message } from 'antd';

type MediaElementsRef = { [key: string]: HTMLVideoElement | HTMLImageElement };

export class ClipManager {
    private setProjectState: Dispatch<SetStateAction<EditorProjectState>>;
    private calculateTotalDuration: (tracks: Track[]) => number;
    private mediaElementsRef: RefObject<MediaElementsRef>;

    constructor(
        setProjectState: Dispatch<SetStateAction<EditorProjectState>>,
        calculateTotalDuration: (tracks: Track[]) => number,
        mediaElementsRef: RefObject<MediaElementsRef>
    ) {
        this.setProjectState = setProjectState;
        this.calculateTotalDuration = calculateTotalDuration;
        this.mediaElementsRef = mediaElementsRef;
    }

    public handleSelectClip(clipId: string | null, currentProjectState: EditorProjectState): void {
        const clipToSelect = currentProjectState.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
        const isSubtitleClip = clipToSelect?.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === clipToSelect.id);
        if (!isSubtitleClip) {
            if (currentProjectState.selectedClipId !== clipId) {
                this.setProjectState(prev => ({ ...prev, selectedClipId: clipId }));
            }
        } else {
            console.log(`Attempted to select subtitle clip (ID: ${clipId}), prevented.`);
        }
    }

    public handleAddTextClip(currentTime: number, currentProjectState: EditorProjectState): void {
        this.setProjectState(prev => {
            let newClipStartTime = 0;
            prev.tracks.forEach(track => track.clips.forEach(clip => newClipStartTime = Math.max(newClipStartTime, clip.endTime)));

            const firstTrackId = prev.tracks[0]?.id || `track-${Date.now()}`;
            const targetTrackIndex = prev.tracks.findIndex(t => t.id === firstTrackId);
            const targetTrackId = targetTrackIndex !== -1 ? prev.tracks[targetTrackIndex].id : firstTrackId;

            const newTextClip: Clip = {
                id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: 'text', source: "Your text here",
                trackId: targetTrackId, startTime: newClipStartTime, endTime: newClipStartTime + DEFAULT_CLIP_DURATION,
                duration: DEFAULT_CLIP_DURATION, position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 },
                rotation: 0, opacity: 1, keyframes: {}, name: "Text Clip",
                originalWidth: 300, originalHeight: 80,
            };
            let updatedTracks = [...prev.tracks];
            if (targetTrackIndex === -1) {
                updatedTracks.push({ id: targetTrackId, clips: [newTextClip] });
            }
            else {
                const currentClips = [...updatedTracks[targetTrackIndex].clips, newTextClip];
                currentClips.sort((a, b) => a.startTime - b.startTime); // Ensure clips stay sorted
                updatedTracks[targetTrackIndex] = { ...updatedTracks[targetTrackIndex], clips: currentClips };
            }
            const newTotalDuration = this.calculateTotalDuration(updatedTracks);
            return { ...prev, tracks: updatedTracks, totalDuration: newTotalDuration, selectedClipId: newTextClip.id };
        });
        message.success("Text clip added");
    }

    public handleDeleteClip(currentProjectState: EditorProjectState, mediaElements: MediaElementsRef): void {
        if (!currentProjectState.selectedClipId) return;

        const clipToDelete = currentProjectState.tracks.flatMap(t => t.clips).find(c => c.id === currentProjectState.selectedClipId);
        const isSubtitleClip = clipToDelete?.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === clipToDelete.id);

        if (isSubtitleClip) {
            console.warn(`Attempted to delete a subtitle clip (ID: ${currentProjectState.selectedClipId}) via clip handler.`);
            return;
        }

        const clipName = clipToDelete?.name || 'Clip';

        this.setProjectState(prev => {
            const updatedTracks = prev.tracks.map(track => ({
                ...track,
                clips: track.clips.filter(clip => clip.id !== prev.selectedClipId)
            }))
                .filter((track, index, arr) => track.clips.length > 0 || arr.length === 1);

            if (updatedTracks.length === 0) {
                updatedTracks.push({ id: `track-${Date.now()}`, clips: [] });
            }

            const newTotalDuration = this.calculateTotalDuration(updatedTracks);

            // Cleanup associated media element - use the *passed* mediaElements
            if (mediaElements[prev.selectedClipId!]) {
                const el = mediaElements[prev.selectedClipId!];
                if (el instanceof HTMLVideoElement) { el.pause(); el.removeAttribute('src'); el.load(); }
                if ((el instanceof HTMLVideoElement || el instanceof HTMLImageElement) && el.src && el.src.startsWith('blob:')) {
                    try { URL.revokeObjectURL(el.src); } catch(e) { console.warn("Error revoking blob URL during delete:", e); }
                }
                if (el.parentNode === document.body) el.remove();
                delete mediaElements[prev.selectedClipId!]; // Remove from the passed ref value
                console.log(`Cleaned up media element for deleted clip ${prev.selectedClipId}`);
            }

            // Cleanup associated media asset
            const asset = prev.mediaAssets.find(a =>
                a.secureUrl === clipToDelete?.source || a.objectURL === clipToDelete?.source
            );
            const isLastClipUsingAsset = asset && !updatedTracks.flatMap(t => t.clips).some(c => c.source === asset.secureUrl || c.source === asset.objectURL);

            if (isLastClipUsingAsset) {
                console.log(`Removing unused media asset ${asset.name}`);
                if (asset.objectURL && asset.objectURL.startsWith('blob:')) {
                    try { URL.revokeObjectURL(asset.objectURL); } catch(e) { console.warn("Error revoking asset blob URL during delete:", e); }
                }
                const updatedMediaAssets = prev.mediaAssets.filter(a => a.id !== asset.id);
                return {
                    ...prev,
                    tracks: updatedTracks,
                    mediaAssets: updatedMediaAssets,
                    totalDuration: newTotalDuration,
                    selectedClipId: null
                };
            }

            return {
                ...prev,
                tracks: updatedTracks,
                totalDuration: newTotalDuration,
                selectedClipId: null
            };
        });
        message.success(`${clipName} deleted.`);
    }

    public updateSelectedClipProperty(
        propUpdates: Partial<Omit<Clip, 'keyframes' | 'id' | 'trackId' | 'type' | 'source' | 'duration' | 'startTime' | 'endTime' | 'thumbnailUrls' | 'originalWidth' | 'originalHeight' | 'name' | 'secureUrl'>>,
        currentProjectState: EditorProjectState // Pass current state
    ): void {
        if (!currentProjectState.selectedClipId) return;
        const selectedClipActual = currentProjectState.tracks.flatMap(t => t.clips).find(c => c.id === currentProjectState.selectedClipId);
        const selectedIsSubtitleClip = selectedClipActual?.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === currentProjectState.selectedClipId);
        if (selectedIsSubtitleClip) {
            console.warn(`Attempted to update non-text properties of a subtitle clip (ID: ${currentProjectState.selectedClipId}).`);
            return;
        }

        this.setProjectState(prev => ({
            ...prev,
            tracks: prev.tracks.map(track => ({
                ...track,
                clips: track.clips.map(clip => clip.id === prev.selectedClipId ? { ...clip, ...propUpdates } : clip)
            }))
        }));
    }

    public updateSelectedClipText(newText: string, currentProjectState: EditorProjectState): void {
        if (!currentProjectState.selectedClipId) return;
        const selectedClipActual = currentProjectState.tracks.flatMap(t => t.clips).find(c => c.id === currentProjectState.selectedClipId);
        const selectedIsSubtitleClip = selectedClipActual?.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === currentProjectState.selectedClipId);

        if (selectedClipActual?.type === 'text' && !selectedIsSubtitleClip) {
            this.setProjectState(prev => ({
                ...prev,
                tracks: prev.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(clip => clip.id === prev.selectedClipId ? { ...clip, source: newText } : clip)
                }))
            }));
        } else if (selectedIsSubtitleClip) {
            console.warn(`Attempted to update text of a subtitle clip (ID: ${currentProjectState.selectedClipId}) via clip handler.`);
        } else {
            console.warn(`Attempted to update text of a non-text clip (ID: ${currentProjectState.selectedClipId}, type: ${selectedClipActual?.type}).`);
        }
    }

    public addOrUpdateKeyframe(
        propName: keyof Clip['keyframes'],
        currentTime: number,
        selectedClip: Clip | null, // Pass the current selected clip
        currentProjectState: EditorProjectState // Pass current state
    ): void {
        if (!selectedClip) return;
        const selectedIsSubtitleClip = selectedClip.type === 'text' && currentProjectState.subtitles.some(sub => sub.id === selectedClip.id);
        if (selectedIsSubtitleClip) {
            console.warn(`Attempted to add keyframe to a subtitle clip (ID: ${selectedClip.id}).`);
            return;
        }

        this.setProjectState(prev => {
            let trackIndex = -1; let clipIndex = -1;
            for (let ti = 0; ti < prev.tracks.length; ti++) {
                const ci = prev.tracks[ti].clips.findIndex(c => c.id === selectedClip.id);
                if (ci !== -1) { trackIndex = ti; clipIndex = ci; break; }
            }
            if (trackIndex === -1 || clipIndex === -1) return prev;

            const clipToUpdate = prev.tracks[trackIndex].clips[clipIndex];

            let propKey: 'position' | 'scale' | 'rotation' | 'opacity' | null = null;
            if (propName === 'position' || propName === 'scale' || propName === 'rotation' || propName === 'opacity') {
                propKey = propName;
            }

            if (!propKey || !(propKey in clipToUpdate)) {
                console.error(`Attempted to add keyframe for invalid or non-animatable property: ${propName}`);
                return prev;
            }

            const defaultValue = clipToUpdate[propKey as 'position' | 'scale' | 'rotation' | 'opacity']; // Cast for type safety

            let currentValue;
            if (typeof defaultValue === 'object' && defaultValue !== null && 'x' in defaultValue && 'y' in defaultValue) {
                currentValue = interpolateValue(clipToUpdate.keyframes?.[propName as 'position' | 'scale'], currentTime, defaultValue as { x: number, y: number });
            } else if (typeof defaultValue === 'number') {
                currentValue = interpolateValue(clipToUpdate.keyframes?.[propName as 'rotation' | 'opacity'], currentTime, defaultValue as number);
            } else {
                console.error(`Unhandled property type for keyframe: ${propName}`, defaultValue);
                return prev;
            }

            const newKf: Keyframe = { time: currentTime, value: currentValue };

            const existingKfs = clipToUpdate.keyframes?.[propName] || [];
            const filteredKfs = existingKfs.filter(kf => Math.abs(kf.time - currentTime) > 0.0001);
            const updatedPropertyKeyframes = [...filteredKfs, newKf].sort((a, b) => a.time - b.time);

            const updatedKeyframes = { ...clipToUpdate.keyframes, [propName]: updatedPropertyKeyframes };
            const updatedClip = { ...clipToUpdate, keyframes: updatedKeyframes };

            const updatedClips = [...prev.tracks[trackIndex].clips];
            updatedClips[clipIndex] = updatedClip;
            const updatedTrack = { ...prev.tracks[trackIndex], clips: updatedClips };
            const updatedTracks = [...prev.tracks];
            updatedTracks[trackIndex] = updatedTrack;

            return { ...prev, tracks: updatedTracks };
        });
        message.success(`Keyframe added for ${propName}`);
    }

    public handleProcessMediaFinish(file: File, secureUrl: string, currentProjectState: EditorProjectState): void {
        console.log("ClipManager: handleProcessMediaFinish called for file:", file.name, "with secureUrl:", secureUrl);
        const fileType: ClipType = file.type.startsWith('video') ? 'video' : 'image';

        const existingAssetIndex = currentProjectState.mediaAssets.findIndex(asset => asset.file === file);
        const existingAsset = existingAssetIndex !== -1 ? currentProjectState.mediaAssets[existingAssetIndex] : undefined;

        if (!existingAsset) {
            console.error("ClipManager Error: handleProcessMediaFinish called for a file with no existing asset.");
            message.error(`Internal error: Asset not found for ${file.name}.`);
            this.setProjectState(prev => ({
                ...prev,
                uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00',
            }));
            return;
        }

        this.setProjectState(prev => {
            let newClipStartTime = 0;
            prev.tracks.forEach(track => track.clips.forEach(clip => newClipStartTime = Math.max(newClipStartTime, clip.endTime)));
            const firstTrackId = prev.tracks[0]?.id || `track-${Date.now()}`;
            const targetTrackIndex = prev.tracks.findIndex(t => t.id === firstTrackId);
            const targetTrackId = targetTrackIndex !== -1 ? prev.tracks[targetTrackIndex].id : firstTrackId;

            const newClip: Clip = {
                id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: fileType,
                source: secureUrl,
                trackId: targetTrackId,
                startTime: newClipStartTime,
                duration: fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01,
                endTime: newClipStartTime + (fileType === 'image' ? DEFAULT_CLIP_DURATION : 0.01),
                position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, keyframes: {},
                name: file.name,
                thumbnailUrls: fileType === 'image' ? [{ time: 0, url: secureUrl }] : [],
                originalWidth: 0, originalHeight: 0,
                secureUrl: secureUrl
            };

            let updatedTracks = [...prev.tracks];
            if (targetTrackIndex === -1) {
                updatedTracks.push({ id: targetTrackId, clips: [newClip] });
            } else {
                const currentClips = [...updatedTracks[targetTrackIndex].clips, newClip];
                currentClips.sort((a, b) => a.startTime - b.startTime);
                updatedTracks[targetTrackIndex] = { ...updatedTracks[targetTrackIndex], clips: currentClips };
            }

            const updatedMediaAssets = [...prev.mediaAssets];
            if (existingAssetIndex !== -1) {
                const assetToUpdate = updatedMediaAssets[existingAssetIndex];
                // Revoke the blob URL now that the secure URL is available
                if (assetToUpdate.objectURL && assetToUpdate.objectURL.startsWith('blob:')) {
                    // FIX: Corrected typo assetToToUpdate to assetToUpdate
                    try { URL.revokeObjectURL(assetToUpdate.objectURL); } catch(e) { console.warn("Error revoking asset object URL after finish:", e); }
                }
                updatedMediaAssets[existingAssetIndex] = {
                    ...assetToUpdate,
                    secureUrl: secureUrl,
                    objectURL: undefined,
                };
            }

            const newTotalDuration = this.calculateTotalDuration(updatedTracks);

            return {
                ...prev,
                mediaAssets: updatedMediaAssets,
                tracks: updatedTracks,
                totalDuration: Math.max(prev.totalDuration, newTotalDuration),
                selectedClipId: newClip.id,
                uploadProgress: 0, uploadingFile: null, currentUploadTaskId: null, uploadTimeRemaining: '00:00',
            };
        });
        message.success(`Added ${file.name} to timeline.`);
    }
}