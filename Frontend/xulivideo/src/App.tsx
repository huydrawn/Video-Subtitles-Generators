import React from 'react';
import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Video from './Components/VideoPage/index'; // Assuming you named your main app component VideoStreamingApp
import UploadPage from './Components/VideoPage/upload'; // Assuming you named your upload component UploadPage
import SummaryPage from './Components/VideoPage/summary'; // Assuming you named your summary component SummaryPage
import TextEditorPage from './Components/VideoPage/texteditor'; // Assuming you named your summary component SummaryPage

function App() {
  return (
      <BrowserRouter>
        <Routes>
          {/* Route for the main Video Streaming App page */}
          <Route path="/" element={<Video />} />

          {/* Route for the Video Upload Page */}
          <Route path="/upload" element={<UploadPage />} />

          {/* Route for the Video Summary Page */}
          <Route path="/summary" element={<SummaryPage />} />
            <Route path="/texteditor" element={<TextEditorPage />} />
          {/* Redirect any unmatched route to the home page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
  );
}

export default App;