// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import Logo from "@/images/logo.png"; // Uncomment if you want to use the logo
// import LogoDark from "@/images/logo-dark.png"; // Uncomment if you want to use the logo
import Head from "@/layout/head/Head";
import './login.css'; // Ensure this file exists in your styles folder

import {
  Block,
  BlockContent,
  // BlockDes, // Uncomment if used
  BlockHead,
  BlockTitle,
  Button,
  Icon,
  PreviewCard,
} from "@/components/Component";
import { Form, Spinner, Alert } from "reactstrap"; // Form is already imported from reactstrap
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [passState, setPassState] = useState(false);
  const [errorVal, setErrorVal] = useState(""); // Renamed to avoid conflict with react-hook-form's errors
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors }, // Using formErrors from react-hook-form
  } = useForm();

  // Carousel data
  const carouselData = [
    {
      title: "Welcome Back!",
      subtitle: "Sign in to access your account and continue your journey with us.",
      features: ["Secure & Fast Login", "Access All Features", "Personalized Experience"]
    },
    {
      title: "Powerful Analytics",
      subtitle: "Get insights and analytics to grow your business effectively.",
      features: ["Real-time Data", "Custom Reports", "Performance Metrics"]
    },
    {
      title: "24/7 Support",
      subtitle: "Our dedicated team is here to help you succeed every step of the way.",
      features: ["Expert Assistance", "Quick Response", "Comprehensive Help"]
    }
  ];

  // Auto-change slides
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselData.length]);

  const onFormSubmit = async (formData) => {
    setLoading(true);
    setErrorVal(""); // Clear previous errors

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050'}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.name, // Your form uses 'name' for the email field
          password: formData.passcode, // Your form uses 'passcode' for the password
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      if (responseData.token) {
        localStorage.setItem("token", responseData.token); // Standardize to 'token'
        // Optionally store user info:
        localStorage.setItem('user', JSON.stringify(responseData.data.user));
        setLoading(false);
        navigate("/"); // Navigate to homepage or dashboard
      } else {
        throw new Error(responseData.message || "Login successful, but no token received.");
      }
    } catch (err) {
      setLoading(false);
      setErrorVal(err.message || "An unknown error occurred. Please try again.");
      console.error("Login failed:", err);
    }
  };

  return (
    <>
      <Head title="Login" />
      
      <div className="login-main-container">
        <div className="login-content-wrapper">
          
          {/* Left Side - Carousel Container */}
          <div className="login-carousel-container">
            {/* Background Image Carousel */}
            <div className="image-carousel">
              <div className={`carousel-slide ${currentSlide === 0 ? 'active' : ''}`}></div>
              <div className={`carousel-slide ${currentSlide === 1 ? 'active' : ''}`}></div>
              <div className={`carousel-slide ${currentSlide === 2 ? 'active' : ''}`}></div>
            </div>
            
            {/* Decorative Elements */}
            <div className="carousel-decoration"></div>
            <div className="carousel-decoration"></div>
            
            {/* Dynamic Content */}
            <div className="carousel-content">
              <h1 className="carousel-title">{carouselData[currentSlide].title}</h1>
              <p className="carousel-subtitle">
                {carouselData[currentSlide].subtitle}
              </p>
              <ul className="carousel-features">
                {carouselData[currentSlide].features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            
            {/* Carousel Indicators */}
            <div className="carousel-indicators">
              {carouselData.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-indicator ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                ></button>
              ))}
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="login-form-container">
            <Block className="nk-block-middle nk-auth-body wide-xs">
              {/* Uncomment if you want the logo
              <div className="brand-logo pb-4 text-center">
                <Link to={"/"} className="logo-link">
                  <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
                  <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
                </Link>
              </div>
              */}

              <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
                <BlockHead>
                  <BlockContent>
                    <BlockTitle tag="h4">Sign-In</BlockTitle>
                    {/*
                    <BlockDes>
                      <p>Access using your email and passcode.</p>
                    </BlockDes>
                    */}
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
                      <label className="form-label" htmlFor="emailOrUsername">
                        Email
                      </label>
                    </div>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        id="emailOrUsername"
                        {...register("name", {
                          required: "Email is required",
                          pattern: {
                            value: /^\S+@\S+$/i,
                            message: "Invalid email address"
                          }
                        })}
                        placeholder="Enter your email address"
                        className={`form-control-lg form-control ${formErrors.name ? "is-invalid" : ""}`}
                      />
                      {formErrors.name && <span className="invalid">{formErrors.name.message}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-label-group">
                      <label className="form-label" htmlFor="password">
                        Passcode
                      </label>
                      {/* <Link className="link link-primary link-sm" to={`/auth-reset`}>
                        Forgot Code?
                      </Link> */}
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
                        {...register("passcode", { required: "Passcode is required" })}
                        placeholder="Enter your passcode"
                        className={`form-control-lg form-control ${formErrors.passcode ? "is-invalid" : ""}`}
                      />
                      {formErrors.passcode && <span className="invalid">{formErrors.passcode.message}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <Button size="lg" className="btn-block" type="submit" color="primary" disabled={loading}>
                      {loading ? <Spinner size="sm" color="light" /> : "Sign in"}
                    </Button>
                  </div>
                </Form>

                {/* <div className="form-note-s2 text-center pt-4">
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
                </ul> */}
              </PreviewCard>
            </Block>
          </div>
          
        </div>
      </div>
      
      {/* <AuthFooter /> */}
    </>
  );
};

export default Login;