let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function save() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function initFilters() {
  const year = document.getElementById("yearFilter");
  const month = document.getElementById("monthFilter");

  const currentYear = new Date().getFullYear();

  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    year.innerHTML += `<option value="${i}">${i}</option>`;
  }

  for (let i = 0; i < 12; i++) {
    month.innerHTML += `<option value="${i}">${i + 1}</option>`;
  }

  year.value = currentYear;
  month.value = new Date().getMonth();

  year.onchange = render;
  month.onchange = render;
}

function addTask() {
  const name = document.getElementById("taskName").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  if (!name) return;

  tasks.push({
    id: Date.now(),
    name,
    start,
    end,
    progress: 0,
    subtasks: [],
    done: false
  });

  save();
  render();
}

function addSubtask(taskId) {
  const name = prompt("Nome da subtask:");
  if (!name) return;

  const task = tasks.find(t => t.id === taskId);
  task.subtasks.push({ name, done: false });

  updateProgress(task);
  save();
  render();
}

function toggleSubtask(taskId, index) {
  const task = tasks.find(t => t.id === taskId);
  task.subtasks[index].done = !task.subtasks[index].done;

  updateProgress(task);
  save();
  render();
}

function updateProgress(task) {
  if (task.subtasks.length === 0) return;

  const done = task.subtasks.filter(s => s.done).length;
  task.progress = Math.round((done / task.subtasks.length) * 100);

  task.done = task.progress === 100;
}

function getExpectedProgress(task) {
  const now = new Date();
  const start = new Date(task.start);
  const end = new Date(task.end);

  if (now < start) return 0;
  if (now > end) return 100;

  const total = end - start;
  const elapsed = now - start;

  return Math.round((elapsed / total) * 100);
}

function getStatus(task) {
  const expected = getExpectedProgress(task);

  if (task.done) return "status-done";
  if (task.progress === 0) return "status-not-started";
  if (task.progress < expected) return "status-delayed";

  return "status-progress";
}

function render() {
  const container = document.getElementById("taskContainer");
  const year = document.getElementById("yearFilter").value;
  const month = document.getElementById("monthFilter").value;

  container.innerHTML = "";

  tasks.forEach(task => {
    const taskDate = new Date(task.start);

    if (taskDate.getFullYear() != year || taskDate.getMonth() != month) return;

    const statusClass = getStatus(task);
    const expected = getExpectedProgress(task);

    const div = document.createElement("div");
    div.className = `task ${statusClass}`;

    div.innerHTML = `
      <div class="task-header">
        <div>
          <strong>${task.name}</strong><br>
          ${task.start} → ${task.end}
        </div>
        <div>
          ${task.progress}% / esperado ${expected}%
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress" style="width:${task.progress}%"></div>
      </div>

      <button onclick="addSubtask(${task.id})">+ Subtask</button>

      <div class="subtasks">
        ${task.subtasks.map((s, i) => `
          <div>
            <input type="checkbox" ${s.done ? "checked" : ""} 
              onclick="toggleSubtask(${task.id}, ${i})">
            ${s.name}
          </div>
        `).join("")}
      </div>
    `;

    container.appendChild(div);
  });
}

initFilters();
render();