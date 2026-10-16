"use client";

import { useEffect, useState } from "react";
import { userRequest, USER_KEY } from "../../../../lib/userClient";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  LoaderCircle,
  Pencil,
  X,
  Save,
} from "lucide-react";
import indiaData from "../../../../lib/indiaStatesDistricts.json";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  addressLine: "",
  district: "",
  state: "",
  pinCode: "",
  landmark: "",
  latitude: "",
  longitude: "",
};

const fields = [
  { label: "Full Name", key: "name", required: true, maxLength: 100 },
  {
    label: "Email Address",
    key: "email",
    type: "email",
    required: true,
    maxLength: 120,
  },
  {
    label: "Phone Number",
    key: "phone",
    type: "tel",
    required: true,
  },
  {
    label: "Address Line",
    key: "addressLine",
    required: true,
  },
  { label: "Landmark", key: "landmark" },
  {
    label: "PIN Code",
    key: "pinCode",
    required: true,
  },
];

function extractUser(result) {
  const candidates = [
    result?.data?.user,
    result?.user,
    result?.data?.data,
    result?.data,
    result?.updatedUser,
  ];

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate._id || candidate.email || candidate.phone)
  );
}

export default function EnterpriseProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const result = await userRequest("/api/users");
        const userData = extractUser(result);

        if (!userData) {
          throw new Error("Unable to load user profile.");
        }

        if (active) {
          setUser(userData);
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        }
      } catch (err) {
        if (active) {
          setError(err?.message || "Failed to fetch user details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

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
                "Location permission was denied. Allow location access and try again."
              )
            );
          } else if (geoError.code === 2) {
            reject(
              new Error("Your location could not be determined.")
            );
          } else if (geoError.code === 3) {
            reject(
              new Error("Location detection timed out. Please try again.")
            );
          } else {
            reject(new Error("Unable to detect your location."));
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

  async function refreshPreciseLocation() {
    setUpdatingLocation(true);
    setLocationMessage("");
    setError("");

    try {
      const coordinates = await getBrowserLocation();

      setForm((current) => ({
        ...current,
        latitude: String(coordinates.latitude),
        longitude: String(coordinates.longitude),
      }));

      setLocationMessage("Precise location updated successfully.");
    } catch (err) {
      setLocationMessage(
        err?.message || "Failed to update your precise location."
      );
    } finally {
      setUpdatingLocation(false);
    }
  }

  const openEditModal = () => {
    setError("");
    setNotice("");

    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      addressLine: user?.location?.addressLine || "",
      district: user?.location?.district || "",
      state: user?.location?.state || "",
      pinCode: user?.location?.pinCode || "",
      landmark: user?.location?.landmark || "",
      latitude: user?.latitude ?? "",
      longitude: user?.longitude ?? "",
    });

    setShowEditModal(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const latitude =
      form.latitude === "" ? NaN : Number(form.latitude);
    const longitude =
      form.longitude === "" ? NaN : Number(form.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Enter valid latitude and longitude coordinates.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: {
        addressLine: form.addressLine.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode.trim(),
        landmark: form.landmark.trim(),
      },
      latitude,
      longitude,
    };

    try {
      setSaving(true);

      const result = await userRequest("/api/users", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Prefer the updated user returned by the API.
      // If the API returns only a success message, use the submitted
      // values merged with the existing user.
      const responseUser = extractUser(result);

      const updatedUser = responseUser
        ? {
            ...user,
            ...responseUser,
            location: {
              ...(user?.location || {}),
              ...(responseUser.location || {}),
            },
          }
        : {
            ...user,
            ...payload,
            location: {
              ...(user?.location || {}),
              ...payload.location,
            },
          };

      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

      setShowEditModal(false);
      setNotice("Your profile has been updated successfully.");
    } catch (err) {
      setError(err?.message || "Failed to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const location = user?.location;

  const locationText =
    location && typeof location === "object"
      ? [
          location.addressLine,
          location.landmark,
          location.district,
          location.state,
          location.pinCode,
        ]
          .filter(Boolean)
          .join(", ")
      : typeof location === "string"
        ? location
        : "";

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-3 text-gray-500">
        <LoaderCircle size={22} className="animate-spin" />
        <span>Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">

      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            ACCOUNT SETTINGS
          </span>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            User Profile
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Discover products from various stores, compare your
            options, and find everything you need in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={openEditModal}
          disabled={!user}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Pencil size={16} />
          Update Details
        </button>
      </section>


      {error && !showEditModal && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {notice}
        </div>
      )}

      {user && (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex h-28 items-end bg-gradient-to-r from-red-700 via-[#ed1c24] to-rose-500 px-6 sm:h-36">
            <div className="mb-0 flex h-20 w-20 translate-y-1/2 items-center justify-center rounded-2xl border-4 border-white bg-red-50 text-[#ed1c24] shadow-md sm:h-24 sm:w-24">
              {user.name?.charAt(0)?.toUpperCase() || (
                <UserRound size={36} />
              )}
            </div>
          </div>

          <div className="px-5 pb-6 pt-12 sm:px-8 sm:pb-8 sm:pt-14">
            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#ed1c24]">
              Customer Account
            </span>

            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              {user.name || "Your Profile"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {user.email || "Account holder"}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 p-4">
                <span className="mb-2 block text-xs font-bold tracking-wide text-gray-500">
                  <Mail size={14} className="mr-1 inline" />
                  EMAIL ADDRESS
                </span>

                <strong className="block break-words text-sm font-semibold text-gray-900">
                  {user.email || "—"}
                </strong>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <span className="mb-2 block text-xs font-bold tracking-wide text-gray-500">
                  <Phone size={14} className="mr-1 inline" />
                  PHONE NUMBER
                </span>

                <strong className="block text-sm font-semibold text-gray-900">
                  {user.phone || "—"}
                </strong>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <span className="mb-2 block text-xs font-bold tracking-wide text-gray-500">
                  <MapPin size={14} className="mr-1 inline" />
                  YOUR LOCATION
                </span>

                <strong className="block break-words text-sm font-semibold text-gray-900">
                  {locationText || "Location not provided"}
                </strong>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <span className="mb-2 block text-xs font-bold tracking-wide text-gray-500">
                  <ShieldCheck size={14} className="mr-1 inline" />
                  USER ID
                </span>

                <strong className="block break-all font-mono text-xs text-gray-900">
                  {user._id || "—"}
                </strong>
              </div>
            </div>

            <p className="mt-6 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-500">
              Your profile information is displayed from your account.
              Passwords are never displayed here.
            </p>
          </div>
        </section>
      )}

      {showEditModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => {
            if (!saving) setShowEditModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
              <div>
                <h2
                  id="edit-profile-title"
                  className="text-xl font-bold text-gray-900"
                >
                  Update Your Details
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Edit your account information below.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowEditModal(false)}
                aria-label="Close edit profile"
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="overflow-y-auto p-5 sm:p-7">
                {error && (
                  <div
                    role="alert"
                    className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {fields
                    .filter(
                      (field) =>
                        ![
                          "state",
                          "district",
                          "latitude",
                          "longitude",
                        ].includes(field.key)
                    )
                    .map((field) => (
                      <label
                        key={field.key}
                        className="flex min-w-0 flex-col gap-1.5"
                      >
                        <span className="text-sm font-semibold text-gray-700">
                          {field.label}
                          {field.required && (
                            <span className="text-red-500"> *</span>
                          )}
                        </span>

                        <input
                          type={field.type || "text"}
                          value={form[field.key]}
                          required={field.required}
                          maxLength={field.maxLength}
                          onChange={(event) =>
                            updateField(field.key, event.target.value)
                          }
                          className={inputClass}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      </label>
                    ))}

                  {/* State dropdown */}
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">
                      State <span className="text-red-500">*</span>
                    </span>

                    <select
                      value={form.state}
                      required
                      onChange={(event) => {
                        const selectedState = event.target.value;

                        setForm((current) => ({
                          ...current,
                          state: selectedState,
                          district: "",
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">Select state</option>

                      {indiaData.states.map((item) => (
                        <option key={item.state} value={item.state}>
                          {item.state}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* District dropdown */}
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">
                      District <span className="text-red-500">*</span>
                    </span>

                    <select
                      value={form.district}
                      required
                      disabled={!form.state}
                      onChange={(event) =>
                        updateField("district", event.target.value)
                      }
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-100`}
                    >
                      <option value="">
                        {form.state
                          ? "Select district"
                          : "Select state first"}
                      </option>

                      {(indiaData.states.find(
                        (item) => item.state === form.state
                      )?.districts ?? []).map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Precise location button */}
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Precise Location
                    </span>

                    <button
                      type="button"
                      onClick={refreshPreciseLocation}
                      disabled={updatingLocation || saving}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingLocation ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <MapPin size={17} />
                      )}

                      {updatingLocation
                        ? "Detecting Location..."
                        : "Update Precise Location"}
                    </button>

                    {form.latitude !== "" &&
                      form.longitude !== "" && (
                        <p className="text-xs text-gray-500">
                          <MapPin size={13} className="mr-1 inline" />
                          Coordinates saved in the form:{" "}
                          {Number(form.latitude).toFixed(6)},{" "}
                          {Number(form.longitude).toFixed(6)}
                        </p>
                      )}

                    {locationMessage && (
                      <p
                        role="status"
                        className={`text-xs ${
                          locationMessage.includes("successfully")
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {locationMessage}
                      </p>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-gray-500">
                  Latitude and longitude identify your location for nearby
                  stores and directions. Keep them accurate.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}