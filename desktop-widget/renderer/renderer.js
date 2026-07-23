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
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; })();
const dday = (due) => Math.round((parse(due) - today) / 86400000);
const mdLabel = (dt) => `${dt.getMonth() + 1}.${dt.getDate()}`;
const dateRangeLabel = (t) => t.start === t.due ? mdLabel(parse(t.due)) : `${mdLabel(parse(t.start))}~${mdLabel(parse(t.due))}`;
const durationDays = (t) => Math.round((parse(t.due) - parse(t.start)) / 86400000) + 1;
// Legacy records may still carry the raw type:'recurring' (pre-checkbox
// migration on the website) — 지속 업무 is always anchored to its 종료일
// instead of spanning/repeating, same as the website's weekly view.
const isOngoing = (t) => t.type === 'ongoing' || t.type === 'recurring';
const LONG_DURATION_DAYS = 10;

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
  week: document.getElementById('week'),
  weekLabel: document.getElementById('week-label'),
  weekHead: document.getElementById('week-head'),
  weekItems: document.getElementById('week-items'),
  weekBars: document.getElementById('week-bars'),
  month: document.getElementById('month'),
  monthLabel: document.getElementById('month-label'),
  monthDow: document.getElementById('month-dow'),
  monthCells: document.getElementById('month-cells'),
  btnClose: document.getElementById('btn-close'),
  btnMore: document.getElementById('btn-more'),
  btnViewList: document.getElementById('btn-view-list'),
  btnViewWeek: document.getElementById('btn-view-week'),
  btnViewMonth: document.getElementById('btn-view-month'),
  btnPrevWeek: document.getElementById('btn-prev-week'),
  btnNextWeek: document.getElementById('btn-next-week'),
  btnTodayWeek: document.getElementById('btn-today-week'),
  btnPrevMonth: document.getElementById('btn-prev-month'),
  btnNextMonth: document.getElementById('btn-next-month'),
  btnTodayMonth: document.getElementById('btn-today-month'),
  btnPin: document.getElementById('btn-pin'),
  btnCollapse: document.getElementById('btn-collapse'),
  openSite: document.getElementById('open-site'),
};

// 일요일-first ordering, matching the website's weekly/monthly grids and
// lining up directly with Date#getDay()'s own 일요일=0 indexing.
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
els.date.textContent = `${today.getMonth() + 1}월 ${today.getDate()}일 (${DOW[today.getDay()]})`;
els.monthDow.innerHTML = DOW.map((d, i) => `<div class="dow-cell" style="color:${(i === 0 || i === 6) ? '#bbb' : '#999'}">${d}</div>`).join('');

let latestTasks = [];
let viewMode = 'list';
let weekOffset = 0;
let monthOffset = 0;

// Updates buttons + re-renders for the given mode, without touching the
// actual OS window size. Used both when the user picks a view (after the
// resize IPC round-trip below) and on startup, where main.js has already
// sized the window correctly before this page even loaded.
function applyViewModeUI(mode) {
  viewMode = mode;
  els.btnViewList.classList.toggle('active', mode === 'list');
  els.btnViewWeek.classList.toggle('active', mode === 'week');
  els.btnViewMonth.classList.toggle('active', mode === 'month');
  renderCurrent();
}

// 주간/달력 views are much wider than 리스트 (to fit real task names like the
// website's calendars), so switching views resizes the actual window.
async function setViewMode(mode) {
  await window.widget.setViewMode(mode);
  applyViewModeUI(mode);
}

function show(which) {
  els.loading.style.display = which === 'loading' ? '' : 'none';
  els.empty.style.display = which === 'empty' ? '' : 'none';
  els.error.style.display = which === 'error' ? '' : 'none';
  els.list.style.display = which === 'list' ? '' : 'none';
  els.week.style.display = which === 'week' ? '' : 'none';
  els.month.style.display = which === 'month' ? '' : 'none';
}

function renderCurrent() {
  if (viewMode === 'week') renderWeek(latestTasks);
  else if (viewMode === 'month') renderMonth(latestTasks);
  else renderList(latestTasks);
}

function renderList(tasks) {
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

// Matches the website's monthly calendar item coloring: 완료 first (so a
// finished task doesn't look like it's still overdue), then 지연, then the
// brand color for everything else.
function statusColor(t) {
  if (isComplete(t)) return '#43A047';
  if (dday(t.due) < 0) return '#E53935';
  return '#F37321';
}

// Same lane-stacking approach as the website's weekly view: multi-day tasks
// long enough to earn a spanning bar (10+ days) are greedily packed into as
// few horizontal lanes as possible so overlapping ones don't collide.
const GRID_LINE = '1px solid #EEF0F2';

function renderWeek(tasks) {
  const wkStart = addDays(today, -today.getDay() + weekOffset * 7);
  const wkEnd = addDays(wkStart, 6);
  els.weekLabel.textContent = `${wkStart.getMonth() + 1}/${wkStart.getDate()} – ${wkEnd.getMonth() + 1}/${wkEnd.getDate()}`;

  const multiDayCandidates = tasks
    .filter((t) => !isComplete(t) && !isOngoing(t) && t.start !== t.due && durationDays(t) >= LONG_DURATION_DAYS
      && !(parse(t.due) < wkStart || parse(t.start) > wkEnd))
    .sort((a, b) => parse(a.start) - parse(b.start));
  const laneEnds = [];
  const bars = [];
  multiDayCandidates.forEach((t) => {
    const clipStart = parse(t.start) < wkStart ? wkStart : parse(t.start);
    const clipEnd = parse(t.due) > wkEnd ? wkEnd : parse(t.due);
    let lane = laneEnds.findIndex((end) => end < clipStart);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(clipEnd); }
    else laneEnds[lane] = clipEnd;
    const colStart = Math.round((clipStart - wkStart) / 86400000);
    const colEnd = Math.round((clipEnd - wkStart) / 86400000);
    const c = statusColor(t);
    bars.push(`
      <div class="week-bar" data-id="${t.id}" title="${escapeHtml(t.name)}"
        style="grid-column:${colStart + 1} / ${colEnd + 2};grid-row:${lane + 1};background:${c}">
        ${escapeHtml(t.name)}(${dateRangeLabel(t)})
      </div>`);
  });
  const laneCount = Math.max(1, laneEnds.length);

  // Same lane-background columns as the website (laneBg in js/viewmodel.js):
  // drawn under the bars so the day-column grid lines and 오늘 tint continue
  // visually from the header/item rows above into the bar row below.
  const laneBg = DOW.map((_, i) => {
    const isToday = iso(addDays(wkStart, i)) === iso(today);
    return `<div style="grid-column:${i + 1};grid-row:1 / ${laneCount + 1};border-right:${i < 6 ? GRID_LINE : 'none'};background:${isToday ? '#FFFBF7' : '#fff'}"></div>`;
  }).join('');
  els.weekBars.style.gridTemplateRows = `repeat(${laneCount}, 22px)`;
  els.weekBars.innerHTML = laneBg + bars.join('');

  els.weekHead.innerHTML = DOW.map((dw, i) => {
    const dt = addDays(wkStart, i), key = iso(dt), isToday = key === iso(today), weekend = i === 0 || i === 6;
    const dowColor = isToday ? '#F37321' : (weekend ? '#bbb' : '#888');
    const dateColor = isToday ? '#F37321' : (weekend ? '#bbb' : '#444');
    return `<div class="week-day-head" data-date="${key}"
        style="border-right:${i < 6 ? GRID_LINE : 'none'};background:${isToday ? '#FFF4EC' : '#FAFBFC'}">
        <span class="wd-name" style="color:${dowColor}">${dw}</span>
        <span class="wd-num" style="color:${dateColor};font-weight:${isToday ? 900 : 700}">${dt.getDate()}</span>
      </div>`;
  }).join('');

  els.weekItems.innerHTML = DOW.map((dw, i) => {
    const dt = addDays(wkStart, i), key = iso(dt), isToday = key === iso(today);
    // 지속 업무는 끝이 없는 진행형 업무라 주간 일정에는 표시하지 않는다
    // (월간 일정에서는 계속 보임) — js/viewmodel.js의 weekDays와 동일.
    const dayTasks = tasks.filter((t) => {
      if (isOngoing(t)) return false;
      if (isComplete(t)) return (t.completedDate || t.updated) === key;
      return t.start === t.due ? t.due === key
        : (durationDays(t) < LONG_DURATION_DAYS && t.start <= key && t.due >= key);
    });
    const shown = dayTasks.slice(0, 4);
    const more = dayTasks.length - shown.length;
    const chips = shown.map((t) => {
      const c = statusColor(t);
      return `<div class="week-item" data-id="${t.id}" title="${escapeHtml(t.name)}" style="background:${c}18;color:${c};border-left-color:${c}">${escapeHtml(t.name)}(${dateRangeLabel(t)})</div>`;
    }).join('');
    return `<div class="week-day-col" data-date="${key}"
        style="border-right:${i < 6 ? GRID_LINE : 'none'};border-bottom:${GRID_LINE};background:${isToday ? '#FFFBF7' : '#fff'}">
        ${chips}${more > 0 ? `<div class="day-more">+${more}</div>` : ''}
      </div>`;
  }).join('');

  show('week');
}

function renderMonth(tasks) {
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  els.monthLabel.textContent = `${base.getFullYear()}년 ${base.getMonth() + 1}월`;

  const byDue = {};
  tasks.forEach((t) => { if (t.due) (byDue[t.due] = byDue[t.due] || []).push(t); });

  // 42-cell grid (6 weeks) starting from the Sunday on/before the 1st,
  // matching the 일~토 header order used across the whole app.
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(gridStart);
    dt.setDate(gridStart.getDate() + i);
    const key = iso(dt);
    const inMonth = dt.getMonth() === base.getMonth();
    const isToday = key === iso(today);
    const weekend = (i % 7) === 0 || (i % 7) === 6;
    const dayTasks = byDue[key] || [];
    // Same layout as the website's month cells: a couple of truncated
    // task-name chips, plus a "+n" indicator for anything that doesn't fit.
    const shown = dayTasks.slice(0, 2);
    const more = dayTasks.length - shown.length;
    const items = shown.map((t) => {
      const c = statusColor(t);
      return `<div class="day-item" data-id="${t.id}" title="${escapeHtml(t.name)}" style="background:${c}18;color:${c}">${escapeHtml(t.name)}</div>`;
    }).join('');
    cells.push(`
      <div class="day-cell${inMonth ? '' : ' outside'}${isToday ? ' today' : ''}${weekend ? ' weekend' : ''}" data-date="${key}">
        <span class="day-num">${dt.getDate()}</span>
        <div class="day-items">${items}${more > 0 ? `<div class="day-more">+${more}</div>` : ''}</div>
      </div>`);
  }
  els.monthCells.innerHTML = cells.join('');
  show('month');
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
els.weekItems.addEventListener('click', (e) => {
  if (e.target.closest('.week-day-col')) window.widget.openSite();
});
els.weekBars.addEventListener('click', (e) => {
  if (e.target.closest('.week-bar')) window.widget.openSite();
});
els.monthCells.addEventListener('click', (e) => {
  const cell = e.target.closest('.day-cell');
  if (cell) window.widget.openSite();
});
els.btnClose.addEventListener('click', () => window.widget.quit());
els.btnMore.addEventListener('click', () => window.widget.showContextMenu());
els.openSite.addEventListener('click', () => window.widget.openSite());
els.btnViewList.addEventListener('click', () => setViewMode('list'));
els.btnViewWeek.addEventListener('click', () => setViewMode('week'));
els.btnViewMonth.addEventListener('click', () => setViewMode('month'));
els.btnPrevWeek.addEventListener('click', () => { weekOffset -= 1; renderWeek(latestTasks); });
els.btnNextWeek.addEventListener('click', () => { weekOffset += 1; renderWeek(latestTasks); });
els.btnTodayWeek.addEventListener('click', () => { weekOffset = 0; renderWeek(latestTasks); });
els.btnPrevMonth.addEventListener('click', () => { monthOffset -= 1; renderMonth(latestTasks); });
els.btnNextMonth.addEventListener('click', () => { monthOffset += 1; renderMonth(latestTasks); });
els.btnTodayMonth.addEventListener('click', () => { monthOffset = 0; renderMonth(latestTasks); });

function applyPinState(pinned) {
  els.btnPin.classList.toggle('active', pinned);
}
els.btnPin.addEventListener('click', async () => {
  const pinned = await window.widget.togglePin();
  applyPinState(pinned);
});
window.widget.onPinChanged(applyPinState);

// Collapsing shrinks the actual OS window to just the header bar (see
// main.js) so the widget stops covering other work without having to quit
// it outright; the button glyph flips between "collapse" and "expand".
els.btnCollapse.addEventListener('click', async () => {
  const next = !document.body.classList.contains('collapsed');
  const collapsed = await window.widget.setCollapsed(next);
  document.body.classList.toggle('collapsed', collapsed);
  els.btnCollapse.textContent = collapsed ? '▢' : '▁';
  els.btnCollapse.title = collapsed ? '펼치기' : '접기';
});

window.widget.getState().then(({ pinned, collapsed, viewMode: savedMode }) => {
  applyPinState(pinned);
  if (collapsed) {
    document.body.classList.add('collapsed');
    els.btnCollapse.textContent = '▢';
    els.btnCollapse.title = '펼치기';
  }
  // No resize here: main.js already created the window at the right size
  // for `savedMode` before this page loaded, so this only needs to update
  // the UI/content to match — calling setViewMode() would resize it again
  // (harmlessly, but pointlessly) and fight any position clamping race.
  applyViewModeUI(savedMode === 'month' ? 'month' : savedMode === 'week' ? 'week' : 'list');
});

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
        latestTasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderCurrent();
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
