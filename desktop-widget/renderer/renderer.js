// The Firebase SDK is imported dynamically (below, inside a try/catch)
// instead of as a static top-level import. A static import that fails to
// load (e.g. a network/firewall blocking Google's CDN) aborts the entire
// module before any of its code runs — including the date display and the
// close button — so a network hiccup would leave the widget completely
// dead with no way to close it except killing the process. Dynamic import
// keeps that failure contained to just the data-loading part.

// Same project the WorkFlow Portal website itself uses — this widget is a
// read-only mirror of the same 업무 data, kept in sync live via onSnapshot.
const firebaseConfig = {
  apiKey: "AIzaSyAL4XJVkYLupw02qaZ5opq6pcoDV5C4Oyw",
  authDomain: "plan-7ca08.firebaseapp.com",
  projectId: "plan-7ca08",
  storageBucket: "plan-7ca08.firebasestorage.app",
  messagingSenderId: "815411734752",
  appId: "1:815411734752:web:1567019cd958300d204885"
};

const MAX_ROWS = 12;

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; })();
const dday = (due) => Math.round((parse(due) - today) / 86400000);

// Mirrors App.logic.deadlineWeight/score from the website's js/logic.js, so
// this widget ranks 해야할 일 exactly the same way the dashboard does.
function deadlineWeight(dd) {
  if (dd < 0) return 12;
  if (dd === 0) return 10;
  if (dd === 1) return 6;
  if (dd === 2) return 4;
  if (dd === 3) return 2;
  return 0;
}
function isComplete(t) { return t.progress >= 100 || t.rawStatus === '완료'; }
function score(t) {
  let s = (t.urg || 1) * 2 + (t.imp || 1);
  if (!isComplete(t)) s += deadlineWeight(dday(t.due));
  return s;
}
function ddayLabel(t) {
  const dd = dday(t.due);
  if (dd < 0) return { text: `D+${-dd}`, cls: 'over' };
  if (dd === 0) return { text: 'D-DAY', cls: 'today' };
  return { text: `D-${dd}`, cls: '' };
}
const TYPE_LABEL = { ongoing: '지속', goal: '목표', simple: '단순', personal: '개인', recurring: '지속' };

const els = {
  date: document.getElementById('date'),
  connDot: document.getElementById('conn-dot'),
  connLabel: document.getElementById('conn-label'),
  loading: document.getElementById('loading'),
  empty: document.getElementById('empty'),
  error: document.getElementById('error'),
  list: document.getElementById('list'),
  btnClose: document.getElementById('btn-close'),
  btnMore: document.getElementById('btn-more'),
  openSite: document.getElementById('open-site'),
};

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
els.date.textContent = `${today.getMonth() + 1}월 ${today.getDate()}일 (${DOW[today.getDay()]})`;

function show(which) {
  els.loading.style.display = which === 'loading' ? '' : 'none';
  els.empty.style.display = which === 'empty' ? '' : 'none';
  els.error.style.display = which === 'error' ? '' : 'none';
  els.list.style.display = which === 'list' ? '' : 'none';
}

function render(tasks) {
  const rows = tasks
    .filter((t) => t.type !== 'personal' && !isComplete(t))
    .sort((a, b) => score(b) - score(a) || dday(a.due) - dday(b.due))
    .slice(0, MAX_ROWS);

  if (!rows.length) { show('empty'); return; }

  els.list.innerHTML = rows.map((t) => {
    const dd = dday(t.due);
    const d = ddayLabel(t);
    const barColor = dd < 0 ? '#E53935' : (dd <= 3 ? '#F37321' : '#6f8fd6');
    const typeLabel = TYPE_LABEL[t.type] || t.type;
    return `
      <div class="row" data-id="${t.id}" title="${escapeHtml(t.name)}">
        <span class="bar" style="background:${barColor}"></span>
        <div class="row-main">
          <div class="row-name">${escapeHtml(t.name)}</div>
          <div class="row-meta">${typeLabel} · 중요 ${t.imp || '-'} · 긴급 ${t.urg || '-'} · ${score(t)}점</div>
        </div>
        <span class="row-dd ${d.cls}">${d.text}</span>
      </div>`;
  }).join('');
  show('list');
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

els.list.addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  if (row) window.widget.openSite();
});
els.btnClose.addEventListener('click', () => window.widget.quit());
els.btnMore.addEventListener('click', () => window.widget.showContextMenu());
els.openSite.addEventListener('click', () => window.widget.openSite());

(async () => {
  try {
    const [{ initializeApp }, { getFirestore, collection, onSnapshot }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js'),
    ]);
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        els.connDot.classList.remove('off');
        els.connLabel.textContent = '실시간 연결됨';
        const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        render(tasks);
      },
      (err) => {
        console.error('[widget] Firestore 구독 실패:', err);
        els.connDot.classList.add('off');
        els.connLabel.textContent = '연결 실패';
        els.error.textContent = `데이터를 불러오지 못했어요.\n인터넷 연결을 확인해 주세요.\n(${err.message})`;
        show('error');
      }
    );
  } catch (err) {
    console.error('[widget] 초기화 실패:', err);
    els.connDot.classList.add('off');
    els.connLabel.textContent = '연결 실패';
    els.error.textContent = `초기화 중 오류가 발생했어요.\n(${err.message})`;
    show('error');
  }
})();
