import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCpqpFe0FwnExJmEZSQJKUwWk1RdbO8CPI",
    authDomain: "company-f4ef5.firebaseapp.com",
    projectId: "company-f4ef5",
    storageBucket: "company-f4ef5.firebasestorage.app",
    messagingSenderId: "679888260857",
    appId: "1:679888260857:web:2f742ead45d54d5dd7dc28",
    measurementId: "G-VJ2XC1YZD7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  if (sessionStorage.getItem('loginRole')) {
    initApp();
  }

  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  const contentSections = document.querySelectorAll('.content-section');
  const mainTitle = document.getElementById('main-title');

  function showSection(sectionId) {
    contentSections.forEach(section => {
      section.classList.remove('active');
    });
    sidebarLinks.forEach(link => {
      link.classList.remove('active');
    });

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
      activeSection.classList.add('active');
    }
    const activeLink = document.querySelector(`.sidebar-nav a[data-section="${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      mainTitle.textContent = activeLink.textContent.replace(activeLink.querySelector('span').textContent, '').trim();
    }
  }

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const targetLink = event.target.closest('a');
      if(targetLink) {
          const sectionId = targetLink.dataset.section;
          showSection(sectionId);
      }
    });
  });

  showSection('dashboard');
  setupTodosRealtimeListener();
  setupPortfolioRealtimeListener();
});

let todoItems = [];
var todoSortKey = 'endDate';

function sortTodos(field) {
  todoSortKey = field;
  renderTodos();
}

function renderTodos() {
  const tbody = document.getElementById('todo-tbody');
  var sorted = todoItems.map(function(todo) { return { todo: todo }; });
  sorted.sort(function(a, b) {
    var va = a.todo[todoSortKey] || '';
    var vb = b.todo[todoSortKey] || '';
    if (va === '-') va = '';
    if (vb === '-') vb = '';
    return va.localeCompare(vb);
  });

  var thStart = document.getElementById('th-start-date');
  var thEnd = document.getElementById('th-end-date');
  thStart.textContent = '시작일자' + (todoSortKey === 'startDate' ? ' ▼' : '');
  thEnd.textContent = '완료일자' + (todoSortKey === 'endDate' ? ' ▼' : '');

  tbody.innerHTML = '';
  sorted.forEach(function(item, displayIndex) {
    var todo = item.todo;
    var tr = document.createElement('tr');
    if (todo.completed) {
      tr.classList.add('completed');
    }
    tr.innerHTML =
      '<td>' + (displayIndex + 1) + '</td>' +
      '<td>' + todo.startDate + '</td>' +
      '<td>' + todo.endDate + '</td>' +
      '<td>' + escapeHtml(todo.detail) + '</td>' +
      '<td><input type="checkbox" ' + (todo.completed ? 'checked' : '') + ' onchange="toggleComplete(\'' + todo.id + '\')" /></td>' +
      '<td><button class="todo-delete-btn" onclick="deleteTodo(\'' + todo.id + '\')">삭제</button></td>';
    tbody.appendChild(tr);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function addTodo() {
  const startDate = document.getElementById('todo-start-date').value;
  const endDate = document.getElementById('todo-end-date').value;
  const detail = document.getElementById('todo-detail').value.trim();

  if (!detail) {
    alert('세부내용을 입력해주세요.');
    return;
  }

  try {
    await addDoc(collection(db, "todos"), {
      startDate: startDate || '-',
      endDate: endDate || '-',
      detail: detail,
      completed: false,
      createdAt: new Date().toISOString()
    });
    document.getElementById('todo-start-date').value = '';
    document.getElementById('todo-end-date').value = '';
    document.getElementById('todo-detail').value = '';
  } catch (e) {
    console.error("Error adding document: ", e);
    alert("할 일 추가에 실패했습니다.");
  }
}

async function deleteTodo(id) {
  try {
    await deleteDoc(doc(db, "todos", id));
  } catch (e) {
    console.error("Error deleting document: ", e);
    alert("할 일 삭제에 실패했습니다.");
  }
}

async function toggleComplete(id) {
  try {
    const todoRef = doc(db, "todos", id);
    const todo = todoItems.find(item => item.id === id);
    if (todo) {
      await updateDoc(todoRef, {
        completed: !todo.completed
      });
    }
  } catch (e) {
    console.error("Error updating document: ", e);
    alert("할 일 상태 변경에 실패했습니다.");
  }
}

function setupTodosRealtimeListener() {
  const q = query(collection(db, "todos"), orderBy("createdAt"));
  onSnapshot(q, (snapshot) => {
    todoItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderTodos();
  }, (error) => {
    console.error("Error fetching todos: ", error);
    alert("할 일 목록을 불러오는 데 실패했습니다.");
  });
}


// ========== Portfolio ==========
let portfolioItems = [];
var EODHD_API_KEY = '6975d9cad29f05.79877483';
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

function setupPortfolioRealtimeListener() {
  const q = query(collection(db, "portfolios"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    portfolioItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderPortfolio();
  }, (error) => {
    console.error("Error fetching portfolio: ", error);
    alert("포트폴리오를 불러오는 데 실패했습니다.");
  });
}

function formatKRW(num) {
  return Math.round(num).toLocaleString('ko-KR');
}

function calcPortfolioItem(item) {
  var isUS = item.market === 'US';
  var currentVal = isUS
    ? (item.currentPrice || 0) * (item.exchangeRate || 0) * item.quantity
    : (item.currentPrice || 0) * item.quantity;
  var costVal = item.buyPrice * item.quantity;
  var profit = currentVal - costVal;
  var profitRate = costVal > 0 ? (profit / costVal) * 100 : 0;
  return { evalValue: currentVal, costVal: costVal, profit: profit, profitRate: profitRate };
}

function renderPortfolio() {
  var tbody = document.getElementById('portfolio-tbody');
  var tfoot = document.getElementById('portfolio-tfoot');
  var items = [...portfolioItems];

  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  var sorted = items.map(function(item) {
    var calc = calcPortfolioItem(item);
    return { item: item, evalValue: calc.evalValue, profit: calc.profit, profitRate: calc.profitRate };
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

  var headerCells = document.querySelectorAll('.portfolio-table tr th.sortable-th');
  headerCells.forEach(function(th) {
    var colKey = th.dataset.sortKey;
    var label = portfolioSortLabels[colKey] || colKey;
    if (colKey === portfolioSortKey) {
      th.textContent = label + (portfolioSortAsc ? ' ▲' : ' ▼');
    } else {
      th.textContent = label;
    }
  });


  var totalCost = 0;
  var totalValue = 0;

  sorted.forEach(function(entry, displayIndex) {
    var item = entry.item;
    var calc = calcPortfolioItem(item);
    var currentVal = calc.evalValue;
    var costVal = calc.costVal;
    var profit = calc.profit;
    var profitRate = calc.profitRate;
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

    var tr = document.createElement('tr');
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
      '<td><button class="portfolio-edit-btn" onclick="editPortfolio(\'' + item.id + '\')">수정</button></td>' +
      '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(\'' + item.id + '\')">삭제</button></td>';
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

async function addPortfolio() {
  var category = document.getElementById('portfolio-category').value.trim();
  var market = document.getElementById('portfolio-market').value;
  var ticker = document.getElementById('portfolio-ticker').value.trim().toUpperCase();
  var manualName = document.getElementById('portfolio-name').value.trim();
  var buyPrice = parseFloat(document.getElementById('portfolio-buy-price').value);
  var quantity = parseFloat(document.getElementById('portfolio-quantity').value);

  if (!ticker) { alert('티커를 입력해주세요.'); return; }
  if (!buyPrice || buyPrice <= 0) { alert('매수가를 입력해주세요.'); return; }
  if (!quantity || quantity <= 0) { alert('수량을 입력해주세요.'); return; }

  const newItemData = {
    category: category || '-',
    market: market,
    ticker: ticker,
    name: manualName || null,
    buyPrice: buyPrice,
    quantity: Math.round(quantity * 100) / 100,
    currentPrice: null,
    exchangeRate: null,
    createdAt: new Date().toISOString()
  };

  try {
    if (portfolioEditIndex !== -1) {
      const itemToUpdateId = portfolioEditIndex;
      const docRef = doc(db, "portfolios", itemToUpdateId);
      await updateDoc(docRef, {
        category: newItemData.category,
        market: newItemData.market,
        ticker: newItemData.ticker,
        name: newItemData.name,
        buyPrice: newItemData.buyPrice,
        quantity: newItemData.quantity
      });
    } else {
      await addDoc(collection(db, "portfolios"), newItemData);
    }

    portfolioEditIndex = -1;
    document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
    var cancelBtn = document.getElementById('portfolio-cancel-btn');
    if (cancelBtn) cancelBtn.remove();

    document.getElementById('portfolio-category').value = '';
    document.getElementById('portfolio-market').value = 'US';
    document.getElementById('portfolio-ticker').value = '';
    document.getElementById('portfolio-name').value = '';
    document.getElementById('portfolio-buy-price').value = '';
    document.getElementById('portfolio-quantity').value = '';
  } catch (e) {
    console.error("Error adding/updating portfolio item: ", e);
    alert("포트폴리오 항목 추가/업데이트에 실패했습니다.");
  }
}

function editPortfolio(id) { // Accept id instead of index
  const item = portfolioItems.find(i => i.id === id);
  if (!item) {
    console.error("Portfolio item not found for editing:", id);
    return;
  }
  portfolioEditIndex = id; // Store item ID for editing

  document.getElementById('portfolio-category').value = item.category || '';
  document.getElementById('portfolio-market').value = item.market || 'US';
  document.getElementById('portfolio-ticker').value = item.ticker;
  document.getElementById('portfolio-name').value = item.name || '';
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
  document.getElementById('portfolio-name').value = '';
  document.getElementById('portfolio-buy-price').value = '';
  document.getElementById('portfolio-quantity').value = '';
  document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
  var cancelBtn = document.getElementById('portfolio-cancel-btn');
  if (cancelBtn) cancelBtn.remove();
}

async function deletePortfolio(id) {
  try {
    await deleteDoc(doc(db, "portfolios", id));
  } catch (e) {
    console.error("Error deleting portfolio item: ", e);
    alert("포트폴리오 항목 삭제에 실패했습니다.");
  }
}

async function refreshPortfolio() {
  var items = [...portfolioItems]; // Use global array

  if (items.length === 0) { alert('종목을 먼저 추가해주세요.'); return; }

  var btn = document.querySelector('.portfolio-refresh-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 불러오는 중...';

  var hasUS = items.some(function(item) { return item.market === 'US'; });

  var ratePromise;
  if (hasUS) {
    var rateUrl = 'https://eodhd.com/api/real-time/USDKRW.FOREX?api_token=' + EODHD_API_KEY + '&fmt=json';
    ratePromise = fetch(rateUrl).then(function(res) { return res.json(); });
  } else {
    ratePromise = Promise.resolve(null);
  }

  try {
    const rateData = await ratePromise;
    var exchangeRate = rateData ? (rateData.close || rateData.previousClose || 0) : 0;

    var tickerKeys = [];
    var tickerList = [];
    items.forEach(function(item) {
      var key = item.ticker + '.' + (item.market || 'US');
      if (tickerKeys.indexOf(key) === -1) {
        tickerKeys.push(key);
        tickerList.push({ ticker: item.ticker, market: item.market || 'US' });
      }
    });

    var priceFetches = tickerList.map(function(t) {
      var suffix = t.market === 'KR' ? '.KO' : '.US';
      var url = 'https://eodhd.com/api/real-time/' + t.ticker + suffix + '?api_token=' + EODHD_API_KEY + '&fmt=json';
      return fetch(url).then(function(res) { return res.json(); });
    });

    var needName = tickerList.filter(function(t) {
      return !items.some(function(item) {
        return item.ticker === t.ticker && item.market === t.market
          && item.name && item.name !== item.ticker && item.name !== '-';
      });
    });
    var nameFetches = needName.map(function(t) {
      var url = 'https://eodhd.com/api/search/' + t.ticker + '?api_token=' + EODHD_API_KEY + '&fmt=json';
      return fetch(url).then(function(res) { return res.json(); });
    });

    const [priceResults, nameResults] = await Promise.all([Promise.all(priceFetches), Promise.all(nameFetches)]);

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

    const updatePromises = items.map(async (item) => {
      var key = item.ticker + '.' + (item.market || 'US');
      const newCurrentPrice = priceMap[key] || 0;
      const fetchedName = nameMap[key];
      const newExchangeRate = (item.market === 'US') ? exchangeRate : null;

      if (item.currentPrice !== newCurrentPrice || item.exchangeRate !== newExchangeRate || (fetchedName && item.name !== fetchedName)) {
        const docRef = doc(db, "portfolios", item.id);
        const updateData = { currentPrice: newCurrentPrice, exchangeRate: newExchangeRate };
        if (fetchedName) updateData.name = fetchedName;
        await updateDoc(docRef, updateData);
      }
    });
    await Promise.all(updatePromises);

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

  } catch (err) {
    console.error("시세 조회 실패: ", err);
    alert('시세 조회 실패: ' + err.message);
    btn.disabled = false;
    btn.textContent = '🔄 시세 업데이트';
  }
}