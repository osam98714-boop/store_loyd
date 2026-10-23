const SALES_NUMBER = '962771111377';

document.getElementById('feedback-form').addEventListener('submit', e => {
    e.preventDefault();

    // جلب قيم الحقول
    const name = document.getElementById('sender-name').value.trim();
    const phone = document.getElementById('sender-phone').value.trim();
    const title = document.getElementById('feedback-title').value.trim();
    const message = document.getElementById('feedback-message').value.trim();

    // التحقق من اكتمال البيانات الأساسية
    if (!name || !phone || !message) {
        document.getElementById('feedback-status').textContent = 'يرجى إكمال الحقول المطلوبة.';
        return;
    }

    // تجهيز نص رسالة الاقتراح لـ WhatsApp
    const body = `السلام عليكم، هذا اقتراح من متجر LF BOTS.\nالاسم: ${name}\nرقم WhatsApp: ${phone}\nالعنوان: ${title || 'بدون عنوان'}\nالتفاصيل: ${message}`;

    // فتح تطبيق WhatsApp
    window.open(`https://wa.me/${SALES_NUMBER}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');

    // إظهار تنبيه للمستخدم
    document.getElementById('feedback-status').textContent = 'فتحنا WhatsApp برسالة جاهزة؛ راجعها واضغط إرسال بنفسك.';
});
