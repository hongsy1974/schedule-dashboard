App.computeViewModel = function (state) {
  const today = App.today;
  const { P, RED, GREEN, IMP } = App.const;
  const { dday, score, statusOf, stalled, ddayView, typeBadge, barColor, goalRollup, deadlineWeight } = App.logic;
  const { iso, addDays, parse } = App.util;
  const S = state;

  const decorate = (t) => {
    // Legacy data: 반복(recurring) used to be its own 유형. It's now an independent
    // flag (t.recur) layered onto a real type, so old records get folded into
    // 지속 업무 + recur set here for every display purpose; saving the task through
    // the modal persists the migration.
    const effType = t.type === 'recurring' ? 'ongoing' : t.type;
    const effRecur = t.type === 'recurring' ? (t.recur || '매월') : t.recur;
    const tb = typeBadge(effType), dv = ddayView(today, t);
    return {
      ...t,
      type: effType, recur: effRecur,
      score: score(today, t),
      status: statusOf(today, t),
      stalled: stalled(today, t),
      typeLabel: tb.label, typeBadgeStyle: tb.style,
      ddayLabel: dv.label, ddayStyle: dv.style, ddayOver: dv.over,
      impLabel: IMP[t.imp], urgLabel: IMP[t.urg],
      barColor: barColor(today, t),
      startLabel: t.start.slice(5).replace('-', '/'),
      dueLabel: t.due.slice(5).replace('-', '/'),
    };
  };

  const all = S.tasks.map(decorate);
  const active = all.filter(t => t.status !== '완료');
  // 개인 일정 is excluded from views that specifically rank/triage *work*
  // (해야할 일, 아이젠하워 매트릭스) — it still shows normally in the
  // calendars, 업무 목록, and alerts.
  const workActive = active.filter(t => t.type !== 'personal');

  // nav
  const navDefs = [['home', '홈'], ['goals', '연간 목표'], ['tasks', '업무 목록'], ['recurring', '반복 일정'], ['matrix', '매트릭스']];
  const navItems = navDefs.map(([v, l]) => ({ view: v, label: l, active: S.view === v }));

  // alerts
  const overdue = active.filter(t => t.status === '지연');
  const soon = active.filter(t => t.recur && dday(today, t.due) >= 0 && dday(today, t.due) <= 5);
  const alerts = [];
  overdue.slice(0, 2).forEach(t => alerts.push(`${t.name} 마감 경과 (지연)`));
  soon.slice(0, 2).forEach(t => alerts.push(`반복 일정 「${t.name}」 ${t.ddayLabel}`));
  const alertsCapped = alerts.slice(0, 3);
  if (alertsCapped.length === 0) alertsCapped.push('오늘 예정된 지연·임박 알림이 없습니다');

  // weekly
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const wkStart = addDays(today, -today.getDay() + S.weekOffset * 7);
  const wkEnd = addDays(wkStart, 6);
  // 시작일과 마감일이 다른 업무도 마감일이 아니라 시작일에 걸어서 월간 달력에
  // 표시한다 (완료 여부와 무관).
  const byAnchorDate = {};
  S.tasks.forEach(t => {
    (byAnchorDate[t.start] = byAnchorDate[t.start] || []).push(t);
  });

  const mdLabel = (dt) => `${dt.getMonth() + 1}.${dt.getDate()}`;
  const dateRangeLabel = (t) => t.start === t.due ? mdLabel(parse(t.due)) : `${mdLabel(parse(t.start))}~${mdLabel(parse(t.due))}`;
  // Legacy records may still carry the raw type:'recurring' (pre-checkbox
  // migration) on S.tasks — decorate() folds that into 지속 for display, but
  // this weekly section reads S.tasks directly, so it has to check both.
  const isOngoing = (t) => t.type === 'ongoing' || t.type === 'recurring';

  const weekDays = DOW.map((dw, i) => {
    const dt = addDays(wkStart, i), key = iso(dt), isToday = key === iso(today);
    const weekend = i === 0 || i === 6;
    // Single-day tasks show on their one day; multi-day tasks repeat in every
    // day cell they cover so the span still reads as connected. 지속 업무는
    // 끝이 없는 진행형 업무라 주간 일정 자체에는 표시하지 않는다 (월간 일정·
    // 업무 목록에서는 계속 보임). Completed tasks are anchored to their
    // 시작일(start), same as the monthly calendar below.
    const dayTasks = S.tasks.filter(t => {
      if (isOngoing(t)) return false;
      if (statusOf(today, t) === '완료') return t.start === key;
      return t.start === t.due ? t.due === key : (t.start <= key && t.due >= key);
    });
    const items = dayTasks.slice(0, 4).map(t => {
      const st = statusOf(today, t);
      const c = st === '완료' ? GREEN : (st === '지연' ? RED : P);
      return { id: t.id, name: `${t.name}(${dateRangeLabel(t)})`, style: `font-size:10.5px;line-height:1.25;padding:3px 5px;border-radius:4px;background:${c}18;color:${c};border-left:2px solid ${c};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer` };
    });
    return {
      dow: dw, date: dt.getDate(), dateIso: key, items,
      colStyle: `border-right:${i < 6 ? '1px solid #EEF0F2' : 'none'};background:${isToday ? '#FFFBF7' : '#fff'};cursor:pointer`,
      headStyle: `text-align:center;padding:7px 0;border-bottom:1px solid #EEF0F2;background:${isToday ? '#FFF4EC' : '#FAFBFC'}`,
      dowStyle: `font-size:11px;font-weight:700;color:${isToday ? P : (weekend ? '#bbb' : '#888')}`,
      dateStyle: `display:block;font-size:14px;font-weight:${isToday ? 900 : 700};color:${isToday ? P : (weekend ? '#bbb' : '#444')};margin-top:1px`
    };
  });
  const we = wkEnd;
  const weekRangeLabel = `${wkStart.getMonth() + 1}/${wkStart.getDate()} – ${we.getMonth() + 1}/${we.getDate()}`;

  // monthly
  const base = new Date(today.getFullYear(), today.getMonth() + S.monthOffset, 1);
  const monthLabel = `${base.getFullYear()}년 ${base.getMonth() + 1}월`;
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  const dowHeaders = DOW.map((d, i) => ({ label: d, style: `text-align:center;font-size:11px;font-weight:700;padding:6px 0;color:${(i === 0 || i === 6) ? '#bbb' : '#999'}` }));
  const monthCells = [];
  for (let i = 0; i < 42; i++) {
    const dt = addDays(gridStart, i), key = iso(dt);
    const inMonth = dt.getMonth() === base.getMonth();
    const isToday = key === iso(today);
    const day = dt.getDate(), weekend = (i % 7) === 0 || (i % 7) === 6;
    const dayTasks = byAnchorDate[key] || [];
    const items = dayTasks.slice(0, 3).map(t => {
      const st = statusOf(today, t), c = st === '지연' ? RED : (st === '완료' ? GREEN : P);
      return { id: t.id, name: t.name, style: `font-size:9.5px;line-height:1.2;padding:1px 4px;border-radius:3px;background:${c}18;color:${c};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer` };
    });
    monthCells.push({
      day, dateIso: key, items, more: dayTasks.length - 3, moreShow: dayTasks.length > 3,
      cellStyle: `height:88px;overflow:hidden;cursor:pointer;border-right:1px solid #EEF0F2;border-bottom:1px solid #EEF0F2;padding:4px 5px;background:${isToday ? '#FFFBF7' : (inMonth ? '#fff' : '#FAFBFC')};opacity:${inMonth ? 1 : .5}`,
      numStyle: `font-size:11.5px;font-weight:${isToday ? 900 : 600};color:${isToday ? '#fff' : (weekend ? '#bbb' : '#555')};${isToday ? `background:${P};border-radius:50%;width:19px;height:19px;display:inline-flex;align-items:center;justify-content:center` : ''}`
    });
  }

  // 해야할 일 — outstanding work items due within the next month (30일 이내),
  // ranked by score (no cap beyond that; the card has a fixed frame and
  // scrolls internally instead of growing with the list)
  const todoList = workActive.filter(t => dday(today, t.due) <= 30).sort((a, b) => b.score - a.score || dday(today, a.due) - dday(today, b.due)).map((t, i, arr) => ({
    ...t, rank: i + 1,
    rowStyle: `display:flex;align-items:center;gap:13px;padding:12px 18px;cursor:pointer;border-bottom:${i < arr.length - 1 ? '1px solid #F2F3F5' : 'none'}`,
    rankStyle: `width:24px;height:24px;flex:none;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;background:${i === 0 ? P : (i < 3 ? '#F9A46A' : '#cfd2d6')}`
  }));

  // ongoing cards — 유형이 "지속"(ongoing)인 업무만, 목표/단순 업무는 제외
  const ongoing = active.filter(t => t.type === 'ongoing');
  const ongoingCards = [...ongoing].sort((a, b) => dday(today, a.due) - dday(today, b.due)).map(t => ({
    ...t, prioLabel: t.score + '점',
    prioBadge: `background:${P};color:#fff;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:4px;flex:none`
  }));

  // 개인 일정 — 향후 1개월(30일) 이내인 것만, 마감이 가장 가까운(임박한) 순으로 정렬
  const personalCards = active.filter(t => t.type === 'personal' && dday(today, t.due) <= 30)
    .sort((a, b) => dday(today, a.due) - dday(today, b.due));

  // Goal status coloring: 'progress' mode compares value achieved vs time elapsed
  // (지연 위험 if behind schedule); numeric/count modes have no timeline to compare
  // against, so they just report 달성 vs 진행중.
  const goalStatus = (r) => {
    if (r.metricType === 'progress') {
      return { bad: r.behind, good: !r.behind, tag: r.behind ? '지연 위험' : '정상' };
    }
    return { bad: false, good: r.done, tag: r.done ? '달성' : '진행중' };
  };

  // goal gauges (home)
  const goalGauges = S.goals.map(g => {
    const r = goalRollup(today, S.tasks, g), C = 2 * Math.PI * 44;
    const st = goalStatus(r);
    const color = st.bad ? RED : (st.good ? GREEN : P);
    return {
      name: g.name, pct: r.pct, color, dash: `${C * r.pct / 100} ${C}`, tag: st.tag,
      tagStyle: `margin-top:5px;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:10px;${st.bad ? `background:#FBECEC;color:${RED}` : (st.good ? `background:#EAF6EE;color:${GREEN}` : `background:#FFF4EC;color:${P}`)}`
    };
  });

  // goal details (goals view)
  const goalDetails = S.goals.map(g => {
    const r = goalRollup(today, S.tasks, g), C = 2 * Math.PI * 27;
    const st = goalStatus(r);
    const color = st.bad ? RED : (st.good ? GREEN : P);
    const subtitle = r.metricType === 'numeric' ? `현재 ${r.current}${r.unit} / 목표 ${r.target}${r.unit}`
      : r.metricType === 'count' ? `세부 업무 ${r.doneCount}/${r.totalCount}건 완료`
      : `실행 계획 ${r.tasks.length}건 · 시간 경과율 ${r.timePct}%`;
    return {
      id: g.id, name: g.name, pct: r.pct, subtitle,
      color, dash: `${C * r.pct / 100} ${C}`,
      tag: st.tag,
      tagStyle: `font-size:11.5px;font-weight:700;padding:4px 12px;border-radius:12px;${st.bad ? `background:#FBECEC;color:${RED}` : (st.good ? `background:#EAF6EE;color:${GREEN}` : `background:#FFF4EC;color:${P}`)}`,
      tasks: r.tasks.map(decorate)
    };
  });

  // tasks table
  let rows = all.filter(t => S.filterType === 'all' || t.type === S.filterType)
    .filter(t => S.filterStatus === 'all' || t.status === S.filterStatus);
  rows.sort((a, b) => S.sortBy === 'due' ? dday(today, a.due) - dday(today, b.due) :
    S.sortBy === 'progress' ? a.progress - b.progress :
      (b.score - a.score || dday(today, a.due) - dday(today, b.due)));
  const decorateRow = (t) => ({
    ...t, overdue: t.status === '지연',
    statusSelStyle: `height:28px;border:1px solid #E3E5E8;border-radius:6px;padding:0 6px;font-size:11.5px;color:${t.status === '완료' ? GREEN : '#555'};font-weight:${t.status === '완료' ? 700 : 500};background:#fff`
  });

  const goalName = (gid) => { const g = S.goals.find(x => x.id === gid); return g ? g.name : null; };
  const validGoalIds = new Set(S.goals.map(g => g.id));
  // A task whose linked goal was since deleted falls back to "unlinked" here too,
  // instead of silently disappearing from every group.
  const effectiveGoalId = (t) => (t.goalId && validGoalIds.has(t.goalId)) ? t.goalId : '';
  const order = ['', ...S.goals.map(g => g.id)];
  const tableGroups = order.map(gid => {
    const grp = rows.filter(t => effectiveGoalId(t) === gid);
    if (!grp.length) return null;
    const nm = goalName(gid);
    const avg = Math.round(grp.reduce((a, t) => a + t.progress, 0) / grp.length);
    return {
      gid, isGoal: !!nm, name: nm || '목표 미연결', count: grp.length, avg,
      headStyle: `display:flex;align-items:center;gap:9px;padding:9px 16px;background:${nm ? '#FFF7F1' : '#F5F6F7'};border-bottom:1px solid #EEF0F2;border-top:1px solid #EEF0F2`,
      dotStyle: `width:8px;height:8px;border-radius:2px;background:${nm ? P : '#c2c6cc'};flex:none`,
      rows: grp.map(decorateRow)
    };
  }).filter(Boolean);

  const typeFilters = [['all', '전체'], ['ongoing', '지속'], ['goal', '목표'], ['simple', '단순'], ['personal', '개인']].map(([v, l]) => ({ value: v, label: l, active: S.filterType === v }));
  const statusFilters = [['all', '전체'], ['예정', '예정'], ['진행중', '진행중'], ['완료', '완료'], ['지연', '지연']].map(([v, l]) => ({ value: v, label: l, active: S.filterStatus === v }));

  // matrix — a task due today always lands in 즉시 처리 (DO) regardless of its
  // own 중요도/긴급도 rating, since a D-DAY deadline overrides everything else.
  const quad = (hi, hu) => workActive.filter(t => {
    if (dday(today, t.due) === 0) return hi && hu;
    return (t.imp >= 2) === hi && (t.urg >= 2) === hu;
  }).sort((a, b) => b.score - a.score);
  const qmeta = [
    { key: [true, true], title: '즉시 처리', action: 'DO', dot: RED, bg: '#FFF6F5' },
    { key: [true, false], title: '계획 수립', action: 'PLAN', dot: P, bg: '#FFFAF5' },
    { key: [false, true], title: '위임 검토', action: 'DELEGATE', dot: '#3f6fb5', bg: '#F5F8FC' },
    { key: [false, false], title: '후순위', action: 'DROP', dot: '#aaa', bg: '#FAFBFC' },
  ];
  const quadrants = qmeta.map(m => {
    const items = quad(m.key[0], m.key[1]);
    return {
      title: m.title, action: m.action, empty: items.length === 0,
      boxStyle: `background:${m.bg};border:1px solid #E3E5E8;border-radius:8px;padding:14px 16px;display:flex;flex-direction:column`,
      dotStyle: `width:9px;height:9px;border-radius:50%;background:${m.dot};display:inline-block`,
      items
    };
  });

  // rules — 업무명/주기/생성 시점 are auto-filled from the task modal's 반복
  // checkbox (see actions.upsertRuleForTask), but 업무명 can be corrected by
  // hand here too (e.g. typos, duplicates). 다음 생성 예정일 and 활성 stay
  // manual. Active rules sort first, then within each group by 다음 생성
  // 예정일 (soonest first, undated ones last).
  const ruleRows = [...S.rules].sort((a, b) => {
    if (!!a.active !== !!b.active) return a.active ? -1 : 1;
    if (!a.nextDue && !b.nextDue) return 0;
    if (!a.nextDue) return 1;
    if (!b.nextDue) return -1;
    return parse(a.nextDue) - parse(b.nextDue);
  }).map(r => ({
    ...r,
    genPointLabel: r.genPoint ? mdLabel(parse(r.genPoint)) : '—',
    alertPeriod: r.alertPeriod || '1개월',
    toggleStyle: `width:42px;height:23px;border-radius:12px;border:none;cursor:pointer;position:relative;background:${r.active ? P : '#cfd2d6'};transition:background .15s`,
    knobStyle: `position:absolute;top:2px;left:${r.active ? '21px' : '2px'};width:19px;height:19px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)`
  }));

  // modal form
  const f = S.form || {};
  const formScore = f.name !== undefined ? (() => {
    const dd = dday(today, f.due || iso(today));
    let s = (f.urg || 2) * 2 + (f.imp || 2);
    if ((f.progress || 0) < 100) s += deadlineWeight(dd);
    return s;
  })() : 0;
  const btnStyle = (on) => `flex:1;height:34px;border:1px solid ${on ? P : '#E3E5E8'};background:${on ? '#FFF4EC' : '#fff'};color:${on ? P : '#888'};border-radius:7px;font-size:13px;font-weight:${on ? 700 : 500};cursor:pointer`;
  const impBtns = [3, 2, 1].map(n => ({ value: n, label: IMP[n], style: btnStyle(f.imp === n) }));
  const urgBtns = [3, 2, 1].map(n => ({ value: n, label: IMP[n], style: btnStyle(f.urg === n) }));

  // goal form (live preview for numeric-target mode only — progress/count modes are
  // derived from linked tasks, not from anything entered in this modal)
  const gf = S.goalForm || {};
  const goalFormPct = gf.metricType === 'numeric'
    ? ((+gf.targetValue || 0) > 0 ? Math.max(0, Math.min(100, Math.round((+gf.currentValue || 0) / (+gf.targetValue || 0) * 100))) : 0)
    : null;

  return {
    todayLabel: `${today.getFullYear()}. ${App.util.pad(today.getMonth() + 1)}. ${App.util.pad(today.getDate())} (${['일', '월', '화', '수', '목', '금', '토'][today.getDay()]})`,
    navItems, alerts: alertsCapped,
    view: S.view,
    weekDays, weekRangeLabel,
    monthLabel, monthCells, dowHeaders,
    googleConnected: App.googleCalendar ? App.googleCalendar.isConnected() : false,
    googleSyncing: S.googleSyncing,
    googleLastSyncLabel: S.googleLastSyncAt
      ? `${App.util.pad(S.googleLastSyncAt.getHours())}:${App.util.pad(S.googleLastSyncAt.getMinutes())}`
      : null,
    todoList, goalGauges, ongoingCards, ongoingCount: ongoing.length, personalCards,
    allCount: all.length, viewCount: rows.length, tableGroups, typeFilters, statusFilters, sortBy: S.sortBy,
    quadrants,
    ruleRows,
    goalYear: today.getFullYear(), goalDetails,
    modalOpen: S.modalOpen, modalTitle: S.editingId ? '업무 수정' : '새 업무 등록', isEditing: !!S.editingId,
    form: f, isRecurringTask: !!f.recur, formScore,
    goalOptions: S.goals.map(g => ({ id: g.id, name: g.name })),
    impBtns, urgBtns,
    goalModalOpen: S.goalModalOpen, goalModalTitle: S.editingGoalId ? '목표 수정' : '새 목표 추가', isEditingGoal: !!S.editingGoalId,
    goalForm: gf, isNumericGoal: gf.metricType === 'numeric', goalFormPct,
  };
};
