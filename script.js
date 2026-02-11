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

// ========== Portfolio ==========
var EODHD_API_KEY = '6975d9cad29f05.79877483';
var portfolioEditIndex = -1;
var portfolioSortKey = 'category';
var portfolioSortAsc = true;

var portfolioSortLabels = {
  category: '구분', market: '시장', ticker: 'Ticker', name: '종목명',
  currentPrice: '현재가', buyPrice: '매수가(₩)', quantity: '수량',
  evalValue: '평가금(₩)', profit: '수익금(₩)', profitRate: '수익률',
  amount: '금액', currency: '통화' // Added for cash items
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

function calcPortfolioItem(item, exchangeRate) {
  let evalValue = 0;
  let costValue = 0;
  let profit = 0;
  let profitRate = 0;

  if (item.type === 'cash') {
    costValue = item.amount; // For cash, cost is its amount
    evalValue = item.amount;
    if (item.currency === 'USD' && exchangeRate) {
      costValue *= exchangeRate;
      evalValue *= exchangeRate;
    }
    // No profit/rate for cash itself
  } else { // Stock item
    var isUS = item.market === 'US';
    evalValue = isUS
      ? (item.currentPrice || 0) * (item.exchangeRate || (isUS ? exchangeRate : 1)) * item.quantity
      : (item.currentPrice || 0) * item.quantity;
    costValue = item.buyPrice * item.quantity;
    profit = evalValue - costValue;
    profitRate = costValue > 0 ? (profit / costValue) * 100 : 0;
  }

  return { evalValue: evalValue, costValue: costValue, profit: profit, profitRate: profitRate };
}

function renderPortfolio(exchangeRate) {
  var tbody = document.getElementById('portfolio-tbody');
  var tfoot = document.getElementById('portfolio-tfoot');
  var items = getPortfolio();
  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  // Build sorted indexed list
  var sorted = items.map(function(item, i) {
    var calc = calcPortfolioItem(item, exchangeRate);
    return { item: item, origIndex: i, evalValue: calc.evalValue, profit: calc.profit, profitRate: calc.profitRate, costValue: calc.costValue };
  });

  sorted.sort(function(a, b) {
    var va, vb;
    var key = portfolioSortKey;
    if (key === 'evalValue' || key === 'profit' || key === 'profitRate' || key === 'costValue') {
      va = a[key]; vb = b[key];
    } else if (key === 'currentPrice' || key === 'buyPrice' || key === 'quantity' || key === 'amount') {
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
    var calc = calcPortfolioItem(item, exchangeRate); // Recalculate with latest exchange rate
    var currentVal = calc.evalValue;
    var costVal = calc.costValue;
    var profit = calc.profit;
    var profitRate = calc.profitRate;

    totalCost += costVal;
    totalValue += currentVal;

    var profitClass = profit >= 0 ? 'positive' : 'negative';
    var profitSign = profit >= 0 ? '+' : '';

    var tr = document.createElement('tr');
    if (item.type === 'cash') {
      let displayAmount = formatKRW(item.amount);
      if (item.currency === 'USD') {
        displayAmount = '$' + item.amount.toFixed(2);
        if (exchangeRate) {
          displayAmount += ` (${formatKRW(currentVal)}원)`;
        } else {
          displayAmount += ' (환율 정보 없음)';
        }
      } else {
        displayAmount += '원';
      }

      tr.innerHTML =
        '<td>' + (displayIndex + 1) + '</td>' +
        '<td>' + escapeHtml(item.category || '-') + '</td>' +
        '<td colspan="4">현금성자산 (' + item.currency + ')</td>' + // Combined ticker/name/currentPrice/rate
        '<td>' + displayAmount + '</td>' + // 매수가 is actual amount here
        '<td>-</td>' + // Quantity not applicable
        '<td>' + formatKRW(currentVal) + '</td>' + // 평가금 is current value
        '<td>-</td>' + // 수익금 not applicable
        '<td>-</td>' + // 수익률 not applicable
        '<td><button class="portfolio-edit-btn" onclick="editPortfolio(\'' + item.id + '\', \'cash\')">수정</button></td>' +
        '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(\'' + item.id + '\')">삭제</button></td>';
    } else { // Stock item
      var hasPrice = item.currentPrice != null && item.currentPrice > 0;
      var isUS = item.market === 'US';
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
        '<td><button class="portfolio-edit-btn" onclick="editPortfolio(\'' + item.id + '\', \'stock\')">수정</button></td>' +
        '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(\'' + item.id + '\')">삭제</button></td>';
    }
    tbody.appendChild(tr);
  });

  if (items.length > 0) {
    var totalProfit = totalValue - totalCost;
    var totalRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : (totalValue > 0 ? 100 : 0);
    var cls = totalProfit >= 0 ? 'positive' : 'negative';
    var sign = totalProfit >= 0 ? '+' : '';

    var tfootTr = document.createElement('tr');
    tfootTr.innerHTML =
      '<td colspan="9" style="text-align:center;">총합계</td>' +
      '<td>' + formatKRW(totalValue) + '</td>' +
      '<td class="' + cls + '">' + sign + formatKRW(totalProfit) + '</td>' +
      '<td class="' + cls + '">' + sign + totalRate.toFixed(2) + '%' + '</td>' +
      '<td></td><td></td>';
    tfoot.appendChild(tfootTr);
  }
}

var portfolioEditId = null; // Use for both stock and cash items

function addPortfolioItem() {
  const stockCategory = document.getElementById('portfolio-category').value.trim();
  const stockMarket = document.getElementById('portfolio-market').value;
  const stockTicker = document.getElementById('portfolio-ticker').value.trim().toUpperCase();
  const stockManualName = document.getElementById('portfolio-name').value.trim();
  const stockBuyPrice = parseFloat(document.getElementById('portfolio-buy-price').value);
  const stockQuantity = parseFloat(document.getElementById('portfolio-quantity').value);

  const cashCategory = document.getElementById('cash-deposit-category').value.trim();
  const cashAmount = parseFloat(document.getElementById('cash-deposit-amount').value);
  const cashCurrency = document.getElementById('cash-deposit-currency').value;

  let items = getPortfolio();

  if (portfolioEditId !== null) {
    // Editing an existing item
    items = items.map(item => {
      if (item.id === portfolioEditId) {
        if (item.type === 'cash') {
          return {
            ...item,
            category: cashCategory || '-',
            amount: cashAmount,
            currency: cashCurrency,
            type: 'cash'
          };
        } else { // stock
          return {
            ...item,
            category: stockCategory || '-',
            market: stockMarket,
            ticker: stockTicker,
            name: stockManualName || null,
            buyPrice: stockBuyPrice,
            quantity: Math.round(stockQuantity * 100) / 100,
            type: 'stock'
          };
        }
      }
      return item;
    });
    portfolioEditId = null;
    document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
    const cancelBtn = document.getElementById('portfolio-cancel-btn');
    if (cancelBtn) cancelBtn.remove();
  } else {
    // Adding a new item
    // First, check if stock fields are filled
    if (stockTicker && stockBuyPrice > 0 && stockQuantity > 0) {
      items.push({
        id: Date.now().toString() + '-stock',
        type: 'stock',
        category: stockCategory || '-',
        market: stockMarket,
        ticker: stockTicker,
        name: stockManualName || null,
        buyPrice: stockBuyPrice,
        quantity: Math.round(stockQuantity * 100) / 100,
        currentPrice: null,
        exchangeRate: null
      });
    }

    // Then, check if cash fields are filled
    if (cashCategory && cashAmount > 0) {
      items.push({
        id: Date.now().toString() + '-cash',
        type: 'cash',
        category: cashCategory || '-',
        amount: cashAmount,
        currency: cashCurrency
      });
    }

    if (!stockTicker && (!cashCategory || !cashAmount)) {
        alert('주식 또는 현금성 자산 정보를 입력해주세요.');
        return;
    }
  }

  savePortfolio(items);
  renderPortfolio();

  // Clear stock inputs
  document.getElementById('portfolio-category').value = '';
  document.getElementById('portfolio-market').value = 'US';
  document.getElementById('portfolio-ticker').value = '';
  document.getElementById('portfolio-name').value = '';
  document.getElementById('portfolio-buy-price').value = '';
  document.getElementById('portfolio-quantity').value = '';

  // Clear cash inputs
  document.getElementById('cash-deposit-category').value = '';
  document.getElementById('cash-deposit-amount').value = '';
  document.getElementById('cash-deposit-currency').value = 'KRW';
}

function editPortfolio(id, type) {
  var items = getPortfolio();
  var item = items.find(i => i.id === id);
  portfolioEditId = id;

  if (item) {
    if (type === 'cash') {
      document.getElementById('cash-deposit-category').value = item.category || '';
      document.getElementById('cash-deposit-amount').value = item.amount;
      document.getElementById('cash-deposit-currency').value = item.currency || 'KRW';
    } else { // stock
      document.getElementById('portfolio-category').value = item.category || '';
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
}

function cancelEditPortfolio() {
  portfolioEditId = null;
  document.getElementById('portfolio-category').value = '';
  document.getElementById('portfolio-market').value = 'US';
  document.getElementById('portfolio-ticker').value = '';
  document.getElementById('portfolio-name').value = '';
  document.getElementById('portfolio-buy-price').value = '';
  document.getElementById('portfolio-quantity').value = '';

  document.getElementById('cash-deposit-category').value = '';
  document.getElementById('cash-deposit-amount').value = '';
  document.getElementById('cash-deposit-currency').value = 'KRW';

  document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
  var cancelBtn = document.getElementById('portfolio-cancel-btn');
  if (cancelBtn) cancelBtn.remove();
}

function deletePortfolio(id) {
  var items = getPortfolio();
  items = items.filter(item => item.id !== id);
  savePortfolio(items);
  renderPortfolio();
}

function refreshPortfolio() {
  var items = getPortfolio();
  // Filter out cash items for API call
  var stockItems = items.filter(item => item.type !== 'cash');

  if (stockItems.length === 0) {
    // If only cash items or no items, just render portfolio without API call
    renderPortfolio();
    return;
  }

  var btn = document.querySelector('.portfolio-refresh-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 불러오는 중...';

  var hasUS = stockItems.some(function(item) { return item.market === 'US'; });

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
      stockItems.forEach(function(item) {
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

      // Fetch names (only for items without a valid name - skip manually entered names)
      var needName = tickerList.filter(function(t) {
        return !stockItems.some(function(item) {
          return item.ticker === t.ticker && item.market === t.market
            && item.name && item.name !== item.ticker && item.name !== '-';
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
          if (item.type !== 'cash') { // Only update stock items
            var key = item.ticker + '.' + (item.market || 'US');
            item.currentPrice = priceMap[key] || 0;
            var fetchedName = nameMap[key];
            if (fetchedName) item.name = fetchedName;
            if (item.market === 'US') {
              item.exchangeRate = exchangeRate;
            } else {
              item.exchangeRate = null;
            }
          }
        });

        savePortfolio(items);
        renderPortfolio(exchangeRate);

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