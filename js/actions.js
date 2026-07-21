function notifySaveError(label, err) {
  console.error(label, err);
  alert(`${label} 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.\n(${err.message})`);
}

App.actions = {
  rerender: null, // wired up by main.js

  setView(v) { App.state.view = v; App.actions.rerender(); },
  prevWeek() { App.state.weekOffset -= 1; App.actions.rerender(); },
  nextWeek() { App.state.weekOffset += 1; App.actions.rerender(); },
  thisWeek() { App.state.weekOffset = 0; App.actions.rerender(); },
  prevMonth() { App.state.monthOffset -= 1; App.actions.rerender(); },
  nextMonth() { App.state.monthOffset += 1; App.actions.rerender(); },
  thisMonth() { App.state.monthOffset = 0; App.actions.rerender(); },
  setSort(v) { App.state.sortBy = v; App.actions.rerender(); },
  setFilter(k, v) { App.state[k] = v; App.actions.rerender(); },
  // Home dashboard "더보기" links: jump to 업무 목록 with that card's 유형 filter
  // already applied, instead of landing on the unfiltered list.
  goToTasksFiltered(type) {
    App.state.view = 'tasks';
    App.state.filterType = type;
    App.actions.rerender();
  },

  openNew() {
    const today = App.today, iso = App.util.iso, addDays = App.util.addDays;
    App.state.modalOpen = true;
    App.state.editingId = null;
    App.state.form = { name: '', desc: '', type: 'ongoing', start: iso(today), due: iso(addDays(today, 7)), imp: 2, urg: 2, recur: '', goalId: '', progress: 0, memo: '' };
    App.actions.rerender();
  },

  // Clicking a date on the weekly/monthly calendar opens the same modal,
  // pre-filled with that date as both start and due (single-day by default).
  openNewOnDate(dateIso) {
    App.state.modalOpen = true;
    App.state.editingId = null;
    App.state.form = { name: '', desc: '', type: 'ongoing', start: dateIso, due: dateIso, imp: 2, urg: 2, recur: '', goalId: '', progress: 0, memo: '' };
    App.actions.rerender();
  },

  openEdit(id) {
    const t = App.state.tasks.find(x => x.id === id);
    if (!t) return;
    App.state.modalOpen = true;
    App.state.editingId = id;
    // Legacy records may still have type:'recurring' — fold into 지속 업무 + recur here too.
    const type = t.type === 'recurring' ? 'ongoing' : t.type;
    const recur = t.type === 'recurring' ? (t.recur || '매월') : (t.recur || '');
    App.state.form = { name: t.name, desc: t.desc || '', type, start: t.start, due: t.due, imp: t.imp, urg: t.urg, recur, goalId: t.goalId || '', progress: t.progress, memo: t.memo || '' };
    App.actions.rerender();
  },

  closeModal() { App.state.modalOpen = false; App.actions.rerender(); },
  setForm(k, v) { App.state.form = { ...App.state.form, [k]: v }; App.actions.rerender(); },
  // Same as setForm, but skips the rerender. Used for freeform text fields
  // (업무명/설명/메모) where nothing else on screen needs to react live to
  // what's being typed — so there's no reason to ever recreate that <input>
  // mid-keystroke, which is what made Korean IME composition fragile.
  setFormQuiet(k, v) { App.state.form = { ...App.state.form, [k]: v }; },

  saveTask() {
    const f = App.state.form;
    if (!f.name.trim()) return;
    const today = App.today, iso = App.util.iso;
    if (App.state.editingId) {
      const eid = App.state.editingId;
      const existing = App.state.tasks.find(t => t.id === eid);
      const payload = { ...f, rawStatus: f.progress >= 100 ? '완료' : (f.progress > 0 ? '진행중' : (existing ? existing.rawStatus : '예정')), updated: iso(today) };
      App.state.tasks = App.state.tasks.map(t => t.id === eid ? { ...t, ...payload } : t);
      App.state.modalOpen = false;
      App.actions.rerender();
      App.firebase.updateTask(eid, payload).catch(err => notifySaveError('업무', err));
    } else {
      const payload = { ...f, rawStatus: f.progress >= 100 ? '완료' : (f.progress > 0 ? '진행중' : '예정'), updated: iso(today) };
      App.state.modalOpen = false;
      App.actions.rerender();
      App.firebase.addTask(payload).catch(err => notifySaveError('업무', err));
    }
  },

  // Quick "완료 처리" button in the edit modal: mark the task 100%/완료 and save
  // immediately, without the user having to drag the progress slider first.
  completeTask() {
    App.state.form = { ...App.state.form, progress: 100 };
    App.actions.saveTask();
  },

  deleteTask() {
    const eid = App.state.editingId;
    const removed = App.state.tasks.find(t => t.id === eid);
    App.state.tasks = App.state.tasks.filter(t => t.id !== eid);
    App.state.modalOpen = false;
    App.actions.rerender();
    App.firebase.deleteTask(eid).catch(err => notifySaveError('업무 삭제', err));
    if (removed && removed.googleEventId) App.googleCalendar.deleteEvent(removed.googleEventId);
  },

  setProgress(id, v) {
    const today = App.today, iso = App.util.iso;
    let payload = null;
    App.state.tasks = App.state.tasks.map(t => {
      if (t.id !== id) return t;
      payload = { progress: v, rawStatus: v >= 100 ? '완료' : (v > 0 && t.rawStatus === '예정' ? '진행중' : t.rawStatus), updated: iso(today) };
      return { ...t, ...payload };
    });
    App.actions.rerender();
    if (payload) App.firebase.updateTask(id, payload).catch(err => notifySaveError('진행률', err));
  },

  setStatus(id, v) {
    const today = App.today, iso = App.util.iso;
    let payload = null;
    App.state.tasks = App.state.tasks.map(t => {
      if (t.id !== id) return t;
      payload = { rawStatus: v, progress: v === '완료' ? 100 : (v === '예정' ? 0 : t.progress), updated: iso(today) };
      return { ...t, ...payload };
    });
    App.actions.rerender();
    if (payload) App.firebase.updateTask(id, payload).catch(err => notifySaveError('상태', err));
  },

  toggleRule(id) {
    let active = null;
    App.state.rules = App.state.rules.map(r => {
      if (r.id !== id) return r;
      active = !r.active;
      return { ...r, active };
    });
    App.actions.rerender();
    if (active !== null) App.firebase.updateRule(id, { active }).catch(err => notifySaveError('반복 규칙', err));
  },

  openNewGoal() {
    App.state.goalModalOpen = true;
    App.state.editingGoalId = null;
    App.state.goalForm = { name: '', year: App.today.getFullYear(), metricType: 'progress', targetValue: 0, targetUnit: '', currentValue: 0 };
    App.actions.rerender();
  },

  openEditGoal(id) {
    const g = App.state.goals.find(x => x.id === id);
    if (!g) return;
    App.state.goalModalOpen = true;
    App.state.editingGoalId = id;
    App.state.goalForm = { name: g.name, year: g.year, metricType: g.metricType || 'progress', targetValue: g.targetValue || 0, targetUnit: g.targetUnit || '', currentValue: g.currentValue || 0 };
    App.actions.rerender();
  },

  closeGoalModal() { App.state.goalModalOpen = false; App.actions.rerender(); },
  setGoalForm(k, v) { App.state.goalForm = { ...App.state.goalForm, [k]: v }; App.actions.rerender(); },
  setGoalFormQuiet(k, v) { App.state.goalForm = { ...App.state.goalForm, [k]: v }; },

  saveGoal() {
    const f = App.state.goalForm;
    if (!f.name.trim()) return;
    const payload = {
      name: f.name.trim(), year: f.year, metricType: f.metricType || 'progress',
      targetValue: +f.targetValue || 0, targetUnit: f.targetUnit || '', currentValue: +f.currentValue || 0
    };
    if (App.state.editingGoalId) {
      const eid = App.state.editingGoalId;
      App.state.goals = App.state.goals.map(g => g.id === eid ? { ...g, ...payload } : g);
      App.state.goalModalOpen = false;
      App.actions.rerender();
      App.firebase.updateGoal(eid, payload).catch(err => notifySaveError('목표', err));
    } else {
      App.state.goalModalOpen = false;
      App.actions.rerender();
      App.firebase.addGoal(payload).catch(err => notifySaveError('목표 등록', err));
    }
  },

  deleteGoal() {
    const eid = App.state.editingGoalId;
    App.state.goals = App.state.goals.filter(g => g.id !== eid);
    App.state.goalModalOpen = false;
    App.actions.rerender();
    App.firebase.deleteGoal(eid).catch(err => notifySaveError('목표 삭제', err));
  },

  async syncGoogleCalendar() {
    if (App.state.googleSyncing) return;
    if (!App.googleCalendar.isConnected()) {
      try {
        await App.googleCalendar.requestToken();
      } catch (err) {
        alert(`Google 캘린더 연동에 실패했습니다.\n(${err.message})`);
        return;
      }
    }
    App.state.googleSyncing = true;
    App.actions.rerender();

    let ok = 0, fail = 0;
    for (const t of App.state.tasks) {
      try {
        const eventId = await App.googleCalendar.syncTask(t);
        if (eventId !== t.googleEventId) {
          t.googleEventId = eventId; // optimistic local update
          App.firebase.updateTask(t.id, { googleEventId: eventId }).catch(() => {});
        }
        ok++;
      } catch (e) {
        fail++;
      }
    }

    App.state.googleSyncing = false;
    App.state.googleLastSyncAt = new Date();
    App.actions.rerender();
    alert(`Google 캘린더 동기화 완료: 성공 ${ok}건${fail ? `, 실패 ${fail}건` : ''}`);
  },

  disconnectGoogleCalendar() {
    App.googleCalendar.disconnect();
    App.state.googleLastSyncAt = null;
    App.actions.rerender();
  },
};
