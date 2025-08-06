import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="nk-footer" style={{ fontSize: "15px", fontWeight: "500" }}>
      <div className="container-fluid">
        <div className="nk-footer-wrap d-flex justify-between align-items-center">
          <div className="nk-footer-copyright">
            &copy; 2025 <strong style={{ fontWeight: "600" }}>XSquare Technology</strong>. All rights reserved.{" "}
            <a
              href="https://xsquaretec.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: "600", color: "#3366ff" }}
            >
              Visit Website
            </a>
          </div>
          <div className="nk-footer-links">
            <ul className="nav nav-sm">
              <li className="nav-item">
                <Link to="" className="nav-link" style={{ fontWeight: "600" }}>
                  Terms
                </Link>
              </li>
              <li className="nav-item">
                <Link to="" className="nav-link" style={{ fontWeight: "600" }}>
                  Privacy
                </Link>
              </li>
              <li className="nav-item">
                <Link to="" className="nav-link" style={{ fontWeight: "600" }}>
                  Help
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
