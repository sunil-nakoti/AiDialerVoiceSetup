import React, { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation, BrowserRouter } from "react-router-dom";
import { CustomerProvider } from "@/pages/panel/e-commerce/customer/CustomerContext";
import { ProductContextProvider } from "@/pages/pre-built/products/ProductContext";
import { UserContextProvider } from "@/pages/pre-built/user-manage/UserContext";


import RouteLoader from "./RouteLoader"; // Import the 

// import PrivateRoute from "./PrivateRoute"; // Import the PrivateRoute component

// Custom loading component
import LoadingSpinner from "./LoadingSpinner"; // Create this component

// Layouts
import Layout from "@/layout/Index";
import LayoutNoSidebar from "@/layout/Index-nosidebar";
import LayoutEcommerce from "@/layout/Index-ecommerce";
import ThemeProvider from "@/layout/provider/Theme";

// Eagerly load critical routes (commonly accessed)
import Homepage from "@/pages/Homepage";




// Lazy load all other routes for better performance
// E-commerce routes
const EcomDashboard = lazy(() => import("@/pages/panel/e-commerce/index"));
const EcomOrder = lazy(() => import("@/pages/panel/e-commerce/order/OrderDefault"));
const EcomSupport = lazy(() => import("@/pages/panel/e-commerce/support/Messages"));
const EcomProducts = lazy(() => import("@/pages/panel/e-commerce/product/ProductList"));
const EcomCustomer = lazy(() => import("@/pages/panel/e-commerce/customer/CustomerList"));
const EcomCustomerDetails = lazy(() => import("@/pages/panel/e-commerce/customer/CustomerDetails"));
const EcomIntegration = lazy(() => import("@/pages/panel/e-commerce/integration/Integration"));
const EcomSettings = lazy(() => import("@/pages/panel/e-commerce/settings/Settings"));

// Components
const Component = lazy(() => import("@/pages/components/Index"));
const Accordian = lazy(() => import("@/pages/components/Accordions"));
const Alerts = lazy(() => import("@/pages/components/Alerts"));
const Avatar = lazy(() => import("@/pages/components/Avatar"));
const Badges = lazy(() => import("@/pages/components/Badges"));
const Breadcrumbs = lazy(() => import("@/pages/components/Breadcrumbs"));
const ButtonGroup = lazy(() => import("@/pages/components/ButtonGroup"));
const Buttons = lazy(() => import("@/pages/components/Buttons"));
const Cards = lazy(() => import("@/pages/components/Cards"));
const Carousel = lazy(() => import("@/pages/components/Carousel"));
const Dropdowns = lazy(() => import("@/pages/components/Dropdowns"));
const FormElements = lazy(() => import("@/pages/components/forms/FormElements"));
const FormLayouts = lazy(() => import("@/pages/components/forms/FormLayouts"));
const FormValidation = lazy(() => import("@/pages/components/forms/FormValidation"));
const DataTablePage = lazy(() => import("@/pages/components/table/DataTable"));
const DateTimePicker = lazy(() => import("@/pages/components/forms/DateTimePicker"));
const CardWidgets = lazy(() => import("@/pages/components/widgets/CardWidgets"));
const ChartWidgets = lazy(() => import("@/pages/components/widgets/ChartWidgets"));
const RatingWidgets = lazy(() => import("@/pages/components/widgets/RatingWidgets"));
const SlickPage = lazy(() => import("@/pages/components/misc/Slick"));
const SweetAlertPage = lazy(() => import("@/pages/components/misc/SweetAlert"));
const BeautifulDnd = lazy(() => import("@/pages/components/misc/BeautifulDnd"));
const DualListPage = lazy(() => import("@/pages/components/misc/DualListbox"));
const GoogleMapPage = lazy(() => import("@/pages/components/misc/GoogleMap"));
const Modals = lazy(() => import("@/pages/components/Modals"));
const Pagination = lazy(() => import("@/pages/components/Pagination"));
const Popovers = lazy(() => import("@/pages/components/Popovers"));
const Progress = lazy(() => import("@/pages/components/Progress"));
const Spinner = lazy(() => import("@/pages/components/Spinner"));
const Tabs = lazy(() => import("@/pages/components/Tabs"));
const Toast = lazy(() => import("@/pages/components/Toast"));
const Tooltips = lazy(() => import("@/pages/components/Tooltips"));
const Typography = lazy(() => import("@/pages/components/Typography"));
const CheckboxRadio = lazy(() => import("@/pages/components/forms/CheckboxRadio"));
const AdvancedControls = lazy(() => import("@/pages/components/forms/AdvancedControls"));
const InputGroup = lazy(() => import("@/pages/components/forms/InputGroup"));
const FormUpload = lazy(() => import("@/pages/components/forms/FormUpload"));
const NumberSpinner = lazy(() => import("@/pages/components/forms/NumberSpinner"));
const NouiSlider = lazy(() => import("@/pages/components/forms/nouislider"));
const WizardForm = lazy(() => import("@/pages/components/forms/WizardForm"));
const UtilBorder = lazy(() => import("@/pages/components/UtilBorder"));
const UtilColors = lazy(() => import("@/pages/components/UtilColors"));
const UtilDisplay = lazy(() => import("@/pages/components/UtilDisplay"));
const UtilEmbeded = lazy(() => import("@/pages/components/UtilEmbeded"));
const UtilFlex = lazy(() => import("@/pages/components/UtilFlex"));
const UtilOthers = lazy(() => import("@/pages/components/UtilOthers"));
const UtilSizing = lazy(() => import("@/pages/components/UtilSizing"));
const UtilSpacing = lazy(() => import("@/pages/components/UtilSpacing"));
const UtilText = lazy(() => import("@/pages/components/UtilText"));

// Other pages
const Blank = lazy(() => import("@/pages/others/Blank"));
const Faq = lazy(() => import("@/pages/others/Faq"));
const Regularv1 = lazy(() => import("@/pages/others/Regular-1"));
const Regularv2 = lazy(() => import("@/pages/others/Regular-2"));
const Terms = lazy(() => import("@/pages/others/Terms"));
const BasicTable = lazy(() => import("@/pages/components/table/BasicTable"));
const SpecialTablePage = lazy(() => import("@/pages/components/table/SpecialTable"));
const ChartPage = lazy(() => import("@/pages/components/charts/Charts"));
const EmailTemplate = lazy(() => import("@/pages/components/email-template/Dialer"));
const VoiceDialerLogReport = lazy(() => import("@/pages/components/email-template/VoiceDialerLogReport"));
const NioIconPage = lazy(() => import("@/pages/components/crafted-icons/NioIcon"));
const SVGIconPage = lazy(() => import("@/pages/components/crafted-icons/SvgIcons"));

// Pre-built pages
const ProjectCardPage = lazy(() => import("@/pages/pre-built/projects/ProjectCard"));
const ProjectListPage = lazy(() => import("@/pages/pre-built/projects/ProjectList"));
const UserListDefault = lazy(() => import("@/pages/pre-built/user-manage/UserListDefault"));
const UserListRegular = lazy(() => import("@/pages/pre-built/user-manage/UserListRegular"));
const UserContactCard = lazy(() => import("@/pages/pre-built/user-manage/UserContactCard"));
const UserDetails = lazy(() => import("@/pages/pre-built/user-manage/UserDetailsRegular"));
const UserListCompact = lazy(() => import("@/pages/pre-built/user-manage/UserListCompact"));
const UserProfileRegular = lazy(() => import("@/pages/pre-built/user-manage/UserProfileRegular"));
const UserProfileSetting = lazy(() => import("@/pages/pre-built/user-manage/UserProfileSetting"));
const UserProfileNotification = lazy(() => import("@/pages/pre-built/user-manage/UserProfileNotification"));
const UserProfileActivity = lazy(() => import("@/pages/pre-built/user-manage/UserProfileActivity"));
const OrderDefault = lazy(() => import("@/pages/pre-built/orders/DoNotCallList"));
const OrderRegular = lazy(() => import("@/pages/pre-built/orders/OrderRegular"));
const KycListRegular = lazy(() => import("@/pages/pre-built/kyc-list-regular/Compliance"));
const KycDetailsRegular = lazy(() => import("@/pages/pre-built/kyc-list-regular/kycDetailsRegular"));
const ProductCard = lazy(() => import("@/pages/pre-built/products/ProductCard"));
const ProductList = lazy(() => import("@/pages/pre-built/products/Settings"));
const ProductDetails = lazy(() => import("@/pages/pre-built/products/ProductDetails"));
const InvoiceList = lazy(() => import("@/pages/pre-built/invoice/InvoiceList"));
const InvoiceDetails = lazy(() => import("@/pages/pre-built/invoice/InvoiceDetails"));
const InvoicePrint = lazy(() => import("@/pages/pre-built/invoice/InvoicePrint"));
const PricingTable = lazy(() => import("@/pages/pre-built/pricing-table/CallLogs"));
const GalleryPreview = lazy(() => import("@/pages/pre-built/gallery/Contactpage"));
const ReactToastify = lazy(() => import("@/pages/components/misc/ReactToastify"));

// App pages
const AppMessages = lazy(() => import("@/pages/app/messages/Messages"));
const Chat = lazy(() => import("@/pages/app/chat/ChatContainer"));
const Kanban = lazy(() => import("@/pages/app/kanban/Kanban"));
const FileManager = lazy(() => import("@/pages/app/file-manager/FileManager"));
const FileManagerFiles = lazy(() => import("@/pages/app/file-manager/FileManagerFiles"));
const FileManagerShared = lazy(() => import("@/pages/app/file-manager/FileManagerShared"));
const FileManagerStarred = lazy(() => import("@/pages/app/file-manager/FileManagerStarred"));
const FileManagerRecovery = lazy(() => import("@/pages/app/file-manager/FileManagerRecovery"));
const FileManagerSettings = lazy(() => import("@/pages/app/file-manager/FileManagerSettings"));
const Inbox = lazy(() => import("@/pages/app/inbox/Inbox"));
const Calender = lazy(() => import("@/pages/app/calender/Calender"));
const TreeViewPreview = lazy(() => import("@/pages/components/misc/TreeView"));
const QuillPreview = lazy(() => import("@/pages/components/forms/rich-editor/QuillPreview"));
const TinymcePreview = lazy(() => import("@/pages/components/forms/rich-editor/TinymcePreview"));
const KnobPreview = lazy(() => import("@/pages/components/charts/KnobPreview"));



import Login from "@/pages/auth/Login";
import AgentLogin from "@/pages/auth/AgentLogin";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Success from "@/pages/auth/Success";

import PrivateRoute from "./PrivateRoute"; // Import the PrivateRoute component
// Custom loading component
// import LoadingSpinner from "./LoadingSpinner"; // Create this component



// Error pages
const Error404Classic = lazy(() => import("@/pages/error/404-classic"));
const Error404Modern = lazy(() => import("@/pages/error/404-modern"));
const Error504Modern = lazy(() => import("@/pages/error/504-modern"));
const Error504Classic = lazy(() => import("@/pages/error/504-classic"));


// Auth pages
// const Login = lazy(() => import("@/pages/auth/Login"));
// const Register = lazy(() => import("@/pages/auth/Register"));
// const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));

// Scroll to top on route change
const ScrollToTop = ({ children }) => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return <>{children}</>;
};

// Route wrapper with suspense for lazy loading
const LazyLoadRoute = ({ component: Component, ...props }) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component {...props} />
  </Suspense>
);

// Group routes for better organization and performance
const Router = () => {
  return (
       <BrowserRouter basename="/" future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <ScrollToTop>  
        <Routes>
          <Route element={<ThemeProvider />}>

            {/* E-commerce routes */}
             {/* === PROTECTED ROUTES WRAPPER === */}
            <Route element={<PrivateRoute />}>
            {/* E-commerce routes (protected) */}

            <Route element={<LayoutEcommerce />}>
              <Route path="ecommerce">
                <Route path="index" element={<LazyLoadRoute component={EcomDashboard} />} />
                <Route path="orders" element={<LazyLoadRoute component={EcomOrder} />} />
                <Route path="products" element={<LazyLoadRoute component={EcomProducts} />} />
                <Route path="support" element={<LazyLoadRoute component={EcomSupport} />} />
                <Route path="settings" element={<LazyLoadRoute component={EcomSettings} />} />
                <Route path="integration" element={<LazyLoadRoute component={EcomIntegration} />} />
                <Route element={<CustomerProvider />}>
                  <Route path="customer" element={<LazyLoadRoute component={EcomCustomer} />} />
                  <Route path="customer-details/:customerId" element={<LazyLoadRoute component={EcomCustomerDetails} />} />
                </Route>
              </Route>
            </Route>

            
            {/* Main Layout Routes (protected) */}
            <Route element={<Layout />}>
              {/* Dashboard (not lazy loaded for fast initial load) */}
              <Route index element={<Homepage />} />
              <Route path="_blank" element={<LazyLoadRoute component={Blank} />} />

              {/* Pre-built Pages */}
              <Route path="project-card" element={<LazyLoadRoute component={ProjectCardPage} />} />
              <Route path="project-list" element={<LazyLoadRoute component={ProjectListPage} />} />
              
              {/* User Context Routes */}
              <Route element={<UserContextProvider />}>
                <Route path="user-list-default" element={<LazyLoadRoute component={UserListDefault} />} />
                <Route path="user-list-regular" element={<LazyLoadRoute component={UserListRegular} />} />
                <Route path="user-list-compact" element={<LazyLoadRoute component={UserListCompact} />} />
                <Route path="user-contact-card" element={<LazyLoadRoute component={UserContactCard} />} />
                <Route path="user-details-regular/:userId" element={<LazyLoadRoute component={UserDetails} />} />
              </Route>
              
              {/* User Profile Routes */}
              <Route>
                <Route path="user-profile-notification" element={<LazyLoadRoute component={UserProfileNotification} />} />
                <Route path="user-profile-regular" element={<LazyLoadRoute component={UserProfileRegular} />} />
                <Route path="user-profile-activity" element={<LazyLoadRoute component={UserProfileActivity} />} />
                <Route path="user-profile-setting" element={<LazyLoadRoute component={UserProfileSetting} />} />
              </Route>

              {/* Order Routes */}
              <Route path="order-list-default" element={<LazyLoadRoute component={OrderDefault} />} />
              <Route path="order-list-regular" element={<LazyLoadRoute component={OrderRegular} />} />
              
              {/* KYC Routes */}
              <Route path="kyc-list-regular" element={<LazyLoadRoute component={KycListRegular} />} />
              <Route path="kyc-details-regular/:kycId" element={<LazyLoadRoute component={KycDetailsRegular} />} />

              {/* Product Routes */}
              <Route element={<ProductContextProvider />}>
                <Route path="product-list" element={<LazyLoadRoute component={ProductList} />} />
                <Route path="product-card" element={<LazyLoadRoute component={ProductCard} />} />
                <Route path="product-details/:productId" element={<LazyLoadRoute component={ProductDetails} />} />
              </Route>
              
              {/* Invoice Routes */}
              <Route path="invoice-list" element={<LazyLoadRoute component={InvoiceList} />} />
              <Route path="invoice-details/:invoiceId" element={<LazyLoadRoute component={InvoiceDetails} />} />
              
              {/* Other Pre-built Pages */}
              <Route path="pricing-table" element={<LazyLoadRoute component={PricingTable} />} />
              <Route path="Contact" element={<LazyLoadRoute component={GalleryPreview} />} />

              {/* Static Pages */}
              <Route path="pages">
                <Route path="terms-policy" element={<LazyLoadRoute component={Terms} />} />
                <Route path="faq" element={<LazyLoadRoute component={Faq} />} />
                <Route path="regular-v1" element={<LazyLoadRoute component={Regularv1} />} />
                <Route path="regular-v2" element={<LazyLoadRoute component={Regularv2} />} />
              </Route>
              
              {/* App Routes */}
              <Route path="app-messages" element={<LazyLoadRoute component={AppMessages} />} />
              <Route path="app-chat" element={<LazyLoadRoute component={Chat} />} />
              <Route path="app-calender" element={<LazyLoadRoute component={Calender} />} />
              <Route path="app-inbox" element={<LazyLoadRoute component={Inbox} />} />
              <Route path="app-kanban" element={<LazyLoadRoute component={Kanban} />} />

              {/* File Manager Routes */}
              <Route path="app-file-manager">
                <Route index element={<LazyLoadRoute component={FileManager} />} />
                <Route path="files" element={<LazyLoadRoute component={FileManagerFiles} />} />
                <Route path="starred" element={<LazyLoadRoute component={FileManagerStarred} />} />
                <Route path="shared" element={<LazyLoadRoute component={FileManagerShared} />} />
                <Route path="recovery" element={<LazyLoadRoute component={FileManagerRecovery} />} />
                <Route path="settings" element={<LazyLoadRoute component={FileManagerSettings} />} />
              </Route>
              

              {/* Components Routes */}
              <Route path="components">
                <Route index element={<LazyLoadRoute component={Component} />} />
                <Route path="accordions" element={<LazyLoadRoute component={Accordian} />} />
                <Route path="alerts" element={<LazyLoadRoute component={Alerts} />} />
                <Route path="avatar" element={<LazyLoadRoute component={Avatar} />} />
                <Route path="badges" element={<LazyLoadRoute component={Badges} />} />
                <Route path="breadcrumbs" element={<LazyLoadRoute component={Breadcrumbs} />} />
                <Route path="button-group" element={<LazyLoadRoute component={ButtonGroup} />} />
                <Route path="buttons" element={<LazyLoadRoute component={Buttons} />} />
                <Route path="cards" element={<LazyLoadRoute component={Cards} />} />
                <Route path="carousel" element={<LazyLoadRoute component={Carousel} />} />
                <Route path="dropdowns" element={<LazyLoadRoute component={Dropdowns} />} />
                <Route path="form-elements" element={<LazyLoadRoute component={FormElements} />} />
                <Route path="form-layouts" element={<LazyLoadRoute component={FormLayouts} />} />
                <Route path="checkbox-radio" element={<LazyLoadRoute component={CheckboxRadio} />} />
                <Route path="advanced-control" element={<LazyLoadRoute component={AdvancedControls} />} />
                <Route path="input-group" element={<LazyLoadRoute component={InputGroup} />} />
                <Route path="form-upload" element={<LazyLoadRoute component={FormUpload} />} />
                <Route path="number-spinner" element={<LazyLoadRoute component={NumberSpinner} />} />
                <Route path="form-validation" element={<LazyLoadRoute component={FormValidation} />} />
                <Route path="datetime-picker" element={<LazyLoadRoute component={DateTimePicker} />} />
                <Route path="modals" element={<LazyLoadRoute component={Modals} />} />
                <Route path="pagination" element={<LazyLoadRoute component={Pagination} />} />
                <Route path="popovers" element={<LazyLoadRoute component={Popovers} />} />
                <Route path="progress" element={<LazyLoadRoute component={Progress} />} />
                <Route path="spinner" element={<LazyLoadRoute component={Spinner} />} />
                <Route path="tabs" element={<LazyLoadRoute component={Tabs} />} />
                <Route path="toast" element={<LazyLoadRoute component={Toast} />} />
                <Route path="tooltips" element={<LazyLoadRoute component={Tooltips} />} />
                <Route path="typography" element={<LazyLoadRoute component={Typography} />} />
                <Route path="noUislider" element={<LazyLoadRoute component={NouiSlider} />} />
                <Route path="wizard-basic" element={<LazyLoadRoute component={WizardForm} />} />
                <Route path="quill" element={<LazyLoadRoute component={QuillPreview} />} />
                <Route path="tinymce" element={<LazyLoadRoute component={TinymcePreview} />} />
                <Route path="util-border" element={<LazyLoadRoute component={UtilBorder} />} />
                <Route path="util-colors" element={<LazyLoadRoute component={UtilColors} />} />
                <Route path="util-display" element={<LazyLoadRoute component={UtilDisplay} />} />
                <Route path="util-embeded" element={<LazyLoadRoute component={UtilEmbeded} />} />
                <Route path="util-flex" element={<LazyLoadRoute component={UtilFlex} />} />
                <Route path="util-others" element={<LazyLoadRoute component={UtilOthers} />} />
                <Route path="util-sizing" element={<LazyLoadRoute component={UtilSizing} />} />
                <Route path="util-spacing" element={<LazyLoadRoute component={UtilSpacing} />} />
                <Route path="util-text" element={<LazyLoadRoute component={UtilText} />} />

                {/* Widget Routes */}
                <Route path="widgets">
                  <Route path="cards" element={<LazyLoadRoute component={CardWidgets} />} />
                  <Route path="charts" element={<LazyLoadRoute component={ChartWidgets} />} />
                  <Route path="rating" element={<LazyLoadRoute component={RatingWidgets} />} />
                </Route>

                {/* Misc Routes */}
                <Route path="misc">
                  <Route path="slick-slider" element={<LazyLoadRoute component={SlickPage} />} />
                  <Route path="sweet-alert" element={<LazyLoadRoute component={SweetAlertPage} />} />
                  <Route path="beautiful-dnd" element={<LazyLoadRoute component={BeautifulDnd} />} />
                  <Route path="dual-list" element={<LazyLoadRoute component={DualListPage} />} />
                  <Route path="map" element={<LazyLoadRoute component={GoogleMapPage} />} />
                  <Route path="toastify" element={<LazyLoadRoute component={ReactToastify} />} />
                  <Route path="tree-view" element={<LazyLoadRoute component={TreeViewPreview} />} />
                </Route>
              </Route>
              
              {/* Chart Routes */}
              <Route path="charts">
                <Route path="chartjs" element={<LazyLoadRoute component={ChartPage} />} />
                <Route path="knobs" element={<LazyLoadRoute component={KnobPreview} />} />
              </Route>
              
              {/* Table Routes */}
              <Route path="table-basic" element={<LazyLoadRoute component={BasicTable} />} />
              <Route path="table-datatable" element={<LazyLoadRoute component={DataTablePage} />} />
              <Route path="table-special" element={<LazyLoadRoute component={SpecialTablePage} />} />
              
              {/* Other Routes */}
              <Route path="email-template" element={<LazyLoadRoute component={EmailTemplate} />} />
              <Route path="dialer/campaigns/:campaignId/report" element={<LazyLoadRoute component={VoiceDialerLogReport} />} />
              <Route path="nioicon" element={<LazyLoadRoute component={NioIconPage} />} />
              <Route path="svg-icons" element={<LazyLoadRoute component={SVGIconPage} />} />
            </Route>
            </Route>

            {/* No Sidebar Layout Routes */}
            <Route element={<LayoutNoSidebar />}>


             {/* Public Routes */}


              {/* Auth Routes */}
              <Route path="auth-success" element={<LazyLoadRoute component={Success} />} />
              <Route path="auth-reset" element={<LazyLoadRoute component={ForgotPassword} />} />
              <Route path="auth-register" element={<LazyLoadRoute component={Register} />} />
              <Route path="auth-login" element={<LazyLoadRoute component={Login} />} />
              <Route path="agent-login" element={<LazyLoadRoute component={AgentLogin} />} />


              {/* Error Routes */}
              <Route path="errors">
                <Route path="404-modern" element={<LazyLoadRoute component={Error404Modern} />} />
                <Route path="404-classic" element={<LazyLoadRoute component={Error404Classic} />} />
                <Route path="504-modern" element={<LazyLoadRoute component={Error504Modern} />} />
                <Route path="504-classic" element={<LazyLoadRoute component={Error504Classic} />} />
              </Route>
              
              {/* Fallback Route */}
              <Route path="*" element={<LazyLoadRoute component={Error404Modern} />} />
              
              {/* Invoice Print Route */}
              <Route path="invoice-print/:invoiceId" element={<LazyLoadRoute component={InvoicePrint} />} />
            </Route>
          </Route>
          {/* A general fallback 404 if no other route matches at all (e.g. for completely wrong top-level paths) */}
            {/* This should be outside PrivateRoute if you want unauthenticated users to see it for non-auth paths */}
            {/* This might conflict with the "*" inside LayoutNoSidebar if not careful.
                Usually, the "*" inside PrivateRoute handles authenticated 404s,
                and one at the very end (or inside LayoutNoSidebar) handles public 404s.
            */}
             <Route path="*" element={<LazyLoadRoute component={Error404Modern} />} /> {/* Catch-all for any non-defined public paths */}

        </Routes>
      </ScrollToTop>
    </BrowserRouter>
   
  );
};

export default Router;