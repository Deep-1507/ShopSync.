"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TOKEN_KEY,
  ENTERPRISE_KEY,
  ENTERPRISE_ID,
} from "../../lib/enterpriseClient";
import indiaData from "../../lib/indiaStatesDistricts.json";

const initialSignup = {
  name: "",
  enterpriseName: "",
  email: "",
  phone: "",
  password: "",
  category: "type1",
  location: {
    addressLine: "",
    district: "",
    state: "",
    pinCode: "",
    landmark: "",
  },
  paymentTypes: ["Online", "COD", "COT"],
  isAcceptingOnlineOrders: true,
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const labelClass = "block text-sm font-semibold text-slate-700";

const primaryButtonClass =
  "flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200";

const signupSteps = [
  {
    number: 1,
    title: "Account details",
    description: "Tell us about yourself and your business.",
  },
  {
    number: 2,
    title: "Business location",
    description: "Add the address of your business.",
  },
  {
    number: 3,
    title: "Order preferences",
    description: "Choose how your customers can place and pay for orders.",
  },
];

export default function EnterpriseAuth() {
  const router = useRouter();

  const [mode, setMode] = useState("signin");

  const [signin, setSignin] = useState({
    email: "",
    password: "",
  });

  const [signup, setSignup] = useState(initialSignup);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [signupStep, setSignupStep] = useState(1);
  const [stepVisible, setStepVisible] = useState(true);

  const signupFormRef = useRef(null);

  // Animate the signup content whenever the step changes.
  useEffect(() => {
    setStepVisible(false);

    const frame = requestAnimationFrame(() => {
      setStepVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [signupStep]);

  function getBrowserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("Geolocation is not supported by your browser.")
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (geoError) => {
          if (geoError.code === 1) {
            reject(
              new Error(
                "Location permission was denied. Please allow location access in your browser and try again."
              )
            );
          } else if (geoError.code === 2) {
            reject(
              new Error(
                "Your location could not be determined. Please check your device location settings and try again."
              )
            );
          } else if (geoError.code === 3) {
            reject(
              new Error("Location detection timed out. Please try again.")
            );
          } else {
            reject(
              new Error("Unable to detect your location. Please try again.")
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  async function submit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const isSignup = mode === "signup";
      let coordinates = null;

      // Request the device's coordinates only when creating an account.
      if (isSignup) {
        coordinates = await getBrowserLocation();
      }

      const body = isSignup
        ? {
            ...signup,
            email: signup.email.trim(),
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          }
        : {
            ...signin,
            email: signin.email.trim(),
          };

      const response = await fetch(
        isSignup
          ? "/api/enterprises/auth/signup"
          : "/api/enterprises/auth/signin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.token) {
        throw new Error(result.message || "Unable to authenticate");
      }

      const enterprise = result.enterprise;
      const enterpriseId = enterprise?._id;

      if (!enterpriseId) {
        throw new Error(
          "Login succeeded, but the enterprise ID was not returned."
        );
      }

      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(ENTERPRISE_KEY, JSON.stringify(enterprise));
      localStorage.setItem(ENTERPRISE_ID, String(enterpriseId));

      router.push("/enterprise/dashboard");
    } catch (err) {
      console.error("Authentication error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    setError("");
    setMode(nextMode);
    setSignupStep(1);
    setStepVisible(true);
  }

  function updateSignupField(field, value) {
    setSignup((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateLocationField(field, value) {
    setSignup((current) => ({
      ...current,
      location: {
        ...current.location,
        [field]: value,
      },
    }));
  }

  function continueSignup() {
    if (loading) return;

    const form = signupFormRef.current;

    // Validate the currently visible step before proceeding.
    if (form && !form.reportValidity()) {
      return;
    }

    setError("");
    setSignupStep((current) => Math.min(current + 1, 3));
  }

  function previousSignupStep() {
    if (loading) return;

    setError("");
    setSignupStep((current) => Math.max(current - 1, 1));
  }

  function handleStateChange(value) {
    setSignup((current) => ({
      ...current,
      location: {
        ...current.location,
        state: value,
        district: "",
      },
    }));
  }

  function togglePaymentType(paymentType, checked) {
    setSignup((current) => ({
      ...current,
      paymentTypes: checked
        ? current.paymentTypes.includes(paymentType)
          ? current.paymentTypes
          : [...current.paymentTypes, paymentType]
        : current.paymentTypes.filter((item) => item !== paymentType),
    }));
  }

  const selectedState = indiaData.states.find(
    (item) => item.state === signup.location.state
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-sky-200/30 blur-3xl" />

      {/* Top navigation */}
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between">
        <a
          href="/enterprise/auth"
          className="flex items-center gap-1 text-xl font-extrabold tracking-tight text-slate-900"
        >
          <span className="mr-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/20">
            S
          </span>
          ShopSync<span className="text-blue-600">.</span>
        </a>

        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 sm:px-4 sm:text-sm">
          Enterprise workspace
        </span>
      </div>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-10 py-10 sm:py-14 lg:min-h-[calc(100vh-100px)] lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-12">
        {/* Introduction */}
        <div className="mx-auto w-full max-w-xl lg:mx-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-[10px] font-extrabold tracking-[0.16em] text-blue-700 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            YOUR BUSINESS, IN SYNC
          </span>

          <h1 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Everything your
            <br />
            business needs.
            <br />
            <span className="text-blue-600">One workspace.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Manage products, monitor sales, and keep your retail operations
            organized from one place.
          </p>

          <div className="mt-9 space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-lg font-bold text-blue-600 shadow-sm">
                ↗
              </span>

              <div>
                <strong className="block text-sm font-bold text-slate-900">
                  Business insights
                </strong>
                <small className="mt-1 block text-sm leading-6 text-slate-500">
                  Understand your store performance
                </small>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-lg font-bold text-blue-600 shadow-sm">
                ▦
              </span>

              <div>
                <strong className="block text-sm font-bold text-slate-900">
                  Product management
                </strong>
                <small className="mt-1 block text-sm leading-6 text-slate-500">
                  Keep your inventory in control
                </small>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-lg font-bold text-blue-600 shadow-sm">
                ✓
              </span>

              <div>
                <strong className="block text-sm font-bold text-slate-900">
                  One connected workspace
                </strong>
                <small className="mt-1 block text-sm leading-6 text-slate-500">
                  Your operations, all together
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication card */}
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl shadow-slate-900/[0.06] sm:p-8 lg:p-9">
          {/* This header remains in place while signup steps change */}
          <div>
            <span className="text-[10px] font-extrabold tracking-[0.18em] text-blue-600 sm:text-xs">
              ENTERPRISE ACCOUNT
            </span>

            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {mode === "signin" ? "Welcome back" : "Build your workspace"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === "signin"
                ? "Sign in to continue to your dashboard."
                : "Create an account for your business."}
            </p>
          </div>

          {/* Persistent Sign in / Sign up switch */}
          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode === "signin"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => changeMode("signin")}
            >
              Sign in
            </button>

            <button
              type="button"
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => changeMode("signup")}
            >
              Sign up
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SIGN IN */}
          {mode === "signin" && (
            <form className="mt-6 space-y-5" onSubmit={submit}>
              <label className={labelClass}>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={inputClass}
                  value={signin.email}
                  onChange={(event) =>
                    setSignin((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className={labelClass}>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={inputClass}
                  value={signin.password}
                  onChange={(event) =>
                    setSignin((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <button
                className={primaryButtonClass}
                type="submit"
                disabled={loading}
              >
                {loading ? "Please wait..." : "Sign in"}
                <span aria-hidden="true">→</span>
              </button>

              <p className="text-center text-sm text-slate-500">
                New to ShopSync?{" "}
                <button
                  type="button"
                  className="font-bold text-blue-600 transition hover:text-blue-700"
                  onClick={() => changeMode("signup")}
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP — three-step wizard */}
          {mode === "signup" && (
            <div className="mt-6">
              {/* Step indicator */}
              <div className="mb-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Step {signupStep} of 3
                    </p>

                    <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                      {signupSteps[signupStep - 1].title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                      {signupSteps[signupStep - 1].description}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {signupSteps.map((step) => (
                      <span
                        key={step.number}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                          signupStep === step.number
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : signupStep > step.number
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {signupStep > step.number ? "✓" : step.number}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${(signupStep / 3) * 100}%` }}
                  />
                </div>
              </div>

              <form
                ref={signupFormRef}
                onSubmit={submit}
                noValidate={false}
              >
                {/* Animated step content */}
                <div
                  className={`transition-all duration-300 ease-out ${
                    stepVisible
                      ? "translate-x-0 opacity-100"
                      : "translate-x-4 opacity-0"
                  }`}
                >
                  {/* STEP 1: Account details */}
                  {signupStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                          Your name
                          <input
                            type="text"
                            className={inputClass}
                            value={signup.name}
                            onChange={(event) =>
                              updateSignupField("name", event.target.value)
                            }
                            placeholder="Full name"
                            autoComplete="name"
                            required
                          />
                        </label>

                        <label className={labelClass}>
                          Business name
                          <input
                            type="text"
                            className={inputClass}
                            value={signup.enterpriseName}
                            onChange={(event) =>
                              updateSignupField(
                                "enterpriseName",
                                event.target.value
                              )
                            }
                            placeholder="Store name"
                            autoComplete="organization"
                            required
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                          Email address
                          <input
                            type="email"
                            className={inputClass}
                            value={signup.email}
                            onChange={(event) =>
                              updateSignupField("email", event.target.value)
                            }
                            placeholder="you@company.com"
                            autoComplete="email"
                            required
                          />
                        </label>

                        <label className={labelClass}>
                          Phone number
                          <input
                            type="tel"
                            className={inputClass}
                            value={signup.phone}
                            onChange={(event) =>
                              updateSignupField("phone", event.target.value)
                            }
                            placeholder="+91..."
                            autoComplete="tel"
                            required
                          />
                        </label>
                      </div>

                      <label className={labelClass}>
                        Business category
                        <select
                          className={inputClass}
                          value={signup.category}
                          onChange={(event) =>
                            updateSignupField("category", event.target.value)
                          }
                          required
                        >
                          <option value="type1">Retail</option>
                          <option value="type2">Wholesale</option>
                          <option value="type3">Other</option>
                        </select>
                      </label>

                      <label className={labelClass}>
                        Password
                        <input
                          type="password"
                          minLength={8}
                          autoComplete="new-password"
                          className={inputClass}
                          value={signup.password}
                          onChange={(event) =>
                            updateSignupField("password", event.target.value)
                          }
                          placeholder="At least 8 characters"
                          required
                        />
                        <span className="mt-1.5 block text-xs font-normal text-slate-400">
                          Use at least 8 characters.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* STEP 2: Business location */}
                  {signupStep === 2 && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-slate-900">
                            Business address
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Enter your business address. Your device
                            coordinates will be detected automatically when
                            you create your account.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <label className={labelClass}>
                            Address Line
                            <input
                              type="text"
                              className={inputClass}
                              value={signup.location.addressLine}
                              onChange={(event) =>
                                updateLocationField(
                                  "addressLine",
                                  event.target.value
                                )
                              }
                              placeholder="Enter full address"
                              autoComplete="street-address"
                              required
                            />
                          </label>

                          <label className={labelClass}>
                            Landmark
                            <input
                              type="text"
                              className={inputClass}
                              value={signup.location.landmark}
                              onChange={(event) =>
                                updateLocationField(
                                  "landmark",
                                  event.target.value
                                )
                              }
                              placeholder="Nearby landmark (optional)"
                            />
                          </label>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className={labelClass}>
                              State
                              <select
                                className={inputClass}
                                value={signup.location.state}
                                onChange={(event) =>
                                  handleStateChange(event.target.value)
                                }
                                required
                              >
                                <option value="">Select state</option>
                                {indiaData.states.map((item) => (
                                  <option
                                    key={item.state}
                                    value={item.state}
                                  >
                                    {item.state}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className={labelClass}>
                              District
                              <select
                                className={inputClass}
                                value={signup.location.district}
                                onChange={(event) =>
                                  updateLocationField(
                                    "district",
                                    event.target.value
                                  )
                                }
                                required
                                disabled={!signup.location.state}
                              >
                                <option value="">
                                  {signup.location.state
                                    ? "Select district"
                                    : "Select state first"}
                                </option>

                                {(selectedState?.districts ?? []).map(
                                  (district) => (
                                    <option
                                      key={district}
                                      value={district}
                                    >
                                      {district}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          </div>

                          <label className={labelClass}>
                            PIN Code
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="postal-code"
                              className={inputClass}
                              value={signup.location.pinCode}
                              onChange={(event) =>
                                updateLocationField(
                                  "pinCode",
                                  event.target.value
                                )
                              }
                              placeholder="Enter PIN code"
                              required
                            />
                          </label>
                        </div>

                        <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs leading-5 text-blue-800">
                          Your device coordinates will be detected
                          automatically when you create your account. Your
                          browser may ask for location permission.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Order preferences */}
                  {signupStep === 3 && (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <h4 className="text-sm font-bold text-slate-900">
                          Payment methods
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Choose the payment methods your business supports.
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {["Online", "COD", "COT"].map((paymentType) => {
                            const checked =
                              signup.paymentTypes.includes(paymentType);

                            return (
                              <label
                                key={paymentType}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                                  checked
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-blue-600"
                                  checked={checked}
                                  onChange={(event) =>
                                    togglePaymentType(
                                      paymentType,
                                      event.target.checked
                                    )
                                  }
                                />
                                {paymentType}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <h4 className="text-sm font-bold text-slate-900">
                          Accept online orders
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Allow customers to place orders online through your
                          business.
                        </p>

                        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                            checked={signup.isAcceptingOnlineOrders}
                            onChange={(event) =>
                              updateSignupField(
                                "isAcceptingOnlineOrders",
                                event.target.checked
                              )
                            }
                          />

                          <span>
                            <span className="block font-semibold text-slate-900">
                              Yes, my business accepts online orders.
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              You can change this setting later from your
                              business dashboard.
                            </span>
                          </span>
                        </label>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="text-sm font-bold text-blue-900">
                          Almost there!
                        </p>
                        <p className="mt-1 text-xs leading-5 text-blue-800">
                          Review your details, then create your account.
                          Your browser will request permission to detect your
                          device coordinates.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Persistent step navigation */}
                <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
                  {signupStep > 1 && (
                    <button
                      type="button"
                      className={`${secondaryButtonClass} flex-1`}
                      onClick={previousSignupStep}
                      disabled={loading}
                    >
                      <span aria-hidden="true">←</span>
                      Back
                    </button>
                  )}

                  {signupStep < 3 ? (
                    <button
                      type="button"
                      className={`${primaryButtonClass} flex-1`}
                      onClick={continueSignup}
                      disabled={loading}
                    >
                      Continue
                      <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button
                      className={`${primaryButtonClass} flex-1`}
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create account"}
                      {!loading && <span aria-hidden="true">→</span>}
                    </button>
                  )}
                </div>
              </form>

              {/* Persistent footer across all three signup steps */}
              <p className="mt-5 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-bold text-blue-600 transition hover:text-blue-700"
                  onClick={() => changeMode("signin")}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}