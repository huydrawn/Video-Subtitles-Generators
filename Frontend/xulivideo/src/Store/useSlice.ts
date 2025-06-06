// src/features/user/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../Services/apiService'; // Adjust path if necessary
import { UserDTO, Project, Workspace } from '../Components/VideoPage'; // Adjust path and import necessary types
// Swal and NavigateFunction are not directly used in the slice but might be in components calling these thunks
// import Swal from 'sweetalert2';
// import { NavigateFunction } from 'react-router-dom';

// Define the state structure for this slice
interface UserState {
    userData: UserDTO | null;
    projects: Project[];
    isLoading: boolean; // For initial data fetch
    isSubmitting: boolean; // For create project specifically
    isProjectActionLoading: boolean; // For rename/delete project actions
    error: string | null;
}

const initialState: UserState = {
    userData: null,
    projects: [],
    isLoading: false,
    isSubmitting: false,
    isProjectActionLoading: false,
    error: null,
};

// --- Async Thunks ---

// Thunk for fetching user data (includes workspace and projects)
export const fetchUserData = createAsyncThunk<
    UserDTO,
    void,
    { rejectValue: string }
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
    Project,
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
            // ... (error handling as before)
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

// Thunk for renaming a project
interface RenameProjectArgs {
    workspacePublicId: string;
    projectPublicId: string;
    newName: string;
}

export const renameProject = createAsyncThunk<
    Project, // Assuming the backend returns the updated project or at least a success status
    RenameProjectArgs,
    { rejectValue: string }
>(
    'user/renameProject',
    async ({ workspacePublicId, projectPublicId, newName }, { rejectWithValue, getState }) => {
        try {
            const apiUrl = `/workspace/${workspacePublicId}/projects/${projectPublicId}`;
            // The backend expects a RenameRequest DTO with newName
            await apiService.post(apiUrl, { newName }); // Assuming POST returns 200 OK without a body, or use a specific type if it returns the project

            // Optimistically create the updated project data for the store
            // Or, if backend returns the updated project, use that.
            // For this example, we'll find the project and update its name locally.
            const state = getState() as { user: UserState };
            const projectToUpdate = state.user.projects.find(p => p.publicId === projectPublicId);
            if (!projectToUpdate) {
                throw new Error("Project not found in state for optimistic update.");
            }
            return { ...projectToUpdate, projectName: newName, updatedAt: new Date().toISOString() };

        } catch (err: any) {
            let errorMessage = "Failed to rename project.";
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


// Thunk for deleting a project
interface DeleteProjectArgs {
    workspacePublicId: string;
    projectPublicId: string;
}

export const deleteProject = createAsyncThunk<
    string, // Return projectPublicId on success for easy removal
    DeleteProjectArgs,
    { rejectValue: string }
>(
    'user/deleteProject',
    async ({ workspacePublicId, projectPublicId }, { rejectWithValue }) => {
        try {
            const apiUrl = `/workspace/${workspacePublicId}/projects/${projectPublicId}`;
            // The backend expects a RenameRequest DTO even for delete, which is unusual.
            // We send a dummy body. If your apiService.delete is axios.delete(url, { data: body }), use that.
            // Otherwise, if it's apiService.delete(url, body), this should work.
            // Let's assume apiService.delete can take a body. If not, this needs adjustment.
            // Based on the Java controller: @RequestBody RenameRequest request
            // We must send a body.
            await apiService.delete(apiUrl, { data: { newName: "" } });
            return projectPublicId;
        } catch (err: any) {
            let errorMessage = "Failed to delete project.";
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
        clearError: (state) => {
            state.error = null;
        },
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
                if (action.payload?.includes("session has expired") || action.payload?.includes("Unauthorized")) {
                    state.userData = null;
                    state.projects = [];
                }
            })
            // Create Project
            .addCase(createProject.pending, (state) => {
                state.isSubmitting = true;
                state.error = null;
            })
            .addCase(createProject.fulfilled, (state, action: PayloadAction<Project>) => {
                state.isSubmitting = false;
                state.projects = [action.payload, ...state.projects].sort((a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
                if (state.userData && state.userData.workspace) {
                    state.userData.workspace.projects = state.projects;
                }
            })
            .addCase(createProject.rejected, (state, action) => {
                state.isSubmitting = false;
                state.error = action.payload || 'Failed to create project';
            })
            // Rename Project
            .addCase(renameProject.pending, (state) => {
                state.isProjectActionLoading = true;
                state.error = null;
            })
            .addCase(renameProject.fulfilled, (state, action: PayloadAction<Project>) => {
                state.isProjectActionLoading = false;
                const updatedProject = action.payload;
                state.projects = state.projects.map(p =>
                    p.publicId === updatedProject.publicId ? updatedProject : p
                ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                if (state.userData && state.userData.workspace) {
                    state.userData.workspace.projects = state.projects;
                }
            })
            .addCase(renameProject.rejected, (state, action) => {
                state.isProjectActionLoading = false;
                state.error = action.payload || 'Failed to rename project';
            })
            // Delete Project
            .addCase(deleteProject.pending, (state) => {
                state.isProjectActionLoading = true;
                state.error = null;
            })
            .addCase(deleteProject.fulfilled, (state, action: PayloadAction<string>) => {
                state.isProjectActionLoading = false;
                const deletedProjectPublicId = action.payload;
                state.projects = state.projects.filter(p => p.publicId !== deletedProjectPublicId);
                if (state.userData && state.userData.workspace) {
                    state.userData.workspace.projects = state.projects;
                }
            })
            .addCase(deleteProject.rejected, (state, action) => {
                state.isProjectActionLoading = false;
                state.error = action.payload || 'Failed to delete project';
            });
    },
});

export const { clearError, logoutUser } = userSlice.actions;
export default userSlice.reducer;