// File: src/App.tsx (or wherever your main App component is)

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import the ProtectedRoute component (ensure this file is saved as auth.tsx)
import ProtectedRoute from './Components/Auth/auth';

// Import components directly (as they were in your original second App.tsx)
import VideoPage from './Components/VideoPage/index'; // Using VideoPage as consistent name
import UploadPage from './Components/VideoPage/upload';
import SummaryPage from './Components/VideoPage/summary';
import VideoEditorPage from './Components/VideoPage/VideoEditor';
import AuthenticatePage from './Components/Auth/AuthenticatePage';
import HomePage from './Components/VideoPage/home'; // This is your Kapwing-like page
import NewHomePage from './Components/VideoPage/index'; // This is your Kapwing-like page
import OAuth2Page from './Components/Auth/OAuth2RedirectPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* --- Routes NOT requiring protection --- */}

                {/* The root path "/" should show HomePage and is NOT protected */}
                <Route path="/" element={<HomePage />} />

                {/* Authentication routes are typically NOT protected by a login-redirect rule */}
                <Route path="/login" element={<AuthenticatePage />} />
                <Route path="/register" element={<AuthenticatePage />} />
                <Route path="/oauth2/redirect" element={<OAuth2Page />} />
                {/* --- Routes REQUIRING protection --- */}
                {/* Wrap the target component with ProtectedRoute for these paths */}
                <Route
                    path="/index"
                    element={<ProtectedRoute component={NewHomePage} />}
                />
                {/* /video route */}
                <Route
                    path="/video"
                    element={<ProtectedRoute component={VideoPage} />}
                />

                {/* /upload route */}
                <Route
                    path="/upload"
                    element={<ProtectedRoute component={UploadPage} />}
                />

                {/* /summary route */}
                <Route
                    path="/summary"
                    element={<ProtectedRoute component={SummaryPage} />}
                />

                {/* /videoeditor route */}
                <Route
                    path="/videoeditor"
                    element={<ProtectedRoute component={VideoEditorPage} />}
                />
                <Route
                    path="/"
                    element={<ProtectedRoute component={UploadPage} />}
                />

                {/* --- Catch-all Route --- */}
                {/* Redirect any unmatched route to the unprotected home page "/" */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;