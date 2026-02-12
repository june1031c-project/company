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
const EODHD_PROXY_FUNCTION_URL = 'https://us-central1-company-f4ef5.cloudfunctions.net/proxyEODHD';
var portfolioEditIndex = -1;
var portfolioSortKey = 'category';
var portfolioSortAsc = true;

var portfolioSortLabels = {
  category: '구분', market: '시장', ticker: 'Ticker', name: '종목명',
  currentPrice: '현재가', buyPrice: '매수가(₩)', quantity: '수량',
  evalValue: '평가금(₩)', profit: '수익금(₩)', profitRate: '수익률'
};

function sortPortfolio(key) {
  if (portfolioSortKey === key) {
    portfolioSortAsc = !portfolioSortAsc;
  } else {
    portfolioSortKey = key;
    portfolioSortAsc = true;
  }
  renderPortfolio();
}

function toggleAssetFields() {
  var assetType = document.getElementById('asset-type').value;
  var stockFields = document.querySelectorAll('.stock-field');
  var cashFields = document.querySelectorAll('.cash-field');

  if (assetType === 'stock') {
    stockFields.forEach(function(field) { field.style.display = ''; });
    cashFields.forEach(function(field) { field.style.display = 'none'; });
  } else {
    stockFields.forEach(function(field) { field.style.display = 'none'; });
    cashFields.forEach(function(field) { field.style.display = ''; });
  }
}

function getPortfolio() {
  var dataStr = localStorage.getItem('portfolio');
  var items = dataStr ? JSON.parse(dataStr) : [];

  // One-time migration for old data
  if (items.length > 0 && items[0].itemType === undefined) {
    items.forEach(function(item) {
      item.itemType = 'stock';
    });
    savePortfolio(items);
  }

  return items;
}

function savePortfolio(items) {
  localStorage.setItem('portfolio', JSON.stringify(items));
}

function formatKRW(num) {
  return Math.round(num).toLocaleString('ko-KR');
}

function calcPortfolioItem(item) {
  if (item.itemType === 'cash') {
    // Cash item calculation
    var amount = item.amount || 0;
    var evalValue = amount;

    // USD를 KRW로 환산
    if (item.currency === 'USD' && item.exchangeRate) {
      evalValue = amount * item.exchangeRate;
    }

    return {
      evalValue: evalValue,
      costVal: evalValue, // 예수금은 원가=평가금
      profit: 0,
      profitRate: 0
    };
  } else {
    // Stock item calculation
    var isUS = item.market === 'US';
    var currentVal = isUS
      ? (item.currentPrice || 0) * (item.exchangeRate || 0) * item.quantity
      : (item.currentPrice || 0) * item.quantity;
    var costVal = item.buyPrice * item.quantity;
    var profit = currentVal - costVal;
    var profitRate = costVal > 0 ? (profit / costVal) * 100 : 0;
    return { evalValue: currentVal, costVal: costVal, profit: profit, profitRate: profitRate };
  }
}

function renderPortfolio() {
  var tbody = document.getElementById('portfolio-tbody');
  var tfoot = document.getElementById('portfolio-tfoot');
  var items = getPortfolio();
  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  // Build sorted indexed list
  var sorted = items.map(function(item, i) {
    var calc = calcPortfolioItem(item);
    return { item: item, origIndex: i, evalValue: calc.evalValue, profit: calc.profit, profitRate: calc.profitRate };
  });

  sorted.sort(function(a, b) {
    var va, vb;
    var key = portfolioSortKey;
    if (key === 'evalValue' || key === 'profit' || key === 'profitRate') {
      va = a[key]; vb = b[key];
    } else if (key === 'currentPrice' || key === 'buyPrice' || key === 'quantity') {
      va = a.item[key] || 0; vb = b.item[key] || 0;
    } else {
      va = (a.item[key] || '').toString().toLowerCase();
      vb = (b.item[key] || '').toString().toLowerCase();
    }
    var result;
    if (typeof va === 'string') {
      result = va.localeCompare(vb);
    } else {
      result = va - vb;
    }
    return portfolioSortAsc ? result : -result;
  });

  // Update header indicators
  var headerCells = document.querySelectorAll('.portfolio-table thead .sortable-th');
  headerCells.forEach(function(th) {
    var onclick = th.getAttribute('onclick');
    var match = onclick.match(/sortPortfolio\('(\w+)'\)/);
    if (match) {
      var colKey = match[1];
      var label = portfolioSortLabels[colKey] || colKey;
      if (colKey === portfolioSortKey) {
        th.textContent = label + (portfolioSortAsc ? ' ▲' : ' ▼');
      } else {
        th.textContent = label;
      }
    }
  });

  var totalCost = 0;
  var totalValue = 0;

  sorted.forEach(function(entry, displayIndex) {
    var item = entry.item;
    var origIndex = entry.origIndex;
    var calc = calcPortfolioItem(item);
    var currentVal = calc.evalValue;
    var costVal = calc.costVal;
    var profit = calc.profit;
    var profitRate = calc.profitRate;

    var tr = document.createElement('tr');

    if (item.itemType === 'cash') {
      // Render cash row
      totalCost += costVal;
      totalValue += currentVal;

      var currency = item.currency === 'USD' ? '$' : '₩';
      var amountDisplay = item.currency === 'USD'
        ? '$' + item.amount.toFixed(2)
        : formatKRW(item.amount) + '원';
      var rateDisplay = item.currency === 'USD' && item.exchangeRate
        ? formatKRW(item.exchangeRate)
        : '-';

      tr.innerHTML =
        '<td>' + (displayIndex + 1) + '</td>' +
        '<td>' + escapeHtml(item.category || '-') + '</td>' +
        '<td colspan="3">[예수금] ' + (item.currency || 'KRW') + '</td>' +
        '<td>' + amountDisplay + '</td>' +
        '<td>' + rateDisplay + '</td>' +
        '<td colspan="2">-</td>' +
        '<td>' + formatKRW(currentVal) + '</td>' +
        '<td colspan="2">-</td>' +
        '<td><button class="portfolio-edit-btn" onclick="editPortfolio(' + origIndex + ')">수정</button></td>' +
        '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(' + origIndex + ')">삭제</button></td>';
    } else {
      // Render stock row
      var hasPrice = item.currentPrice != null && item.currentPrice > 0;
      var isUS = item.market === 'US';

      totalCost += costVal;
      if (hasPrice) totalValue += currentVal;

      var profitClass = profit >= 0 ? 'positive' : 'negative';
      var profitSign = profit >= 0 ? '+' : '';

      var priceDisplay = '-';
      if (hasPrice) {
        priceDisplay = isUS ? '$' + item.currentPrice.toFixed(2) : formatKRW(item.currentPrice) + '원';
      }
      var rateDisplay = isUS ? (item.exchangeRate ? formatKRW(item.exchangeRate) : '-') : '-';

      tr.innerHTML =
        '<td>' + (displayIndex + 1) + '</td>' +
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
        '<td><button class="portfolio-edit-btn" onclick="editPortfolio(' + origIndex + ')">수정</button></td>' +
        '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(' + origIndex + ')">삭제</button></td>';
    }

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

function addAsset() {
  var assetType = document.getElementById('asset-type').value;
  var category = document.getElementById('portfolio-category').value.trim();
  var items = getPortfolio();

  if (assetType === 'stock') {
    var market = document.getElementById('portfolio-market').value;
    var ticker = document.getElementById('portfolio-ticker').value.trim().toUpperCase();
    var manualName = document.getElementById('portfolio-name').value.trim();
    var buyPrice = parseFloat(document.getElementById('portfolio-buy-price').value);
    var quantity = parseFloat(document.getElementById('portfolio-quantity').value);

    if (!ticker) { alert('티커를 입력해주세요.'); return; }
    if (!buyPrice || buyPrice <= 0) { alert('매수가를 입력해주세요.'); return; }
    if (!quantity || quantity <= 0) { alert('수량을 입력해주세요.'); return; }

    if (portfolioEditIndex >= 0 && items[portfolioEditIndex].itemType === 'stock') {
      // Edit existing stock
      items[portfolioEditIndex].category = category || '-';
      items[portfolioEditIndex].market = market;
      items[portfolioEditIndex].ticker = ticker;
      if (manualName) items[portfolioEditIndex].name = manualName;
      items[portfolioEditIndex].buyPrice = buyPrice;
      items[portfolioEditIndex].quantity = Math.round(quantity * 100) / 100;
      portfolioEditIndex = -1;
      document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
      var cancelBtn = document.getElementById('portfolio-cancel-btn');
      if (cancelBtn) cancelBtn.remove();
    } else {
      // Add new stock
      items.push({
        itemType: 'stock',
        category: category || '-',
        market: market,
        ticker: ticker,
        name: manualName || null,
        buyPrice: buyPrice,
        quantity: Math.round(quantity * 100) / 100,
        currentPrice: null,
        exchangeRate: null
      });
    }

    savePortfolio(items);
    renderPortfolio();
    clearAssetForm();
  } else if (assetType === 'cash') {
    var currency = document.getElementById('cash-currency').value;
    var amount = parseFloat(document.getElementById('cash-amount').value);

    if (!amount || amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    if (portfolioEditIndex >= 0 && items[portfolioEditIndex].itemType === 'cash') {
      // Edit existing cash
      items[portfolioEditIndex].category = category || '-';
      items[portfolioEditIndex].currency = currency;
      items[portfolioEditIndex].amount = amount;
      portfolioEditIndex = -1;
      document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
      var cancelBtn = document.getElementById('portfolio-cancel-btn');
      if (cancelBtn) cancelBtn.remove();
    } else {
      // Add new cash
      items.push({
        itemType: 'cash',
        category: category || '-',
        currency: currency,
        amount: amount,
        exchangeRate: null
      });
    }

    savePortfolio(items);
    renderPortfolio();
    clearAssetForm();
  }
}

function clearAssetForm() {
  document.getElementById('asset-type').value = 'stock';
  document.getElementById('portfolio-category').value = '';
  document.getElementById('portfolio-market').value = 'US';
  document.getElementById('portfolio-ticker').value = '';
  document.getElementById('portfolio-name').value = '';
  document.getElementById('portfolio-buy-price').value = '';
  document.getElementById('portfolio-quantity').value = '';
  document.getElementById('cash-currency').value = 'KRW';
  document.getElementById('cash-amount').value = '';
  toggleAssetFields();
}

function editPortfolio(index) {
  var items = getPortfolio();
  var item = items[index];
  portfolioEditIndex = index;

  // Set asset type
  document.getElementById('asset-type').value = item.itemType;
  toggleAssetFields();

  // Fill common field
  document.getElementById('portfolio-category').value = item.category || '';

  if (item.itemType === 'cash') {
    // Fill cash fields
    document.getElementById('cash-currency').value = item.currency || 'KRW';
    document.getElementById('cash-amount').value = item.amount;
  } else {
    // Fill stock fields
    document.getElementById('portfolio-market').value = item.market || 'US';
    document.getElementById('portfolio-ticker').value = item.ticker;
    document.getElementById('portfolio-name').value = item.name || '';
    document.getElementById('portfolio-buy-price').value = item.buyPrice;
    document.getElementById('portfolio-quantity').value = item.quantity;
  }

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
  clearAssetForm();
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
  var stockItems = items.filter(function(item) { return item.itemType === 'stock'; });

  if (stockItems.length === 0) {
    alert('업데이트할 주식 종목이 없습니다.');
    return;
  }

  var btn = document.querySelector('.portfolio-refresh-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 불러오는 중...';

  var hasUS = stockItems.some(function(item) { return item.market === 'US'; });

  fetch(EODHD_PROXY_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items: stockItems, hasUS: hasUS }),
  })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Firebase Function returned an error: ' + response.statusText);
      }
      return response.json();
    })
    .then(function(data) {
      const { updatedItems, exchangeRate } = data;

      // Merge updated stock items back into full portfolio
      var stockIndex = 0;
      items = items.map(function(item) {
        if (item.itemType === 'stock') {
          return updatedItems[stockIndex++];
        } else if (item.itemType === 'cash' && item.currency === 'USD') {
          // Update USD cash exchange rate
          return { ...item, exchangeRate: exchangeRate };
        } else {
          return item;
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
    })
    .catch(function(err) {
      alert('시세 조회 실패: ' + err.message);
      btn.disabled = false;
      btn.textContent = '🔄 시세 업데이트';
    });
}
