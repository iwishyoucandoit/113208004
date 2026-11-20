import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const $ = (selector) => document.querySelector(selector);
const authScreen = $("#auth-screen");
const appScreen = $("#app");
const toast = $("#toast");
const selectedDateInput = $("#date-picker");
let auth;
let db;
let currentUser;
let events = [];
let tasks = [];
let unsubscribeEvents;
let unsubscribeTasks;
let toastTimer;
let selectedDate = dateKey(new Date());

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function userCollection(name) {
  return collection(db, "users", currentUser.uid, name);
}

function describeAuthError(error) {
  const messages = {
    "auth/unauthorized-domain": "此網站網域尚未加入 Firebase 授權網域。請依 README 設定 GitHub Pages 網域。",
    "auth/operation-not-allowed": "Firebase 尚未啟用這種登入方式，請檢查 Authentication 設定。",
    "auth/popup-closed-by-user": "登入視窗已關閉。",
    "auth/popup-blocked": "瀏覽器封鎖了登入視窗，請允許彈出視窗後重試。",
    "auth/account-exists-with-different-credential": "這個電子郵件已使用其他登入方式註冊。",
  };
  return messages[error.code] || `登入失敗：${error.message || error.code || "未知錯誤"}`;
}

async function login(provider) {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    showToast(describeAuthError(error));
  }
}

function listenToUserData() {
  unsubscribeEvents?.();
  unsubscribeTasks?.();
  unsubscribeEvents = onSnapshot(userCollection("events"), (snapshot) => {
    events = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    render();
  }, (error) => showToast(`讀取行程失敗：${error.message}`));
  unsubscribeTasks = onSnapshot(userCollection("tasks"), (snapshot) => {
    tasks = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    render();
  }, (error) => showToast(`讀取待辦失敗：${error.message}`));
}

function render() {
  const dayEvents = events
    .filter((event) => event.date === selectedDate)
    .sort((a, b) => a.start.localeCompare(b.start));
  const dayTasks = tasks
    .filter((task) => task.dueDate === selectedDate)
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  const doneCount = dayTasks.filter((task) => task.done).length;
  const totalHours = dayEvents.reduce((sum, event) => {
    const [startHour, startMinute] = event.start.split(":").map(Number);
    const [endHour, endMinute] = event.end.split(":").map(Number);
    return sum + (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
  }, 0);

  $("#event-count").innerHTML = `${dayEvents.length} <small>個安排</small>`;
  $("#task-count").innerHTML = `${doneCount} <small>/ ${dayTasks.length} 已完成</small>`;
  $("#task-progress").textContent = `${doneCount} / ${dayTasks.length}`;
  $("#focus-time").innerHTML = `${Number(totalHours.toFixed(1))} <small>小時</small>`;
  $("#date-label").textContent = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  }).format(new Date(`${selectedDate}T12:00:00`));
  selectedDateInput.value = selectedDate;

  $("#schedule").innerHTML = dayEvents.length ? dayEvents.map((event) => `
    <article class="schedule-item">
      <time class="time">${escapeHtml(event.start)}</time><span class="timeline"><span class="dot"></span></span>
      <div class="event-card"><div class="event-top"><h3 class="event-title">${escapeHtml(event.title)}</h3><span class="event-time">${escapeHtml(event.start)} – ${escapeHtml(event.end)}</span></div>
        <div class="event-meta">${event.location ? `<span>⌖ ${escapeHtml(event.location)}</span>` : ""}<span class="tag">${event.category === "work" ? "工作會議" : "個人安排"}</span><button class="delete-button" type="button" data-delete-event="${escapeHtml(event.id)}">刪除</button></div>
      </div>
    </article>`).join("") : '<p class="empty">這天還沒有行程，新增一筆來安排今天吧。</p>';

  $("#task-list").innerHTML = dayTasks.length ? dayTasks.map((task) => `
    <label class="task ${task.done ? "done" : ""}">
      <input type="checkbox" data-toggle-task="${escapeHtml(task.id)}" ${task.done ? "checked" : ""} aria-label="完成 ${escapeHtml(task.title)}">
      <span class="task-copy"><p class="task-name">${escapeHtml(task.title)}</p><p class="task-due">${escapeHtml(task.detail || "個人 · 今天完成")}</p></span>
      <span class="task-actions"><button class="delete-button" type="button" data-delete-task="${escapeHtml(task.id)}">刪除</button></span>
    </label>`).join("") : '<p class="empty">今天沒有待辦事項，先新增一項吧。</p>';
}

function changeDate(value) {
  if (!value) return;
  selectedDate = value;
  render();
}

$("#previous-day").addEventListener("click", () => {
  const date = new Date(`${selectedDate}T12:00:00`);
  date.setDate(date.getDate() - 1);
  changeDate(dateKey(date));
});
$("#next-day").addEventListener("click", () => {
  const date = new Date(`${selectedDate}T12:00:00`);
  date.setDate(date.getDate() + 1);
  changeDate(dateKey(date));
});
selectedDateInput.addEventListener("change", (event) => changeDate(event.target.value));

$("#add-event").addEventListener("click", () => {
  const form = $("#event-form");
  form.reset();
  $("#event-date").value = selectedDate;
  $("#event-dialog").showModal();
});
$("#cancel-event").addEventListener("click", () => $("#event-dialog").close());
$("#event-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const start = String(form.get("start"));
  const end = String(form.get("end"));
  if (end <= start) return showToast("結束時間必須晚於開始時間");
  try {
    await addDoc(userCollection("events"), {
      title: String(form.get("title")).trim(), date: String(form.get("date")), start, end,
      location: String(form.get("location") || "").trim(), category: String(form.get("category")),
      createdAt: Date.now(),
    });
    $("#event-dialog").close();
    changeDate(String(form.get("date")));
    showToast("行程已新增並同步");
  } catch (error) {
    showToast(`儲存行程失敗：${error.message}`);
  }
});

$("#add-task").addEventListener("click", async () => {
  const title = window.prompt("請輸入待辦事項：");
  if (!title?.trim()) return;
  try {
    await addDoc(userCollection("tasks"), {
      title: title.trim(), dueDate: selectedDate, detail: "個人 · 今天完成", done: false, createdAt: Date.now(),
    });
    showToast("待辦事項已新增並同步");
  } catch (error) {
    showToast(`儲存待辦失敗：${error.message}`);
  }
});

$("#schedule").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-event]");
  if (!button || !window.confirm("確定刪除這筆行程嗎？")) return;
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "events", button.dataset.deleteEvent));
    showToast("已刪除行程");
  } catch (error) {
    showToast(`刪除行程失敗：${error.message}`);
  }
});
$("#task-list").addEventListener("change", async (event) => {
  const input = event.target.closest("[data-toggle-task]");
  if (!input) return;
  try {
    await updateDoc(doc(db, "users", currentUser.uid, "tasks", input.dataset.toggleTask), { done: input.checked });
  } catch (error) {
    showToast(`更新待辦失敗：${error.message}`);
  }
});
$("#task-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-task]");
  if (!button) return;
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "tasks", button.dataset.deleteTask));
    showToast("已刪除待辦事項");
  } catch (error) {
    showToast(`刪除待辦失敗：${error.message}`);
  }
});

if (!isFirebaseConfigured) {
  $("#google-login").disabled = true;
  $("#line-login").disabled = true;
  $("#setup-note").hidden = false;
} else {
  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  const googleButton = $("#google-login");
  const lineButton = $("#line-login");
  googleButton.addEventListener("click", () => login(new GoogleAuthProvider()));
  googleButton.disabled = false;
  lineButton.addEventListener("click", () => {
    const provider = new OAuthProvider("oidc.line");
    provider.addScope("profile");
    provider.addScope("email");
    login(provider);
  });
  lineButton.disabled = false;
  $("#logout").addEventListener("click", () => signOut(auth).catch((error) => showToast(error.message)));
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    authScreen.hidden = Boolean(user);
    appScreen.hidden = !user;
    if (!user) {
      unsubscribeEvents?.();
      unsubscribeTasks?.();
      events = [];
      tasks = [];
      return;
    }
    const displayName = user.displayName || user.email || "使用者";
    $("#user-email").textContent = displayName;
    $("#user-initial").textContent = [...displayName][0] || "我";
    $("#user-initial").hidden = Boolean(user.photoURL);
    $("#user-photo").hidden = !user.photoURL;
    if (user.photoURL) $("#user-photo").src = user.photoURL;
    listenToUserData();
    render();
  });
}
