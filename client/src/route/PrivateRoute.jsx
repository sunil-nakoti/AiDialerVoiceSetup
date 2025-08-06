// src/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom'; // Import Outlet

const PrivateRoute = () => {
  const isAuthenticated = localStorage.getItem('token');
  // For debugging, you can add this:
  // console.log("PrivateRoute check. Authenticated:", !!isAuthenticated);

  if (!isAuthenticated) {
    // replace prop is a good practice for login redirects
    // it replaces the current entry in the history stack instead of pushing a new one
    return <Navigate to="/auth-login" replace />;
  }

  return <Outlet />; // This will render the matched child route element
};

export default PrivateRoute;