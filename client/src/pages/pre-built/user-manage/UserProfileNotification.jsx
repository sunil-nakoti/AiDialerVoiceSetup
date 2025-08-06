import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import { Card } from "reactstrap";
import Head from "@/layout/head/Head";
import {
  BlockBetween,
  BlockContent,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  InputSwitch,
  Button,
} from "@/components/Component";
import UserProfileAside from "./UserProfileAside";
import apiClient from "../../../utils/apiClient";
import { toast } from "react-toastify";

const UserProfileNotificationPage = () => {
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [loading, setLoading] = useState(true); // Start as true
  const [user, setUser] = useState(null); // Will hold the full user object from localStorage initially

  const [notificationSettings, setNotificationSettings] = useState({
    securityAlerts: {
      unusualActivity: true, // Default if not found
      newBrowserSignIn: false, // Default if not found
    },
    newsUpdates: {
      salesAndNews: true, // Default if not found
      newFeatures: false, // Default if not found
      accountTips: true, // Default if not found
    },
  });

  // Effect 1: Load user from localStorage and initialize settings
  useEffect(() => {
    console.log("1. Running initial useEffect to load user from localStorage.");
    const userDataString = localStorage.getItem('user'); // Use 'user' as per your localStorage data
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        setUser(userData); // Set the local user state

        // Initialize notification settings from localStorage if available
        if (userData.notifications) {
          console.log("1a. Initializing notification settings from localStorage.");
          setNotificationSettings({
            securityAlerts: {
              unusualActivity: userData.notifications.securityAlerts?.unusualActivity ?? true,
              newBrowserSignIn: userData.notifications.securityAlerts?.newBrowserSignIn ?? false,
            },
            newsUpdates: {
              salesAndNews: userData.notifications.newsUpdates?.salesAndNews ?? true,
              newFeatures: userData.notifications.newsUpdates?.newFeatures ?? false,
              accountTips: userData.notifications.accountTips?.accountTips ?? true,
            },
          });
        } else {
            console.log("1b. No notifications object in localStorage user data. Using default settings.");
        }
        // setLoading(false); // Do not set loading false here, as we might still fetch from API
      } catch (error) {
        console.error("1c. Error parsing user data from localStorage:", error);
        toast.error("Failed to load user session. Please log in again.");
        setLoading(false); // Error parsing, stop loading
      }
    } else {
      console.log("1d. No user data found in localStorage. Stopping loading.");
      setLoading(false); // No user data, so stop loading
      toast.warn("No user session found. Please log in.");
    }
  }, []); // Run once on mount

  // Effect 2: Fetch fresh notification data from API when user state is available
  const fetchNotificationSettingsFromAPI = useCallback(async () => {
    // Only attempt to fetch if a user is confirmed to be loaded (even if partial from LS)
    if (!user && !localStorage.getItem('user')) { // Double check for user presence
        console.log("2a. No user available to fetch API data for. Skipping API call.");
        setLoading(false); // Ensure loading is false if no user
        return;
    }

    console.log("2b. User found. Attempting to fetch fresh notification data from API...");
    setLoading(true); // Set loading while fetching from API
    try {
      const response = await apiClient.get('/api/users/profile'); // This fetches the entire profile
      const userDataFromApi = response.data.data.user; // Access the nested user object

      console.log("3. API fetch successful. Applying notification settings from API data.");
      setNotificationSettings({
        securityAlerts: {
          unusualActivity: userDataFromApi.notifications?.securityAlerts?.unusualActivity ?? true,
          newBrowserSignIn: userDataFromApi.notifications?.securityAlerts?.newBrowserSignIn ?? false,
        },
        newsUpdates: {
          salesAndNews: userDataFromApi.notifications?.newsUpdates?.salesAndNews ?? true,
          newFeatures: userDataFromApi.notifications?.newsUpdates?.newFeatures ?? false,
          accountTips: userDataFromApi.notifications?.newsUpdates?.accountTips ?? true,
        },
      });
      toast.success("Notification settings loaded from server.");
    } catch (error) {
      console.error("3a. Error fetching notification settings from API:", error.response?.data || error.message);
      toast.error("Failed to load latest notification settings from server.");
      // If API fails, we'll keep the settings initialized from localStorage (if any)
    } finally {
      console.log("4. API fetch process completed. Setting loading to false.");
      setLoading(false); // Always set loading to false when fetch completes (success or error)
    }
  }, [user]); // Depend on user to trigger when user is loaded from LS

  useEffect(() => {
    if (user) { // Trigger API fetch only when user state is set
      fetchNotificationSettingsFromAPI();
    }
  }, [user, fetchNotificationSettingsFromAPI]); // Re-run if user object changes or fetch function changes

  const handleNotificationChange = async (category, subcategory, checked) => {
    if (!user) { // Prevent changes if no user is loaded
      toast.error("User not loaded. Cannot update settings.");
      return;
    }

    const originalSettings = notificationSettings; // Store for potential revert

    // Create the updated settings object
    const updatedSettings = {
      ...notificationSettings,
      [category]: {
        ...notificationSettings[category],
        [subcategory]: checked,
      },
    };
    setNotificationSettings(updatedSettings); // Optimistically update UI

    try {
      // Send only the 'notifications' part of the data to the backend
      // The backend's updateMe will merge this with existing settings
      console.log("5. Sending updated notification settings to API:", updatedSettings);
      await apiClient.put('/api/users/profile', { notifications: updatedSettings });
      toast.success("Notification settings updated!");
    } catch (error) {
      console.error("5a. Error updating notification settings:", error.response?.data || error.message);
      toast.error("Failed to update notification settings.");
      setNotificationSettings(originalSettings); // Revert UI on error
    }
  };

  const viewChange = () => { /* ... (no changes here) ... */
    if (window.innerWidth < 990) {
      setMobileView(true);
    } else {
      setMobileView(false);
      updateSm(false);
    }
  };

  useEffect(() => { /* ... (no changes here) ... */
    viewChange();
    window.addEventListener("load", viewChange);
    window.addEventListener("resize", viewChange);
    const headerElement = document.getElementsByClassName("nk-header")[0];
    if (headerElement) {
      headerElement.addEventListener("click", () => updateSm(false));
    }
    return () => {
      window.removeEventListener("resize", viewChange);
      window.removeEventListener("load", viewChange);
      if (headerElement) {
        headerElement.removeEventListener("click", () => updateSm(false));
      }
    };
  }, []);

  // Display loading indicator if data is still being fetched or parsed, and user is not yet available.
  if (loading || !user) {
    console.log("6. Rendering loading state. Loading:", loading, "User:", user);
    return (
      <Content>
        <div className="text-center py-5">Loading profile settings...</div>
      </Content>
    );
  }

  return (
    <React.Fragment>
      {/* ... rest of your JSX (no changes here) ... */}
      <Head title="Notification Settings"></Head>
      <Content>
        <Card>
          <div className="card-aside-wrap">
            <div
              className={`card-aside card-aside-left user-aside toggle-slide toggle-slide-left toggle-break-lg ${
                sm ? "content-active" : ""
              }`}
            >
              <UserProfileAside updateSm={updateSm} sm={sm} currentUser={user} />
            </div>
            <div className="card-inner card-inner-lg">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <BlockHead size="lg">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h4">Notification Settings</BlockTitle>
                    <BlockDes>
                      <p>You will get only notification what have enabled.</p>
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

              <BlockHead size="sm">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h6">Security Alerts</BlockTitle>
                    <BlockDes>
                      <p>You will get only those email notification what you want.</p>
                    </BlockDes>
                  </BlockHeadContent>
                </BlockBetween>
              </BlockHead>

              <BlockContent>
                <div className="gy-3">
                  <div className="g-item">
                    <div className="custom-control custom-switch">
                      <InputSwitch
                        id="unusualActivity"
                        checked={notificationSettings.securityAlerts.unusualActivity}
                        onChange={(e) => handleNotificationChange('securityAlerts', 'unusualActivity', e.target.checked)}
                        label="Email me whenever encounter unusual activity"
                      />
                    </div>
                  </div>
                  <div className="g-item">
                    <div className="custom-control custom-switch">
                      <InputSwitch
                        id="newBrowserSignIn"
                        checked={notificationSettings.securityAlerts.newBrowserSignIn}
                        onChange={(e) => handleNotificationChange('securityAlerts', 'newBrowserSignIn', e.target.checked)}
                        label="Email me if new browser is used to sign in"
                      />
                    </div>
                  </div>
                </div>
              </BlockContent>

              <BlockHead size="sm">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h6">News</BlockTitle>
                    <BlockDes>
                      <p>You will get only those email notification what you want.</p>
                    </BlockDes>
                  </BlockHeadContent>
                </BlockBetween>
              </BlockHead>

              <BlockContent>
                <div className="gy-3">
                  <div className="g-item">
                    <div className="custom-control custom-switch">
                      <InputSwitch
                        id="salesAndNews"
                        checked={notificationSettings.newsUpdates.salesAndNews}
                        onChange={(e) => handleNotificationChange('newsUpdates', 'salesAndNews', e.target.checked)}
                        label="Notify me by email about sales and latest news"
                      />
                    </div>
                  </div>
                  <div className="g-item">
                    <div className="custom-control custom-switch">
                      <InputSwitch
                        id="newFeatures"
                        checked={notificationSettings.newsUpdates.newFeatures}
                        onChange={(e) => handleNotificationChange('newsUpdates', 'newFeatures', e.target.checked)}
                        label="Email me about new features and updates"
                      />
                    </div>
                  </div>
                  <div className="g-item">
                    <div className="custom-control custom-switch">
                      <InputSwitch
                        id="accountTips"
                        checked={notificationSettings.newsUpdates.accountTips}
                        onChange={(e) => handleNotificationChange('newsUpdates', 'accountTips', e.target.checked)}
                        label="Email me about tips on using account"
                      />
                    </div>
                  </div>
                </div>
              </BlockContent>
            </div>
          </div>
        </Card>
      </Content>
    </React.Fragment>
  );
};

export default UserProfileNotificationPage;