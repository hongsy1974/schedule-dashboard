import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAL4XJVkYLupw02qaZ5opq6pcoDV5C4Oyw",
  authDomain: "plan-7ca08.firebaseapp.com",
  projectId: "plan-7ca08",
  storageBucket: "plan-7ca08.firebasestorage.app",
  messagingSenderId: "815411734752",
  appId: "1:815411734752:web:1567019cd958300d204885"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

function docsToArray(snapshot) {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

function watch(collectionName, stateKey) {
  onSnapshot(collection(db, collectionName), (snapshot) => {
    App.state[stateKey] = docsToArray(snapshot);
    App.actions.rerender();
  }, (err) => {
    console.error(`[firestore] "${collectionName}" 구독 실패:`, err);
  });
}

window.App = window.App || {};
window.App.firebase = {
  init() {
    watch('tasks', 'tasks');
    watch('goals', 'goals');
    watch('rules', 'rules');
  },
  addTask(payload) {
    return addDoc(collection(db, 'tasks'), payload);
  },
  updateTask(id, payload) {
    return updateDoc(doc(db, 'tasks', id), payload);
  },
  deleteTask(id) {
    return deleteDoc(doc(db, 'tasks', id));
  },
  updateRule(id, payload) {
    return updateDoc(doc(db, 'rules', id), payload);
  },
  addGoal(payload) {
    return addDoc(collection(db, 'goals'), payload);
  },
  updateGoal(id, payload) {
    return updateDoc(doc(db, 'goals', id), payload);
  },
  deleteGoal(id) {
    return deleteDoc(doc(db, 'goals', id));
  },
};

App.firebase.init();
