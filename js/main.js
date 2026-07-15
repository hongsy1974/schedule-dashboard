(function () {
  const root = document.getElementById('app');

  function render() {
    return App.renderApp(App.computeViewModel(App.state));
  }

  function captureFocus() {
    const el = document.activeElement;
    if (!el || !root.contains(el) || !el.id) return null;
    return {
      id: el.id,
      start: ('selectionStart' in el) ? el.selectionStart : null,
      end: ('selectionEnd' in el) ? el.selectionEnd : null,
    };
  }

  function restoreFocus(info) {
    if (!info) return;
    const el = root.querySelector('#' + CSS.escape(info.id));
    if (!el) return;
    el.focus();
    if (info.start != null && el.setSelectionRange) {
      try { el.setSelectionRange(info.start, info.end); } catch (e) { /* not a text-selectable input */ }
    }
  }

  // Tracks whether an IME composition (e.g. building a Korean syllable block) is
  // in progress anywhere in the app. This has to be a global flag, not just a
  // guard inside the 'input' handler below: Firestore's onSnapshot listeners
  // (js/firebaseClient.js) call App.actions.rerender() directly whenever data
  // changes remotely, on their own schedule, completely bypassing any per-input
  // event handling. If that rerender lands mid-composition it recreates the
  // <input> DOM node and aborts the composition, wiping out everything typed
  // since the last commit. So rerender() itself has to refuse to run while
  // composing=true; the browser always fires a final 'input' event right after
  // compositionend, which reaches the normal setForm()->rerender() path once
  // composing is back to false, so nothing is lost — it's just deferred.
  let composing = false;
  root.addEventListener('compositionstart', () => { composing = true; });
  root.addEventListener('compositionend', () => { composing = false; });

  function rerender() {
    if (composing) return;
    const focusInfo = captureFocus();
    root.innerHTML = render();
    restoreFocus(focusInfo);
  }

  App.actions.rerender = rerender;

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    switch (action) {
      case 'setView': App.actions.setView(el.dataset.value); break;
      case 'prevWeek': App.actions.prevWeek(); break;
      case 'nextWeek': App.actions.nextWeek(); break;
      case 'thisWeek': App.actions.thisWeek(); break;
      case 'prevMonth': App.actions.prevMonth(); break;
      case 'nextMonth': App.actions.nextMonth(); break;
      case 'thisMonth': App.actions.thisMonth(); break;
      case 'openNew': App.actions.openNew(); break;
      case 'openEdit': App.actions.openEdit(el.dataset.id); break;
      case 'closeModal': App.actions.closeModal(); break;
      case 'saveTask': App.actions.saveTask(); break;
      case 'deleteTask': App.actions.deleteTask(); break;
      case 'setFilterType': App.actions.setFilter('filterType', el.dataset.value); break;
      case 'setFilterStatus': App.actions.setFilter('filterStatus', el.dataset.value); break;
      case 'toggleRule': App.actions.toggleRule(el.dataset.id); break;
      case 'setImp': App.actions.setForm('imp', +el.dataset.value); break;
      case 'setUrg': App.actions.setForm('urg', +el.dataset.value); break;
      case 'openNewGoal': App.actions.openNewGoal(); break;
      case 'openEditGoal': App.actions.openEditGoal(el.dataset.id); break;
      case 'closeGoalModal': App.actions.closeGoalModal(); break;
      case 'saveGoal': App.actions.saveGoal(); break;
      case 'deleteGoal': App.actions.deleteGoal(); break;
    }
  });

  root.addEventListener('change', (e) => {
    const el = e.target, action = el.dataset.action;
    if (!action) return;
    if (action === 'setSort') App.actions.setSort(el.value);
    else if (action === 'setRowProgress') App.actions.setProgress(el.dataset.id, +el.value);
    else if (action === 'setRowStatus') App.actions.setStatus(el.dataset.id, el.value);
    else if (action === 'fType') App.actions.setForm('type', el.value);
    else if (action === 'fGoal') App.actions.setForm('goalId', el.value);
    else if (action === 'fRecur') App.actions.setForm('recur', el.value);
  });

  root.addEventListener('input', (e) => {
    // Skip mid-composition keystrokes (e.g. Korean IME building a syllable block).
    // Re-rendering the whole DOM on every jamo would recreate the <input> element
    // and abort the browser's composition session, splitting the syllable apart.
    if (e.isComposing) return;
    const el = e.target, action = el.dataset.action;
    if (!action) return;
    if (action === 'fName') App.actions.setForm('name', el.value);
    else if (action === 'fDesc') App.actions.setForm('desc', el.value);
    else if (action === 'fStart') App.actions.setForm('start', el.value);
    else if (action === 'fDue') App.actions.setForm('due', el.value);
    else if (action === 'fProg') App.actions.setForm('progress', +el.value);
    else if (action === 'fMemo') App.actions.setForm('memo', el.value);
    else if (action === 'gfName') App.actions.setGoalForm('name', el.value);
    else if (action === 'gfYear') App.actions.setGoalForm('year', +el.value);
  });

  rerender();
})();
