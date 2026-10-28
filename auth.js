(() => {
  "use strict";
  // رابط الخدمة العامة فقط؛ لا تضع هنا أي API key أو كلمة مرور.
  const API_URL = "https://p3we5ocn8u.apps.bot-hosting.cloud".replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);
  const phoneForm = $("phoneForm");
  const otpForm = $("otpForm");
  const statusEl = $("status");
  const sendBtn = $("sendBtn");
  const verifyBtn = $("verifyBtn");
  const apiState = $("apiState");
  const apiDot = $("apiDot");
  let normalizedPhone = "";

  function status(message, bad = false) {
    statusEl.textContent = message || "";
    statusEl.classList.toggle("bad", Boolean(bad));
  }
  function normalizePhone(value) {
    // لا نخمن رمز الدولة. اطلب رقمًا دوليًا يبدأ بعلامة +، ثم أرسل الأرقام فقط.
    const trimmed = String(value || "").trim();
    if (!trimmed.startsWith("+")) throw new Error("اكتب الرقم بالصيغة الدولية، مع + ورمز الدولة، مثل +9665XXXXXXXX.");
    const digits = trimmed.slice(1).replace(/[\s().-]/g, "");
    if (!/^\d{8,15}$/.test(digits)) throw new Error("رقم الهاتف غير صحيح. استخدم الصيغة الدولية من 8 إلى 15 رقمًا.");
    return digits;
  }
  async function apiFetch(path, body) {
    let response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store"
      });
    } catch (error) {
      throw new Error("تعذر الاتصال بالسيرفر. تحقق من أن الخدمة تعمل وأن إعداد CORS يسمح بنطاق متجر Vercel. افتح Console وNetwork لمراجعة السبب.");
    }
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { data = { message: raw.slice(0, 180) || "استجابة غير صالحة من السيرفر." }; }
    if (!response.ok) {
      throw new Error(data.message || data.error || `فشل الطلب (HTTP ${response.status}).`);
    }
    return data;
  }

  async function checkHealth() {
    try {
      const response = await fetch(`${API_URL}/health`, { method: "GET", mode: "cors", cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      apiDot.classList.add("ok");
      apiState.textContent = "السيرفر يستجيب على /health";
    } catch {
      apiDot.classList.remove("ok");
      apiState.textContent = "تعذر فحص /health؛ قد لا يكون هذا المسار موجودًا";
    }
  }

  phoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    status("");
    let phone;
    try { phone = normalizePhone($("phone").value); }
    catch (error) { status(error.message, true); return; }
    sendBtn.disabled = true;
    sendBtn.textContent = "جارٍ طلب إرسال الرمز…";
    try {
      const result = await apiFetch("/send-otp", { phone, phoneNumber: phone });
      normalizedPhone = phone;
      phoneForm.classList.add("hidden");
      otpForm.classList.remove("hidden");
      $("otp").focus();
      status(result.message || "تم قبول طلب إرسال الرمز. تحقق من واتساب.");
    } catch (error) {
      console.error("LF-BOTS send-otp request failed:", error.message);
      status(error.message, true);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "إرسال رمز التحقق";
    }
  });

  otpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    status("");
    const otp = $("otp").value.trim();
    if (!/^\d{4,8}$/.test(otp)) { status("أدخل رمز التحقق بالأرقام فقط.", true); return; }
    verifyBtn.disabled = true;
    verifyBtn.textContent = "جارٍ التحقق…";
    try {
      const result = await apiFetch("/verify-otp", { phone: normalizedPhone, phoneNumber: normalizedPhone, otp, code: otp });
      // احفظ الرمز فقط إذا كان السيرفر يعيد رمز جلسة صالحًا. لا نحفظ OTP نفسه.
      const token = result.token || result.accessToken || result.sessionToken;
      if (token) sessionStorage.setItem("lf_account_token", token);
      if (result.user) sessionStorage.setItem("lf_verified_user", JSON.stringify(result.user));
      status("تم التحقق بنجاح. جارٍ فتح المتجر…");
      window.location.assign("store.html");
    } catch (error) {
      console.error("LF-BOTS verify-otp request failed:", error.message);
      status(error.message, true);
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "تحقق وتابع إلى المتجر";
    }
  });

  $("backBtn").addEventListener("click", () => {
    otpForm.classList.add("hidden");
    phoneForm.classList.remove("hidden");
    $("otp").value = "";
    status("");
  });
  checkHealth();
})();
