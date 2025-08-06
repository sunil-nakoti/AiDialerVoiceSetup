import React, { useState, useEffect } from "react";
import Content from "@/layout/content/Content";
import { Card, Badge } from "reactstrap";
import Head from "@/layout/head/Head";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  InputSwitch,
  Button,
} from "@/components/Component";
import UserProfileAside from "./UserProfileAside";
import ChangePasswordModal from "./ChangePasswordModal"; // Import the new modal component

const UserProfileSettingPage = () => {
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [userRole, setUserRole] = useState(null); // State to store user's role
  const [userId, setUserId] = useState(null); // State to store user's ID

  // Function to change the design view under 990 px
  const viewChange = () => {
    if (window.innerWidth < 990) {
      setMobileView(true);
    } else {
      setMobileView(false);
      updateSm(false);
    }
  };

  useEffect(() => {
    viewChange();
    window.addEventListener("load", viewChange);
    window.addEventListener("resize", viewChange);
    document.getElementsByClassName("nk-header")[0].addEventListener("click", function () {
      updateSm(false);
    });
    return () => {
      window.removeEventListener("resize", viewChange);
      window.removeEventListener("load", viewChange);
    };
  }, []);

  useEffect(() => {
    // Retrieve user role and ID from localStorage or your authentication context
    // This assumes your login process stores these.
    const storedUser = JSON.parse(localStorage.getItem('user')); // Assuming 'user' object is stored
    if (storedUser && storedUser.role) {
      setUserRole(storedUser.role);
      setUserId(storedUser._id); // Assuming user ID is stored as _id
    } else {
      console.warn("User role or ID not found in local storage. Please ensure user data is stored on login.");
      // Handle case where user data is not available (e.g., redirect to login)
    }
  }, []);

  const openChangePasswordModal = () => {
    setIsChangePasswordModalOpen(true);
  };

  const closeChangePasswordModal = (passwordChanged = false) => {
    setIsChangePasswordModalOpen(false);
    if (passwordChanged) {
      // Optionally, show a success message or refresh user data if needed
      console.log("Password change successful, modal closed.");
    }
  };

  return (
    <React.Fragment>
      <Head title="User List - Profile"></Head>
      <Content>
        <Card>
          <div className="card-aside-wrap">
            <div
              className={`card-aside card-aside-left user-aside toggle-slide toggle-slide-left toggle-break-lg ${
                sm ? "content-active" : ""
              }`}
            >
              <UserProfileAside updateSm={updateSm} sm={sm} />
            </div>
            <div className="card-inner card-inner-lg">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <BlockHead size="lg">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h4">Security Settings</BlockTitle>
                    <BlockDes>
                      <p>These settings will help you to keep your account secure.</p>
                    </BlockDes>
                  </BlockHeadContent>
                  <BlockHeadContent className="align-self-start d-lg-none">
                    <Button
                      className={`toggle btn btn-icon btn-trigger mt-n1 ${sm ? "active" : ""}`}
                      onClick={() => updateSm(!sm)}
                    >
                      <Icon name="menu-alt-r"></Icon>
                    </Button>
                  </BlockHeadContent>
                </BlockBetween>
              </BlockHead>

              <Block>
                <Card>
                  <div className="card-inner-group">
                    <div className="card-inner">
                      <div className="between-center flex-wrap flex-md-nowrap g-3">
                        <div className="nk-block-text">
                          <h6>Save my Activity Logs</h6>
                          <p>You can save your all activity logs including unusual activity detected.</p>
                        </div>
                        <div className="nk-block-actions">
                          <ul className="align-center gx-3">
                            <li className="order-md-last">
                              <div className="custom-control custom-switch me-n2">
                                <InputSwitch checked id="activity-log" />
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="card-inner">
                      <div className="between-center flex-wrap g-3">
                        <div className="nk-block-text">
                          <h6>Change Password</h6>
                          <p>Set a unique password to protect your account.</p>
                        </div>
                        <div className="nk-block-actions flex-shrink-sm-0">
                          <ul className="align-center flex-wrap flex-sm-nowrap gx-3 gy-2">
                            <li className="order-md-last">
                              {/* Button to open the password change modal */}
                              <Button color="primary" onClick={openChangePasswordModal}>
                                Change Password
                              </Button>
                            </li>
                            {/* <li>
                              <em className="text-soft text-date fs-12px">
                                Last changed: <span>Oct 2, 2019</span>
                              </em>
                            </li> */}
                          </ul>
                        </div>
                      </div>
                    </div>
                    {/* <div className="card-body">
                      <div className="between-center flex-wrap flex-md-nowrap g-3">
                        <div className="nk-block-text">
                          <h6>
                            2 Factor Auth &nbsp; <Badge color="success" className="ml-0">Enabled</Badge>
                          </h6>
                          <p>
                            Secure your account with 2FA security. When it is activated you will need to enter not only your
                            password, but also a special code using app. You will receive this code via mobile application.{" "}
                          </p>
                        </div>
                        <div className="nk-block-actions">
                          <Button color="primary">Disable</Button>
                        </div>
                      </div>
                    </div> */}
                  </div>
                </Card>
              </Block>
            </div>
          </div>
        </Card>
      </Content>

      {/* Render the ChangePasswordModal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={closeChangePasswordModal}
        userRole={userRole} // Pass the determined role
        userId={userId}     // Pass the user ID
      />
    </React.Fragment>
  );
};

export default UserProfileSettingPage;