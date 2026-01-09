import { drawSessionChart } from "./charts.js";

const routes = ["home", "measure", "stats", "settings"];

export function setupUI(handlers) {
  const navLinks = document.querySelectorAll(".nav a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  window.addEventListener("hashchange", () => {
    const route = getRoute();
    setRoute(route);
    handlers.onRouteChange(route);
  });

  document.getElementById("btn-left").addEventListener("click", () => {
    handlers.onTap("L");
  });
  document.getElementById("btn-right").addEventListener("click", () => {
    handlers.onTap("R");
  });

  document.getElementById("measure-start").addEventListener("click", () => {
    handlers.onMeasureStart();
  });
  document.getElementById("measure-tap").addEventListener("click", () => {
    handlers.onMeasureTap();
  });
  document.getElementById("measure-undo").addEventListener("click", () => {
    handlers.onMeasureUndo();
  });
  document.getElementById("measure-reset").addEventListener("click", () => {
    handlers.onMeasureReset();
  });
  document.getElementById("measure-target").addEventListener("change", (event) => {
    handlers.onMeasureTargetChange(Number(event.target.value));
  });
  document.querySelectorAll("input[name='measure-baby']").forEach((radio) => {
    radio.addEventListener("change", (event) => {
      handlers.onMeasureBabyChange(event.target.value);
    });
  });

  document.getElementById("stats-left").addEventListener("click", () => {
    handlers.onStatsChange("L");
  });
  document.getElementById("stats-right").addEventListener("click", () => {
    handlers.onStatsChange("R");
  });

  document.getElementById("save-names").addEventListener("click", () => {
    const left = document.getElementById("name-left").value.trim();
    const right = document.getElementById("name-right").value.trim();
    handlers.onSaveNames({ left, right });
  });
  document.getElementById("create-family").addEventListener("click", () => {
    handlers.onCreateFamily();
  });
  document.getElementById("leave-family").addEventListener("click", () => {
    handlers.onLeaveFamily();
  });
  document.getElementById("clear-sessions").addEventListener("click", () => {
    handlers.onClearSessions();
  });
  document.getElementById("copy-invite").addEventListener("click", () => {
    handlers.onCopyInvite();
  });

  setRoute(getRoute());
}

export function setRoute(route) {
  const target = routes.includes(route) ? route : "home";
  document.querySelectorAll(".view").forEach((view) => {
    const active = view.getAttribute("data-route") === target;
    view.classList.toggle("active", active);
  });
  document.querySelectorAll(".nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-route") === target);
  });
}

export function updateHomeNames(names) {
  if (!names) return;
  document.getElementById("btn-left").textContent = names.left;
  document.getElementById("btn-right").textContent = names.right;
  document.getElementById("label-left").textContent = names.left;
  document.getElementById("label-right").textContent = names.right;
  document.getElementById("stats-left").textContent = names.left;
  document.getElementById("stats-right").textContent = names.right;
}

export function setFamilyStatus(hasFamily) {
  const disabled = !hasFamily;
  ["btn-left", "btn-right"].forEach((id) => {
    document.getElementById(id).disabled = disabled;
  });
  document.getElementById("family-panel").style.display = hasFamily ? "block" : "none";
  document.getElementById("family-create").style.display = hasFamily ? "none" : "block";
  document.getElementById("home-hint").textContent = hasFamily
    ? ""
    : "家族を作成すると記録を開始できます。";
}

export function updateMeasureView(state) {
  document.getElementById("measure-elapsed").textContent = state.elapsedLabel;
  document.getElementById("measure-count").textContent = `${state.count}/${state.target}`;
  document.getElementById("measure-start").disabled = !state.hasFamily || state.active;
  document.getElementById("measure-tap").disabled = !state.hasFamily || !state.active;
  document.getElementById("measure-undo").disabled = !state.hasFamily || !state.active || !state.canUndo;
  document.getElementById("measure-reset").disabled = !state.hasFamily || !state.active;

  document.querySelectorAll("input[name='measure-baby']").forEach((radio) => {
    radio.disabled = !state.hasFamily || state.active;
    radio.checked = radio.value === state.baby;
  });

  const targetInput = document.getElementById("measure-target");
  targetInput.disabled = !state.hasFamily || state.active;
  targetInput.value = state.target;
}

export function updateStatsView(payload) {
  document.getElementById("stat-today").textContent = payload.todayLabel;
  document.getElementById("stat-avg").textContent = payload.avgLabel;
  document.getElementById("stat-range").textContent = payload.rangeLabel;

  document.getElementById("stats-left").classList.toggle("active", payload.activeBaby === "L");
  document.getElementById("stats-right").classList.toggle("active", payload.activeBaby === "R");

  const canvas = document.getElementById("stats-chart");
  drawSessionChart(canvas, payload.chartSessions, payload.chartColors);

  const list = document.getElementById("stats-sessions");
  list.innerHTML = "";
  if (!payload.listItems.length) {
    list.innerHTML = "<div class=\"hint\">記録がありません</div>";
    return;
  }

  payload.listItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "session-row";

    const meta = document.createElement("div");
    meta.className = "session-meta";
    const title = document.createElement("div");
    title.className = "session-duration";
    title.textContent = item.durationLabel;
    const sub = document.createElement("div");
    sub.textContent = item.metaLabel;
    meta.appendChild(title);
    meta.appendChild(sub);

    const del = document.createElement("button");
    del.className = "session-delete";
    del.textContent = "削除";
    del.addEventListener("click", () => item.onDelete());

    row.appendChild(meta);
    row.appendChild(del);
    list.appendChild(row);
  });
}

export function updateSettingsView(payload) {
  document.getElementById("name-left").value = payload.names.left || "";
  document.getElementById("name-right").value = payload.names.right || "";
  document.getElementById("family-code").textContent = payload.familyCode || "--";
  document.getElementById("invite-link").textContent = payload.inviteLink || "--";
}

export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1600);
}

function getRoute() {
  return (location.hash || "#home").replace("#", "");
}

