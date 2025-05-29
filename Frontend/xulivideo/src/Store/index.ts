// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../Store/useSlice'; // Adjust path

export const store = configureStore({
    reducer: {
        user: userReducer,
        // Add other reducers here if you have more slices
    },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;