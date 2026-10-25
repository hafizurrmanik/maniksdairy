'use strict';
/* My Life OS core: work shifts, expenses, backup. Data never leaves this browser (IndexedDB). */

const T = {
  en: {
    dash: 'Dashboard', work: 'Work Hours', exp: 'Expenses', bak: 'Backup & Print',
    today: 'Today', week: 'This week', month: 'This month', spent: 'Spent this month',
    est: 'Estimated earnings (not salary)', hrs: 'Hours', place: 'Workplace', name: 'Name',
    wage: 'Hourly wage (JPY)', date: 'Date', start: 'Start', end: 'End', brk: 'Break (min)',
    status: 'Status', ovr: 'Actual hours (overrides calculation)', add: 'Add', save: 'Save', del: 'Delete',
    amt: 'Amount (JPY)', cat: 'Category', desc: 'Description', limit: 'Weekly limit (h)',
    done: 'Completed', sched: 'Scheduled', proj: 'Projected', left: 'Remaining',
    warn: 'Projected hours may exceed your limit. This is not a legal determination; check immigration rules separately.',
    ovl: 'Overlaps another shift', none: 'No records yet.', exp1: 'Export backup', imp1: 'Restore backup',
    prt: 'Print / Save as PDF', sure: 'Delete this record?', repl: 'Restore replaces ALL current data. Continue?',
    need: 'Add a workplace first.', bad: 'Please fill in all fields with valid values.', total: 'Total',
    saved: 'Saved', badfile: 'Invalid or unreadable backup file; nothing was changed.',
    note: 'Data is stored only in this browser on this Mac. Back up regularly and keep FileVault on.',
    st: { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', absent: 'Absent' },
    cats: ['Rent', 'Food', 'Transport', 'Phone/Internet', 'Education', 'Shopping', 'Medical', 'Other']
  },
  bn: {
    dash: 'ড্যাশবোর্ড', work: 'কাজের সময়', exp: 'খরচ', bak: 'ব্যাকআপ ও প্রিন্ট',
    today: 'আজ', week: 'এই সপ্তাহ', month: 'এই মাস', spent: 'এই মাসের খরচ',
    est: 'আনুমানিক আয় (বেতন নয়)', hrs: 'ঘণ্টা', place: 'কর্মস্থল', name: 'নাম',
    wage: 'ঘণ্টাপ্রতি মজুরি (¥)', date: 'তারিখ', start: 'শুরু', end: 'শেষ', brk: 'বিরতি (মিনিট)',
    status: 'অবস্থা', ovr: 'প্রকৃত ঘণ্টা (হিসাব বদলায়)', add: 'যোগ করুন', save: 'সংরক্ষণ', del: 'মুছুন',
    amt: 'পরিমাণ (¥)', cat: 'বিভাগ', desc: 'বিবরণ', limit: 'সাপ্তাহিক সীমা (ঘণ্টা)',
    done: 'সম্পন্ন', sched: 'নির্ধারিত', proj: 'আনুমানিক মোট', left: 'বাকি',
    warn: 'সীমা ছাড়াতে পারে। এটি আইনি সিদ্ধান্ত নয়; ইমিগ্রেশন নিয়ম আলাদাভাবে দেখুন।',
    ovl: 'অন্য শিফটের সাথে মিলছে', none: 'এখনো কোনো রেকর্ড নেই।', exp1: 'ব্যাকআপ এক্সপোর্ট', imp1: 'ব্যাকআপ রিস্টোর',
    prt: 'প্রিন্ট / PDF সেভ', sure: 'রেকর্ডটি মুছবেন?', repl: 'রিস্টোর করলে বর্তমান সব ডেটা বদলে যাবে। চালিয়ে যাবেন?',
    need: 'আগে একটি কর্মস্থল যোগ করুন।', bad: 'দয়া করে সব ঘর সঠিকভাবে পূরণ করুন।', total: 'মোট',
    saved: 'সংরক্ষিত', badfile: 'ব্যাকআপ ফাইলটি অবৈধ; কিছুই বদলায়নি।',
    note: 'ডেটা শুধু এই ম্যাকের এই ব্রাউজারে থাকে। নিয়মিত ব্যাকআপ নিন ও FileVault চালু রাখুন।',
    st: { scheduled: 'নির্ধারিত', completed: 'সম্পন্ন', cancelled: 'বাতিল', absent: 'অনুপস্থিত' },
    cats: ['ভাড়া', 'খাবার', 'যাতায়াত', 'ফোন/ইন্টারনেট', 'শিক্ষা', 'কেনাকাটা', 'চিকিৎসা', 'অন্যান্য']
  }
};
const STORES = ['workplaces', 'shifts', 'expenses', 'settings'];
// Preferences are namespaced and validated: other pages on the same address may already use a plain lang key.
const pref = (k, ok, d) => { try { const v = localStorage.getItem('lifeos.' + k); return ok.includes(v) ? v : d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem('lifeos.' + k, v); } catch { /* storage blocked: keep going */ } };
let lang = pref('lang', ['en', 'bn'], 'en'), db, D = {}, page = 'dash', wk = 0, em = '';
const $ = i => document.getElementById(i);
const t = k => T[lang][k] || k;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const yen = n => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

/* ---- storage (IndexedDB) ---- */
const open = () => new Promise((ok, no) => {
  const r = indexedDB.open('lifeos', 1);
  r.onupgradeneeded = () => STORES.forEach(s => r.result.createObjectStore(s, { keyPath: 'id' }));
  r.onsuccess = () => ok(r.result);
  r.onerror = () => no(r.error);
});
const tx = (s, m, f) => new Promise((ok, no) => {
  const x = db.transaction(s, m), q = f(x.objectStore(s));
  x.oncomplete = () => ok(q.result);
  x.onerror = () => no(x.error);
});
const all = s => tx(s, 'readonly', o => o.getAll());
const put = (s, v) => tx(s, 'readwrite', o => o.put(v));
const rm = (s, id) => tx(s, 'readwrite', o => o.delete(id));

/* ---- local-date helpers (never UTC, so a shift stays on its Japan calendar day) ---- */
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const pd = s => { const [a, b, c] = s.split('-'); return new Date(+a, b - 1, +c); };
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mon = d => { const x = addD(d, -((d.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; }; // week starts Monday
const mins = s => { const [h, m] = s.split(':'); return h * 60 + +m; };

/* ---- shift maths ---- */
const dur = s => { const d = mins(s.end) - mins(s.start); return d <= 0 ? d + 1440 : d; }; // end <= start means overnight
const hrs = s => s.ovr !== '' ? s.ovr : Math.max(0, dur(s) - s.brk) / 60; // net hours = span - unpaid break, unless overridden
const live = s => s.status === 'scheduled' || s.status === 'completed'; // cancelled/absent never count
const done = s => s.status === 'completed' ? hrs(s) : 0;
const plan = s => s.status === 'scheduled' ? hrs(s) : 0;
const abs = s => pd(s.date).getTime() / 6e4 + mins(s.start);
const ovl = s => live(s) && D.shifts.some(o => o.id !== s.id && live(o) && abs(s) < abs(o) + dur(o) && abs(o) < abs(s) + dur(s));
const wp = id => D.workplaces.find(w => w.id === id) || { name: '?', wage: 0 };
const lim = () => (D.settings.find(x => x.id === 'limit') || { v: 28 }).v;
const sumS = (f, p) => D.shifts.filter(p).reduce((a, s) => a + f(s), 0);

/* ---- safe DOM helpers (text is always inserted as text, never as HTML) ---- */
const h = (tag, a, ...k) => {
  const e = document.createElement(tag);
  for (const n in a || {}) n.startsWith('on') ? e.addEventListener(n.slice(2), a[n]) : e.setAttribute(n, a[n]);
  k.flat().forEach(c => e.append(c instanceof Node ? c : String(c)));
  return e;
};
const card = (l, v) => h('div', { class: 'card' }, h('div', { class: 'mu' }, l), h('div', { class: 'big' }, v));
const inp = (n, type, a = {}) => h('label', {}, t(n), h('input', { name: n, type, ...a }));
const sel = (n, o, v) => h('label', {}, t(n), h('select', { name: n }, o.map(([x, y]) => h('option', x === v ? { value: x, selected: '' } : { value: x }, y))));
const toast = (m, bad) => { $('msg').textContent = m; $('msg').className = bad ? 'warn' : 'mu'; };
const form = (f, ok, b = 'add') => {
  const e = h('form', {}, f, h('button', { class: 'p', type: 'submit' }, t(b)));
  e.addEventListener('submit', async ev => {
    ev.preventDefault();
    try { await ok(Object.fromEntries(new FormData(e))); await render(); toast(t('saved')); }
    catch (x) { toast(x.message, 1); }
  });
  return e;
};
const del = (s, id) => h('button', { type: 'button', onclick: async () => { if (confirm(t('sure'))) { await rm(s, id); await render(); } } }, t('del'));
const table = (head, rows) => rows.length
  ? h('table', {}, h('thead', {}, h('tr', {}, head.map(x => h('th', {}, x)))), h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', {}, c))))))
  : h('p', { class: 'mu' }, t('none'));

/* Weekly-limit panel: completed vs scheduled vs projected. Informational only, not a legal determination. */
const limitCard = (a, b) => {
  const c = sumS(done, s => s.date >= a && s.date <= b), p = c + sumS(plan, s => s.date >= a && s.date <= b), L = lim();
  return h('div', { class: 'card' },
    h('b', {}, t('limit') + ': ' + L),
    h('p', {}, `${t('done')}: ${c.toFixed(1)} h · ${t('sched')}: ${(p - c).toFixed(1)} h · ${t('proj')}: ${p.toFixed(1)} h · ${t('left')}: ${(L - p).toFixed(1)} h`),
    p > L ? h('p', { class: 'warn' }, t('warn')) : '');
};

/* ---- views ---- */
const views = {
  dash() {
    const n = new Date(), td = iso(n), a = iso(mon(n)), b = iso(addD(mon(n), 6)), mo = td.slice(0, 7);
    const H = p => sumS(done, p).toFixed(1) + ' h';
    // Estimated only: completed hours x workplace wage. Never recorded as salary.
    const est = Math.round(sumS(s => done(s) * wp(s.wp).wage, s => s.date.startsWith(mo)));
    const sp = D.expenses.filter(e => e.date.startsWith(mo)).reduce((x, e) => x + e.amt, 0);
    return [
      h('div', { class: 'grid' },
        card(t('today'), H(s => s.date === td)),
        card(t('week'), H(s => s.date >= a && s.date <= b)),
        card(t('month'), H(s => s.date.startsWith(mo))),
        card(t('spent'), yen(sp)),
        card(t('est'), yen(est))),
      limitCard(a, b)
    ];
  },
  work() {
    const m0 = addD(mon(new Date()), 7 * wk), days = [...Array(7)].map((_, i) => iso(addD(m0, i))), a = days[0], b = days[6];
    const rows = D.shifts.filter(s => s.date >= a && s.date <= b).sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
    return [
      h('div', { class: 'card' }, form([inp('name', 'text', { required: '' }), inp('wage', 'number', { required: '', min: 1, step: 1 })], async f => {
        const w = +f.wage;
        if (!f.name.trim() || !(w > 0)) throw new Error(t('bad'));
        await put('workplaces', { id: uid(), name: f.name.trim(), wage: w });
      })),
      h('div', { class: 'card' }, form([
        inp('date', 'date', { required: '', value: iso(new Date()) }),
        sel('place', D.workplaces.map(w => [w.id, w.name])),
        inp('start', 'time', { required: '', value: '09:00' }),
        inp('end', 'time', { required: '', value: '17:00' }),
        inp('brk', 'number', { min: 0, value: 0 }),
        sel('status', Object.entries(T[lang].st)),
        inp('ovr', 'number', { min: 0, max: 24, step: '0.25' })
      ], async f => {
        if (!D.workplaces.length) throw new Error(t('need'));
        const bk = +f.brk || 0, o = f.ovr === '' ? '' : +f.ovr;
        if (!f.date || !f.start || !f.end || bk < 0 || bk >= dur(f) || (o !== '' && !(o >= 0 && o <= 24))) throw new Error(t('bad'));
        await put('shifts', { id: uid(), date: f.date, wp: f.place, start: f.start, end: f.end, brk: bk, status: f.status, ovr: o });
      })),
      h('div', { class: 'card' },
        h('div', { class: 'row' },
          h('button', { type: 'button', onclick: () => { wk--; render(); } }, '‹'),
          h('b', {}, `${a} – ${b}`),
          h('button', { type: 'button', onclick: () => { wk++; render(); } }, '›')),
        table([t('date'), t('place'), t('start') + '–' + t('end'), t('brk'), t('hrs'), t('status'), '', ''],
          rows.map(s => [s.date, wp(s.wp).name, s.start + '–' + s.end, s.brk, (live(s) ? hrs(s) : 0).toFixed(2) + (s.ovr !== '' ? ' *' : ''), T[lang].st[s.status], ovl(s) ? '⚠ ' + t('ovl') : '', del('shifts', s.id)])),
        h('p', { class: 'mu' }, t('total') + ': ' + rows.reduce((x, s) => x + done(s), 0).toFixed(2) + ' h')),
      limitCard(a, b),
      h('div', { class: 'card' }, form([inp('limit', 'number', { required: '', min: 1, max: 168, value: lim() })], async f => {
        const v = +f.limit;
        if (!(v > 0 && v <= 168)) throw new Error(t('bad'));
        await put('settings', { id: 'limit', v });
      }, 'save'))
    ];
  },
  exp() {
    const m = em || (em = iso(new Date()).slice(0, 7)), C = T[lang].cats;
    const L = D.expenses.filter(e => e.date.startsWith(m)).sort((x, y) => y.date.localeCompare(x.date));
    const by = C.map((c, i) => [c, L.filter(e => e.cat === i).reduce((x, e) => x + e.amt, 0)]).filter(x => x[1]);
    return [
      h('div', { class: 'card' }, form([
        inp('date', 'date', { required: '', value: iso(new Date()) }),
        inp('amt', 'number', { required: '', min: 1, step: 1 }),
        sel('cat', C.map((c, i) => [String(i), c])),
        inp('desc', 'text')
      ], async f => {
        const a = +f.amt;
        if (!f.date || !(a > 0)) throw new Error(t('bad'));
        await put('expenses', { id: uid(), date: f.date, amt: a, cat: +f.cat, desc: f.desc.trim() });
      })),
      h('div', { class: 'card' },
        h('label', {}, t('month'), h('input', { type: 'month', value: m, onchange: e => { em = e.target.value; render(); } })),
        h('p', { class: 'big' }, t('total') + ': ' + yen(L.reduce((x, e) => x + e.amt, 0))),
        by.map(([c, v]) => h('span', { class: 'tag' }, c + ' ' + yen(v))),
        table([t('date'), t('cat'), t('desc'), t('amt'), ''], L.map(e => [e.date, C[e.cat], e.desc, yen(e.amt), del('expenses', e.id)])))
    ];
  },
  bak() {
    return [h('div', { class: 'card' },
      h('p', {}, t('note')),
      h('div', { class: 'row' },
        h('button', { class: 'p', type: 'button', onclick: exportData }, t('exp1')),
        h('label', { class: 'file' }, t('imp1'), h('input', { type: 'file', accept: '.json', onchange: importData })),
        h('button', { type: 'button', onclick: () => window.print() }, t('prt'))))];
  }
};

/* ---- backup / restore ---- */
async function exportData() {
  const d = { app: 'my-life-os', version: 1, exportedAt: new Date().toISOString() };
  for (const s of STORES) d[s] = await all(s);
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })), download: `my-life-os-${iso(new Date())}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function importData(e) {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.app !== 'my-life-os' || d.version !== 1 || !STORES.every(s => Array.isArray(d[s]))) throw 0;
    if (!confirm(`${t('repl')}\n${d.exportedAt}`)) return;
    // One transaction: if anything fails the whole restore aborts and current data is untouched.
    const x = db.transaction(STORES, 'readwrite');
    STORES.forEach(s => { const o = x.objectStore(s); o.clear(); d[s].forEach(v => o.put(v)); });
    await new Promise((ok, no) => { x.oncomplete = ok; x.onerror = x.onabort = () => no(x.error); });
    await render();
    toast(t('saved'));
  } catch { toast(t('badfile'), 1); }
}

/* ---- render + init ---- */
async function render() {
  for (const s of STORES) D[s] = await all(s);
  document.documentElement.lang = lang;
  $('nav').replaceChildren(...['dash', 'work', 'exp', 'bak'].map(k =>
    h('button', { type: 'button', 'aria-current': k === page ? 'page' : 'false', onclick: () => { page = k; toast(''); render(); } }, t(k))));
  $('title').textContent = t(page);
  $('view').replaceChildren(...views[page]());
}
(async () => {
  db = await open();
  const th = pref('theme', ['light', 'dark'], matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = th;
  $('theme').value = th;
  $('lang').value = lang;
  $('theme').onchange = e => { setPref('theme', e.target.value); document.documentElement.dataset.theme = e.target.value; };
  $('lang').onchange = e => { lang = e.target.value; setPref('lang', lang); render(); };
  await render();
})().catch(e => { document.body.textContent = 'Could not start: ' + e.message; });
