(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    // أنواع البيانات المتاحة
    const TYPES = {
        text: {
            n: 'نص / رابط',
            f: '<label for="v1">النص أو الرابط</label><textarea id="v1" maxlength="2500">https://example.com</textarea>',
            g: v => v.v1
        },
        wifi: {
            n: 'واي فاي',
            f: '<label for="v1">اسم الشبكة</label><input type="text" id="v1" maxlength="100"><label for="v2">كلمة السر</label><input type="text" id="v2" maxlength="100"><label>التشفير</label><input type="hidden" id="v3" value="WPA"><div class="seg" data-for="v3"><button type="button" data-v="WPA"><b>WPA / WPA2</b></button><button type="button" data-v="WEP"><b>WEP</b></button><button type="button" data-v="nopass"><b>بدون كلمة سر</b></button></div>',
            g: v => {
                const e = s => String(s || '').replace(/([\\;,:"\\])/g, '\\$1');
                return v.v1 ? `WIFI:T:${v.v3};S:${e(v.v1)};P:${v.v3 === 'nopass' ? '' : e(v.v2)};;` : '';
            }
        },
        wa: {
            n: 'واتساب',
            f: '<label for="v1">الرقم بالكود الدولي</label><input type="tel" id="v1" dir="ltr" placeholder="9665XXXXXXXX"><label for="v2">رسالة جاهزة (اختياري)</label><input type="text" id="v2" maxlength="300">',
            g: v => {
                const n = (v.v1 || '').replace(/\D/g, '');
                return n ? 'https://wa.me/' + n + (v.v2 ? '?text=' + encodeURIComponent(v.v2) : '') : '';
            }
        },
        mail: {
            n: 'إيميل',
            f: '<label for="v1">البريد الإلكتروني</label><input type="email" id="v1" dir="ltr"><label for="v2">الموضوع</label><input type="text" id="v2"><label for="v3">النص</label><input type="text" id="v3">',
            g: v => v.v1 ? `mailto:${v.v1}?subject=${encodeURIComponent(v.v2 || '')}&body=${encodeURIComponent(v.v3 || '')}` : ''
        },
        tel: {
            n: 'اتصال',
            f: '<label for="v1">رقم الهاتف</label><input type="tel" id="v1" dir="ltr" placeholder="+9665XXXXXXXX">',
            g: v => v.v1 ? 'tel:' + v.v1.replace(/\s/g, '') : ''
        },
        card: {
            n: 'كارت شخصي',
            f: '<label for="v1">الاسم</label><input type="text" id="v1"><label for="v2">الهاتف</label><input type="tel" id="v2" dir="ltr"><label for="v3">البريد</label><input type="email" id="v3" dir="ltr"><label for="v4">الشركة</label><input type="text" id="v4"><label for="v5">الموقع</label><input type="text" id="v5" dir="ltr">',
            g: v => v.v1 ? `BEGIN:VCARD\nVERSION:3.0\nFN:${v.v1}\nTEL:${v.v2 || ''}\nEMAIL:${v.v3 || ''}\nORG:${v.v4 || ''}\nURL:${v.v5 || ''}\nEND:VCARD` : ''
        }
    };

    // الستايلات الجاهزة
    const PRE = [
        ['أوقيانوس', '#0a1f44', '#0a84ff', '#ffffff', 'rd', 'rd'],
        ['غروب', '#7a1fa2', '#ff5f6d', '#fff8f0', 'dt', 'ci'],
        ['غابة', '#053b2a', '#00c48c', '#f2fff9', 'rd', 'rd'],
        ['كلاسيك', '#000000', '#000000', '#ffffff', 'sq', 'sq'],
        ['نيون', '#f5f7ff', '#3ee6c9', '#0b1020', 'dt', 'rd']
    ];

    let tab = 'text', dot = 'rd', eye = 'rd', logoImg = null, logoUrl = null;

    function vals() {
        const o = {};
        for (let i = 1; i <= 5; i++) {
            const e = $('v' + i);
            if (e) o['v' + i] = e.value.trim();
        }
        return o;
    }

    function fields() {
        const t = $('fields');
        t.innerHTML = TYPES[tab].f;
        t.querySelectorAll('input,textarea,select').forEach(e => e.addEventListener('input', draw));
        bindSeg(t);
    }

    function tabsUI() {
        const t = $('tabs');
        t.innerHTML = '';
        Object.entries(TYPES).forEach(([k, v]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = v.n;
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', String(k === tab));
            b.onclick = () => { tab = k; tabsUI(); fields(); draw(); };
            t.appendChild(b);
        });
    }

    function bindSeg(root) {
        root.querySelectorAll('.seg[data-for]').forEach(g => {
            const inp = $(g.dataset.for), bs = g.querySelectorAll('button');
            const sync = () => bs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === inp.value)));
            bs.forEach(b => b.onclick = () => {
                inp.value = b.dataset.v;
                sync();
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                draw();
            });
            sync();
        });
    }

    function optsUI() {
        document.querySelectorAll('.opts').forEach(g => g.querySelectorAll('button').forEach(b => {
            b.setAttribute('aria-pressed', String((g.dataset.k === 'dot' ? dot : eye) === b.dataset.v));
            b.onclick = () => {
                if (g.dataset.k === 'dot') dot = b.dataset.v;
                else eye = b.dataset.v;
                optsUI();
                draw();
            };
        }));
    }

    PRE.forEach(p => {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<i style="background:linear-gradient(135deg,${p[1]},${p[2]})"></i>${p[0]}`;
        b.onclick = () => {
            $('c1').value = p[1];
            $('c2').value = p[2];
            $('bg').value = p[3];
            dot = p[4];
            eye = p[5];
            $('gr').checked = p[1] !== p[2];
            $('ec').value = 'M';
            eccUI();
            optsUI();
            draw();
        };
        $('pre').appendChild(b);
    });

    function eccUI() {
        document.querySelectorAll('#ecc button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === $('ec').value)));
    }

    $('ecc').querySelectorAll('button').forEach(b => b.onclick = () => {
        $('ec').value = b.dataset.v;
        eccUI();
        draw();
    });

    function roundRect(c, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function isFinder(r, k, n) {
        return (r < 7 && k < 7) || (r < 7 && k >= n - 7) || (r >= n - 7 && k < 7);
    }

    function drawShape(c, x, y, w, h, kind) {
        if (kind === 'sq') {
            c.fillRect(x, y, w, h);
            return;
        }
        c.beginPath();
        if (kind === 'ci' || kind === 'dt') {
            c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else {
            const r = Math.min(w, h) * .28;
            c.moveTo(x + r, y);
            c.arcTo(x + w, y, x + w, y + h, r);
            c.arcTo(x + w, y + h, x, y + h, r);
            c.arcTo(x, y + h, x, y, r);
            c.arcTo(x, y, x + w, y, r);
        }
        c.fill();
    }

    function draw() {
        const cv = $('cv'), c = cv.getContext('2d'), msg = $('msg'), s = +$('sz').value, txt = TYPES[tab].g(vals()) || '', cap = $('cap').value.trim(), bg = $('bg').value;
        $('szv').textContent = s;
        msg.textContent = '';
        msg.style.color = '#ff8a80';
        
        const ch = cap ? Math.round(s * .13) : 0;
        cv.width = s;
        cv.height = s + ch;
        c.fillStyle = bg;
        c.fillRect(0, 0, cv.width, cv.height);

        if (!txt) {
            msg.textContent = 'املأ البيانات وسيظهر الكود هنا.';
            return;
        }

        if (typeof qrcode === 'undefined') {
            msg.textContent = 'مكتبة QR لم تتحمّل. تحقق من الإنترنت ثم حدّث الصفحة.';
            return;
        }

        try {
            qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
            const q = qrcode(0, logoImg ? 'H' : $('ec').value);
            q.addData(txt);
            q.make();

            const n = q.getModuleCount(), margin = 4, cell = s / (n + margin * 2), off = margin * cell;
            let fill = $('c1').value;

            if ($('gr').checked) {
                fill = c.createLinearGradient(0, 0, s, s);
                fill.addColorStop(0, $('c1').value);
                fill.addColorStop(1, $('c2').value);
            }
            c.fillStyle = fill;

            for (let r = 0; r < n; r++) {
                for (let k = 0; k < n; k++) {
                    if (isFinder(r, k, n) || !q.isDark(r, k)) continue;
                    if (logoImg && Math.abs(r + .5 - n / 2) < n * .105 && Math.abs(k + .5 - n / 2) < n * .105) continue;
                    
                    const shrink = dot === 'dt' ? .82 : dot === 'rd' ? .94 : 1;
                    const d = cell * (1 - shrink) / 2;
                    drawShape(c, off + k * cell + d, off + r * cell + d, cell * shrink, cell * shrink, dot);
                }
            }

            // رسم أركان الكود (Finders)
            [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, k]) => {
                const x = off + k * cell, y = off + r * cell, kind = eye === 'ci' ? 'ci' : eye;
                c.fillStyle = fill;
                drawShape(c, x, y, 7 * cell, 7 * cell, kind);
                c.fillStyle = bg;
                drawShape(c, x + cell, y + cell, 5 * cell, 5 * cell, kind);
                c.fillStyle = fill;
                drawShape(c, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, kind);
            });

            // رسم الشعار إن وجد
            if (logoImg) {
                const L = s * .18, x = (s - L) / 2, y = (s - L) / 2;
                c.fillStyle = bg;
                roundRect(c, x - L * .12, y - L * .12, L * 1.24, L * 1.24, L * .2);
                c.fill();
                c.save();
                roundRect(c, x, y, L, L, L * .15);
                c.clip();
                const a = Math.max(L / logoImg.width, L / logoImg.height);
                c.drawImage(logoImg, x + (L - logoImg.width * a) / 2, y + (L - logoImg.height * a) / 2, logoImg.width * a, logoImg.height * a);
                c.restore();
            }

            // رسم النص السفلِي
            if (cap) {
                c.fillStyle = $('c1').value;
                c.font = `800 ${Math.round(ch * .42)}px Tajawal,Tahoma,sans-serif`;
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.fillText(cap, s / 2, s + ch * .5, s * .9);
            }

            msg.textContent = 'تم إنشاء الرمز. امسحه بكاميرا جوالك للتأكد قبل مشاركته.';
            msg.style.color = '#3ee6c9';

        } catch (e) {
            msg.textContent = 'تعذر إنشاء الرمز. جرّب تقصير المحتوى أو رفع مستوى التصحيح.';
            console.error(e);
        }
    }

    // رفع وإزالة الشعار
    $('logo').addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) {
            $('msg').textContent = 'اختر ملف صورة صالحًا.';
            return;
        }
        if (logoUrl) URL.revokeObjectURL(logoUrl);
        logoUrl = URL.createObjectURL(f);
        const i = new Image();
        i.onload = () => {
            logoImg = i;
            $('ln').textContent = f.name.slice(0, 30);
            $('lx').classList.remove('hide');
            draw();
        };
        i.onerror = () => {
            $('msg').textContent = 'تعذر فتح الصورة.';
        };
        i.src = logoUrl;
    });

    $('lx').onclick = () => {
        logoImg = null;
        if (logoUrl) URL.revokeObjectURL(logoUrl);
        logoUrl = null;
        $('logo').value = '';
        $('ln').textContent = 'اختر صورة للشعار';
        $('lx').classList.add('hide');
        draw();
    };

    // ربط الأحداث بمعدلات التغيير
    ['c1', 'c2', 'gr', 'bg', 'ec', 'sz', 'cap'].forEach(id => $(id).addEventListener('input', () => {
        if (id === 'ec') eccUI();
        draw();
    }));

    // التنزيل والنسخ
    $('dl').onclick = () => {
        try {
            const a = document.createElement('a');
            a.href = $('cv').toDataURL('image/png');
            a.download = 'lf-bots-qr.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            $('msg').textContent = 'تعذر تنزيل الصورة في هذا المتصفح.';
        }
    };

    $('cp').onclick = async () => {
        try {
            if (!navigator.clipboard || !window.ClipboardItem) throw Error('unsupported');
            const blob = await new Promise((resolve, reject) => $('cv').toBlob(b => b ? resolve(b) : reject(Error('canvas')), 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            $('msg').style.color = '#3ee6c9';
            $('msg').textContent = 'تم نسخ الصورة بنجاح.';
        } catch (e) {
            $('msg').style.color = '#ff8a80';
            $('msg').textContent = 'المتصفح لا يسمح بنسخ الصورة مباشرة. استخدم زر التحميل.';
        }
    };

    // تشغيل التطبيق أول مرة
    tabsUI();
    fields();
    optsUI();
    eccUI();
    draw();
})();
