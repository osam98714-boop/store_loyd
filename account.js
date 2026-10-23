(() => {
    const $ = id => document.getElementById(id);
    const KEY = 'lf_account_token';

    // دالة تحديث شريط الحالة (الرسائل)
    const status = (msg, bad = false) => {
        $('status').textContent = msg || '';
        $('status').style.color = bad ? '#ffaaa3' : '';
    };

    // دالة إدارة طلبات الـ API
    const request = async (body, auth = true) => {
        const headers = { 'Content-Type': 'application/json' };
        if (auth) {
            const t = sessionStorage.getItem(KEY);
            if (t) headers.Authorization = 'Bearer ' + t;
        }
        
        const r = await fetch('/api/account', {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        
        const d = await r.json().catch(() => ({ error: 'استجابة غير مفهومة من الخادم.' }));
        if (!r.ok) throw new Error(d.error || 'تعذر تنفيذ الطلب.');
        return d;
    };

    // التحكم في وضع العرض (تسجيل دخول / إنشاء حساب)
    function setMode(mode) {
        const login = mode === 'login';
        $('loginForm').classList.toggle('hidden', !login);
        $('signupForm').classList.toggle('hidden', login);
        $('showLogin').classList.toggle('selected', login);
        $('showSignup').classList.toggle('selected', !login);
        status('');
    }

    // عرض بيانات المستخدم في واجهة الملف الشخصي
    function showUser(u) {
        $('authView').classList.add('hidden');
        $('profileView').classList.remove('hidden');
        
        $('displayName').textContent = u.username;
        $('displayEmail').textContent = u.email;
        $('displayPhone').textContent = u.phone || 'لم تضف رقم WhatsApp';
        $('avatar').textContent = (u.username || 'LF').slice(0, 2).toUpperCase();
        
        $('points').textContent = Number(u.points || 0).toLocaleString('ar-SA');
        $('earned').textContent = Number(u.pointsEarned || 0).toLocaleString('ar-SA');
        $('spent').textContent = Number(u.pointsSpent || 0).toLocaleString('ar-SA');
        
        $('editName').value = u.username || '';
        $('editPhone').value = u.phone || '';
        $('referralCode').textContent = u.referralCode || '—';
    }

    // عرض سجل الحركات والنقاط
    function showHistory(rows) {
        const el = $('history');
        el.innerHTML = '';
        
        if (!rows || !rows.length) {
            el.innerHTML = '<p class="small">لا توجد حركات نقاط بعد.</p>';
            return;
        }
        
        rows.forEach(row => {
            const item = document.createElement('div');
            item.className = 'historyItem';
            
            const desc = document.createElement('span');
            desc.textContent = (row.reason || 'حركة نقاط') + ' · ' + new Date(row.createdAt).toLocaleDateString('ar-SA');
            
            const amount = document.createElement('strong');
            amount.className = Number(row.amount) >= 0 ? 'plus' : 'minus';
            amount.textContent = (Number(row.amount) > 0 ? '+' : '') + Number(row.amount).toLocaleString('ar-SA');
            
            item.append(desc, amount);
            el.append(item);
        });
    }

    // التحقق من حالة الجلسة وتحديث البيانات
    async function refresh() {
        const t = sessionStorage.getItem(KEY);
        if (!t) {
            $('authView').classList.remove('hidden');
            $('profileView').classList.add('hidden');
            return;
        }
        try {
            const d = await request({ action: 'me' });
            showUser(d.user);
            showHistory(d.history);
        } catch (e) {
            sessionStorage.removeItem(KEY);
            $('authView').classList.remove('hidden');
            $('profileView').classList.add('hidden');
            status(e.message, true);
        }
    }

    // ربط الأحداث (Event Listeners)
    $('showLogin').onclick = () => setMode('login');
    $('showSignup').onclick = () => setMode('signup');

    $('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        status('جارٍ تسجيل الدخول…');
        try {
            const d = await request({
                action: 'login',
                email: $('loginEmail').value,
                password: $('loginPassword').value
            }, false);
            sessionStorage.setItem(KEY, d.token);
            status('تم تسجيل الدخول بنجاح.');
            await refresh();
        } catch (err) {
            status(err.message, true);
        }
    });

    $('signupForm').addEventListener('submit', async e => {
        e.preventDefault();
        status('جارٍ إنشاء الحساب وحفظه في JSON…');
        try {
            const d = await request({
                action: 'signup',
                username: $('signupName').value,
                phone: $('signupPhone').value,
                email: $('signupEmail').value,
                password: $('signupPassword').value,
                referralCode: $('referralInput').value
            }, false);
            sessionStorage.setItem(KEY, d.token);
            status('تم إنشاء الحساب وحفظه.');
            await refresh();
        } catch (err) {
            status(err.message, true);
        }
    });

    $('profileForm').addEventListener('submit', async e => {
        e.preventDefault();
        status('جارٍ حفظ الملف…');
        try {
            const d = await request({
                action: 'update',
                username: $('editName').value,
                phone: $('editPhone').value,
                password: $('editPassword').value
            });
            $('editPassword').value = '';
            showUser(d.user);
            status('تم تحديث الملف الشخصي.');
        } catch (err) {
            status(err.message, true);
        }
    });

    $('logoutBtn').onclick = () => {
        sessionStorage.removeItem(KEY);
        $('profileView').classList.add('hidden');
        $('authView').classList.remove('hidden');
        setMode('login');
        status('تم تسجيل الخروج.');
    };

    $('copyCode').onclick = async () => {
        const code = $('referralCode').textContent;
        if (!code || code === '—') return;
        try {
            await navigator.clipboard.writeText(code);
            status('تم نسخ رمز الدعوة.');
        } catch {
            status('تعذّر النسخ التلقائي؛ انسخ الرمز يدويًا.', true);
        }
    };

    // تشغيل التطبيق عند التحميل
    refresh();
})();
