"use client";

import { useCallback, useEffect, useState, useMemo } from "react";


export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Read the logged-in user's details from localStorage
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

      // Pass district and state to the products API
      const params = new URLSearchParams({
        district,
        state,
      });



      const response = await fetch(
        `/api/products/allProducts?${params.toString()}`,
        {
          method: "GET",
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to load products."
        );
      }

      // Support either response.data or response.products
      const productList = result.products ?? result.data;

      setProducts(
        Array.isArray(productList) ? productList : []
      );
    } catch (err) {
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      const searchableFields = [
        product.name,
        product.sku,
        product.category,
        product.brand,
        product.description,
        product.price,
        product.stock,
        product.quantity,
        product.unit,
        product.weight,
      ];

      return searchableFields.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [products, search]);

  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Explore products
          </span>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Products
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Discover products from various stores, compare your
            options, and find everything you need in one place.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
            ▦
          </span>

          <span className="flex flex-col gap-1">
            <strong className="text-xl font-bold text-slate-900">
              {products.length}
            </strong>

            <small className="text-xs text-slate-500">
              Products found as per your location
            </small>
          </span>
        </div>
      </section>

      {/* Notifications */}
      {(error || success) && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
        >
          {error || success}
        </div>
      )}

      {/* Products catalogue */}
      <section className="mt-2">
        {/* Search panel */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m20 20-4-4"
                />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by name, SKU, category, brand, price, stock..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-slate-400 transition hover:text-slate-700"
                >
                  ×
                </button>
              )}
            </div>

            <span className="text-sm text-slate-500">
              {filteredProducts.length} of {products.length} products
            </span>
          </div>
        </div>

        {/* Loading skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 h-40 rounded-xl bg-slate-100" />
                <div className="mb-3 h-5 w-2/3 rounded bg-slate-100" />
                <div className="mb-5 h-4 w-1/2 rounded bg-slate-100" />
                <div className="h-10 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mb-3 text-4xl">📦</div>

            <h2 className="text-lg font-semibold text-slate-900">
              No products found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {search.trim()
                ? "Try changing your search keywords."
                : "Products will appear here when they are available."}
            </p>
          </div>
        ) : (
          /* Product cards */
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const enterpriseId =
                product.enterpriseId?._id ||
                product.enterpriseId ||
                product.enterprise?._id ||
                product.enterprise ||
                product.enterpriseRef?._id ||
                product.enterpriseRef;

              return (
                <article
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      setSelectedProduct(product);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {/* Product image */}
                  <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100">
                    {product.photo_url || product.imageUrl ? (
                      <img
                        src={product.photo_url || product.imageUrl}
                        alt={product.name || "Product"}
                        className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-6xl">📦</span>
                    )}

                    {product.category && (
                      <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                        {product.category}
                      </span>
                    )}
                  </div>

                  {/* Product details */}
                  <div className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h2 className="line-clamp-2 text-lg font-bold text-slate-900">
                        {product.name || "Unnamed Product"}
                      </h2>

                      {product.brand && (
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          {product.brand}
                        </span>
                      )}
                    </div>

                    {product.sku && (
                      <p className="mb-3 text-xs text-slate-500">
                        SKU: {product.sku}
                      </p>
                    )}

                    {product.description && (
                      <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-600">
                        {product.description}
                      </p>
                    )}

                    <div className="mb-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          Price
                        </p>

                        <p className="mt-1 break-words text-xl font-bold text-blue-600">
                          {product.price != null
                            ? `₹${Number(product.price).toLocaleString("en-IN")}`
                            : "Price unavailable"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Stock
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {product.stock ??
                            product.quantity ??
                            "—"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!enterpriseId}
                      onClick={(event) => {
                        event.stopPropagation();

                        if (!enterpriseId) return;

                        window.location.href = `/user/orders/createOrder?enterpriseId=${encodeURIComponent(
                          String(enterpriseId)
                        )}&productId=${encodeURIComponent(
                          String(product._id)
                        )}`;
                      }}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {enterpriseId
                        ? "Place Order →"
                        : "Enterprise unavailable"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Product details modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-slate-600 shadow transition hover:bg-slate-100"
            >
              ×
            </button>

            {/* Product image */}
            <div className="flex h-64 items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 sm:h-80">
              {selectedProduct.photo_url ||
                selectedProduct.imageUrl ? (
                <img
                  src={
                    selectedProduct.photo_url ||
                    selectedProduct.imageUrl
                  }
                  alt={selectedProduct.name || "Product"}
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <span className="text-7xl">📦</span>
              )}
            </div>

            <div className="p-6 sm:p-8">
              {/* Product heading */}
              <div className="mb-6">
                {selectedProduct.category && (
                  <span className="mb-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {selectedProduct.category}
                  </span>
                )}

                <h2
                  id="product-modal-title"
                  className="text-2xl font-bold text-slate-900 sm:text-3xl"
                >
                  {selectedProduct.name || "Unnamed Product"}
                </h2>

                {selectedProduct.brand && (
                  <p className="mt-2 text-sm text-slate-500">
                    Brand: {selectedProduct.brand}
                  </p>
                )}

                <p className="mt-4 text-2xl font-bold text-blue-600">
                  {selectedProduct.price != null
                    ? `₹${Number(
                      selectedProduct.price
                    ).toLocaleString("en-IN")}`
                    : "Price unavailable"}
                </p>
              </div>

              {/* Available product fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Object.entries(selectedProduct)
                  .filter(
                    ([key, value]) =>
                      ![
                        "_id",
                        "__v",
                        "photo_url",
                        "imageUrl",
                      ].includes(key) &&
                      value !== null &&
                      value !== undefined &&
                      typeof value !== "object"
                  )
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/_/g, " ")}
                      </p>

                      <p className="break-words text-sm font-semibold text-slate-900">
                        {String(value)}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Place order */}
              <button
                type="button"
                disabled={
                  !(
                    selectedProduct.enterpriseId?._id ||
                    selectedProduct.enterpriseId ||
                    selectedProduct.enterprise?._id ||
                    selectedProduct.enterprise ||
                    selectedProduct.enterpriseRef?._id ||
                    selectedProduct.enterpriseRef
                  )
                }
                onClick={() => {
                  const enterpriseId =
                    selectedProduct.enterpriseId?._id ||
                    selectedProduct.enterpriseId ||
                    selectedProduct.enterprise?._id ||
                    selectedProduct.enterprise ||
                    selectedProduct.enterpriseRef?._id ||
                    selectedProduct.enterpriseRef;

                  if (!enterpriseId) return;

                  window.location.href = `/user/orders/createOrder?enterpriseId=${encodeURIComponent(
                    String(enterpriseId)
                  )}&productId=${encodeURIComponent(
                    String(selectedProduct._id)
                  )}`;
                }}
                className="mt-8 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Place Order →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}