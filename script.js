import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig } from "./secrets.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let chart;
let allLogs = [];
let currentFilter = "all";


const levelRef = ref(db, "/tank/current");

onValue(levelRef, (snapshot) => {
  const level = Number(snapshot.val()) || 0;

  document.getElementById("fill").style.height = `${level}%`;
  document.getElementById("percent").innerText = `${level}%`;

  let status = "EMPTY";
  let cls = "";

  if (level <= 25) {
    status = "LOW";
    cls = "low";
  } 
  else if (level <= 50) {
    status = "MEDIUM";
    cls = "mid";
  } 
  else if (level <= 75) {
    status = "HIGH";
    cls = "high";
  } 
  else {
    status = "FULL";
    cls = "high";
  }

  const statusEl = document.getElementById("status");
  statusEl.innerText = status;
  statusEl.className = cls;
});


const logsRef = ref(db, "/tank/logs");

onValue(logsRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  allLogs = Object.entries(data)
    .map(([key, value]) => ({
      timestamp: Number(key),
      level: Number(value?.level ?? 0)
    }))
    .filter(x => !isNaN(x.timestamp));

  allLogs.sort((a, b) => a.timestamp - b.timestamp);

  applyFilter(currentFilter);
});


function renderLogs(logs) {
  const logsBody = document.getElementById("logs-body");
  logsBody.innerHTML = "";

  const latestLogs = [...logs].slice(-20).reverse();

  latestLogs.forEach((log) => {
    const dateObj = new Date(log.timestamp * 1000);

    const row = document.createElement("div");
    row.className = "log-item";

    row.innerHTML = `
      <span>${dateObj.toLocaleDateString()}</span>
      <span>${dateObj.toLocaleTimeString()}</span>
      <span>${log.level}%</span>
    `;

    logsBody.appendChild(row);
  });
}


function renderChart(logs) {
  const ctx = document.getElementById("levelChart");

  const latest = logs.slice(-20);

  const labels = latest.map(log =>
    new Date(log.timestamp * 1000).toLocaleTimeString()
  );

  const values = latest.map(log => log.level);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Water Level",
        data: values,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.15)",
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        x: {
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" }
        }
      },
      plugins: {
        legend: {
          labels: { color: "white" }
        }
      }
    }
  });
}


function applyFilter(filter) {
  currentFilter = filter;

  let filtered = [...allLogs];

  if (filter === "low") {
    filtered = allLogs.filter(l => l.level <= 25);
  }

  if (filter === "high") {
    filtered = allLogs.filter(l => l.level >= 75);
  }

  if (filter === "today") {
    const today = new Date().toDateString();

    filtered = allLogs.filter(l =>
      new Date(l.timestamp * 1000).toDateString() === today
    );
  }

  renderLogs(filtered);
  renderChart(filtered);
}


document.querySelectorAll(".filters button")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      applyFilter(btn.dataset.filter);
    });
  });