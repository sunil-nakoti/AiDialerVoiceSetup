// frontend/src/pages/user-profile/UserProfileRegularPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import { Card } from "reactstrap";
import Head from "@/layout/head/Head";
import DatePicker from "react-datepicker";
import { Modal, ModalBody } from "reactstrap";
import {
    Block,
    BlockBetween,
    BlockDes,
    BlockHead,
    BlockHeadContent,
    BlockTitle,
    Icon,
    Row,
    Col,
    Button,
    RSelect
} from "@/components/Component";
import { countryOptions } from "./UserData"; // Assuming countryOptions is correctly imported and sufficient
import { getDateStructured } from "@/utils/Utils"; // Keep this for utility, but we'll manage Date objects directly
import UserProfileAside from "./UserProfileAside";
import apiClient from "../../../utils/apiClient"; // Import your apiClient for fetching/updating
import { toast } from "react-toastify"; // For notifications

// --- NEW: Define options for Language and Date Format ---
const languageOptions = [
    { value: 'en-US', label: 'English (United States)' },
    { value: 'en-GB', label: 'English (United Kingdom)' },
    { value: 'es-ES', label: 'Spanish (Spain)' },
    { value: 'fr-FR', label: 'French (France)' },
    { value: 'de-DE', label: 'German (Germany)' },
    // Add more languages as needed
];

const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/31/2025)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/01/2025)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-01-31)' },
    // Add more date formats as needed
];
// --- END NEW ---

const UserProfileRegularPage = () => {
    const [sm, updateSm] = useState(false);
    const [mobileView, setMobileView] = useState(false);

    // State to hold the fetched user data
    const [currentUser, setCurrentUser] = useState(null);
    // State for form fields, initialized with empty strings or null
    const [formData, setFormData] = useState({
        name: "", // For admin
        firstName: "", // For agent
        lastName: "", // For agent
        email: "", // Both
        // --- Initialize new fields here ---
        phone: "",
        dob: null, // Use null for DatePicker to represent no date selected
        addressLine1: "", // Corresponds to 'address' in your old code
        addressLine2: "",
        state: "",
        country: "",
        language: "en-US", // Default value
        dateFormat: "MM/DD/YYYY", // Default value
        // --- End new fields ---
    });
    const [modal, setModal] = useState(false);
    const [modalTab, setModalTab] = useState("1"); // For modal tabs: 1 = Personal, 2 = Address, 3 = Preferences
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch

    // Function to fetch user data from the backend
    const fetchUserData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/users/profile');
            const userDataFromApi = response.data.data.user;
            const userRoleFromApi = response.data.data.role;

            // Update currentUser state with fetched data and role
            setCurrentUser({ ...userDataFromApi, role: userRoleFromApi });

            // Initialize formData based on the fetched user's role and data
            let initialFormData;
            if (userRoleFromApi === 'admin') {
                initialFormData = {
                    name: userDataFromApi.name || "",
                    email: userDataFromApi.email || "",
                    phone: userDataFromApi.phone || "",
                    dob: userDataFromApi.dob ? new Date(userDataFromApi.dob) : null, // Convert ISO string to Date object
                    addressLine1: userDataFromApi.addressLine1 || "",
                    addressLine2: userDataFromApi.addressLine2 || "",
                    state: userDataFromApi.state || "",
                    country: userDataFromApi.country || "",
                    language: userDataFromApi.language || "en-US",
                    dateFormat: userDataFromApi.dateFormat || "MM/DD/YYYY",
                    firstName: "", // Agent-specific, keep empty for admin
                    lastName: "", // Agent-specific, keep empty for admin
                };
            } else if (userRoleFromApi === 'agent') {
                initialFormData = {
                    firstName: userDataFromApi.firstName || "",
                    lastName: userDataFromApi.lastName || "",
                    email: userDataFromApi.email || "",
                    phone: userDataFromApi.phone || "",
                    dob: userDataFromApi.dob ? new Date(userDataFromApi.dob) : null, // Convert ISO string to Date object
                    addressLine1: userDataFromApi.addressLine1 || "",
                    addressLine2: userDataFromApi.addressLine2 || "",
                    state: userDataFromApi.state || "",
                    country: userDataFromApi.country || "",
                    language: userDataFromApi.language || "en-US",
                    dateFormat: userDataFromApi.dateFormat || "MM/DD/YYYY",
                    name: "", // Admin-specific, keep empty for agent
                };
            }
            setFormData(initialFormData);

        } catch (error) {
            console.error("Error fetching user data:", error.response?.data || error.message);
            toast.error("Failed to load user profile. Please try logging in again.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch user data on component mount
    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const onInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- NEW: Handler for RSelect components (Country, Language, Date Format) ---
    const onSelectChange = (name, selectedOption) => {
        setFormData({ ...formData, [name]: selectedOption ? selectedOption.value : "" });
    };
    // --- END NEW ---

    const submitForm = async (ev) => {
        ev.preventDefault(); // Prevent default form submission
        setLoading(true);
        try {
            let dataToUpdate = {};
            // Construct dataToUpdate based on the current user's role
            if (currentUser.role === 'admin') {
                dataToUpdate = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    dob: formData.dob ? formData.dob.toISOString() : null, // Convert Date object to ISO string for backend
                    addressLine1: formData.addressLine1,
                    addressLine2: formData.addressLine2,
                    state: formData.state,
                    country: formData.country,
                    language: formData.language,
                    dateFormat: formData.dateFormat,
                };
            } else if (currentUser.role === 'agent') {
                dataToUpdate = {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    dob: formData.dob ? formData.dob.toISOString() : null, // Convert Date object to ISO string
                    addressLine1: formData.addressLine1,
                    addressLine2: formData.addressLine2,
                    state: formData.state,
                    country: formData.country,
                    language: formData.language,
                    dateFormat: formData.dateFormat,
                };
            }

            const response = await apiClient.put('/api/users/profile', dataToUpdate);

            // Update local storage and current user state with the fresh data from the API
            const updatedUserData = { ...response.data.data.user, role: currentUser.role };
            localStorage.setItem('user', JSON.stringify(updatedUserData)); // Update local storage
            setCurrentUser(updatedUserData); // Update the main state

            toast.success(response.data.message || "Profile updated successfully!");
            setModal(false); // Close the modal
        } catch (error) {
            console.error("Error updating profile:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    // Function to handle window resize for mobile view toggle
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

    // Helper functions to display user data (handle loading and missing data)
    const getDisplayValue = (key) => {
        if (!currentUser) return 'Loading...';

        // --- NEW: Helper for date formatting based on user preference ---
        const formatDob = (dob, format) => {
            if (!dob) return 'N/A';
            const date = new Date(dob);
            if (isNaN(date.getTime())) return 'N/A'; // Invalid date

            switch (format) {
                case 'MM/DD/YYYY':
                    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                case 'DD/MM/YYYY':
                    return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
                case 'YYYY-MM-DD':
                    return date.toISOString().split('T')[0];
                default:
                    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            }
        };
        // --- END NEW ---

        if (currentUser.role === 'admin') {
            switch (key) {
                case 'fullName': return currentUser.name || 'N/A';
                case 'displayName': return currentUser.name || 'N/A'; // Admin might not have separate display name
                case 'email': return currentUser.email || 'N/A';
                case 'phone': return currentUser.phone || 'N/A';
                case 'dob': return formatDob(currentUser.dob, currentUser.dateFormat); // Use the stored dateFormat
                case 'address':
                    // Join address parts, filtering out empty ones
                    const adminAddressParts = [
                        currentUser.addressLine1,
                        currentUser.addressLine2,
                        currentUser.state,
                        currentUser.country
                    ].filter(Boolean); // Filters out '', null, undefined
                    return adminAddressParts.length > 0 ? adminAddressParts.join(', ') : 'N/A';
                case 'language': return languageOptions.find(opt => opt.value === currentUser.language)?.label || 'N/A';
                case 'dateFormat': return currentUser.dateFormat || 'N/A';
                default: return 'N/A';
            }
        } else if (currentUser.role === 'agent') {
            switch (key) {
                case 'fullName': return `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'N/A';
                case 'displayName': return currentUser.firstName || 'N/A';
                case 'email': return currentUser.email || 'N/A';
                case 'phone': return currentUser.phone || 'N/A';
                case 'dob': return formatDob(currentUser.dob, currentUser.dateFormat); // Use the stored dateFormat
                case 'address':
                    // Join address parts, filtering out empty ones
                    const agentAddressParts = [
                        currentUser.addressLine1,
                        currentUser.addressLine2,
                        currentUser.state,
                        currentUser.country
                    ].filter(Boolean);
                    return agentAddressParts.length > 0 ? agentAddressParts.join(', ') : 'N/A';
                case 'language': return languageOptions.find(opt => opt.value === currentUser.language)?.label || 'N/A';
                case 'dateFormat': return currentUser.dateFormat || 'N/A';
                default: return 'N/A';
            }
        }
        return 'N/A';
    };

    // Show loading indicator until currentUser is populated
    if (loading || !currentUser) {
        return <Content><div className="text-center py-5">Loading profile...</div></Content>;
    }


    return (
        <React.Fragment>
            <Head title="User Profile"></Head>
            <Content>
                <Card>
                    <div className="card-aside-wrap">
                        <div
                            className={`card-aside card-aside-left user-aside toggle-slide toggle-slide-left toggle-break-lg ${
                                sm ? "content-active" : ""
                            }`}
                        >
                            {/* Pass currentUser to UserProfileAside */}
                            <UserProfileAside updateSm={updateSm} sm={sm} currentUser={currentUser} />
                        </div>
                        <div className="card-inner card-inner-lg">
                            {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
                            <BlockHead size="lg">
                                <BlockBetween>
                                    <BlockHeadContent>
                                        <BlockTitle tag="h4">Personal Information</BlockTitle>
                                        <BlockDes>
                                            <p>Basic info, like your name and email.</p>
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
                                <div className="nk-data data-list">
                                    <div className="data-head">
                                        <h6 className="overline-title">Basics</h6>
                                    </div>
                                    {/* Updated onClick to set modalTab correctly */}
                                    <div className="data-item" onClick={() => { setModal(true); setModalTab("1"); }}>
                                        <div className="data-col">
                                            <span className="data-label">Full Name</span>
                                            <span className="data-value">{getDisplayValue('fullName')}</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <span className="data-more">
                                                <Icon name="forward-ios"></Icon>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="data-item" onClick={() => { setModal(true); setModalTab("1"); }}>
                                        <div className="data-col">
                                            <span className="data-label">Display Name</span>
                                            <span className="data-value">{getDisplayValue('displayName')}</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <span className="data-more">
                                                <Icon name="forward-ios"></Icon>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="data-item">
                                        <div className="data-col">
                                            <span className="data-label">Email</span>
                                            <span className="data-value">{getDisplayValue('email')}</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <span className="data-more disable">
                                                <Icon name="lock-alt"></Icon>
                                            </span>
                                        </div>
                                    </div>
                                    {/* Enabled Phone Number */}
                                    <div className="data-item" onClick={() => { setModal(true); setModalTab("1"); }}>
                                        <div className="data-col">
                                            <span className="data-label">Phone Number</span>
                                            <span className="data-value text-soft">{getDisplayValue('phone')}</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <span className="data-more">
                                                <Icon name="forward-ios"></Icon>
                                            </span>
                                        </div>
                                    </div>
                                    {/* Enabled Date of Birth */}
                                    <div className="data-item" onClick={() => { setModal(true); setModalTab("1"); }}>
                                        <div className="data-col">
                                            <span className="data-label">Date of Birth</span>
                                            <span className="data-value">{getDisplayValue('dob')}</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <span className="data-more">
                                                <Icon name="forward-ios"></Icon>
                                            </span>
                                        </div>
                                    </div>
                                    {/* Enabled Address */}
                                    <div className="data-item" onClick={() => { setModal(true); setModalTab("2"); }}>
                                        <div className="data-col">
                                            <span className="data-label">Address</span>
                                            <span className="data-value">
                                                {getDisplayValue('address')}
                                            </span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <span className="data-more">
                                                <Icon name="forward-ios"></Icon>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="nk-data data-list">
                                    <div className="data-head">
                                        <h6 className="overline-title">Preferences</h6>
                                    </div>
                                    {/* Enabled Language */}
                                    <div className="data-item" onClick={() => { setModal(true); setModalTab("3"); }}>
                                        <div className="data-col">
                                            <span className="data-label">Language</span>
                                            <span className="data-value">{getDisplayValue('language')}</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <a
                                                href="#language"
                                                onClick={(ev) => {
                                                    ev.preventDefault();
                                                    setModal(true); setModalTab("3");
                                                }}
                                                className="link link-primary"
                                            >
                                                Change Language
                                            </a>
                                        </div>
                                    </div>
                                    {/* Enabled Date Format */}
                                    <div className="data-item" onClick={() => { setModal(true); setModalTab("3"); }}>
                                        <div className="data-col">
                                            <span className="data-label">Date Format</span>
                                            <span className="data-value">{getDisplayValue('dateFormat')}</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <a
                                                href="#link"
                                                onClick={(ev) => {
                                                    ev.preventDefault();
                                                    setModal(true); setModalTab("3");
                                                }}
                                                className="link link-primary"
                                            >
                                                Change
                                            </a>
                                        </div>
                                    </div>
                                    {/* <div className="data-item">
                                        <div className="data-col">
                                            <span className="data-label">Timezone</span>
                                            <span className="data-value">Bangladesh (GMT +6)</span>
                                        </div>
                                        <div className="data-col data-col-end">
                                            <a
                                                href="#link"
                                                onClick={(ev) => {
                                                    ev.preventDefault();
                                                    // Timezone would require a more complex selection mechanism and potentially a separate API or library.
                                                }}
                                                className="link link-primary"
                                            >
                                                Change
                                            </a>
                                        </div>
                                    </div> */}
                                </div>
                            </Block>

                            <Modal isOpen={modal} className="modal-dialog-centered" size="lg" toggle={() => setModal(false)}>
                                <a
                                    href="#dropdownitem"
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        setModal(false);
                                    }}
                                    className="close"
                                >
                                    <Icon name="cross-sm"></Icon>
                                </a>
                                <ModalBody>
                                    <div className="p-2">
                                        <h5 className="title">Update Profile</h5>
                                        <ul className="nk-nav nav nav-tabs">
                                            <li className="nav-item">
                                                <a
                                                    className={`nav-link ${modalTab === "1" && "active"}`}
                                                    onClick={(ev) => {
                                                        ev.preventDefault();
                                                        setModalTab("1");
                                                    }}
                                                    href="#personal"
                                                >
                                                    Personal
                                                </a>
                                            </li>
                                            <li className="nav-item">
                                                <a
                                                    className={`nav-link ${modalTab === "2" && "active"}`}
                                                    onClick={(ev) => {
                                                        ev.preventDefault();
                                                        setModalTab("2");
                                                    }}
                                                    href="#address"
                                                >
                                                    Address
                                                </a>
                                            </li>
                                            {/* NEW: Preferences Tab */}
                                            <li className="nav-item">
                                                <a
                                                    className={`nav-link ${modalTab === "3" && "active"}`}
                                                    onClick={(ev) => {
                                                        ev.preventDefault();
                                                        setModalTab("3");
                                                    }}
                                                    href="#preferences"
                                                >
                                                    Preferences
                                                </a>
                                            </li>
                                            {/* END NEW */}
                                        </ul>
                                        <div className="tab-content">
                                            <div className={`tab-pane ${modalTab === "1" ? "active" : ""}`} id="personal">
                                                <Row className="gy-4">
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="full-name">
                                                                {currentUser?.role === 'admin' ? "Full Name" : "First Name"}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="full-name"
                                                                className="form-control"
                                                                name={currentUser?.role === 'admin' ? "name" : "firstName"}
                                                                value={currentUser?.role === 'admin' ? formData.name : formData.firstName}
                                                                onChange={(e) => onInputChange(e)}
                                                                placeholder={`Enter ${currentUser?.role === 'admin' ? "full name" : "first name"}`}
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="last-name">
                                                                {currentUser?.role === 'admin' ? "Display Name" : "Last Name"}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="last-name"
                                                                className="form-control"
                                                                name={currentUser?.role === 'admin' ? "name" : "lastName"} // Admin 'displayName' maps to 'name'
                                                                value={currentUser?.role === 'admin' ? formData.name : formData.lastName} // Admin display name is same as full name for now
                                                                onChange={(e) => onInputChange(e)}
                                                                placeholder={`Enter ${currentUser?.role === 'admin' ? "display name" : "last name"}`}
                                                                disabled={currentUser?.role === 'admin'} // Disable for admin as it's not a separate field if display name is same as full name
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="user-email">
                                                                Email
                                                            </label>
                                                            <input
                                                                type="email"
                                                                id="user-email"
                                                                className="form-control"
                                                                name="email"
                                                                value={formData.email}
                                                                onChange={(e) => onInputChange(e)}
                                                                placeholder="Enter email address"
                                                            />
                                                        </div>
                                                    </Col>
                                                    {/* Phone and DOB fields are now enabled */}
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="phone-no">
                                                                Phone Number
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="phone-no"
                                                                className="form-control"
                                                                name="phone"
                                                                value={formData.phone}
                                                                onChange={(e) => onInputChange(e)}
                                                                placeholder="Phone Number"
                                                                // disabled={false} // Removed disabled
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="birth-day">
                                                                Date of Birth
                                                            </label>
                                                            <DatePicker
                                                                selected={formData.dob} // formData.dob is already a Date object or null
                                                                className="form-control"
                                                                onChange={(date) => setFormData({ ...formData, dob: date })} // Save as Date object
                                                                maxDate={new Date()}
                                                                dateFormat="MM/dd/yyyy" // Format for DatePicker display
                                                                // disabled={false} // Removed disabled
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col size="12">
                                                        <div className="custom-control custom-switch">
                                                            <input type="checkbox" className="custom-control-input" id="latest-sale" />
                                                            <label className="custom-control-label" htmlFor="latest-sale">
                                                                Use full name to display{" "}
                                                            </label>
                                                        </div>
                                                    </Col>
                                                    <Col size="12">
                                                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                                                            <li>
                                                                <Button
                                                                    color="primary"
                                                                    size="lg"
                                                                    onClick={submitForm}
                                                                    disabled={loading}
                                                                >
                                                                    {loading ? "Updating..." : "Update Profile"}
                                                                </Button>
                                                            </li>
                                                            <li>
                                                                <a
                                                                    href="#cancel"
                                                                    onClick={(ev) => {
                                                                        ev.preventDefault();
                                                                        setModal(false);
                                                                    }}
                                                                    className="link link-light"
                                                                >
                                                                    Cancel
                                                                </a>
                                                            </li>
                                                        </ul>
                                                    </Col>
                                                </Row>
                                            </div>
                                            <div className={`tab-pane ${modalTab === "2" ? "active" : ""}`} id="address">
                                                <Row className="gy-4">
                                                    {/* Address fields are now enabled and names updated */}
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="address-l1">
                                                                Address Line 1
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="address-l1"
                                                                name="addressLine1" // Changed from 'address'
                                                                value={formData.addressLine1}
                                                                onChange={(e) => onInputChange(e)}
                                                                className="form-control"
                                                                // disabled={false} // Removed disabled
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="address-l2">
                                                                Address Line 2
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="address-l2"
                                                                name="addressLine2" // Changed from 'address2'
                                                                value={formData.addressLine2}
                                                                onChange={(e) => onInputChange(e)}
                                                                className="form-control"
                                                                // disabled={false} // Removed disabled
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="address-st">
                                                                State
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="address-st"
                                                                name="state"
                                                                value={formData.state}
                                                                onChange={(e) => onInputChange(e)}
                                                                className="form-control"
                                                                // disabled={false} // Removed disabled
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label" htmlFor="address-county">
                                                                Country
                                                            </label>
                                                            <RSelect
                                                                options={countryOptions}
                                                                placeholder="Select a country"
                                                                // Display the selected country's label or its value if label is not found
                                                                value={formData.country ? { value: formData.country, label: countryOptions.find(opt => opt.value === formData.country)?.label || formData.country } : null}
                                                                onChange={(selectedOption) => onSelectChange("country", selectedOption)}
                                                                // isDisabled={false} // Removed disabled
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col size="12">
                                                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                                                            <li>
                                                                <Button color="primary" size="lg" onClick={submitForm} disabled={loading}>
                                                                    {loading ? "Updating..." : "Update Address"}
                                                                </Button>
                                                            </li>
                                                            <li>
                                                                <a
                                                                    href="#cancel-address"
                                                                    onClick={(ev) => {
                                                                        ev.preventDefault();
                                                                        setModal(false);
                                                                    }}
                                                                    className="link link-light"
                                                                >
                                                                    Cancel
                                                                </a>
                                                            </li>
                                                        </ul>
                                                    </Col>
                                                </Row>
                                            </div>
                                            {/* NEW: Preferences Tab Content */}
                                            <div className={`tab-pane ${modalTab === "3" ? "active" : ""}`} id="preferences">
                                                <Row className="gy-4">
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label">Language</label>
                                                            <RSelect
                                                                options={languageOptions}
                                                                placeholder="Select Language"
                                                                value={formData.language ? { value: formData.language, label: languageOptions.find(opt => opt.value === formData.language)?.label || formData.language } : null}
                                                                onChange={(selectedOption) => onSelectChange("language", selectedOption)}
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label">Date Format</label>
                                                            <RSelect
                                                                options={dateFormatOptions}
                                                                placeholder="Select Date Format"
                                                                value={formData.dateFormat ? { value: formData.dateFormat, label: formData.dateFormat } : null}
                                                                onChange={(selectedOption) => onSelectChange("dateFormat", selectedOption)}
                                                            />
                                                        </div>
                                                    </Col>
                                                    {/* <Col md="6">
                                                        <div className="form-group">
                                                            <label className="form-label">Timezone</label>
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                value="Bangladesh (GMT +6)" // This is still static as it's more complex
                                                                disabled
                                                            />
                                                        </div>
                                                    </Col> */}
                                                    <Col size="12">
                                                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                                                            <li>
                                                                <Button color="primary" size="lg" onClick={submitForm} disabled={loading}>
                                                                    {loading ? "Updating..." : "Update Preferences"}
                                                                </Button>
                                                            </li>
                                                            <li>
                                                                <a
                                                                    href="#cancel-preferences"
                                                                    onClick={(ev) => {
                                                                        ev.preventDefault();
                                                                        setModal(false);
                                                                    }}
                                                                    className="link link-light"
                                                                >
                                                                    Cancel
                                                                </a>
                                                            </li>
                                                        </ul>
                                                    </Col>
                                                </Row>
                                            </div>
                                            {/* END NEW */}
                                        </div>
                                    </div>
                                </ModalBody>
                            </Modal>
                        </div>
                    </div>
                </Card>
            </Content>
        </React.Fragment>
    );
};

export default UserProfileRegularPage;