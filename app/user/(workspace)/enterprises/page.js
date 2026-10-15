
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function UserEnterprisesPage() {
    const [enterprises, setEnterprises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchEnterprises() {
            try {
                setLoading(true);
                setError("");

                const storedUser = localStorage.getItem("shopsync_user");

                if (!storedUser) {
                    throw new Error(
                        "User details not found. Please sign in again."
                    );
                }

                const user = JSON.parse(storedUser);

                const district = user?.location?.district;
                const state = user?.location?.state;

                if (!district || !state) {
                    throw new Error(
                        "Your district or state is missing from your profile."
                    );
                }

                const token = localStorage.getItem("shopsync_user_token");

                if (!token) {
                    throw new Error(
                        "Authentication token not found. Please sign in again."
                    );
                }

                const params = new URLSearchParams({
                    district,
                    state,
                });

                const response = await fetch(
                    `/api/enterprises/search?${params.toString()}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                    }
                );

                const result = await response.json();

                if (!response.ok || result.success === false) {
                    throw new Error(
                        result.message || "Unable to load enterprises."
                    );
                }

                setEnterprises(
                    Array.isArray(result.enterprises)
                        ? result.enterprises
                        : []
                );
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(
                        err.message || "Unable to load businesses."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchEnterprises();

        return () => controller.abort();
    }, []);

    const filteredEnterprises = enterprises.filter((enterprise) => {
        const query = search.trim().toLowerCase();

        if (!query) return true;

        return [
            enterprise.enterpriseName,
            enterprise.name,
            enterprise.category,
            enterprise.location?.addressLine,
            enterprise.location?.district,
            enterprise.location?.state,
            enterprise.location?.pinCode,
            enterprise.location?.landmark,
        ].some((value) =>
            String(value || "").toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6">
            {/* Page heading — Tailwind only */}
            <section className="flex flex-col justify-between gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                <div className="min-w-0">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
                        DISCOVER BUSINESSES
                    </span>

                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                        Enterprises
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        Explore businesses on ShopSync and discover stores
                        where you can shop.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                        ▦
                    </span>

                    <span className="flex min-w-0 flex-col">
                        <strong className="text-xl font-bold leading-tight text-gray-900">
                            {enterprises.length}
                        </strong>

                        <small className="mt-1 max-w-48 text-xs leading-5 text-gray-500">
                            Enterprises found as per your location
                        </small>
                    </span>
                </div>
            </section>

            {/* Main content */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-5 border-b border-gray-100 p-5 sm:p-6 lg:flex-row lg:items-center">
                    <div>
                        <h2 className="mt-2 text-xl font-bold text-gray-900">
                            Available businesses
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Choose a business to start shopping.
                        </p>
                    </div>

                    <div className="relative w-full lg:max-w-sm">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xl text-gray-400">
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search businesses..."
                            aria-label="Search businesses"
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-8">
                        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-red-100 border-t-blue-600" />

                        <p className="mt-4 text-sm font-semibold text-gray-800">
                            Finding businesses...
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                            Loading available stores.
                        </p>
                    </div>
                ) : error ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-[#ed1c24]">
                            !
                        </div>

                        <h3 className="mt-4 font-bold text-gray-900">
                            Unable to load businesses
                        </h3>

                        <p className="mt-2 max-w-md text-sm text-gray-500">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        >
                            Try again
                        </button>
                    </div>
                ) : filteredEnterprises.length === 0 ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-500">
                            ⌕
                        </div>

                        <h3 className="mt-4 font-bold text-gray-900">
                            {search
                                ? "No matching businesses"
                                : "Oops! Looks like we are not there yet."}
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                            {search
                                ? "Try a different name, category, or location."
                                : "But don't worry, we are continuously expanding our network! We will be there soon!"}
                        </p>
                    </div>
                ) : (
                    <div className="p-5 sm:p-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-gray-500">
                                Showing{" "}
                                <span className="font-bold text-gray-900">
                                    {filteredEnterprises.length}
                                </span>{" "}
                                {filteredEnterprises.length === 1
                                    ? "business"
                                    : "businesses"}
                            </p>

                            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                Available to explore
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredEnterprises.map((enterprise) => {
                                const displayName =
                                    enterprise.enterpriseName ||
                                    enterprise.name ||
                                    "Unnamed Business";

                                const initials = displayName
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((word) => word[0])
                                    .join("")
                                    .toUpperCase();

                                const location = enterprise.location;

                                const locationText = location
                                    ? [
                                        location.addressLine,
                                        location.landmark,
                                        location.district,
                                        location.state,
                                        location.pinCode,
                                    ]
                                        .filter(Boolean)
                                        .join(", ")
                                    : "Location not provided";

                                return (
                                    <article
                                        key={enterprise._id}
                                        className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/60"
                                    >
                                        {/* Card cover */}
                                        <div className="relative flex min-h-36 items-center justify-center border-b border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-100">
                                            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-2xl font-extrabold tracking-tight text-[#ed1c24] shadow-sm transition duration-200 group-hover:scale-105">
                                                {initials || "S"}
                                            </div>

                                            <span className="absolute right-3 top-3 max-w-[55%] truncate rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                                {enterprise.category || "Business"}
                                            </span>
                                        </div>

                                        {/* Card details */}
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="break-words text-lg font-bold tracking-tight text-gray-900">
                                                        {displayName}
                                                    </h3>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Owned by{" "}
                                                        {enterprise.name ||
                                                            "Business owner"}
                                                    </p>
                                                </div>

                                                <span
                                                    title="Listed on ShopSync"
                                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-600"
                                                >
                                                    ✓
                                                </span>
                                            </div>

                                            <div className="my-5 space-y-3 border-y border-gray-100 py-4">
                                                {/* Location */}
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-base text-[#ed1c24]">
                                                        ⌖
                                                    </span>

                                                    <div className="min-w-0 flex-1 pt-1">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            Location
                                                        </p>

                                                        <p className="mt-1 break-words text-sm leading-6 text-gray-700">
                                                            {locationText}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Phone and email */}
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-600">
                                                        📞
                                                    </span>

                                                    <div className="min-w-0 flex-1 pt-1">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            PHONE
                                                        </p>

                                                        <p className="mt-1 break-all text-sm text-gray-700">
                                                            {enterprise.phone ||
                                                                "Phone not provided"}
                                                        </p>
                                                    </div>

                                                    <div className="min-w-0 flex-1 pt-1">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            EMAIL
                                                        </p>

                                                        <p className="mt-1 break-all text-sm text-gray-700">
                                                            {enterprise.email ||
                                                                "Email not provided"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Shop button */}
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                    Ready to shop
                                                </span>

                                                <Link
                                                    href={`/user/orders/createOrder?enterpriseId=${encodeURIComponent(
                                                        enterprise._id
                                                    )}`}
                                                    aria-label={`Shop at ${displayName}`}
                                                    className="inline-flex min-h-10 items-center justify-center gap-3 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold !text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
                                                >
                                                    Shop now

                                                    <span
                                                        aria-hidden="true"
                                                        className="text-base text-white transition-transform group-hover:translate-x-0.5"
                                                    >
                                                        ↗
                                                    </span>
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
