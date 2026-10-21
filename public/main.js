let currentFilter = 'all';

const listEl = document.getElementById('task-list');
const emptyEl = document.getElementById('empty');
const errorEl = document.getElementById('error');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = !msg;
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadInfo() {
  try {
    const info = await api('/api/info');
    document.getElementById('version').textContent = info.version;
    document.getElementById('hostname').textContent = info.hostname;
  } catch (e) {
    document.getElementById('version').textContent = 'unavailable';
    document.getElementById('hostname').textContent = 'unavailable';
  }
}

async function loadStats() {
  const s = await api('/api/stats');
  document.getElementById('stat-total').textContent = s.total;
  document.getElementById('stat-active').textContent = s.active;
  document.getElementById('stat-done').textContent = s.done;
}

function renderTask(task) {
  const li = document.createElement('li');
  if (task.done) li.classList.add('done');

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = task.done;
  check.addEventListener('change', () => update(task.id, { done: check.checked }));

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;

  const badge = document.createElement('span');
  badge.className = 'badge ' + task.priority;
  badge.textContent = task.priority;

  const del = document.createElement('button');
  del.className = 'delete';
  del.textContent = '\u00d7';
  del.title = 'Delete task';
  del.addEventListener('click', () => remove(task.id));

  li.append(check, title, badge, del);
  return li;
}

async function refresh() {
  try {
    const query = currentFilter === 'all' ? '' : '?status=' + currentFilter;
    const tasks = await api('/api/tasks' + query);
    listEl.replaceChildren(...tasks.map(renderTask));
    emptyEl.hidden = tasks.length > 0;
    await loadStats();
    showError('');
  } catch (e) {
    showError(e.message);
  }
}

async function update(id, changes) {
  try {
    await api('/api/tasks/' + id, { method: 'PATCH', body: JSON.stringify(changes) });
    await refresh();
  } catch (e) {
    showError(e.message);
  }
}

async function remove(id) {
  try {
    await api('/api/tasks/' + id, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    showError(e.message);
  }
}

document.getElementById('task-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const titleInput = document.getElementById('task-title');
  const priority = document.getElementById('task-priority').value;
  try {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: titleInput.value, priority }),
    });
    titleInput.value = '';
    await refresh();
  } catch (e) {
    showError(e.message);
  }
});

document.querySelectorAll('.filters button').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filters button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    refresh();
  });
});

loadInfo();
refresh();
