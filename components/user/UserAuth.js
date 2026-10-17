"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TOKEN_KEY,
  USER_KEY,
  USER_ID,
} from "../../lib/userClient";
import indiaData from "../../lib/indiaStatesDistricts.json";
import { MapPin } from "lucide-react";

const initialSignup = {
  name: "",
  email: "",
  phone: "",
  password: "",
  location: {
    addressLine: "",
    district: "",
    state: "",
    pinCode: "",
    landmark: "",
  },
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const labelClass = "block text-sm font-semibold text-slate-700";

const buttonClass =
  "flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60";

const signupSteps = [
  {
    number: 1,
    title: "Your account",
    description: "Enter your personal and login details.",
  },
  {
    number: 2,
    title: "Your location",
    description: "Add your address to discover nearby stores.",
  },
  {
    number: 3,
    title: "Review and create",
    description: "Review your details before creating your account.",
  },
];

export default function UserAuth() {
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
          const messages = {
            1: "Location permission was denied. Please allow location access in your browser and try again.",
            2: "Your location could not be determined. Please check your device location settings and try again.",
            3: "Location detection timed out. Please try again.",
          };

          reject(
            new Error(
              messages[geoError.code] ||
              "Unable to detect your location. Please try again."
            )
          );
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

      // Detect coordinates only during signup.
      if (isSignup) {
        coordinates = await getBrowserLocation();
      }

      const body = isSignup
        ? {
          ...signup,
          name: signup.name.trim(),
          email: signup.email.trim(),
          phone: signup.phone.trim(),
          location: {
            addressLine: signup.location.addressLine.trim(),
            district: signup.location.district.trim(),
            state: signup.location.state.trim(),
            pinCode: signup.location.pinCode.trim(),
            landmark: signup.location.landmark.trim(),
          },
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }
        : {
          ...signin,
          email: signin.email.trim(),
        };

      const response = await fetch(
        isSignup
          ? "/api/users/auth/signup"
          : "/api/users/auth/signin",
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

      const user = result.data;
      const userId = user?._id;

      if (!userId) {
        throw new Error(
          "Authentication succeeded, but the user ID was not returned."
        );
      }

      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(USER_ID, String(userId));

      router.push("/user/dashboard");
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

  function updateSignup(field, value) {
    setSignup((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateLocation(field, value) {
    setSignup((previous) => ({
      ...previous,
      location: {
        ...previous.location,
        [field]: value,
        ...(field === "state" ? { district: "" } : {}),
      },
    }));
  }

  function continueSignup() {
    if (loading) return;

    // Validate only the currently visible step.
    if (
      signupFormRef.current &&
      !signupFormRef.current.reportValidity()
    ) {
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

  const districts =
    indiaData.states.find(
      (item) => item.state === signup.location.state
    )?.districts ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"
      />

      {/* Navbar */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-lg shadow-blue-600/20">
            S
          </span>
          ShopSync
          <span className="text-blue-600">.</span>
        </a>

        <span className="hidden rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm sm:inline-flex">
          Customer workspace
        </span>
      </header>

      {/* Main layout */}
      <section className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-8 sm:px-8 md:py-12 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-16">
        {/* Left section */}
        <div className="mx-auto w-full max-w-xl lg:mx-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold tracking-[0.16em] text-blue-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            YOUR SHOPPING, SIMPLIFIED
          </div>

          <h1 className="text-4xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Everything you need.
            <br />
            <span className="text-blue-600">
              All in one place.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            Discover products, explore local stores, and shop for
            everything you need—all from one convenient platform.
          </p>

          {/* Features */}
          <div className="mt-10 space-y-4">
            {[
              {
                icon: "↗",
                title: "Discover Products",
                description:
                  "Explore products across a wide range of categories.",
              },
              {
                icon: "▦",
                title: "Find Nearby Stores",
                description:
                  "Discover businesses and products available in your area.",
              },
              {
                icon: "✓",
                title: "Manage Your Orders",
                description:
                  "Keep track of your orders in one convenient place.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group flex items-start gap-4 rounded-2xl border border-transparent p-4 transition hover:border-blue-100 hover:bg-white/80 hover:shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
                  {feature.icon}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication card */}
        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-2xl shadow-slate-200/70 backdrop-blur-xl sm:p-8 lg:p-10">
            {/* Card heading */}
            <div className="mb-7">
              <span className="text-xs font-extrabold tracking-[0.2em] text-blue-600">
                USER ACCOUNT
              </span>

              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {mode === "signin"
                  ? "Welcome back"
                  : "Create your account"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === "signin"
                  ? "Sign in to continue shopping."
                  : "Create an account and explore a wide variety of products."}
              </p>
            </div>

            {/* Persistent Sign in / Sign up switch */}
            <div className="relative mb-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <span
                className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-300 ${mode === "signup"
                    ? "translate-x-full"
                    : "translate-x-0"
                  }`}
              />

              <button
                type="button"
                onClick={() => changeMode("signin")}
                className={`relative z-10 rounded-lg px-4 py-3 text-sm font-bold transition ${mode === "signin"
                    ? "text-blue-700"
                    : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() => changeMode("signup")}
                className={`relative z-10 rounded-lg px-4 py-3 text-sm font-bold transition ${mode === "signup"
                    ? "text-blue-700"
                    : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Sign up
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
              >
                <span className="font-bold">!</span>
                <p>{error}</p>
              </div>
            )}

            {/* SIGN IN */}
            {mode === "signin" && (
              <form
                className="space-y-5"
                onSubmit={submit}
                noValidate
              >
                <label className={labelClass}>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@gmail.com"
                    value={signin.email}
                    onChange={(event) =>
                      setSignin((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  />
                </label>

                <label className={labelClass}>
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={signin.password}
                    onChange={(event) =>
                      setSignin((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  />
                </label>

                <button
                  className={buttonClass}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : "Sign in"}
                  <span aria-hidden="true">→</span>
                </button>

                <p className="pt-2 text-center text-sm text-slate-500">
                  New to ShopSync?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("signup")}
                    className="font-bold text-blue-700 underline-offset-4 hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </form>
            )}

            {/* SIGN UP — three-step form */}
            {mode === "signup" && (
              <div>
                {/* Step progress */}
                <div className="mb-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
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
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${signupStep === step.number
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                              : signupStep > step.number
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                        >
                          {signupStep > step.number
                            ? "✓"
                            : step.number}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
                      style={{
                        width: `${(signupStep / 3) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <form
                  ref={signupFormRef}
                  onSubmit={submit}
                >
                  {/* Animated step content */}
                  <div
                    className={`transition-all duration-300 ease-out ${stepVisible
                        ? "translate-x-0 opacity-100"
                        : "translate-x-4 opacity-0"
                      }`}
                  >
                    {/* STEP 1: Account details */}
                    {signupStep === 1 && (
                      <div className="space-y-4">
                        <label className={labelClass}>
                          Your name
                          <input
                            type="text"
                            autoComplete="name"
                            placeholder="Full name"
                            value={signup.name}
                            onChange={(event) =>
                              updateSignup(
                                "name",
                                event.target.value
                              )
                            }
                            className={inputClass}
                            required
                          />
                        </label>

                        <label className={labelClass}>
                          Email address
                          <input
                            type="email"
                            autoComplete="email"
                            placeholder="you@gmail.com"
                            value={signup.email}
                            onChange={(event) =>
                              updateSignup(
                                "email",
                                event.target.value
                              )
                            }
                            className={inputClass}
                            required
                          />
                        </label>

                        <label className={labelClass}>
                          Phone number
                          <input
                            type="tel"
                            autoComplete="tel"
                            placeholder="Enter phone number"
                            value={signup.phone}
                            onChange={(event) =>
                              updateSignup(
                                "phone",
                                event.target.value
                              )
                            }
                            className={inputClass}
                            required
                          />
                        </label>

                        <label className={labelClass}>
                          Password
                          <input
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            placeholder="At least 8 characters"
                            value={signup.password}
                            onChange={(event) =>
                              updateSignup(
                                "password",
                                event.target.value
                              )
                            }
                            className={inputClass}
                            required
                          />

                          <span className="mt-1.5 block text-xs font-normal text-slate-400">
                            Use at least 8 characters.
                          </span>
                        </label>
                      </div>
                    )}

                    {/* STEP 2: Location */}
                    {signupStep === 2 && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                          <h4 className="text-sm font-bold text-slate-900">
                            Your address
                          </h4>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Add your location to help discover nearby
                            businesses.
                          </p>

                          <div className="mt-4 space-y-4">
                            <label className={labelClass}>
                              Address Line
                              <input
                                type="text"
                                autoComplete="street-address"
                                placeholder="House number, street, area"
                                value={signup.location.addressLine}
                                onChange={(event) =>
                                  updateLocation(
                                    "addressLine",
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                                required
                              />
                            </label>

                            <label className={labelClass}>
                              Landmark
                              <input
                                type="text"
                                placeholder="Nearby landmark (optional)"
                                value={signup.location.landmark}
                                onChange={(event) =>
                                  updateLocation(
                                    "landmark",
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className={labelClass}>
                                State
                                <select
                                  value={signup.location.state}
                                  onChange={(event) =>
                                    updateLocation(
                                      "state",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                  required
                                >
                                  <option value="">
                                    Select state
                                  </option>

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
                                  value={signup.location.district}
                                  onChange={(event) =>
                                    updateLocation(
                                      "district",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                  disabled={!signup.location.state}
                                  required
                                >
                                  <option value="">
                                    {signup.location.state
                                      ? "Select district"
                                      : "Select state first"}
                                  </option>

                                  {districts.map((district) => (
                                    <option
                                      key={district}
                                      value={district}
                                    >
                                      {district}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <label className={labelClass}>
                              PIN Code
                              <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="postal-code"
                                placeholder="Enter PIN code"
                                value={signup.location.pinCode}
                                onChange={(event) =>
                                  updateLocation(
                                    "pinCode",
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                                required
                              />
                            </label>
                          </div>
                        </div>

                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs leading-5 text-blue-800">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                          <p>
                            Your device coordinates will be detected automatically when you create
                            your account. Your browser may ask for location permission.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Review */}
                    {signupStep === 3 && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-slate-900">
                              Personal details
                            </h4>

                            <button
                              type="button"
                              onClick={() => setSignupStep(1)}
                              className="text-xs font-bold text-blue-700 hover:underline"
                            >
                              Edit
                            </button>
                          </div>

                          <dl className="mt-4 space-y-3 text-sm">
                            <div>
                              <dt className="text-xs text-slate-500">
                                Full name
                              </dt>
                              <dd className="mt-1 break-words font-semibold text-slate-900">
                                {signup.name || "Not provided"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                Email address
                              </dt>
                              <dd className="mt-1 break-words font-semibold text-slate-900">
                                {signup.email || "Not provided"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                Phone number
                              </dt>
                              <dd className="mt-1 break-words font-semibold text-slate-900">
                                {signup.phone || "Not provided"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-slate-900">
                              Address details
                            </h4>

                            <button
                              type="button"
                              onClick={() => setSignupStep(2)}
                              className="text-xs font-bold text-blue-700 hover:underline"
                            >
                              Edit
                            </button>
                          </div>

                          <dl className="mt-4 space-y-3 text-sm">
                            <div>
                              <dt className="text-xs text-slate-500">
                                Address
                              </dt>
                              <dd className="mt-1 break-words font-semibold text-slate-900">
                                {signup.location.addressLine}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                Landmark
                              </dt>
                              <dd className="mt-1 break-words font-semibold text-slate-900">
                                {signup.location.landmark || "Not provided"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                State and district
                              </dt>
                              <dd className="mt-1 break-words font-semibold text-slate-900">
                                {signup.location.district},{" "}
                                {signup.location.state}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                PIN Code
                              </dt>
                              <dd className="mt-1 font-semibold text-slate-900">
                                {signup.location.pinCode}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-sm font-bold text-blue-900">
                            Ready to get started?
                          </p>
                          <p className="mt-1 text-xs leading-5 text-blue-800">
                            Select Create account to register. Your browser
                            will request permission to detect your device
                            coordinates.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Back / Continue / Create account */}
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
                        className={`${buttonClass} flex-1`}
                        onClick={continueSignup}
                        disabled={loading}
                      >
                        Continue
                        <span aria-hidden="true">→</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className={`${buttonClass} flex-1`}
                        disabled={loading}
                      >
                        {loading
                          ? "Creating account..."
                          : "Create account"}
                        {!loading && (
                          <span aria-hidden="true">→</span>
                        )}
                      </button>
                    )}
                  </div>
                </form>

                {/* Persistent signup footer */}
                <p className="mt-5 text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("signin")}
                    className="font-bold text-blue-700 underline-offset-4 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}