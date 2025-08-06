// src/pages/auth/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/images/logo.png"; // Ensure these paths are correct
import LogoDark from "@/images/logo-dark.png"; // Ensure these paths are correct
import Head from "@/layout/head/Head";
import './register.css'; // Make sure to create this CSS file
import {
  Block,
  BlockContent,
  BlockDes,
  BlockHead,
  BlockTitle,
  Button,
  Icon,
  PreviewCard,
} from "@/components/Component"; // Ensure these paths are correct
import { Spinner, Alert } from "reactstrap"; // Added Alert
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

const Register = () => {
  const [passState, setPassState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // For API errors
  const [currentSlide, setCurrentSlide] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors }, // Renamed to avoid conflict if needed
  } = useForm();
  const navigate = useNavigate();

  // Carousel data for registration
  const carouselData = [
    {
      title: "Join Our Community!",
      subtitle: "Create your account and start your journey with us today.",
      features: ["Quick & Easy Setup", "Secure Registration", "Instant Access"]
    },
    {
      title: "Unlock Features",
      subtitle: "Get access to powerful tools and features designed for your success.",
      features: ["Premium Tools", "Advanced Analytics", "Priority Support"]
    },
    {
      title: "Get Started Now",
      subtitle: "Join thousands of satisfied users who trust our platform.",
      features: ["Trusted Platform", "Active Community", "Regular Updates"]
    }
  ];

  // Auto-change slides
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselData.length]);

  const handleFormSubmit = async (data) => {
    setLoading(true);
    setError(""); // Clear previous errors

    try {
      const response = await fetch(`http://localhost:5000/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.passcode, // Ensure your form field name matches 'passcode'
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // If server responds with an error status (4xx, 5xx)
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      // Assuming backend returns a token on successful registration
      if (responseData.token) {
        localStorage.setItem("token", responseData.token); // Store the token
        // You might want to store user info too, e.g., localStorage.setItem('user', JSON.stringify(responseData.data.user));
        setLoading(false);
        navigate(`/auth-success`); // Or navigate to a dashboard or login page
      } else {
        // If token is not in responseData for some reason
        throw new Error(responseData.message || "Registration successful, but no token received.");
      }

    } catch (err) {
      setLoading(false);
      setError(err.message || "An unknown error occurred. Please try again.");
      console.error("Registration failed:", err);
    }
  };

  return (
    <>
      <Head title="Register" />
      
      <div className="register-main-container">
        <div className="register-content-wrapper">
          
          {/* Left Side - Carousel Container */}
          <div className="register-carousel-container">
            {/* Background Image Carousel */}
            <div className="register-image-carousel">
              <div className={`register-carousel-slide ${currentSlide === 0 ? 'active' : ''}`}></div>
              <div className={`register-carousel-slide ${currentSlide === 1 ? 'active' : ''}`}></div>
              <div className={`register-carousel-slide ${currentSlide === 2 ? 'active' : ''}`}></div>
            </div>
            
            {/* Decorative Elements */}
            <div className="register-carousel-decoration"></div>
            <div className="register-carousel-decoration"></div>
            
            {/* Dynamic Content */}
            <div className="register-carousel-content">
              <h1 className="register-carousel-title">{carouselData[currentSlide].title}</h1>
              <p className="register-carousel-subtitle">
                {carouselData[currentSlide].subtitle}
              </p>
              <ul className="register-carousel-features">
                {carouselData[currentSlide].features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            
            {/* Carousel Indicators */}
            <div className="register-carousel-indicators">
              {carouselData.map((_, index) => (
                <button
                  key={index}
                  className={`register-carousel-indicator ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                ></button>
              ))}
            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="register-form-container">
            <Block className="nk-block-middle nk-auth-body wide-xs">
              {/* <div className="brand-logo pb-4 text-center">
                <Link to={`/`} className="logo-link">
                  <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
                  <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
                </Link>
              </div> */}
              
              <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
                <BlockHead>
                  <BlockContent>
                    <BlockTitle tag="h4">Register</BlockTitle>
                    <BlockDes>
                      <p>Create New Account</p>
                    </BlockDes>
                  </BlockContent>
                </BlockHead>

                {error && (
                  <Alert color="danger" className="mb-3">
                    {error}
                  </Alert>
                )}

                <form className="is-alter" onSubmit={handleSubmit(handleFormSubmit)}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">
                      Name
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        id="name"
                        {...register("name", { required: "Name is required" })}
                        placeholder="Enter your name"
                        className={`form-control-lg form-control ${formErrors.name ? "is-invalid" : ""}`}
                      />
                      {formErrors.name && <span className="invalid">{formErrors.name.message}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-label-group">
                      <label className="form-label" htmlFor="email">
                        Email or Username
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
                            message: "Invalid email address",
                          },
                        })}
                        className={`form-control-lg form-control ${formErrors.email ? "is-invalid" : ""}`}
                        placeholder="Enter your email address"
                      />
                      {formErrors.email && <span className="invalid">{formErrors.email.message}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-label-group">
                      <label className="form-label" htmlFor="password">
                        Passcode
                      </label>
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
                        {...register("passcode", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          },
                        })}
                        placeholder="Enter your passcode"
                        className={`form-control-lg form-control ${passState ? "is-hidden" : "is-shown"} ${formErrors.passcode ? "is-invalid" : ""}`}
                      />
                      {formErrors.passcode && <span className="invalid">{formErrors.passcode.message}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <Button type="submit" color="primary" size="lg" className="btn-block" disabled={loading}>
                      {loading ? <Spinner size="sm" color="light" /> : "Register"}
                    </Button>
                  </div>
                </form>
                
                <div className="form-note-s2 text-center pt-4">
                  Already have an account?{" "}
                  <Link to={`/auth-login`}>
                    <strong>Sign in instead</strong>
                  </Link>
                </div>
              </PreviewCard>
            </Block>
          </div>
          
        </div>
      </div>
      
      {/* <AuthFooter /> */}
    </>
  );
};

export default Register;