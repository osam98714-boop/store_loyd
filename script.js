const SALES_NUMBER = "962771111377";
const FALLBACK_PRODUCTS = [];
let productsCache = [];
let currentProduct = null;
const rates = { USD: { rate: 1, symbol: "$" }, SAR: { rate: 3.75, symbol: "ر.س" }, EGP: { rate: 48.5, symbol: "ج.م" } };
let currency = "USD";
const FAVORITES_KEY = "lf_favorites_v1";
const REVIEWS_KEY = "lf_reviews_v1";
const ACTIVITY_KEY = "lf_activity_v1";
function readStore(key, fallback = []) { try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v ?? fallback; } catch { return fallback; } }
function writeStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

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
    const detailsUrl = `product.html?id=${encodeURIComponent(p.id)}`;
    return `<article class="product-card"><a class="product-image-link" href="${detailsUrl}" aria-label="عرض تفاصيل ${escapeHtml(p.name)}"><div class="product-image-wrap">${img}<i class="product-placeholder fa-solid fa-robot"></i><span class="product-tag">${escapeHtml(p.tag || "متوفر")}</span></div></a><div class="product-info"><h3 class="product-title"><a href="${detailsUrl}">${escapeHtml(p.name)}</a></h3><p class="product-desc">${escapeHtml(p.desc || "حل برمجي متقدم من LF BOTS.")}</p><div class="product-meta"><span><i class="fa-solid fa-code"></i> ${escapeHtml(p.lang || "برمجة")}</span><span>${escapeHtml(p.category || "متنوع")}</span></div><div class="product-bottom"><span class="product-price">${money(p.price)} <small>السعر</small></span><div class="product-actions"><a class="btn btn-outline" href="${detailsUrl}">التفاصيل</a><button class="btn btn-primary" type="button" data-order="${escapeHtml(p.id)}"><i class="fa-solid fa-cart-shopping"></i> اطلب الآن</button></div></div></div></article>`;
  }).join("");
  box.querySelectorAll("[data-order]").forEach(btn => btn.addEventListener("click", () => openOrder(btn.dataset.order)));
  box.querySelectorAll("[data-favorite]").forEach(btn => {
    const id = String(btn.dataset.favorite), favorites = readStore(FAVORITES_KEY, []).map(String);
    const active = favorites.includes(id); btn.classList.toggle("is-favorite", active);
    btn.innerHTML = `<i class="${active ? "fa-solid" : "fa-regular"} fa-heart"></i>`;
    btn.setAttribute("aria-label", active ? "إزالة من المفضلة" : "إضافة إلى المفضلة");
    btn.addEventListener("click", () => { let list = readStore(FAVORITES_KEY, []).map(String); list = list.includes(id) ? list.filter(x => x !== id) : [...list, id]; writeStore(FAVORITES_KEY, list); renderProducts(); renderFavorites(); renderAchievements(); });
  });
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
    const tracked = readStore("lf_recent_orders_v1", []); tracked.unshift({ orderId: String(data.orderId), productName: currentProduct.name, createdAt: new Date().toISOString() }); writeStore("lf_recent_orders_v1", tracked.slice(0, 30));
    renderAchievements();
    $("order-form").reset();
  } catch (err) {
    error.textContent = err.message || "حدث خطأ غير متوقع أثناء تسجيل الطلب.";
  } finally {
    btn.disabled = false; btn.innerHTML = `تسجيل الطلب والمتابعة <i class="fa-solid fa-arrow-left"></i>`;
  }
}

function renderFavorites() {
  const box = $("favorites-list"); if (!box) return;
  const ids = readStore(FAVORITES_KEY, []).map(String);
  const items = productsCache.filter(p => ids.includes(String(p.id)));
  box.innerHTML = items.length ? items.map(p => `<div class="mini-product"><a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a><span>${money(p.price)}</span><button type="button" data-remove-favorite="${escapeHtml(p.id)}" aria-label="إزالة">×</button></div>`).join("") : `<p class="muted">لا توجد منتجات محفوظة بعد.</p>`;
  box.querySelectorAll("[data-remove-favorite]").forEach(b => b.addEventListener("click", () => { writeStore(FAVORITES_KEY, ids.filter(id => id !== String(b.dataset.removeFavorite))); renderFavorites(); renderProducts(); renderAchievements(); }));
}
function renderAchievements() {
  const box = $("achievements-panel"); if (!box) return;
  const favorites = readStore(FAVORITES_KEY, []).length, orders = readStore("lf_recent_orders_v1", []).length;
  const reviews = readStore(REVIEWS_KEY, []).length;
  const badges = [{ok:favorites>0,icon:"fa-heart",title:"جامع المفضلة",desc:"احفظ أول منتج"},{ok:orders>0,icon:"fa-box",title:"أول طلب",desc:"سجّل طلبًا من المتجر"},{ok:reviews>0,icon:"fa-star",title:"صوت المجتمع",desc:"أرسل أول تقييم"}];
  box.innerHTML = `<div class="achievement-stats"><span><b>${favorites}</b> مفضلة</span><span><b>${orders}</b> طلبات من هذا المتصفح</span><span><b>${reviews}</b> تقييمات محلية</span></div><div class="achievement-badges">${badges.map(b=>`<div class="achievement ${b.ok?'unlocked':''}"><i class="fa-solid ${b.icon}"></i><span><b>${b.title}</b><small>${b.ok?'تم فتح الإنجاز':b.desc}</small></span></div>`).join("")}</div><p class="feature-disclaimer">هذه الإحصاءات محلية على جهازك وليست نقاط حساب LF الرسمية.</p>`;
}
function renderReviews() {
  const box = $("reviews-list"); if (!box) return;
  const reviews = readStore(REVIEWS_KEY, []);
  box.innerHTML = reviews.length ? reviews.slice(0,8).map(r => `<div class="review-item"><div><b>${escapeHtml(r.productName)}</b><span class="review-stars">${"★".repeat(Number(r.rating)||0)}${"☆".repeat(5-(Number(r.rating)||0))}</span></div><p>${escapeHtml(r.text || "تقييم بدون تعليق")}</p><small>${new Date(r.createdAt).toLocaleDateString("ar-SA")}</small></div>`).join("") : `<p class="muted">لا توجد تقييمات محلية حتى الآن.</p>`;
}
function initCommunityFeatures() {
  const reviewProduct = $("review-product");
  if (reviewProduct) reviewProduct.innerHTML = productsCache.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  renderFavorites(); renderAchievements(); renderReviews();
  $("review-form")?.addEventListener("submit", e => { e.preventDefault(); const product = productsCache.find(p => String(p.id) === String($("review-product").value)); if (!product) return; const list = readStore(REVIEWS_KEY, []); list.unshift({ productId:String(product.id), productName:product.name, rating:Number($("review-rating").value), text:$ ("review-text").value.trim(), createdAt:new Date().toISOString() }); writeStore(REVIEWS_KEY, list.slice(0,50)); $("review-text").value=""; renderReviews(); renderAchievements(); });
  $("assistant-form")?.addEventListener("submit", e => { e.preventDefault(); const need = $("assistant-need").value, budget = $("assistant-budget").value; let items = [...productsCache]; if (need === "whatsapp") items = items.filter(p => /whatsapp|baileys|واتساب/i.test(`${p.name} ${p.desc} ${p.category} ${p.lang}`)); else if (need === "ai") items = items.filter(p => /ai|ذكاء|مساعد|ذكاء اصطناعي/i.test(`${p.name} ${p.desc} ${p.category}`)); else if (need === "admin") items = items.filter(p => /admin|حماية|إدارة|security/i.test(`${p.name} ${p.desc} ${p.category}`)); if (budget === "low") items.sort((a,b)=>Number(a.price)-Number(b.price)); if (budget === "high") items.sort((a,b)=>Number(b.price)-Number(a.price)); if (!items.length && productsCache.length) items = [...productsCache].sort((a,b)=> budget === "high" ? Number(b.price)-Number(a.price) : Number(a.price)-Number(b.price)).slice(0,3); else items = items.slice(0,3); $("assistant-result").innerHTML = items.length ? `<p class="muted">هذه اقتراحات مبدئية حسب معلومات المنتجات المتاحة:</p>${items.map(p=>`<div class="mini-product"><a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a><span>${money(p.price)}</span></div>`).join("")}` : `<p class="muted">لا توجد منتجات مطابقة حاليًا. جرّب اختيار احتياج آخر.</p>`; });
  $("track-order-form")?.addEventListener("submit", async e => { e.preventDefault(); const id = $("track-order-id").value.trim(); const result = $("track-order-result"); const local = readStore("lf_recent_orders_v1", []).find(o => String(o.orderId).toLowerCase() === id.toLowerCase()); if (local) { result.innerHTML = `<div class="tracking-result"><b>الطلب ${escapeHtml(local.orderId)}</b><span class="status-pill">تم تسجيل الطلب</span><p>المنتج: ${escapeHtml(local.productName)}</p><p>تم إنشاء الطلب في ${new Date(local.createdAt).toLocaleString("ar-SA")}.</p><small>هذه معلومات محفوظة على هذا المتصفح فقط. لحالة الدفع والتسليم النهائية، تواصل مع فريق المبيعات.</small></div>`; return; } result.innerHTML = `<div class="tracking-result"><b>لم نجد الطلب في هذا المتصفح.</b><p>قد يكون الطلب مسجّلًا على جهاز آخر. لا يمكن تأكيد حالة الطلب من الواجهة وحدها.</p><a class="btn btn-outline" target="_blank" rel="noopener" href="https://wa.me/${SALES_NUMBER}?text=${encodeURIComponent("السلام عليكم، أريد الاستفسار عن حالة الطلب: "+id)}">استفسر عبر WhatsApp</a></div>`; });
}

async function init() {
  productsCache = await getProducts();
  renderCategories(productsCache);
  renderProducts();
  initCommunityFeatures();
  const requestedProduct = new URLSearchParams(location.search).get("order");
  if (requestedProduct) openOrder(requestedProduct);
  ["search-input", "category-filter", "sort-filter"].forEach(id => $(id).addEventListener(id === "search-input" ? "input" : "change", renderProducts));
  $("order-form").addEventListener("submit", submitOrder);
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModals(); }));
  $("menu-toggle").addEventListener("click", () => $("main-nav").classList.toggle("open"));
}

async function initProductDetails() {
  const target = $("product-details");
  if (!target) return;
  const id = new URLSearchParams(location.search).get("id");
  const products = await getProducts();
  const product = products.find(p => String(p.id) === String(id));
  if (!product) {
    target.innerHTML = `<div class="details-empty"><i class="fa-solid fa-box-open"></i><h1>المنتج غير موجود</h1><p>قد يكون المنتج حُذف أو أن الرابط غير صحيح.</p><a class="btn btn-primary" href="index.html#store">العودة إلى المتجر</a></div>`;
    return;
  }
  const image = product.img ? `<img class="details-image" src="${escapeHtml(product.img)}" alt="${escapeHtml(product.name)}" onerror="this.style.display='none'">` : `<div class="details-placeholder"><i class="fa-solid fa-robot"></i></div>`;
  target.innerHTML = `<div class="details-breadcrumb"><a href="index.html">الرئيسية</a><i class="fa-solid fa-chevron-left"></i><a href="index.html#store">المتجر</a><i class="fa-solid fa-chevron-left"></i><span>${escapeHtml(product.name)}</span></div><article class="details-layout"><div class="details-visual">${image}<span class="product-tag">${escapeHtml(product.tag || "متوفر")}</span></div><div class="details-content"><span class="eyebrow"><i class="fa-solid fa-cube"></i> تفاصيل المنتج</span><h1>${escapeHtml(product.name)}</h1><div class="details-price">${money(product.price)} <small>السعر</small></div><div class="details-meta"><span><i class="fa-solid fa-code"></i> ${escapeHtml(product.lang || "برمجة")}</span><span><i class="fa-solid fa-layer-group"></i> ${escapeHtml(product.category || "متنوع")}</span></div><section class="details-description"><h2><i class="fa-solid fa-circle-info"></i> معلومات البوت كاملة</h2><div class="details-description-text">${escapeHtml(product.desc || "لا توجد تفاصيل إضافية لهذا المنتج حاليًا.")}</div></section><div class="details-actions"><a class="btn btn-primary btn-large" href="index.html?order=${encodeURIComponent(product.id)}#store"><i class="fa-solid fa-cart-shopping"></i> اطلب الآن</a><a class="btn btn-outline btn-large" href="index.html#store"><i class="fa-solid fa-arrow-right"></i> العودة للمتجر</a></div><p class="details-note"><i class="fa-solid fa-shield-halved"></i> يتم تأكيد الدفع والتسليم يدويًا عبر فريق LF BOTS.</p></div></article>`;
  document.title = `${product.name} | LF BOTS`;
}

document.addEventListener("DOMContentLoaded", () => {
  if ($("product-details")) initProductDetails();
  else init();
});
