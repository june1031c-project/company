document.addEventListener('DOMContentLoaded', () => {
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

function getTodos() {
  const data = localStorage.getItem('todos');
  return data ? JSON.parse(data) : [];
}

function saveTodos(todos) {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
  const tbody = document.getElementById('todo-tbody');
  const todos = getTodos();
  tbody.innerHTML = '';
  todos.forEach((todo, index) => {
    const tr = document.createElement('tr');
    if (todo.completed) {
      tr.classList.add('completed');
    }
    tr.innerHTML =
      '<td>' + (index + 1) + '</td>' +
      '<td>' + todo.startDate + '</td>' +
      '<td>' + todo.endDate + '</td>' +
      '<td>' + escapeHtml(todo.detail) + '</td>' +
      '<td><input type="checkbox" ' + (todo.completed ? 'checked' : '') + ' onchange="toggleComplete(' + index + ')" /></td>' +
      '<td><button class="todo-delete-btn" onclick="deleteTodo(' + index + ')">삭제</button></td>';
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

