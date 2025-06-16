import React from 'react';
import './home.css'; // We'll create this CSS file next

const Home: React.FC = () => {
    return (
        <div className="kapwing-landing-page">
            {/* Header */}
            <header className="header">
                <div className="header-left">
                    {/* Replace with SVG logo if available */}
                    <div className="logo">
                        <span className="logo-bar logo-bar-1"></span>
                        <span className="logo-bar logo-bar-2"></span>
                        <span className="logo-bar logo-bar-3"></span>
                        <span className="logo-bar logo-bar-4"></span>
                        <span className="logo-text">KAPWING</span>
                    </div>
                    <nav className="nav-links">
                        <a href="#">Tools <span className="dropdown-arrow">▾</span></a>
                        <a href="#">AI <span className="dropdown-arrow">▾</span></a>
                        <a href="#">Solutions <span className="dropdown-arrow">▾</span></a>
                        <a href="#">Learn <span className="dropdown-arrow">▾</span></a>
                        <a href="#">Pricing</a>
                    </nav>
                </div>
                <div className="header-right">
                    <a href="#" className="request-demo">Request a Demo</a>
                    <a href="/signin" className="sign-in">Sign In</a>
                    <a href="#" className="try-kapwing-free">Try Kapwing Free</a>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <h1 className="headline">
                    Create <span className="color-more">more</span> <span className="color-content">content</span> in <span className="color-time">less time</span>
                </h1>
                <p className="description">
                    Kapwing is a modern video creation platform <br />
                    that helps teams make great content faster.
                </p>
                <a href="/login" className="get-started-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="upload-icon">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Get started
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </a>
            </section>

            {/* Video Section */}
            <section className="video-section">
                <div className="video-player-container">
                    {/* Mock Player Interface Bar */}
                    <div className="video-player-bar">
                        <div className="project-title">
                            <span className="logo-small"></span>
                            Kapwing Team Folder Our Best Video Ever
                        </div>
                        <div className="player-controls">
                            {/* Basic placeholders */}
                            <span className="control-icon">👤</span>
                            <span className="control-icon">👤</span>
                            <span className="control-icon">👤</span>
                            <button className="share-button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                                Share
                            </button>
                            <button className="export-button">Export Project <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></button>
                        </div>
                    </div>

                    {/* Video Element */}
                    <div className="video-content">
                        <video
                            className="hero-video"
                            src="https://cdn-useast1.kapwing.com/static/9i6-homepage-hero_1.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline // Recommended for mobile autoplay
                        >
                            Your browser does not support the video tag.
                        </video>

                        {/* Video Overlay - Mockup */}
                        <div className="video-overlay">
                            <div className="overlay-box">
                                WHAT'S<br/>GOING<br/>ON
                            </div>
                            <div className="overlay-cursor"></div> {/* Mock cursor */}
                            <div className="overlay-label">Eric</div>
                        </div>
                    </div>

                    {/* Basic Sidebar mockup */}
                    <div className="video-sidebar">
                        <div className="sidebar-item"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"></path><line x1="8" y1="6" x2="8" y2="2"></line><line x1="16" y1="6" x2="16" y2="2"></line><line x1="2 10" y1="10" x2="22" y2="10"></line><line x1="12" y1="14" x2="12" y2="18"></line><line x1="10" y1="16" x2="14" y2="16"></line></svg> Media</div>
                        <div className="sidebar-item"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3 9" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Layers</div>
                        <div className="sidebar-item"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Text</div>
                        <div className="sidebar-item"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg> Subtitles</div>
                        <div className="sidebar-item"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg> Videos</div>
                        <div className="sidebar-item"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Images</div>
                    </div>

                </div>
            </section>
        </div>
    );
};

export default Home;