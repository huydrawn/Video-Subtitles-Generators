// src/features/user/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../Services/apiService'; // Adjust path if necessary
import { UserDTO, Project, Workspace } from '../Components/VideoPage'; // Adjust path and import necessary types
import Swal from 'sweetalert2';
import { NavigateFunction } from 'react-router-dom'; // For navigation in thunks

// Define the state structure for this slice
interface UserState {
    userData: UserDTO | null;
    projects: Project[];
    isLoading: boolean;
    isSubmitting: boolean; // For create project specifically
    error: string | null;
}

const initialState: UserState = {
    userData: null,
    projects: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
};

// --- Async Thunks ---

// Thunk for fetching user data (includes workspace and projects)
export const fetchUserData = createAsyncThunk<
    UserDTO, // Return type of the payload creator
    void,    // First argument to the payload creator (not used here)
    { rejectValue: string } // Types for ThunkAPI
>(
    'user/fetchUserData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiService.get<UserDTO>("/users");
            return response.data;
        } catch (err: any) {
            let errorMessage = "Failed to fetch user data.";
            if (err.response) {
                if (err.response.status === 401 || err.response.status === 403) {
                    errorMessage = "Your session has expired. Please log in again.";
                    localStorage.removeItem('accessToken');
                    // Consider navigating to login here or handling globally
                } else if (err.response.data && err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else {
                    errorMessage = `Server error: ${err.response.status}`;
                }
            } else if (err.request) {
                errorMessage = "Network error: No response from server.";
            } else {
                errorMessage = `An unexpected error occurred: ${err.message}`;
            }
            return rejectWithValue(errorMessage);
        }
    }
);

// Thunk for creating a new project
interface CreateProjectArgs {
    workspacePublicId: string;
    projectName: string;
    description: string;
}

export const createProject = createAsyncThunk<
    Project, // Return type: the newly created project
    CreateProjectArgs,
    { rejectValue: string }
>(
    'user/createProject',
    async ({ workspacePublicId, projectName, description }, { rejectWithValue }) => {
        try {
            const apiUrl = `/workspace/${workspacePublicId}/projects`;
            const response = await apiService.post<Project>(apiUrl, { projectName, description });
            return response.data;
        } catch (err: any) {
            let errorMessage = "Failed to create project.";
            if (err.response) {
                if (err.response.status === 401 || err.response.status === 403) {
                    errorMessage = "You are not authorized. Please log in again.";
                    localStorage.removeItem('accessToken');
                } else if (err.response.data?.message) {
                    errorMessage = err.response.data.message;
                } else {
                    errorMessage = `Server responded with status: ${err.response.status}`;
                }
            } else if (err.request) {
                errorMessage = "Network error. Is the backend running?";
            } else {
                errorMessage = `Unexpected error: ${err.message}`;
            }
            return rejectWithValue(errorMessage);
        }
    }
);

// --- Slice Definition ---
const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        // Standard reducer for clearing error (optional)
        clearError: (state) => {
            state.error = null;
        },
        // Potentially a reducer to handle logout if needed
        logoutUser: (state) => {
            state.userData = null;
            state.projects = [];
            localStorage.removeItem('accessToken');
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch User Data
            .addCase(fetchUserData.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserData.fulfilled, (state, action: PayloadAction<UserDTO>) => {
                state.isLoading = false;
                state.userData = action.payload;
                if (action.payload?.workspace?.projects) {
                    state.projects = action.payload.workspace.projects.sort((a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                } else {
                    state.projects = [];
                }
            })
            .addCase(fetchUserData.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Failed to fetch user data';
                // If 401/403, user data should be cleared
                if (action.payload?.includes("session has expired") || action.payload?.includes("Unauthorized")) {
                    state.userData = null;
                    state.projects = [];
                }
            })
            // Create Project
            .addCase(createProject.pending, (state) => {
                state.isSubmitting = true;
                state.error = null; // Clear previous errors
            })
            .addCase(createProject.fulfilled, (state, action: PayloadAction<Project>) => {
                state.isSubmitting = false;
                // Add the new project to the beginning of the projects array
                state.projects = [action.payload, ...state.projects];
                // Optionally, update the userData.workspace.projects if it's directly mutated
                // This ensures consistency if other parts of the app rely on userData.workspace.projects
                if (state.userData && state.userData.workspace) {
                    state.userData.workspace.projects = state.projects;
                }
            })
            .addCase(createProject.rejected, (state, action) => {
                state.isSubmitting = false;
                state.error = action.payload || 'Failed to create project';
            });
    },
});

export const { clearError, logoutUser } = userSlice.actions;
export default userSlice.reducer;