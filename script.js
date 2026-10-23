const SALES_NUMBER = "962771111377";
const FALLBACK_PRODUCTS = [];
let productsCache = [];
let currentProduct = null;
const rates = { USD: { rate: 1, symbol: "$" }, SAR: { rate: 3.75, symbol: "ر.س" }, EGP: { rate: 48.5, symbol: "ج.م" } };
let currency = "USD";

const $ = id => document.getElementById(id);
const safeText = value => String(value ?? "");
function money(value) { const r = rates[currency]; return `${(Number(value || 0) * r.rate).toFixed(2)} ${r.symbol}`; }
function escapeHtml(value) { return safeText(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function getProducts() {
  try {
    const res = await fetch("/api/products", { cache: "no-store" });
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) return data; }
  } catch (e) {}
  try {
    const res = await fetch("products.json?v=" + Date.now(), { cache: "no-store" });
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) return data; }
  } catch (e) {}
  try { const local = JSON.parse(localStorage.getItem("lf_products") || "[]"); return Array.isArray(local) ? local : FALLBACK_PRODUCTS; }
  catch (e) { return FALLBACK_PRODUCTS; }
}

function iconForCategory(cat) {
  const c = String(cat).toLowerCase();
  if (c.includes("whatsapp")) return "fa-brands fa-whatsapp";
  if (c.includes("baileys")) return "fa-solid fa-comments";
  if (c.includes("admin") || c.includes("حماية")) return "fa-solid fa-shield-halved";
  if (c.includes("game") || c.includes("لعب")) return "fa-solid fa-gamepad";
  if (c.includes("ai") || c.includes("ذكاء")) return "fa-solid fa-brain";
  if (c.includes("instagram")) return "fa-brands fa-instagram";
  return "fa-solid fa-code";
}

function renderCategories(items) {
  const box = $("categories-container"), filter = $("category-filter");
  const cats = [...new Set(items.map(p => p.category).filter(Boolean))];
  box.innerHTML = cats.length ? cats.map(c => `<button class="category-card" type="button" data-category="${escapeHtml(c)}"><i class="${iconForCategory(c)}"></i><strong>${escapeHtml(c)}</strong></button>`).join("") : `<div class="empty-state">ستظهر التصنيفات فور إضافة المنتجات.</div>`;
  const selected = filter.value;
  filter.innerHTML = `<option value="all">كل التصنيفات</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  if (cats.includes(selected)) filter.value = selected;
  box.querySelectorAll("[data-category]").forEach(btn => btn.addEventListener("click", () => { filter.value = btn.dataset.category; renderProducts(); $("store").scrollIntoView({ behavior: "smooth" }); }));
}

function filteredProducts() {
  const query = ($("search-input").value || "").trim().toLowerCase();
  const cat = $("category-filter").value;
  const sort = $("sort-filter").value;
  let items = productsCache.filter(p => (cat === "all" || p.category === cat) && [p.name, p.desc, p.lang, p.category].some(v => safeText(v).toLowerCase().includes(query)));
  if (sort === "price-low") items.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === "price-high") items.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === "newest") items.sort((a, b) => Number(String(b.id || "").replace(/\D/g, "")) - Number(String(a.id || "").replace(/\D/g, "")));
  return items;
}

function renderProducts() {
  const box = $("products-container"), items = filteredProducts();
  $("product-count").textContent = `${items.length} منتج`;
  if (!items.length) { box.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>لا توجد منتجات مطابقة لبحثك حاليًا.</p></div>`; return; }
  box.innerHTML = items.map(p => {
    const img = p.img ? `<img class="product-img" src="${escapeHtml(p.img)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.remove()">` : "";
    return `<article class="product-card"><div class="product-image-wrap">${img}<i class="product-placeholder fa-solid fa-robot"></i><span class="product-tag">${escapeHtml(p.tag || "متوفر")}</span></div><div class="product-info"><h3 class="product-title">${escapeHtml(p.name)}</h3><p class="product-desc">${escapeHtml(p.desc || "حل برمجي متقدم من LF BOTS.")}</p><div class="product-meta"><span><i class="fa-solid fa-code"></i> ${escapeHtml(p.lang || "برمجة")}</span><span>${escapeHtml(p.category || "متنوع")}</span></div><div class="product-bottom"><span class="product-price">${money(p.price)} <small>السعر</small></span><button class="btn btn-primary" type="button" data-order="${escapeHtml(p.id)}"><i class="fa-solid fa-cart-shopping"></i> اطلب الآن</button></div></div></article>`;
  }).join("");
  box.querySelectorAll("[data-order]").forEach(btn => btn.addEventListener("click", () => openOrder(btn.dataset.order)));
}

function openModal(id) { $(id).classList.add("open"); $(id).setAttribute("aria-hidden", "false"); }
function closeModals() { document.querySelectorAll(".modal").forEach(m => { m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); }); }

function openOrder(id) {
  currentProduct = productsCache.find(p => String(p.id) === String(id));
  if (!currentProduct) return;
  $("order-product-id").value = currentProduct.id;
  $("order-product-preview").innerHTML = `<div><strong>${escapeHtml(currentProduct.name)}</strong><small>${escapeHtml(currentProduct.category || "")}</small></div><b>${money(currentProduct.price)}</b>`;
  $("order-error").textContent = "";
  openModal("order-modal");
}

async function submitOrder(e) {
  e.preventDefault();
  const btn = $("submit-order"), error = $("order-error");
  error.textContent = "";
  if (!currentProduct) { error.textContent = "تعذر تحديد المنتج. حدّث الصفحة وحاول مجددًا."; return; }
  const clientName = $("order-client-name").value.trim();
  const clientPhone = $("order-client-phone").value.trim();
  const clientNotes = $("order-client-notes").value.trim();
  if (!clientName || !clientPhone) { error.textContent = "يرجى إدخال الاسم ورقم WhatsApp بدقة."; return; }
  const order = { productId: String(currentProduct.id), clientName, clientPhone, clientNotes };
  btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جارٍ تسجيل الطلب...`;
  try {
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.orderId) throw new Error(data.error || "تعذر تسجيل الطلب. يرجى المحاولة لاحقًا.");
    closeModals();
    $("success-order-id").textContent = data.orderId;
    const msg = `السلام عليكم، أرغب في إكمال طلب من متجر LF BOTS.\nرقم الطلب: ${data.orderId}\nاسم البوت: ${currentProduct.name}\nالسعر: ${money(currentProduct.price)}\nاسم العميل: ${clientName}\nرقم التواصل: ${clientPhone}\nملاحظات: ${clientNotes || "لا يوجد"}\nأرجو توضيح خطوات الدفع والتسليم اليدوي.`;
    $("success-wa-link").href = `https://wa.me/${SALES_NUMBER}?text=${encodeURIComponent(msg)}`;
    openModal("success-modal");
    $("order-form").reset();
  } catch (err) {
    error.textContent = err.message || "حدث خطأ غير متوقع أثناء تسجيل الطلب.";
  } finally {
    btn.disabled = false; btn.innerHTML = `تسجيل الطلب والمتابعة <i class="fa-solid fa-arrow-left"></i>`;
  }
}

async function init() {
  productsCache = await getProducts();
  renderCategories(productsCache);
  renderProducts();
  ["search-input", "category-filter", "sort-filter"].forEach(id => $(id).addEventListener(id === "search-input" ? "input" : "change", renderProducts));
  $("order-form").addEventListener("submit", submitOrder);
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModals(); }));
  $("menu-toggle").addEventListener("click", () => $("main-nav").classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", init);
