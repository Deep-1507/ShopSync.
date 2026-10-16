"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ENTERPRISE_ID,
  TOKEN_KEY,
  enterpriseRequest,
} from "../../../../lib/enterpriseClient";

const emptyForm = {
  name: "",
  photo_url: "",
  sku: "",
  category: "",
  brand: "",
  price: "",
  stock: "0",
  unit: "piece",
  weight: "0",
  description: "",
};

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",

    currency: "INR",

    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const id = localStorage.getItem(ENTERPRISE_ID);
    console.log("Reached here:", id);

    try {
      const result = await enterpriseRequest(`/api/products/allProducts/${id}`);
      setProducts(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || "Unable to load products");
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

    return products.filter((product) =>
      [product.name, product.sku, product.category, product.brand].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
      ),
    );
  }, [products, search]);

  function updateField(event) {
    setForm((previous) => ({
      ...previous,

      [event.target.name]: event.target.value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    setError("");
    setSuccess("");
    stopCamera();
  }

  function handleImageSelection(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function startCamera() {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is unavailable. Use HTTPS or choose an image file."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      setError(
        error.message || "Unable to access the camera. Check browser permissions."
      );
    }
  }

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) {
      return;
    }

    videoRef.current.srcObject = cameraStreamRef.current;

    videoRef.current.play().catch(() => {
      setError("Unable to start the camera preview.");
    });
  }, [cameraOpen]);

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("The camera is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to capture the image.");
          return;
        }

        const file = new File(
          [blob],
          `product-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setError("");
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  }


  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);


  function startEditing(product) {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      photo_url: product.photo_url || "",
      sku: product.sku || "",
      category: product.category || "",
      brand: product.brand || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? 0),
      unit: product.unit || "piece",
      weight: String(product.weight ?? 0),
      description: product.description || "",
    });

    setError("");
    setSuccess("");
    setImageFile(null);
    setImagePreview("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  async function submitProduct(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setError("Authentication token not found. Please sign in again.");
      setSaving(false);
      return;
    }

    try {
      // Keep the existing image URL when editing without choosing a new image.
      let photoUrl = form.photo_url || "";

      // Step 1: Upload the selected/captured image, if there is one.
      if (imageFile) {
        const imageData = new FormData();
        imageData.append("image", imageFile);

        const uploadResponse = await fetch("/api/product-images", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: imageData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadResult.message || "Unable to upload product image."
          );
        }

        photoUrl = uploadResult.photo_url;
      }

      // Step 2: Submit the product with the returned image URL.
      const payload = {
        ...form,
        photo_url: photoUrl,
        price: Number(form.price),
        stock: Number(form.stock),
        weight: Number(form.weight),
      };

      await enterpriseRequest(
        editingId ? `/api/products/${editingId}` : "/api/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      setSuccess(
        editingId
          ? "Product updated successfully."
          : "Product created successfully."
      );

      setForm(emptyForm);
      setImageFile(null);
      setImagePreview("");
      setEditingId(null);

      await loadProducts();
    } catch (err) {
      setError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }


  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setError("Authentication token not found. Please sign in again.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await enterpriseRequest(`/api/products/${product._id}`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (editingId === product._id) resetForm();

      setSuccess("Product deleted successfully.");

      await loadProducts();
    } catch (err) {
      setError(err.message || "Unable to delete product");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            CATALOGUE MANAGEMENT
          </span>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create products, maintain your inventory, and keep your catalogue up
            to date.
          </p>
        </div>

        <div className="heading-counter flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
          <span className="heading-counter-icon flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl text-emerald-800">
            ▦
          </span>

          <span>
            <strong className="block text-2xl font-extrabold tracking-tight text-emerald-900">
              {products.length}
            </strong>

            <small className="text-xs font-medium text-slate-500">
              Registered products
            </small>
          </span>
        </div>
      </section>


      {(error || success) && (
        <div
          className={
            error
              ? "notice-error mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              : "notice-success mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          }
        >
          {error || success}
        </div>
      )}

      <div className="products-layout grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">

        <section className="panel product-form-panel min-w-0 overflow-hidden rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_10px_35px_rgba(16,80,48,0.06)] sm:p-7">
          <div className="panel-heading mb-6 flex items-start justify-between gap-4 border-b border-emerald-100 pb-5">
            <div>
              <span className="panel-eyebrow mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                {editingId ? "EDIT CATALOGUE ITEM" : "NEW CATALOGUE ITEM"}
              </span>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {editingId ? "Edit product" : "Add a product"}
              </h2>

              <p>
                {editingId
                  ? "Update the product information below."
                  : "Fill in the details to add a product."}
              </p>
            </div>

            <span className="form-heading-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-semibold text-emerald-800">
              {editingId ? "✎" : "＋"}
            </span>
          </div>

          <form className="product-form space-y-5" onSubmit={submitProduct}>
            <div className="form-section-label border-b border-emerald-100 pb-2 text-xs font-extrabold tracking-[0.16em] text-emerald-800">
              BASIC INFORMATION
            </div>

            <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
              <span>
                Product name <span className="text-red-500">*</span>
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="e.g. Wireless Mouse"
                maxLength={120}
                required
              />
            </label>

            <div className="field-row grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>
                  SKU <span className="text-red-500">*</span>
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="sku"
                  value={form.sku}
                  onChange={updateField}
                  placeholder="WM-001"
                  required
                />
              </label>

              <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>
                  Category <span className="text-red-500">*</span>
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  placeholder="Electronics"
                  required
                />
              </label>
            </div>

            <div className="field-row grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
                Brand
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="brand"
                  value={form.brand}
                  onChange={updateField}
                  placeholder="Brand name"
                />
              </label>

              <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>
                  Unit <span className="text-red-500">*</span>
                </span>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="unit"
                  value={form.unit}
                  onChange={updateField}
                  required
                >
                  <option value="piece">Piece</option>
                  <option value="pack">Pack</option>
                  <option value="box">Box</option>
                  <option value="kg">Kilogram</option>
                  <option value="gram">Gram</option>
                  <option value="litre">Litre</option>
                  <option value="metre">Metre</option>
                  <option value="dozen">Dozen</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Product image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelection}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"
                />
                <span className="text-xs font-normal text-slate-500">
                  Choose a JPEG, PNG, or WebP image. Maximum size: 5 MB.
                </span>
              </label>

              <button
                type="button"
                onClick={startCamera}
                className="inline-flex w-fit items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Take a picture with camera
              </button>

              {(imagePreview || form.photo_url) && (
                <div className="flex max-h-64 items-center justify-center overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                  <img
                    src={imagePreview || form.photo_url}
                    alt="Product preview"
                    className="max-h-56 max-w-full rounded-xl object-contain"
                  />
                </div>
              )}

              {imageFile && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                  className="w-fit text-sm font-semibold text-rose-700 hover:underline"
                >
                  Remove selected image
                </button>
              )}
            </div>

            {form.photo_url && (
              <div className="product-image-preview mt-3 flex max-h-56 items-center justify-center overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <img
                  src={form.photo_url}
                  alt="Product preview"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = "block";
                  }}
                />
              </div>
            )}

            <div className="form-section-label form-section-spaced mt-2 border-b border-emerald-100 pb-2 text-xs font-extrabold tracking-[0.16em] text-emerald-800">
              PRICING & INVENTORY
            </div>

            <div className="field-row grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>
                  Price (₹) <span className="text-red-500">*</span>
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={updateField}
                  placeholder="799.00"
                  required
                />
              </label>

              <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>
                  Stock quantity <span className="text-red-500">*</span>
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  type="number"
                  name="stock"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={updateField}
                  required
                />
              </label>
            </div>

            <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
              Weight
              <div className="input-with-suffix flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  type="number"
                  name="weight"
                  min="0"
                  step="any"
                  value={form.weight}
                  onChange={updateField}
                />
                <span>kg</span>
              </div>
            </label>

            <label className="field flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
              Description
              <textarea
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Describe the product..."
                rows={3}
                maxLength={1000}
              />
              <small className="field-hint">
                {form.description.length}/1000 characters
              </small>
            </label>

            <div className="form-actions flex flex-wrap items-center gap-3 pt-2">
              <button
                className="primary-button form-submit inline-flex min-w-40 items-center justify-center gap-3 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create product"}
                <span>→</span>
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary-button inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <p className="form-security-note flex items-start gap-2 text-xs leading-5 text-slate-500">
              <span>✓</span> Your product is associated with your authenticated
              enterprise.
            </p>
          </form>
        </section>


        <section className="panel product-list-panel min-w-0 overflow-hidden rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_10px_35px_rgba(16,80,48,0.06)] sm:p-7">
          <div className="panel-heading mb-6 flex items-start justify-between gap-4 border-b border-emerald-100 pb-5">
            <div>
              <span className="panel-eyebrow mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                YOUR INVENTORY
              </span>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Product catalogue
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                All products registered by your enterprise.
              </p>
            </div>

            <span className="count-pill shrink-0 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
              {products.length} total
            </span>
          </div>

          <div className="product-search mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100">
            <span>⌕</span>

            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, SKU, brand..."
              aria-label="Search products"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="product-list-summary mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>
              Showing <strong>{filteredProducts.length}</strong> of{" "}
              <strong className="block text-2xl font-extrabold tracking-tight text-emerald-900">
                {products.length}
              </strong>{" "}
              products
            </span>

            <button
              type="button"
              className="text-button rounded-lg px-3 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-50"
              onClick={loadProducts}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="empty-state flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center">
              <span className="loading-mark flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-bold text-white">
                S
              </span>

              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center">
              <span className="empty-state-icon flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-800">
                ▦
              </span>

              <strong>
                {search ? "No matching products" : "Your catalogue is empty"}
              </strong>

              <p>
                {search
                  ? "Try another name, SKU, category, or brand."
                  : "Use the form to create your first product."}
              </p>

              {search && (
                <button
                  className="secondary-button inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="table-scroll product-table-scroll max-w-full overflow-x-auto rounded-2xl border border-slate-100">
              <table className="data-table product-table w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap bg-emerald-50/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Product
                    </th>

                    <th className="whitespace-nowrap bg-emerald-50/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-900">
                      SKU / Category
                    </th>

                    <th className="whitespace-nowrap bg-emerald-50/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Price
                    </th>

                    <th className="whitespace-nowrap bg-emerald-50/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Stock
                    </th>

                    <th className="align-right whitespace-nowrap bg-emerald-50/70 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product._id}
                      className="border-t border-slate-100 transition hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-4 align-middle text-slate-700">
                        <div className="product-cell flex min-w-40 items-center gap-3">
                          {product.photo_url ? (
                            <img
                              className="product-thumbnail h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-emerald-100"
                              src={product.photo_url}
                              alt=""
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="product-thumbnail-placeholder flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-800">
                              {product.name?.charAt(0)?.toUpperCase() || "P"}
                            </span>
                          )}

                          <span className="product-cell-copy flex min-w-0 flex-col gap-1">
                            <strong className="truncate font-semibold text-slate-900">
                              {product.name}
                            </strong>

                            <small>{product.brand || "No brand"}</small>
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle text-slate-700">
                        <strong>{product.sku}</strong>

                        <small className="table-subtext mt-1 block text-xs font-normal text-slate-500">
                          {product.category}
                        </small>
                      </td>

                      <td className="px-4 py-4 align-middle text-slate-700">
                        <strong>{money(product.price)}</strong>

                        <small className="table-subtext mt-1 block text-xs font-normal text-slate-500">
                          per {product.unit}
                        </small>
                      </td>

                      <td className="px-4 py-4 align-middle text-slate-700">
                        <span
                          className={`stock-pill inline-flex min-w-10 justify-center rounded-full px-3 py-1 text-xs font-bold ${Number(product.stock) === 0
                            ? "stock-empty bg-rose-100 text-rose-700"
                            : Number(product.stock) < 10
                              ? "stock-low bg-amber-100 text-amber-800"
                              : "stock-available bg-emerald-100 text-emerald-800"
                            }`}
                        >
                          {product.stock}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-middle text-slate-700">
                        <div className="row-actions flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="icon-button edit-action flex h-9 w-9 items-center justify-center rounded-lg border transition border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            title="Edit product"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => startEditing(product)}
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="icon-button delete-action flex h-9 w-9 items-center justify-center rounded-lg border transition border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            title="Delete product"
                            aria-label={`Delete ${product.name}`}
                            onClick={() => deleteProduct(product)}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="product-list-footer mt-5 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span>Catalogue management</span>

            <span>Updated from your database</span>
          </div>
        </section>
      </div>


      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Take product picture
              </h2>

              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
                aria-label="Close camera"
              >
                ✕
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-[60vh] w-full rounded-xl bg-black object-contain"
            />

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
              >
                Capture photo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
