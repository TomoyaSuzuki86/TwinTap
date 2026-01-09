import { initFirebase, signInAnon } from "./firebase.js";
import {
  addEvent,
  addSession,
  clearUserFamily,
  createFamily,
  getUserFamilyId,
  joinFamily,
  subscribeFamily,
  subscribeSessions,
  updateBabyNames,
} from "./store.js";
import {
  setupUI,
  setRoute,
  setFamilyStatus,
  showToast,
  updateHomeNames,
  updateMeasureView,
  updateSettingsView,
  updateStatsView,
} from "./ui.js";

const state = {
  user: null,
  familyId: null,
  family: null,
  sessions: [],
  statsBaby: "L",
  measure: {
    active: false,
    baby: "L",
    target: 10,
    count: 0,
    startedAt: 0,
    elapsedSec: 0,
    timerId: null,
  },
  unsubscribeFamily: null,
  unsubscribeSessions: null,
};

const { auth, db } = initFirebase();

setupUI({
  onTap: handleTap,
  onMeasureStart: startMeasure,
  onMeasureTap: incrementMeasure,
  onMeasureReset: resetMeasure,
  onMeasureBabyChange: changeMeasureBaby,
  onMeasureTargetChange: changeMeasureTarget,
  onStatsChange: changeStatsBaby,
  onSaveNames: saveNames,
  onCreateFamily: handleCreateFamily,
  onLeaveFamily: handleLeaveFamily,
  onCopyInvite: copyInvite,
  onRouteChange: () => {},
});

boot();

async function boot() {
  state.user = await signInAnon(auth);
  await handleFamilyFromUrl();

  if (!state.familyId) {
    const stored = localStorage.getItem("familyId");
    if (stored) {
      state.familyId = stored;
    } else {
      state.familyId = await getUserFamilyId(db, state.user.uid);
      if (state.familyId) {
        localStorage.setItem("familyId", state.familyId);
      }
    }
  }

  if (state.familyId) {
    subscribeFamilyData();
  }

  renderAll();
  setRoute((location.hash || "#home").replace("#", ""));
}

async function handleFamilyFromUrl() {
  const url = new URL(window.location.href);
  const familyId = url.searchParams.get("family");
  const token = url.searchParams.get("token");
  if (!familyId || !token) return;

  try {
    const data = await joinFamily(db, state.user.uid, familyId, token);
    state.familyId = familyId;
    state.family = data;
    localStorage.setItem("familyId", familyId);
    showToast("家族に参加しました");
  } catch (error) {
    showToast("招待リンクが無効です");
  } finally {
    const cleanBase = window.location.href.split("?")[0].split("#")[0];
    const cleanUrl = `${cleanBase}${url.hash}`;
    history.replaceState({}, "", cleanUrl);
  }
}

function subscribeFamilyData() {
  if (state.unsubscribeFamily) state.unsubscribeFamily();
  if (state.unsubscribeSessions) state.unsubscribeSessions();

  state.unsubscribeFamily = subscribeFamily(db, state.familyId, (data) => {
    state.family = data;
    updateHomeNames(data.babyNames);
    updateSettingsView({
      names: data.babyNames,
      familyCode: data.familyCode,
      inviteLink: buildInviteLink(state.familyId, data.joinToken),
    });
  });

  state.unsubscribeSessions = subscribeSessions(db, state.familyId, (sessions) => {
    state.sessions = sessions;
    updateStats();
  });
}

async function handleCreateFamily() {
  try {
    const result = await createFamily(db, state.user.uid);
    state.familyId = result.familyId;
    localStorage.setItem("familyId", result.familyId);
    subscribeFamilyData();
    setFamilyStatus(true);
    showToast("家族を作成しました");
  } catch (error) {
    showToast("家族の作成に失敗しました");
  }
}

async function handleLeaveFamily() {
  if (!confirm("この端末を家族から外しますか？")) return;
  try {
    await clearUserFamily(db, state.user.uid);
    localStorage.removeItem("familyId");
    state.familyId = null;
    state.family = null;
    state.sessions = [];
    if (state.unsubscribeFamily) state.unsubscribeFamily();
    if (state.unsubscribeSessions) state.unsubscribeSessions();
    renderAll();
    showToast("端末を外しました");
  } catch (error) {
    showToast("処理に失敗しました");
  }
}

async function handleTap(baby) {
  if (!state.familyId) return;
  try {
    await addEvent(db, state.familyId, baby, state.user.uid);
    showToast("記録しました");
  } catch (error) {
    showToast("記録に失敗しました");
  }
}

function startMeasure() {
  if (!state.familyId || state.measure.active) return;
  state.measure.active = true;
  state.measure.startedAt = Date.now();
  state.measure.count = 0;
  state.measure.elapsedSec = 0;
  if (state.measure.timerId) clearInterval(state.measure.timerId);
  state.measure.timerId = setInterval(() => {
    state.measure.elapsedSec = Math.floor((Date.now() - state.measure.startedAt) / 1000);
    updateMeasure();
  }, 500);
  updateMeasure();
}

function incrementMeasure() {
  if (!state.measure.active) return;
  state.measure.count += 1;
  if (state.measure.count >= state.measure.target) {
    finishMeasure();
  } else {
    updateMeasure();
  }
}

function resetMeasure() {
  if (!state.measure.active) return;
  if (!confirm("計測を中止しますか？")) return;
  stopMeasureTimer();
  state.measure.active = false;
  state.measure.count = 0;
  state.measure.elapsedSec = 0;
  updateMeasure();
}

function changeMeasureBaby(value) {
  state.measure.baby = value;
  updateMeasure();
}

function changeMeasureTarget(value) {
  state.measure.target = Math.max(1, Math.min(50, value || 10));
  updateMeasure();
}

async function finishMeasure() {
  stopMeasureTimer();
  const endedAt = Date.now();
  const durationSec = Math.max(1, Math.floor((endedAt - state.measure.startedAt) / 1000));
  const session = {
    startedAt: state.measure.startedAt,
    endedAt,
    durationSec,
    targetCount: state.measure.target,
    baby: state.measure.baby,
  };

  state.measure.active = false;
  state.measure.count = 0;
  state.measure.elapsedSec = 0;
  updateMeasure();

  try {
    await addSession(db, state.familyId, session, state.user.uid);
    showToast("計測を保存しました");
  } catch (error) {
    showToast("計測の保存に失敗しました");
  }
}

function stopMeasureTimer() {
  if (state.measure.timerId) {
    clearInterval(state.measure.timerId);
    state.measure.timerId = null;
  }
}

function changeStatsBaby(baby) {
  state.statsBaby = baby;
  updateStats();
}

async function saveNames(names) {
  if (!state.familyId) return;
  if (!names.left || !names.right) {
    showToast("名前を入力してください");
    return;
  }
  try {
    await updateBabyNames(db, state.familyId, names);
    showToast("名前を更新しました");
  } catch (error) {
    showToast("更新に失敗しました");
  }
}

function copyInvite() {
  const inviteText = document.getElementById("invite-link").textContent;
  if (!inviteText || inviteText === "--") return;
  navigator.clipboard.writeText(inviteText).then(
    () => showToast("コピーしました"),
    () => showToast("コピーできませんでした")
  );
}

function updateMeasure() {
  updateMeasureView({
    hasFamily: Boolean(state.familyId),
    active: state.measure.active,
    baby: state.measure.baby,
    target: state.measure.target,
    count: state.measure.count,
    elapsedLabel: formatElapsed(state.measure.elapsedSec),
  });
}

function updateStats() {
  const filtered = state.sessions.filter(
    (session) => session.baby === state.statsBaby || session.baby === "U"
  );
  const lastSeven = filtered.slice(0, 7);
  const todaySession = filtered.find((session) => isSameDay(session.endedAt));
  const durations = filtered.map((session) => session.durationSec);

  const todayLabel = todaySession ? formatDuration(todaySession.durationSec) : "--";
  const avgLabel = lastSeven.length
    ? formatDuration(Math.round(average(lastSeven.map((s) => s.durationSec))))
    : "--";
  const rangeLabel = durations.length
    ? `${formatDuration(Math.min(...durations))} / ${formatDuration(Math.max(...durations))}`
    : "--";

  updateStatsView({
    todayLabel,
    avgLabel,
    rangeLabel,
    activeBaby: state.statsBaby,
    chartSessions: lastSeven.slice().reverse(),
    chartColors: {
      baseColor: "#d16666",
      unknownColor: "#b7b0a4",
    },
  });
}

function renderAll() {
  setFamilyStatus(Boolean(state.familyId));
  updateHomeNames(state.family?.babyNames || { left: "いのちゃん", right: "ふーちゃん" });
  updateMeasure();
  updateStats();
  updateSettingsView({
    names: state.family?.babyNames || { left: "いのちゃん", right: "ふーちゃん" },
    familyCode: state.family?.familyCode || "--",
    inviteLink: state.familyId && state.family?.joinToken ? buildInviteLink(state.familyId, state.family.joinToken) : "--",
  });
}

function average(list) {
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

function isSameDay(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function buildInviteLink(familyId, token) {
  const base = window.location.href.split("?")[0].split("#")[0];
  return `${base}?family=${familyId}&token=${token}#settings`;
}

