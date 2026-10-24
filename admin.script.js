let adminPassword = "";
let products = [], orders = [], coupons = [];

const $ = id => document.getElementById(id);

function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, options = {}) {
    const headers = { ...(options.headers || {}), "Content-Type": "application/json", "x-admin-password": adminPassword };
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `فشل الطلب (${res.status})`);
    return data;
}

function message(text) {
    const el = $("admin-message");
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 3500);
}

async function loadAll() {
    try {
        const [p, o, c] = await Promise.all([api("/api/products"), api("/api/orders"), api("/api/coupons")]);
        products = Array.isArray(p.products) ? p.products : (Array.isArray(p) ? p : []);
        orders = Array.isArray(o.orders) ? o.orders : [];
        coupons = Array.isArray(c.coupons) ? c.coupons : [];
        render(); renderCoupons();
        try { const st = await api("/api/stats"); let extra=document.getElementById('extra-stats'); if(!extra){extra=document.createElement('div');extra.id='extra-stats';extra.className='stats-grid';document.querySelector('#tab-stats .stats-grid').after(extra);} extra.innerHTML=`<article class="stat"><span>العملاء</span><strong>${Number(st.customers)||0}</strong></article><article class="stat"><span>أصوات البوتات القادمة</span><strong>${Number(st.votes)||0}</strong></article><article class="stat"><span>الكوبونات</span><strong>${Number(st.coupons)||0}</strong></article>`; } catch {}
    } catch (e) {
        message(e.message + " — تأكد من إعداد متغيرات البيئة على Vercel.");
    }
}

function render() {
    $("stat-products").textContent = products.length;
    $("stat-orders").textContent = orders.length;
    $("stat-pending").textContent = orders.filter(o => o.paymentStatus !== "تم التأكيد").length;
    $("stat-paid").textContent = orders.filter(o => o.paymentStatus === "تم التأكيد").length;
    
    renderProducts();
    renderOrders("recent-orders", orders.slice(-5).reverse(), false);
    renderOrders("admin-orders-table", orders.slice().reverse(), true);
} 

function renderCoupons(){
 const box=$("admin-coupons-table"); if(!box)return;
 if(!coupons.length){box.innerHTML='<div class="empty">لا توجد كوبونات بعد.</div>';return;}
 box.innerHTML=`<table><thead><tr><th>الرمز</th><th>الخصم</th><th>الاستخدام</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${coupons.map(c=>`<tr><td>${esc(c.code)}</td><td>${c.type==='fixed'?'$'+Number(c.value):Number(c.value)+'%'}</td><td>${Number(c.uses)||0}${c.maxUses?' / '+Number(c.maxUses):' / بلا حد'}</td><td>${c.active===false?'متوقف':'نشط'}</td><td><button class="table-action" data-toggle-coupon="${esc(c.code)}" data-active="${c.active===false?'1':'0'}">${c.active===false?'تفعيل':'إيقاف'}</button><button class="table-action red" data-delete-coupon="${esc(c.code)}">حذف</button></td></tr>`).join('')}</tbody></table>`;
 box.querySelectorAll('[data-toggle-coupon]').forEach(b=>b.onclick=async()=>{try{await api('/api/coupons',{method:'PATCH',body:JSON.stringify({code:b.dataset.toggleCoupon,active:b.dataset.active==='1'})});message('تم تحديث حالة الكوبون.');await loadAll();}catch(e){message(e.message);}});
 box.querySelectorAll('[data-delete-coupon]').forEach(b=>b.onclick=async()=>{if(!confirm('حذف الكوبون نهائيًا؟'))return;try{await api('/api/coupons',{method:'DELETE',body:JSON.stringify({code:b.dataset.deleteCoupon})});message('تم حذف الكوبون.');await loadAll();}catch(e){message(e.message);}});
}

function renderProducts() {
    const box = $("admin-products-table");
    if (!products.length) {
        box.innerHTML = '<div class="empty">لا توجد منتجات حتى الآن.</div>';
        return;
    }
    box.innerHTML = `<table><thead><tr><th>المنتج</th><th>السعر</th><th>التصنيف</th><th>اللغة</th><th>الشارة</th><th>الإجراء</th></tr></thead><tbody>${products.map(p => `<tr><td>${esc(p.name)}</td><td>$${Number(p.price || 0).toFixed(2)}</td><td>${esc(p.category)}</td><td>${esc(p.lang)}</td><td>${esc(p.tag)}</td><td><button class="table-action red" data-delete-product="${esc(p.id)}">حذف</button></td></tr>`).join("")}</tbody></table>`;
    
    box.querySelectorAll("[data-delete-product]").forEach(b => b.onclick = () => deleteProduct(b.dataset.deleteProduct));
}

function renderOrders(target, list, actions) {
    const box = $(target);
    if (!list.length) {
        box.innerHTML = '<div class="empty">لا توجد طلبات مسجلة.</div>';
        return;
    }
    box.innerHTML = `<table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>WhatsApp</th><th>المنتج</th><th>السعر</th><th>حالة الدفع</th>${actions ? '<th>إجراء</th>' : ''}</tr></thead><tbody>${list.map(o => `<tr><td>${esc(o.id)}</td><td>${esc(o.clientName)}</td><td>${esc(o.clientPhone)}</td><td>${esc(o.productName)}${o.couponCode?`<small style="display:block;opacity:.75">كوبون: ${esc(o.couponCode)} · خصم $${Number(o.discountValue||0).toFixed(2)}</small>`:''}</td><td>${o.finalPrice!==undefined?`$${Number(o.finalPrice).toFixed(2)} بعد الخصم`:esc(o.productPrice)}</td><td><span class="status ${o.paymentStatus === "تم التأكيد" ? "" : "pending"}">${esc(o.paymentStatus || "غير مدفوع")}</span></td>${actions ? `<td><button class="table-action" data-pay="${esc(o.id)}">تأكيد الدفع</button><button class="table-action red" data-delete-order="${esc(o.id)}">حذف</button></td>` : ""}</tr>`).join("")}</tbody></table>`;
    
    box.querySelectorAll("[data-pay]").forEach(b => b.onclick = () => updateOrder(b.dataset.pay, "confirm"));
    box.querySelectorAll("[data-delete-order]").forEach(b => b.onclick = () => updateOrder(b.dataset.deleteOrder, "delete"));
}

function showTab(tab) {
    document.querySelectorAll(".side-link").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-page").forEach(p => p.classList.toggle("active", p.id === "tab-" + tab));
    $("page-title").textContent = ({ stats: "نظرة عامة", products: "إدارة المنتجات", orders: "إدارة الطلبات", coupons: "كوبونات الخصم" })[tab] || "لوحة الإدارة";
}

async function deleteProduct(id) {
    if (!confirm("هل تريد حذف هذا المنتج؟")) return;
    try {
        await api("/api/products", { method: "DELETE", body: JSON.stringify({ id }) });
        message("تم حذف المنتج.");
        await loadAll();
    } catch (e) {
        message(e.message);
    }
}

async function updateOrder(id, action) {
    if (action === "delete" && !confirm("هل تريد حذف الطلب؟")) return;
    try {
        await api("/api/orders", { method: "PATCH", body: JSON.stringify({ id, action }) });
        message(action === "confirm" ? "تم تأكيد الدفع." : "تم حذف الطلب.");
        await loadAll();
    } catch (e) {
        message(e.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    $("admin-login-form").addEventListener("submit", async e => {
        e.preventDefault();
        adminPassword = $("admin-password").value;
        try {
            await api("/api/admin-auth", {
                method: "POST",
                body: JSON.stringify({ username: $("admin-username").value, password: adminPassword })
            });
            sessionStorage.setItem("lf_admin_ok", "1");
            $("login-screen").classList.add("hidden");
            $("dashboard-screen").classList.remove("hidden");
            $("login-error").textContent = "";
            await loadAll();
        } catch (err) {
            $("login-error").textContent = "تعذر تسجيل الدخول. تحقق من البيانات وإعدادات Vercel.";
        }
    });

    document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
    
    $("logout-btn").onclick = () => {
        adminPassword = "";
        sessionStorage.removeItem("lf_admin_ok");
        $("dashboard-screen").classList.add("hidden");
        $("login-screen").classList.remove("hidden");
        $("admin-password").value = "";
    };
    
    $("refresh-btn").onclick = loadAll;

    $("add-coupon-form")?.addEventListener("submit", async e => {
        e.preventDefault();
        const coupon={code:$("coupon-code").value.trim().toUpperCase(),type:$("coupon-type").value,value:Number($("coupon-value").value),active:true,maxUses:Number($("coupon-max-uses").value||0),uses:0,expiresAt:$("coupon-expiry").value?new Date($("coupon-expiry").value+'T23:59:59').toISOString():null};
        try{await api('/api/coupons',{method:'POST',body:JSON.stringify(coupon)});e.target.reset();$("coupon-max-uses").value='0';message('تم إنشاء الكوبون وحفظه في GitHub.');await loadAll();}catch(err){message(err.message);}
    });

    $("add-product-form").addEventListener("submit", async e => {
        e.preventDefault();
        const btn = $("save-prod-btn");
        btn.disabled = true;
        
        const product = {
            id: "bot_" + Date.now(),
            name: $("prod-name").value.trim(),
            price: Number($("prod-price").value),
            category: $("prod-category").value.trim(),
            lang: $("prod-lang").value.trim(),
            tag: $("prod-tag").value,
            img: $("prod-img").value.trim(),
            desc: $("prod-desc").value.trim()
        };
        
        try {
            await api("/api/products", { method: "POST", body: JSON.stringify(product) });
            e.target.reset();
            message("تمت إضافة المنتج.");
            await loadAll();
        } catch (err) {
            message(err.message);
        } finally {
            btn.disabled = false;
        }
    });

    if (sessionStorage.getItem("lf_admin_ok") === "1") { 
        sessionStorage.removeItem("lf_admin_ok"); 
    }
});
