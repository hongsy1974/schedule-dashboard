var App = window.App || (window.App = {});

App.const = {
  P: '#F37321',
  RED: '#E53935',
  GREEN: '#43A047',
  SUB: '#888',
  IMP: { 3: '상', 2: '중', 1: '하' },
  TYPE: {
    recurring: { label: '반복', color: '#3f6fb5' },
    ongoing: { label: '지속', color: '#7a5db5' },
    goal: { label: '목표', color: '#2f9e78' },
    simple: { label: '단순', color: '#6b7280' }
  }
};

App.util = {
  pad(n) { return String(n).padStart(2, '0'); },
  iso(d) { return d.getFullYear() + '-' + App.util.pad(d.getMonth() + 1) + '-' + App.util.pad(d.getDate()); },
  parse(s) { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); },
  addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; },
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
};

App.logic = {
  dday(today, due) { return Math.round((App.util.parse(due) - today) / 86400000); },

  score(today, t) {
    let s = t.imp * 2 + t.urg;
    const dd = App.logic.dday(today, t.due);
    if (t.rawStatus !== '완료' && dd <= 3) s += 1;
    return s;
  },

  statusOf(today, t) {
    if (t.progress >= 100 || t.rawStatus === '완료') return '완료';
    if (App.logic.dday(today, t.due) < 0) return '지연';
    return t.progress > 0 ? '진행중' : '예정';
  },

  stalled(today, t) {
    if (t.progress >= 100) return false;
    const gap = Math.round((today - App.util.parse(t.updated)) / 86400000);
    return gap >= 7;
  },

  ddayView(today, t) {
    const { RED, P, SUB } = App.const;
    const dd = App.logic.dday(today, t.due), st = App.logic.statusOf(today, t);
    let label, over = false;
    if (dd < 0) { label = 'D+' + (-dd); over = true; }
    else if (dd === 0) { label = 'D-DAY'; }
    else { label = 'D-' + dd; }
    const urgent = (dd <= 3 && st !== '완료');
    const color = (over && st !== '완료') ? RED : (urgent ? P : SUB);
    return { label, color, over, style: `font-size:11px;font-weight:700;color:${color}` };
  },

  typeBadge(type) {
    const c = App.const.TYPE[type];
    return { label: c.label, style: `background:#fff;border:1px solid ${c.color}55;color:${c.color};font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:4px;flex:none` };
  },

  barColor(today, t) {
    const st = App.logic.statusOf(today, t);
    return st === '완료' ? App.const.GREEN : (st === '지연' ? App.const.RED : App.const.P);
  },

  goalRollup(today, tasks, g) {
    const ts = tasks.filter(t => t.goalId === g.id);
    const pct = ts.length ? Math.round(ts.reduce((a, t) => a + t.progress, 0) / ts.length) : 0;
    let timePct = 0;
    if (ts.length) {
      let acc = 0, n = 0;
      ts.forEach(t => {
        const s = App.util.parse(t.start), e = App.util.parse(t.due);
        const span = (e - s) / 86400000;
        if (span > 0) { acc += Math.max(0, Math.min(100, Math.round((today - s) / 86400000 / span * 100))); n++; }
      });
      timePct = n ? Math.round(acc / n) : 0;
    }
    const behind = timePct - pct >= 15;
    return { pct, timePct, behind, tasks: ts };
  },

  navStyle(active) {
    const P = App.const.P;
    return `height:56px;padding:0 16px;border:none;background:none;cursor:pointer;font-size:13.5px;font-weight:${active ? 700 : 500};color:${active ? P : '#555'};border-bottom:3px solid ${active ? P : 'transparent'};margin-bottom:-1px`;
  },

  chip(active) {
    const P = App.const.P;
    return `height:28px;padding:0 12px;border:1px solid ${active ? P : '#E3E5E8'};background:${active ? P : '#fff'};color:${active ? '#fff' : '#666'};border-radius:15px;font-size:12px;font-weight:${active ? 700 : 500};cursor:pointer`;
  },

  segBtn(active) {
    const P = App.const.P;
    return `flex:1;height:34px;border:1px solid ${active ? P : '#E3E5E8'};background:${active ? '#FFF4EC' : '#fff'};color:${active ? P : '#888'};border-radius:7px;font-size:13px;font-weight:${active ? 700 : 500};cursor:pointer`;
  }
};
