// C:/Users/kendi/Downloads/Ai-main(sunil)/client/src/layout/sidebar/Sidebar.jsx
import React, { useState, useEffect } from "react"; // Ensure useEffect is imported
import classNames from "classnames";
import SimpleBar from "simplebar-react";
import Toggle from "./Toggle";
import { useTheme, useThemeUpdate } from '@/layout/provider/Theme';
import "@/css/sidebar.css";

const Sidebar = ({ fixed, className, menuData, ...props }) => {
    const theme = useTheme();
    const themeUpdate = useThemeUpdate();

    const [mouseEnter, setMouseEnter] = useState(false);
    const [userRole, setUserRole] = useState(null); // State to store the user's role

    const handleMouseEnter = () => setMouseEnter(true);
    const handleMouseLeave = () => setMouseLeave(false);

    useEffect(() => {
        // --- ADDED DEBUGGING CONSOLE LOGS HERE ---
        console.log("Sidebar: Checking localStorage...");
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        // console.log("Sidebar (localStorage) - 'token':", token);
        // console.log("Sidebar (localStorage) - 'user' (raw string):", storedUser);

        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                console.log("Sidebar (localStorage) - 'user' (parsed object):", user); // Log parsed object
                if (user && user.role) {
                    setUserRole(user.role);
                    console.log("User Role detected in Sidebar:", user.role);
                } else {
                    console.warn("User object in localStorage is missing 'role' property.");
                    setUserRole(null);
                }
            } catch (error) {
                console.error("Error parsing user object from localStorage in Sidebar:", error);
                setUserRole(null); // Clear role if parsing fails
            }
        } else {
            setUserRole(null); // No 'user' object in localStorage (e.g., admin login, or not logged in)
            console.log("No 'user' object found in localStorage for Sidebar. Defaulting to showing all items.");
        }
    }, []); // Empty dependency array means this runs once on component mount

    const classes = classNames({
        "nk-sidebar": true,
        "nk-sidebar-fixed": fixed,
        "nk-sidebar-active": theme.sidebarVisibility,
        "nk-sidebar-mobile": theme.sidebarMobile,
        "is-compact": theme.sidebarCompact,
        "has-hover": theme.sidebarCompact && mouseEnter,
        [`is-light`]: theme.sidebar === "white",
        [`is-${theme.sidebar}`]: theme.sidebar !== "white" && theme.sidebar !== "light",
        [`${className}`]: className,
    });

    // Filtering logic based on the userRole state
    const isAgent = userRole === 'agent';
    console.log("Sidebar - isAgent for filtering:", isAgent); // Debugging line for filtering logic

    const filteredMenuData = menuData.filter(item => {
        if (isAgent) {
            // Hide 'contacts', 'settings', and 'dnc-list' icons for agents
            const shouldHide = ['contacts', 'settings', 'dnc-list'].includes(item.icon);
            // Uncomment the line below for even more detailed debugging of each item
            // console.log(`Item: ${item.text}, Icon: ${item.icon}, Should Hide: ${shouldHide} (for agent: ${isAgent})`);
            return !shouldHide;
        }
        // For admin or other roles (or if no role is found/logged out), show all items
        return true;
    });

    return (
        <>
            <div className={classes}>
                <div
                    className="nk-sidebar-element nk-sidebar-head"
                    style={{
                        backgroundColor: "#111827",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        padding: "1rem"
                    }}
                >
                    <div className="nk-sidebar-brand">
                        <div className="logo-container d-flex align-items-center">
                            <div className="logo-icon me-2">
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 2C8.268 2 2 8.268 2 16C2 23.732 8.268 30 16 30C23.732 30 30 23.732 30 16C30 8.268 23.732 2 16 2Z" fill="#4F46E5" />
                                    <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C21.523 26 26 21.523 26 16" stroke="white" strokeWidth="2" />
                                    <path d="M20 12L12 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                    <path d="M12 12L20 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <h5 className="text-white mb-0 fw-bold">DialEdge AI</h5>
                        </div>
                    </div>
                    <div className="nk-menu-trigger me-n2">
                        <Toggle
                            className="nk-nav-toggle nk-quick-nav-icon d-xl-none me-n2"
                            icon="arrow-left"
                            click={themeUpdate.sidebarVisibility}
                        />
                        <Toggle
                            className={`nk-nav-compact nk-quick-nav-icon d-none d-xl-inline-flex ${
                                theme.sidebarCompact ? "compact-active" : ""
                            }`}
                            click={themeUpdate.sidebarCompact}
                            icon="menu"
                        />
                    </div>
                </div>

                <div
                    className="nk-sidebar-content"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{ backgroundColor: "#111827" }}
                >
                    <SimpleBar className="nk-sidebar-menu">
                        {/* Ensure filteredMenuData is passed here */}
                        <Menu data={filteredMenuData} />
                    </SimpleBar>
                </div>
            </div>

            {theme.sidebarVisibility && (
                <div
                    onClick={themeUpdate.sidebarVisibility}
                    className="nk-sidebar-overlay"
                ></div>
            )}
        </>
    );
};

// Enhanced Menu component with better hover effects (unchanged)
const Menu = ({ data }) => {
    return (
        <ul className="nk-menu">
            {data.map((item, index) => (
                <li key={index} className="nk-menu-item">
                    <a href={item.link} className="nk-menu-link22">
                        <span className="nk-menu-icon">
                            {getIcon(item.icon)}
                        </span>
                        <span className="nk-menu-text">{item.text}</span>
                    </a>
                </li>
            ))}
        </ul>
    );
};

// Function to get appropriate icons (unchanged)
const getIcon = (iconName) => {
    switch (iconName) {
        case "dashboard":
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                </svg>
            );
        case "contacts":
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            );
        case "dialer":
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
            );
        case "call-logs":
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            );
        case "dnc-list":
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 15H5l7-10z" />
                    <line x1="4" y1="21" x2="20" y2="21" />
                    <line x1="9" y1="9" x2="15" y2="9" strokeWidth="1.5" />
                </svg>
            );
        case "compliance":
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            );
        case "settings":
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            );
        default:
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                </svg>
            );
    }
};

export default Sidebar;