import React, { useState, useEffect } from "react";
import "@/css/RouteLoader.css";

const RouteLoader = ({ children }) => {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // Adjust timing as needed
    
    return () => clearTimeout(timer);
  }, []);
  
  if (loading) {
    return (
      <div className="route-loader">
        <div className="spinner-container">
          {/* Create 8 dots for the spinner */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="spinner-dot"></div>
          ))}
        </div>
        {/* <div className="progress-bar-container">
          <div className="progress-bar"></div>
        </div>
        <div className="loading-text">Loading</div> */}
      </div>
    );
  }
  
  return <>{children}</>;
};

export default RouteLoader;