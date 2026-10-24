let secret = 0, tries = 0, finished = false;
const $ = id => document.getElementById(id);
function reset() {
  secret = Math.floor(Math.random() * 20) + 1; tries = 0; finished = false;
  $('guess').value = ''; $('guess').disabled = false; $('guess-btn').disabled = false;
  $('game-status').textContent = 'ابدأ التحدي! لديك 5 محاولات.';
  $('attempts').textContent = 'المحاولات: 0 / 5';
}
function check() {
  if (finished) return;
  const n = Number($('guess').value);
  if (!Number.isInteger(n) || n < 1 || n > 20) { $('game-status').textContent = 'أدخل رقمًا صحيحًا من 1 إلى 20.'; return; }
  tries++; $('attempts').textContent = `المحاولات: ${tries} / 5`;
  if (n === secret) { $('game-status').textContent = `أحسنت! الرقم هو ${secret}، فزت خلال ${tries} محاولة 🎉`; finished = true; }
  else if (tries >= 5) { $('game-status').textContent = `انتهت المحاولات! الرقم الصحيح كان ${secret}.`; finished = true; }
  else $('game-status').textContent = n < secret ? 'الرقم المخفي أكبر من تخمينك. جرّب مرة أخرى.' : 'الرقم المخفي أصغر من تخمينك. جرّب مرة أخرى.';
  if (finished) { $('guess').disabled = true; $('guess-btn').disabled = true; }
}
$('guess-btn').addEventListener('click', check);
$('guess').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
$('restart-btn').addEventListener('click', reset);
reset();
