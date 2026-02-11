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
var portfolioEditIndex = -1;

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
    var isUS = item.market === 'US';
    var currentVal;
    if (isUS) {
      currentVal = (item.currentPrice || 0) * (item.exchangeRate || 0) * item.quantity;
    } else {
      currentVal = (item.currentPrice || 0) * item.quantity;
    }
    var costVal = item.buyPrice * item.quantity;
    var profit = currentVal - costVal;
    var profitRate = costVal > 0 ? (profit / costVal) * 100 : 0;
    var hasPrice = item.currentPrice != null && item.currentPrice > 0;

    totalCost += costVal;
    if (hasPrice) totalValue += currentVal;

    var profitClass = profit >= 0 ? 'positive' : 'negative';
    var profitSign = profit >= 0 ? '+' : '';

    var priceDisplay = '-';
    if (hasPrice) {
      priceDisplay = isUS ? '$' + item.currentPrice.toFixed(2) : formatKRW(item.currentPrice) + '원';
    }
    var rateDisplay = isUS ? (item.exchangeRate ? formatKRW(item.exchangeRate) : '-') : '-';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + (index + 1) + '</td>' +
      '<td>' + escapeHtml(item.category || '-') + '</td>' +
      '<td>' + (item.market || 'US') + '</td>' +
      '<td>' + escapeHtml(item.ticker) + '</td>' +
      '<td>' + escapeHtml(item.name || '-') + '</td>' +
      '<td>' + priceDisplay + '</td>' +
      '<td>' + rateDisplay + '</td>' +
      '<td>' + formatKRW(item.buyPrice) + '</td>' +
      '<td>' + item.quantity + '</td>' +
      '<td>' + (hasPrice ? formatKRW(currentVal) : '-') + '</td>' +
      '<td class="' + profitClass + '">' + (hasPrice ? profitSign + formatKRW(profit) : '-') + '</td>' +
      '<td class="' + profitClass + '">' + (hasPrice ? profitSign + profitRate.toFixed(2) + '%' : '-') + '</td>' +
      '<td><button class="portfolio-edit-btn" onclick="editPortfolio(' + index + ')">수정</button></td>' +
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
      '<td colspan="9" style="text-align:center;">합계</td>' +
      '<td>' + (totalValue > 0 ? formatKRW(totalValue) : '-') + '</td>' +
      '<td class="' + cls + '">' + (totalValue > 0 ? sign + formatKRW(totalProfit) : '-') + '</td>' +
      '<td class="' + cls + '">' + (totalValue > 0 ? sign + totalRate.toFixed(2) + '%' : '-') + '</td>' +
      '<td></td><td></td>';
    tfoot.appendChild(tfootTr);
  }
}

function addPortfolio() {
  var category = document.getElementById('portfolio-category').value.trim();
  var market = document.getElementById('portfolio-market').value;
  var ticker = document.getElementById('portfolio-ticker').value.trim().toUpperCase();
  var buyPrice = parseFloat(document.getElementById('portfolio-buy-price').value);
  var quantity = parseFloat(document.getElementById('portfolio-quantity').value);

  if (!ticker) { alert('티커를 입력해주세요.'); return; }
  if (!buyPrice || buyPrice <= 0) { alert('매수가를 입력해주세요.'); return; }
  if (!quantity || quantity <= 0) { alert('수량을 입력해주세요.'); return; }

  var items = getPortfolio();

  if (portfolioEditIndex >= 0) {
    items[portfolioEditIndex].category = category || '-';
    items[portfolioEditIndex].market = market;
    items[portfolioEditIndex].ticker = ticker;
    items[portfolioEditIndex].buyPrice = buyPrice;
    items[portfolioEditIndex].quantity = Math.round(quantity * 100) / 100;
    portfolioEditIndex = -1;
    document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
    var cancelBtn = document.getElementById('portfolio-cancel-btn');
    if (cancelBtn) cancelBtn.remove();
  } else {
    items.push({
      category: category || '-',
      market: market,
      ticker: ticker,
      buyPrice: buyPrice,
      quantity: Math.round(quantity * 100) / 100,
      currentPrice: null,
      exchangeRate: null
    });
  }

  savePortfolio(items);
  renderPortfolio();

  document.getElementById('portfolio-category').value = '';
  document.getElementById('portfolio-market').value = 'US';
  document.getElementById('portfolio-ticker').value = '';
  document.getElementById('portfolio-buy-price').value = '';
  document.getElementById('portfolio-quantity').value = '';
}

function editPortfolio(index) {
  var items = getPortfolio();
  var item = items[index];
  portfolioEditIndex = index;

  document.getElementById('portfolio-category').value = item.category || '';
  document.getElementById('portfolio-market').value = item.market || 'US';
  document.getElementById('portfolio-ticker').value = item.ticker;
  document.getElementById('portfolio-buy-price').value = item.buyPrice;
  document.getElementById('portfolio-quantity').value = item.quantity;

  var addBtn = document.querySelector('.portfolio-form .todo-add-btn');
  addBtn.textContent = '저장';

  if (!document.getElementById('portfolio-cancel-btn')) {
    var cancelBtn = document.createElement('button');
    cancelBtn.id = 'portfolio-cancel-btn';
    cancelBtn.className = 'portfolio-cancel-btn';
    cancelBtn.textContent = '취소';
    cancelBtn.type = 'button';
    cancelBtn.onclick = cancelEditPortfolio;
    addBtn.parentNode.appendChild(cancelBtn);
  }
}

function cancelEditPortfolio() {
  portfolioEditIndex = -1;
  document.getElementById('portfolio-category').value = '';
  document.getElementById('portfolio-market').value = 'US';
  document.getElementById('portfolio-ticker').value = '';
  document.getElementById('portfolio-buy-price').value = '';
  document.getElementById('portfolio-quantity').value = '';
  document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
  var cancelBtn = document.getElementById('portfolio-cancel-btn');
  if (cancelBtn) cancelBtn.remove();
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

  var hasUS = items.some(function(item) { return item.market === 'US'; });

  // Fetch exchange rate only if there are US stocks
  var ratePromise;
  if (hasUS) {
    var rateUrl = 'https://eodhd.com/api/real-time/USDKRW.FOREX?api_token=' + EODHD_API_KEY + '&fmt=json';
    ratePromise = fetch(rateUrl).then(function(res) { return res.json(); });
  } else {
    ratePromise = Promise.resolve(null);
  }

  ratePromise
    .then(function(rateData) {
      var exchangeRate = rateData ? (rateData.close || rateData.previousClose || 0) : 0;

      // Collect unique ticker+market combos
      var tickerKeys = [];
      var tickerList = [];
      items.forEach(function(item) {
        var key = item.ticker + '.' + (item.market || 'US');
        if (tickerKeys.indexOf(key) === -1) {
          tickerKeys.push(key);
          tickerList.push({ ticker: item.ticker, market: item.market || 'US' });
        }
      });

      // Fetch prices
      var priceFetches = tickerList.map(function(t) {
        var suffix = t.market === 'KR' ? '.KO' : '.US';
        var url = 'https://eodhd.com/api/real-time/' + t.ticker + suffix + '?api_token=' + EODHD_API_KEY + '&fmt=json';
        return fetch(url).then(function(res) { return res.json(); });
      });

      // Fetch names (for items without a valid name)
      var needName = tickerList.filter(function(t) {
        return !items.some(function(item) {
          return item.ticker === t.ticker && item.market === t.market && item.name && item.name !== item.ticker;
        });
      });
      var nameFetches = needName.map(function(t) {
        var url = 'https://eodhd.com/api/search/' + t.ticker + '?api_token=' + EODHD_API_KEY + '&fmt=json';
        return fetch(url).then(function(res) { return res.json(); });
      });

      return Promise.all([Promise.all(priceFetches), Promise.all(nameFetches)]).then(function(allResults) {
        var priceResults = allResults[0];
        var nameResults = allResults[1];

        var priceMap = {};
        priceResults.forEach(function(data, i) {
          var key = tickerList[i].ticker + '.' + tickerList[i].market;
          priceMap[key] = data.close || data.previousClose || 0;
        });

        var nameMap = {};
        nameResults.forEach(function(data, i) {
          var t = needName[i];
          if (Array.isArray(data)) {
            var krExchanges = ['KO', 'KQ'];
            var match;
            if (t.market === 'KR') {
              match = data.find(function(d) { return d.Code === t.ticker && krExchanges.indexOf(d.Exchange) !== -1; });
            } else {
              match = data.find(function(d) { return d.Code === t.ticker && d.Exchange === 'US'; });
            }
            if (!match) match = data.find(function(d) { return d.Code === t.ticker; });
            if (!match && data.length > 0) match = data[0];
            if (match) nameMap[t.ticker + '.' + t.market] = match.Name;
          }
        });

        items.forEach(function(item) {
          var key = item.ticker + '.' + (item.market || 'US');
          item.currentPrice = priceMap[key] || 0;
          var fetchedName = nameMap[key];
          if (fetchedName) item.name = fetchedName;
          if (item.market === 'US') {
            item.exchangeRate = exchangeRate;
          } else {
            item.exchangeRate = null;
          }
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
        var rateText = hasUS ? '환율: ' + formatKRW(exchangeRate) + '원/$  |  ' : '';
        infoEl.textContent = rateText + timeStr + ' 업데이트';

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

