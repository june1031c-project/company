// Login credentials
const USERS = {
  'june1031c': { password: 'june1031c', role: 'admin', label: 'Admin' },
  'ewp': { password: 'ewp', role: 'user', label: 'User' }
};

function handleLogin(event) {
  event.preventDefault();
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;
  const errorEl = document.getElementById('login-error');

  const user = USERS[id];
  if (user && user.password === pw) {
    sessionStorage.setItem('loginRole', user.role);
    sessionStorage.setItem('loginUser', id);
    errorEl.textContent = '';
    initApp();
  } else {
    errorEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
  }
  return false;
}

function handleLogout() {
  sessionStorage.removeItem('loginRole');
  sessionStorage.removeItem('loginUser');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
  document.body.classList.remove('readonly');
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
}

function initApp() {
  const role = sessionStorage.getItem('loginRole');
  if (!role) return;

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';

  const userId = sessionStorage.getItem('loginUser');
  const user = USERS[userId];
  document.getElementById('user-role-label').textContent =
    (user ? user.label : role) + ' Mode';

  if (role === 'user') {
    document.body.classList.add('readonly');
  } else {
    document.body.classList.remove('readonly');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Check existing session
  if (sessionStorage.getItem('loginRole')) {
    initApp();
  }

  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  const contentSections = document.querySelectorAll('.content-section');
  const mainTitle = document.getElementById('main-title');

  function showSection(sectionId) {
    // Deactivate all sections and links
    contentSections.forEach(section => {
      section.classList.remove('active');
    });
    sidebarLinks.forEach(link => {
      link.classList.remove('active');
    });

    // Activate the selected section and link
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
      activeSection.classList.add('active');
    }
    const activeLink = document.querySelector(`.sidebar-nav a[data-section="${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      // Update the main title
      mainTitle.textContent = activeLink.textContent.replace(activeLink.querySelector('span').textContent, '').trim();
    }
  }

  // Add event listeners to sidebar links
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default anchor behavior
      // Find the link element even if the click is on a child (like the span)
      const targetLink = event.target.closest('a');
      if(targetLink) {
          const sectionId = targetLink.dataset.section;
          showSection(sectionId);
      }
    });
  });

  // Show the dashboard section by default on load
  showSection('dashboard');

  // To-Do functionality
  loadTodos();
});

var todoSortKey = 'endDate';

function getTodos() {
  const data = localStorage.getItem('todos');
  return data ? JSON.parse(data) : [];
}

function saveTodos(todos) {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function sortTodos(field) {
  todoSortKey = field;
  renderTodos();
}

function renderTodos() {
  const tbody = document.getElementById('todo-tbody');
  const todos = getTodos();

  // Build indexed list to keep original index for delete/toggle
  var sorted = todos.map(function(todo, i) { return { todo: todo, origIndex: i }; });
  sorted.sort(function(a, b) {
    var va = a.todo[todoSortKey] || '';
    var vb = b.todo[todoSortKey] || '';
    if (va === '-') va = '';
    if (vb === '-') vb = '';
    return va.localeCompare(vb);
  });

  // Update header indicators
  var thStart = document.getElementById('th-start-date');
  var thEnd = document.getElementById('th-end-date');
  thStart.textContent = '시작일자' + (todoSortKey === 'startDate' ? ' ▼' : '');
  thEnd.textContent = '완료일자' + (todoSortKey === 'endDate' ? ' ▼' : '');

  tbody.innerHTML = '';
  sorted.forEach(function(item, displayIndex) {
    var todo = item.todo;
    var origIndex = item.origIndex;
    var tr = document.createElement('tr');
    if (todo.completed) {
      tr.classList.add('completed');
    }
    tr.innerHTML =
      '<td>' + (displayIndex + 1) + '</td>' +
      '<td>' + todo.startDate + '</td>' +
      '<td>' + todo.endDate + '</td>' +
      '<td>' + escapeHtml(todo.detail) + '</td>' +
      '<td><input type="checkbox" ' + (todo.completed ? 'checked' : '') + ' onchange="toggleComplete(' + origIndex + ')" /></td>' +
      '<td><button class="todo-delete-btn" onclick="deleteTodo(' + origIndex + ')">삭제</button></td>';
    tbody.appendChild(tr);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addTodo() {
  const startDate = document.getElementById('todo-start-date').value;
  const endDate = document.getElementById('todo-end-date').value;
  const detail = document.getElementById('todo-detail').value.trim();

  if (!detail) {
    alert('세부내용을 입력해주세요.');
    return;
  }

  const todos = getTodos();
  todos.push({
    startDate: startDate || '-',
    endDate: endDate || '-',
    detail: detail,
    completed: false
  });
  saveTodos(todos);
  renderTodos();

  // Clear inputs
  document.getElementById('todo-start-date').value = '';
  document.getElementById('todo-end-date').value = '';
  document.getElementById('todo-detail').value = '';
}

function deleteTodo(index) {
  const todos = getTodos();
  todos.splice(index, 1);
  saveTodos(todos);
  renderTodos();
}

function toggleComplete(index) {
  const todos = getTodos();
  todos[index].completed = !todos[index].completed;
  saveTodos(todos);
  renderTodos();
}

function loadTodos() {
  renderTodos();
}

