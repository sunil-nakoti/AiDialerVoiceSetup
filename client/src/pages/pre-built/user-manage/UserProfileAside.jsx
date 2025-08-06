// frontend/src/pages/user-profile/UserProfileAside.jsx
import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Icon, UserAvatar } from "@/components/Component";
import { DropdownItem, UncontrolledDropdown, DropdownMenu, DropdownToggle } from "reactstrap";

// UserProfileAside now accepts 'currentUser' as a prop
const UserProfileAside = ({ updateSm, sm, currentUser }) => {

  // Derive display values based on currentUser and its role
  const displayFullName = currentUser
    ? currentUser.role === 'admin'
      ? currentUser.name || 'Admin User'
      : `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Agent User'
    : 'Guest User'; // Fallback if currentUser is null/undefined

  const displayEmail = currentUser ? currentUser.email : 'guest@example.com'; // Fallback

  const displayInitials = currentUser
    ? currentUser.role === 'admin'
      ? currentUser.name?.charAt(0)?.toUpperCase() || 'A' // Use first letter of 'name' for admin
      : (currentUser.firstName?.charAt(0) || '') + (currentUser.lastName?.charAt(0) || '')?.toUpperCase() || 'AG' // Use initials for agent
    : 'GU'; // Fallback

  useEffect(() => {
    // This effect handles adding/removing 'toggle-shown' class to body for mobile sidebar
    sm ? document.body.classList.add("toggle-shown") : document.body.classList.remove("toggle-shown");
  }, [sm]);

  return (
    <div className="card-inner-group">
      <div className="card-inner">
        <div className="user-card">
          {/* UserAvatar now uses dynamically derived initials */}
          <UserAvatar text={displayInitials} theme="primary" />
          <div className="user-info">
            {/* Display dynamically derived full name and email */}
            <span className="lead-text">{displayFullName}</span>
            <span className="sub-text">{displayEmail}</span>
          </div>
          <div className="user-action">
            <UncontrolledDropdown>
              <DropdownToggle tag="a" className="btn btn-icon btn-trigger me-n2">
                <Icon name="more-v"></Icon>
              </DropdownToggle>
              <DropdownMenu end>
                <ul className="link-list-opt no-bdr">
                  <li>
                    <DropdownItem
                      tag="a"
                      href="#dropdownitem"
                      onClick={(ev) => {
                        ev.preventDefault();
                        // Add logic for changing photo if applicable
                      }}
                    >
                      <Icon name="camera-fill"></Icon>
                      <span>Change Photo</span>
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem
                      tag="a"
                      href="#dropdownitem"
                      onClick={(ev) => {
                        ev.preventDefault();
                        // Add logic for updating profile, perhaps open the modal
                      }}
                    >
                      <Icon name="edit-fill"></Icon>
                      <span>Update Profile</span>
                    </DropdownItem>
                  </li>
                </ul>
              </DropdownMenu>
            </UncontrolledDropdown>
          </div>
        </div>
      </div>
      {/* <div className="card-inner">
        <div className="user-account-info py-0">
          <h6 className="overline-title-alt">Nio Wallet Account</h6>
          <div className="user-balance">
            12.395769 <small className="currency currency-btc">BTC</small>
          </div>
          <div className="user-balance-sub">
            Locked{" "}
            <span>
              0.344939 <span className="currency currency-btc">BTC</span>
            </span>
          </div>
        </div>
      </div> */}
      <div className="card-inner p-0">
        <ul className="link-list-menu">
          {/* NavLinks updated to use dynamic routing and active class */}
          <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-regular`}>
              <Icon name="user-fill-c"></Icon>
              <span>Personal Information</span>
            </NavLink>
          </li>
          <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-notification`}>
              <Icon name="bell-fill"></Icon>
              <span>Notification</span>
            </NavLink>
          </li>
          {/* <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-activity`}>
              <Icon name="activity-round-fill"></Icon>
              <span>Account Activity</span>
            </NavLink>
          </li> */}
          <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-setting`}>
              <Icon name="lock-alt-fill"></Icon>
              <span>Security Setting</span>
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default UserProfileAside;
