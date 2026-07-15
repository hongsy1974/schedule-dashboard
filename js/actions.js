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

  openNew() {
    const today = App.today, iso = App.util.iso, addDays = App.util.addDays;
    App.state.modalOpen = true;
    App.state.editingId = null;
    App.state.form = { name: '', desc: '', type: 'ongoing', start: iso(today), due: iso(addDays(today, 7)), imp: 2, urg: 2, recur: '매월', goalId: '', progress: 0, memo: '' };
    App.actions.rerender();
  },

  openEdit(id) {
    const t = App.state.tasks.find(x => x.id === id);
    if (!t) return;
    App.state.modalOpen = true;
    App.state.editingId = id;
    App.state.form = { name: t.name, desc: t.desc || '', type: t.type, start: t.start, due: t.due, imp: t.imp, urg: t.urg, recur: t.recur || '매월', goalId: t.goalId || '', progress: t.progress, memo: t.memo || '' };
    App.actions.rerender();
  },

  closeModal() { App.state.modalOpen = false; App.actions.rerender(); },
  setForm(k, v) { App.state.form = { ...App.state.form, [k]: v }; App.actions.rerender(); },

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

  deleteTask() {
    const eid = App.state.editingId;
    App.state.tasks = App.state.tasks.filter(t => t.id !== eid);
    App.state.modalOpen = false;
    App.actions.rerender();
    App.firebase.deleteTask(eid).catch(err => notifySaveError('업무 삭제', err));
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
};
