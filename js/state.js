// Placeholder until js/firebaseClient.js (an ES module, loaded separately) finishes
// initializing and overwrites this with the real implementation. Keeps App.firebase.x(...)
// from throwing a raw TypeError if that module hasn't loaded yet (or fails to load at all).
App.firebase = {
  init() {},
  addTask: () => Promise.reject(new Error('Firebase가 아직 초기화되지 않았습니다')),
  updateTask: () => Promise.reject(new Error('Firebase가 아직 초기화되지 않았습니다')),
  deleteTask: () => Promise.reject(new Error('Firebase가 아직 초기화되지 않았습니다')),
  updateRule: () => Promise.reject(new Error('Firebase가 아직 초기화되지 않았습니다')),
  addGoal: () => Promise.reject(new Error('Firebase가 아직 초기화되지 않았습니다')),
  updateGoal: () => Promise.reject(new Error('Firebase가 아직 초기화되지 않았습니다')),
  deleteGoal: () => Promise.reject(new Error('Firebase가 아직 초기화되지 않았습니다')),
};

App.today = (function () {
  const T = new Date();
  T.setHours(0, 0, 0, 0);
  return T;
})();

App.state = {
  view: 'home', weekOffset: 0, monthOffset: 0,
  modalOpen: false, editingId: null, form: null,
  goalModalOpen: false, editingGoalId: null, goalForm: null,
  filterType: 'all', filterStatus: 'all', sortBy: 'score',
  goals: [],
  rules: [],
  tasks: [],
  googleSyncing: false, googleLastSyncAt: null,
};
