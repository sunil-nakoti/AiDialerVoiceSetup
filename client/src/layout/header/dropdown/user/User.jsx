import React, { useState, useEffect } from "react";
import { DropdownToggle, DropdownMenu, Dropdown } from "reactstrap";
import { Icon } from "@/components/Component";
import { LinkList, LinkItem } from "@/components/links/Links";
import UserAvatar from "@/components/user/UserAvatar";
import { useTheme, useThemeUpdate } from "@/layout/provider/Theme";
import { useNavigate } from "react-router-dom";

const User = () => {
  const theme = useTheme();
  const themeUpdate = useThemeUpdate();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((prevState) => !prevState);
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogout = async () => {
    let userRole = null;
    const storedUserOnLogout = localStorage.getItem('user');
    if (storedUserOnLogout) {
      try {
        const user = JSON.parse(storedUserOnLogout);
        if (user && user.role) {
          userRole = user.role;
        }
      } catch (error) {
        console.error("Error parsing user data from localStorage during logout:", error);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error("Error calling backend logout endpoint:", error);
    }

    if (userRole === 'agent') {
      navigate('/agent-login');
    } else {
      navigate('/auth-login');
    }
  };

  const userFullName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'User';
  const userEmail = currentUser ? currentUser.email : 'user@example.com';
  const userInitials = currentUser && currentUser.firstName && currentUser.lastName
    ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase()
    : '??';

  return (
    <Dropdown isOpen={open} className="user-dropdown" toggle={toggle}>
      <DropdownToggle
        tag="a"
        href="#toggle"
        className="dropdown-toggle"
        onClick={(ev) => {
          ev.preventDefault();
        }}
        >
         <div className="user-toggle">
        <UserAvatar icon="user-alt" className="sm" />
        <div className="user-info d-none d-md-block">
          <div className="user-name dropdown-indicator">{userFullName || "User"}</div>
        </div>
      </div>
      </DropdownToggle>

      <DropdownMenu end className="dropdown-menu-md dropdown-menu-s1">
        <div className="dropdown-inner user-card-wrap bg-lighter d-none d-md-block">
          <div className="user-card sm">
            <UserAvatar icon="user-alt" className="sm" />
            <div className="user-info">
              <span className="lead-text">{userFullName}</span>
              <span className="sub-text">{userEmail}</span>
            </div>
          </div>
        </div>

        <div className="dropdown-inner">
          <LinkList>
            <LinkItem link="/user-profile-regular" icon="user-alt" onClick={toggle}>
              View Profile
            </LinkItem>
            <LinkItem link="/user-profile-setting" icon="setting-alt" onClick={toggle}>
              Account Setting
            </LinkItem>
          </LinkList>
        </div>

        {/* SIGN OUT SECTION - IMPROVED */}
        <div className="dropdown-inner">
          <div
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              gap: "10px",
              color: "#e74c3c", // Red for emphasis
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f6fa"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <Icon name="signout" />
            <span>Sign Out</span>
          </div>
        </div>
      </DropdownMenu>
    </Dropdown>
  );
};

export default User;
