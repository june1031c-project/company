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

  // Portfolio
  renderPortfolio();
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

// ========== Portfolio ==========
var EODHD_API_KEY = '6975d9cad29f05.79877483';

function getPortfolio() {
  var data = localStorage.getItem('portfolio');
  return data ? JSON.parse(data) : [];
}

function savePortfolio(items) {
  localStorage.setItem('portfolio', JSON.stringify(items));
}

function formatKRW(num) {
  return Math.round(num).toLocaleString('ko-KR');
}

function renderPortfolio() {
  var tbody = document.getElementById('portfolio-tbody');
  var tfoot = document.getElementById('portfolio-tfoot');
  var items = getPortfolio();
  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  var totalCost = 0;
  var totalValue = 0;

  items.forEach(function(item, index) {
    var currentVal = (item.currentPrice || 0) * (item.exchangeRate || 0) * item.quantity;
    var costVal = item.buyPrice * item.quantity;
    var profit = currentVal - costVal;
    var profitRate = costVal > 0 ? (profit / costVal) * 100 : 0;

    totalCost += costVal;
    totalValue += currentVal;

    var profitClass = profit >= 0 ? 'positive' : 'negative';
    var profitSign = profit >= 0 ? '+' : '';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + (index + 1) + '</td>' +
      '<td>' + escapeHtml(item.ticker) + '</td>' +
      '<td>' + (item.currentPrice ? '$' + item.currentPrice.toFixed(2) : '-') + '</td>' +
      '<td>' + (item.exchangeRate ? formatKRW(item.exchangeRate) : '-') + '</td>' +
      '<td>' + formatKRW(item.buyPrice) + '</td>' +
      '<td>' + item.quantity + '</td>' +
      '<td>' + (item.currentPrice ? formatKRW(currentVal) : '-') + '</td>' +
      '<td class="' + profitClass + '">' + (item.currentPrice ? profitSign + formatKRW(profit) : '-') + '</td>' +
      '<td class="' + profitClass + '">' + (item.currentPrice ? profitSign + profitRate.toFixed(2) + '%' : '-') + '</td>' +
      '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(' + index + ')">삭제</button></td>';
    tbody.appendChild(tr);
  });

  if (items.length > 0 && totalCost > 0) {
    var totalProfit = totalValue - totalCost;
    var totalRate = (totalProfit / totalCost) * 100;
    var cls = totalProfit >= 0 ? 'positive' : 'negative';
    var sign = totalProfit >= 0 ? '+' : '';

    var tfootTr = document.createElement('tr');
    tfootTr.innerHTML =
      '<td colspan="6" style="text-align:center;">합계</td>' +
      '<td>' + (totalValue > 0 ? formatKRW(totalValue) : '-') + '</td>' +
      '<td class="' + cls + '">' + (totalValue > 0 ? sign + formatKRW(totalProfit) : '-') + '</td>' +
      '<td class="' + cls + '">' + (totalValue > 0 ? sign + totalRate.toFixed(2) + '%' : '-') + '</td>' +
      '<td></td>';
    tfoot.appendChild(tfootTr);
  }
}

function addPortfolio() {
  var ticker = document.getElementById('portfolio-ticker').value.trim().toUpperCase();
  var buyPrice = parseFloat(document.getElementById('portfolio-buy-price').value);
  var quantity = parseFloat(document.getElementById('portfolio-quantity').value);

  if (!ticker) { alert('티커를 입력해주세요.'); return; }
  if (!buyPrice || buyPrice <= 0) { alert('매수가를 입력해주세요.'); return; }
  if (!quantity || quantity <= 0) { alert('수량을 입력해주세요.'); return; }

  var items = getPortfolio();
  items.push({
    ticker: ticker,
    buyPrice: buyPrice,
    quantity: Math.round(quantity * 100) / 100,
    currentPrice: null,
    exchangeRate: null
  });
  savePortfolio(items);
  renderPortfolio();

  document.getElementById('portfolio-ticker').value = '';
  document.getElementById('portfolio-buy-price').value = '';
  document.getElementById('portfolio-quantity').value = '';
}

function deletePortfolio(index) {
  var items = getPortfolio();
  items.splice(index, 1);
  savePortfolio(items);
  renderPortfolio();
}

function refreshPortfolio() {
  var items = getPortfolio();
  if (items.length === 0) { alert('종목을 먼저 추가해주세요.'); return; }

  var btn = document.querySelector('.portfolio-refresh-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 불러오는 중...';

  var rateUrl = 'https://eodhd.com/api/real-time/USDKRW.FOREX?api_token=' + EODHD_API_KEY + '&fmt=json';

  fetch(rateUrl)
    .then(function(res) { return res.json(); })
    .then(function(rateData) {
      var exchangeRate = rateData.close || rateData.previousClose || 0;

      var tickers = [];
      items.forEach(function(item) {
        if (tickers.indexOf(item.ticker) === -1) tickers.push(item.ticker);
      });

      var fetches = tickers.map(function(ticker) {
        var url = 'https://eodhd.com/api/real-time/' + ticker + '.US?api_token=' + EODHD_API_KEY + '&fmt=json';
        return fetch(url).then(function(res) { return res.json(); });
      });

      return Promise.all(fetches).then(function(results) {
        var priceMap = {};
        results.forEach(function(data, i) {
          priceMap[tickers[i]] = data.close || data.previousClose || 0;
        });

        items.forEach(function(item) {
          item.currentPrice = priceMap[item.ticker] || 0;
          item.exchangeRate = exchangeRate;
        });

        savePortfolio(items);
        renderPortfolio();

        var infoEl = document.getElementById('portfolio-rate-info');
        var now = new Date();
        var timeStr = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + ' ' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0');
        infoEl.textContent = '환율: ' + formatKRW(exchangeRate) + '원/$  |  ' + timeStr + ' 업데이트';

        btn.disabled = false;
        btn.textContent = '🔄 시세 업데이트';
      });
    })
    .catch(function(err) {
      alert('시세 조회 실패: ' + err.message);
      btn.disabled = false;
      btn.textContent = '🔄 시세 업데이트';
    });
}

