import { Dispatch, SetStateAction } from 'react';
import type { EditorProjectState, Track } from '../../Components/VideoPage/types'; // Assuming types are imported
import { calculateTotalDuration } from '../../Components/VideoPage/utils' // Import utility

// This class *could* wrap the useState logic, but often in hooks
// it's simpler to keep useState in the hook and pass the setter.
// Let's design this to receive the state and setter.

export class ProjectStateStore {
    private projectState: EditorProjectState;
    private setProjectState: Dispatch<SetStateAction<EditorProjectState>>;
    private setEditorState: Dispatch<SetStateAction<'initial' | 'uploading' | 'transcribing' | 'editor'>>;
    private setCurrentTime: Dispatch<SetStateAction<number>>;
    private setTimelineZoom: Dispatch<SetStateAction<number>>;
    private setSelectedMenuKey: Dispatch<SetStateAction<string>>;
    private setMobileDrawerVisible: Dispatch<SetStateAction<boolean>>;


    constructor(
        projectState: EditorProjectState,
        setProjectState: Dispatch<SetStateAction<EditorProjectState>>,
        setEditorState: Dispatch<SetStateAction<'initial' | 'uploading' | 'transcribing' | 'editor'>>,
        currentTime: number, // Pass current time for context if needed in internal calculations
        setCurrentTime: Dispatch<SetStateAction<number>>,
        timelineZoom: number, // Pass zoom for context
        setTimelineZoom: Dispatch<SetStateAction<number>>,
        selectedMenuKey: string,
        setSelectedMenuKey: Dispatch<SetStateAction<string>>,
        mobileDrawerVisible: boolean,
        setMobileDrawerVisible: Dispatch<SetStateAction<boolean>>,
        // ... other state dependencies maybe?
    ) {
        this.projectState = projectState;
        this.setProjectState = setProjectState;
        this.setEditorState = setEditorState;
        this.setCurrentTime = setCurrentTime;
        this.setTimelineZoom = setTimelineZoom;
        this.setSelectedMenuKey = setSelectedMenuKey;
        this.setMobileDrawerVisible = setMobileDrawerVisible;
        // Store state values if needed for internal checks, but rely on passed state for updates
    }

    // Example method to update projectState
    public updateProjectState(updater: (prevState: EditorProjectState) => EditorProjectState): void {
        this.setProjectState(prevState => {
            const newState = updater(prevState);
            // Add logic here to ensure total duration is updated if tracks changed
            // This might be better handled by the ClipManager after clip updates
            // Or make calculateTotalDuration a method here. Let's add it here.
            const totalDurationMaybeChanged = prevState.tracks !== newState.tracks; // Simple check
            if (totalDurationMaybeChanged) {
                newState.totalDuration = calculateTotalDuration(newState.tracks);
            }
            return newState;
        });
    }

    public setEditorStateValue(state: 'initial' | 'uploading' | 'transcribing' | 'editor'): void {
        this.setEditorState(state);
    }

    public setCurrentTimeValue(time: number): void {
        this.setCurrentTime(time);
    }

    public setTimelineZoomValue(zoom: number): void {
        this.setTimelineZoom(zoom);
    }

    public setSelectedMenuKeyValue(key: string): void {
        this.setSelectedMenuKey(key);
    }

    public setMobileDrawerVisibleValue(visible: boolean): void {
        this.setMobileDrawerVisible(visible);
    }

    // Expose utility functions if they operate on state or are tightly coupled
    public calculateTotalDuration(tracks: Track[]): number {
        return calculateTotalDuration(tracks);
    }
}