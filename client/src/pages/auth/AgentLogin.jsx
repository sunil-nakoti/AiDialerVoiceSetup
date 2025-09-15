// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import Logo from "@/images/logo.png";
// import LogoDark from "@/images/logo-dark.png";
import Head from "@/layout/head/Head";
import AuthFooter from "./AuthFooter";
import {
  Block,
  BlockContent,
  // BlockDes,
  BlockHead,
  BlockTitle,
  Button,
  Icon,
  PreviewCard,
} from "@/components/Component";
import { Form, Spinner, Alert } from "reactstrap";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

const AgentLogin = () => {
  const [loading, setLoading] = useState(false);
  const [passState, setPassState] = useState(false);
  const [errorVal, setErrorVal] = useState("");
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm();

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5050";

  const onFormSubmit = async (formData) => {
    setLoading(true);
    setErrorVal("");

    try {
      // *** IMPORTANT CHANGE: Update the login endpoint here ***
      const response = await fetch(`${API_BASE_URL}/api/agents/login`, { // Now using /api/agents/login
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Login failed with status: ${response.status}`);
      }

      if (responseData.token) {
        localStorage.setItem("token", responseData.token);
        localStorage.setItem("user", JSON.stringify({
          _id: responseData._id,
          firstName: responseData.firstName,
          lastName: responseData.lastName,
          email: responseData.email,
          role: responseData.role,
        }));
        
        setLoading(false);
        navigate("/");
      } else {
        throw new Error(responseData.message || "Login successful, but no token received.");
      }
    } catch (err) {
      setLoading(false);
      setErrorVal(err.message || "An unknown error occurred. Please try again.");
      console.error("Agent login failed:", err);
    }
  };

  return (
    <>
      <Head title="Agent Login" />
      <Block className="nk-block-middle nk-auth-body wide-xs">
        <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
          <BlockHead>
            <BlockContent>
              <BlockTitle tag="h4">Agent Sign-In</BlockTitle>
            </BlockContent>
          </BlockHead>

          {errorVal && (
            <div className="mb-3">
              <Alert color="danger" className="alert-icon">
                <Icon name="alert-circle" /> {errorVal}
              </Alert>
            </div>
          )}

          <Form className="is-alter" onSubmit={handleSubmit(onFormSubmit)}>
            <div className="form-group">
              <div className="form-label-group">
                <label className="form-label" htmlFor="email">
                  Email
                </label>
              </div>
              <div className="form-control-wrap">
                <input
                  type="text"
                  id="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                        value: /^\S+@\S+$/i,
                        message: "Invalid email address"
                    }
                  })}
                  placeholder="Enter your email address"
                  className={`form-control-lg form-control ${formErrors.email ? "is-invalid" : ""}`}
                />
                {formErrors.email && <span className="invalid">{formErrors.email.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <Link className="link link-primary link-sm" to={`/auth-reset`}>
                  Forgot Password?
                </Link>
              </div>
              <div className="form-control-wrap">
                <a
                  href="#password"
                  onClick={(ev) => {
                    ev.preventDefault();
                    setPassState(!passState);
                  }}
                  className={`form-icon lg form-icon-right passcode-switch ${passState ? "is-hidden" : "is-shown"}`}
                >
                  <Icon name="eye" className="passcode-icon icon-show"></Icon>
                  <Icon name="eye-off" className="passcode-icon icon-hide"></Icon>
                </a>
                <input
                  type={passState ? "text" : "password"}
                  id="password"
                  {...register("password", { required: "Password is required" })}
                  placeholder="Enter your password"
                  className={`form-control-lg form-control ${formErrors.password ? "is-invalid" : ""}`}
                />
                {formErrors.password && <span className="invalid">{formErrors.password.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <Button size="lg" className="btn-block" type="submit" color="primary" disabled={loading}>
                {loading ? <Spinner size="sm" color="light" /> : "Sign in"}
              </Button>
            </div>
          </Form>

          <div className="form-note-s2 text-center pt-4">
            New on our platform? <Link to={`/auth-register`}>Create an account</Link>
          </div>

          <div className="text-center pt-4 pb-3">
            <h6 className="overline-title overline-title-sap">
              <span>OR</span>
            </h6>
          </div>
          <ul className="nav justify-center gx-4">
            <li className="nav-item">
              <a
                className="nav-link"
                href="#socials"
                onClick={(ev) => {
                  ev.preventDefault();
                  // Handle Facebook login here
                }}
              >
                Facebook
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#socials"
                onClick={(ev) => {
                  ev.preventDefault();
                  // Handle Google login here
                }}
              >
                Google
              </a>
            </li>
          </ul>
        </PreviewCard>
      </Block>
      <AuthFooter />
    </>
  );
};
export default AgentLogin;