"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ENTERPRISE_ID, TOKEN_KEY, enterpriseRequest } from "../../../../lib/enterpriseClient";

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

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const id = localStorage.getItem(ENTERPRISE_ID)
    console.log("Reached here:",id)
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
      [
        product.name,
        product.sku,
        product.category,
        product.brand,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
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
    setError("");
    setSuccess("");
  }

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

  const payload = {
    ...form,
    price: Number(form.price),
    stock: Number(form.stock),
    weight: Number(form.weight),
  };

  try {
    await enterpriseRequest(
      editingId
        ? `/api/products/${editingId}`
        : "/api/products",
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
    setEditingId(null);
    await loadProducts();
  } catch (err) {
    setError(err.message || "Unable to save product");
  } finally {
    setSaving(false);
  }
}

async function deleteProduct(product) {
  const confirmed = window.confirm(
    `Delete "${product.name}"? This action cannot be undone.`
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
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">CATALOGUE MANAGEMENT</span>
          <h1>Products</h1>
          <p>
            Create products, maintain your inventory, and keep
            your catalogue up to date.
          </p>
        </div>

        <div className="heading-counter">
          <span className="heading-counter-icon">▦</span>
          <span>
            <strong>{products.length}</strong>
            <small>Registered products</small>
          </span>
        </div>
      </section>

      {(error || success) && (
        <div className={error ? "notice-error" : "notice-success"}>
          {error || success}
        </div>
      )}

      <div className="products-layout">
        <section className="panel product-form-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">
                {editingId ? "EDIT CATALOGUE ITEM" : "NEW CATALOGUE ITEM"}
              </span>
              <h2>{editingId ? "Edit product" : "Add a product"}</h2>
              <p>
                {editingId
                  ? "Update the product information below."
                  : "Fill in the details to add a product."}
              </p>
            </div>
            <span className="form-heading-icon">
              {editingId ? "✎" : "＋"}
            </span>
          </div>

          <form className="product-form" onSubmit={submitProduct}>
            <div className="form-section-label">BASIC INFORMATION</div>

            <label className="field">
              Product name <span>*</span>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="e.g. Wireless Mouse"
                maxLength={120}
                required
              />
            </label>

            <div className="field-row">
              <label className="field">
                SKU <span>*</span>
                <input
                  name="sku"
                  value={form.sku}
                  onChange={updateField}
                  placeholder="WM-001"
                  required
                />
              </label>

              <label className="field">
                Category <span>*</span>
                <input
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  placeholder="Electronics"
                  required
                />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                Brand
                <input
                  name="brand"
                  value={form.brand}
                  onChange={updateField}
                  placeholder="Brand name"
                />
              </label>

              <label className="field">
                Unit <span>*</span>
                <select
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

            <label className="field">
              Product image URL
              <input
                type="url"
                name="photo_url"
                value={form.photo_url}
                onChange={updateField}
                placeholder="https://example.com/product.jpg"
              />
            </label>

            {form.photo_url && (
              <div className="product-image-preview">
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

            <div className="form-section-label form-section-spaced">
              PRICING & INVENTORY
            </div>

            <div className="field-row">
              <label className="field">
                Price (₹) <span>*</span>
                <input
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

              <label className="field">
                Stock quantity <span>*</span>
                <input
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

            <label className="field">
              Weight
              <div className="input-with-suffix">
                <input
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

            <label className="field">
              Description
              <textarea
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

            <div className="form-actions">
              <button
                className="primary-button form-submit"
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
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <p className="form-security-note">
              <span>✓</span> Your product is associated with your
              authenticated enterprise.
            </p>
          </form>
        </section>

        <section className="panel product-list-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">YOUR INVENTORY</span>
              <h2>Product catalogue</h2>
              <p>All products registered by your enterprise.</p>
            </div>
            <span className="count-pill">{products.length} total</span>
          </div>

          <div className="product-search">
            <span>⌕</span>
            <input
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

          <div className="product-list-summary">
            <span>
              Showing <strong>{filteredProducts.length}</strong> of{" "}
              <strong>{products.length}</strong> products
            </span>
            <button
              type="button"
              className="text-button"
              onClick={loadProducts}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <span className="loading-mark">S</span>
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">▦</span>
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
                  className="secondary-button"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="table-scroll product-table-scroll">
              <table className="data-table product-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU / Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th className="align-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="product-cell">
                          {product.photo_url ? (
                            <img
                              className="product-thumbnail"
                              src={product.photo_url}
                              alt=""
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="product-thumbnail-placeholder">
                              {product.name?.charAt(0)?.toUpperCase() || "P"}
                            </span>
                          )}
                          <span className="product-cell-copy">
                            <strong>{product.name}</strong>
                            <small>{product.brand || "No brand"}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{product.sku}</strong>
                        <small className="table-subtext">
                          {product.category}
                        </small>
                      </td>
                      <td>
                        <strong>{money(product.price)}</strong>
                        <small className="table-subtext">
                          per {product.unit}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`stock-pill ${
                            Number(product.stock) === 0
                              ? "stock-empty"
                              : Number(product.stock) < 10
                                ? "stock-low"
                                : "stock-available"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button edit-action"
                            title="Edit product"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => startEditing(product)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-button delete-action"
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

          <div className="product-list-footer">
            <span>Catalogue management</span>
            <span>Updated from your database</span>
          </div>
        </section>
      </div>
    </div>
  );
}
