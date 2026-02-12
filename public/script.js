// ========== Firebase 초기화 ==========
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Login credentials (아이디 → 이메일 + 역할 매핑)
const USERS = {
  'june1031c': { email: 'june1031@gmail.com', password: 'june1031c', role: 'admin', label: 'Admin' },
  'ewp': { email: 'ewp@gmail.com', password: 'ewpewp', role: 'user', label: 'User' }
};

function handleLogin(event) {
  event.preventDefault();
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.querySelector('.login-btn');

  const userConfig = USERS[id];
  if (!userConfig || userConfig.password !== pw) {
    errorEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
    return false;
  }

  // Firebase Authentication 로그인
  loginBtn.disabled = true;
  loginBtn.textContent = '로그인 중...';
  errorEl.textContent = '';

  auth.signInWithEmailAndPassword(userConfig.email, pw)
    .then((userCredential) => {
      // 로그인 성공
      const user = userCredential.user;
      sessionStorage.setItem('loginRole', userConfig.role);
      sessionStorage.setItem('loginUser', id);
      sessionStorage.setItem('firebaseUid', user.uid);
      initApp();
    })
    .catch((error) => {
      console.error('Firebase Auth Error:', error);
      errorEl.textContent = '로그인 실패: ' + error.message;
      loginBtn.disabled = false;
      loginBtn.textContent = '로그인';
    });

  return false;
}

function handleLogout() {
  // Firestore 리스너 해제
  if (todosUnsubscribe) {
    todosUnsubscribe();
    todosUnsubscribe = null;
  }
  if (portfolioUnsubscribe) {
    portfolioUnsubscribe();
    portfolioUnsubscribe = null;
  }

  // 캐시 데이터 초기화
  todosCache = [];
  portfolioCache = [];

  auth.signOut().then(() => {
    sessionStorage.removeItem('loginRole');
    sessionStorage.removeItem('loginUser');
    sessionStorage.removeItem('firebaseUid');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.body.classList.remove('readonly');
    document.getElementById('login-id').value = '';
    document.getElementById('login-pw').value = '';
    document.querySelector('.login-btn').disabled = false;
    document.querySelector('.login-btn').textContent = '로그인';
  }).catch((error) => {
    console.error('Logout error:', error);
  });
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

  // Load data from Firestore
  loadTodos();
  loadPortfolioFromFirestore();
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
});

var todoSortKey = 'endDate';
var todosCache = []; // Firestore 데이터 캐시
var todosUnsubscribe = null; // Firestore 리스너 해제 함수

function getTodos() {
  return todosCache;
}

// Firestore에서 To-Do 목록 로드
function loadTodosFromFirestore() {
  const uid = sessionStorage.getItem('firebaseUid');
  if (!uid) {
    console.warn('User not logged in');
    return;
  }

  // 기존 리스너가 있다면 해제
  if (todosUnsubscribe) {
    todosUnsubscribe();
  }

  // 새 리스너 등록
  todosUnsubscribe = db.collection('users').doc(uid).collection('todos')
    .orderBy('endDate', 'asc')
    .onSnapshot((snapshot) => {
      todosCache = [];
      snapshot.forEach((doc) => {
        todosCache.push({ id: doc.id, ...doc.data() });
      });
      renderTodos();
    }, (error) => {
      console.error('Error loading todos:', error);
      // 로그아웃 상태에서는 에러 무시
      if (auth.currentUser) {
        alert('To-Do 목록 로드 실패: ' + error.message);
      }
    });
}

function sortTodos(field) {
  todoSortKey = field;
  renderTodos();
}

function renderTodos() {
  const tbody = document.getElementById('todo-tbody');
  const todos = getTodos();

  // Build sorted list
  var sorted = todos.map(function(todo) { return todo; });
  sorted.sort(function(a, b) {
    var va = a[todoSortKey] || '';
    var vb = b[todoSortKey] || '';
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
  sorted.forEach(function(todo, displayIndex) {
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

function addTodo() {
  const startDate = document.getElementById('todo-start-date').value;
  const endDate = document.getElementById('todo-end-date').value;
  const detail = document.getElementById('todo-detail').value.trim();

  if (!detail) {
    alert('세부내용을 입력해주세요.');
    return;
  }

  const uid = sessionStorage.getItem('firebaseUid');
  if (!uid) {
    alert('로그인이 필요합니다.');
    return;
  }

  // Firestore에 추가
  db.collection('users').doc(uid).collection('todos').add({
    startDate: startDate || '-',
    endDate: endDate || '-',
    detail: detail,
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    // Clear inputs
    document.getElementById('todo-start-date').value = '';
    document.getElementById('todo-end-date').value = '';
    document.getElementById('todo-detail').value = '';
  }).catch((error) => {
    console.error('Error adding todo:', error);
    alert('To-Do 추가 실패: ' + error.message);
  });
}

function deleteTodo(todoId) {
  const uid = sessionStorage.getItem('firebaseUid');
  if (!uid) return;

  if (!confirm('삭제하시겠습니까?')) return;

  db.collection('users').doc(uid).collection('todos').doc(todoId).delete()
    .catch((error) => {
      console.error('Error deleting todo:', error);
      alert('To-Do 삭제 실패: ' + error.message);
    });
}

function toggleComplete(todoId) {
  const uid = sessionStorage.getItem('firebaseUid');
  if (!uid) return;

  const todo = todosCache.find(t => t.id === todoId);
  if (!todo) return;

  db.collection('users').doc(uid).collection('todos').doc(todoId).update({
    completed: !todo.completed
  }).catch((error) => {
    console.error('Error toggling todo:', error);
    alert('To-Do 업데이트 실패: ' + error.message);
  });
}

function loadTodos() {
  const uid = sessionStorage.getItem('firebaseUid');
  if (uid) {
    loadTodosFromFirestore();
  } else {
    renderTodos();
  }
}

// ========== Portfolio ==========
const EODHD_PROXY_FUNCTION_URL = 'https://us-central1-company-f4ef5.cloudfunctions.net/proxyEODHD';
var portfolioEditId = null;
var portfolioSortKey = 'category';
var portfolioSortAsc = true;
var portfolioCache = []; // Firestore 데이터 캐시
var portfolioUnsubscribe = null; // Firestore 리스너 해제 함수

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
  return portfolioCache;
}

// Firestore에서 Portfolio 로드
function loadPortfolioFromFirestore() {
  const uid = sessionStorage.getItem('firebaseUid');
  if (!uid) {
    console.warn('User not logged in');
    return;
  }

  // 기존 리스너가 있다면 해제
  if (portfolioUnsubscribe) {
    portfolioUnsubscribe();
  }

  // 새 리스너 등록
  portfolioUnsubscribe = db.collection('users').doc(uid).collection('portfolio')
    .onSnapshot((snapshot) => {
      portfolioCache = [];
      snapshot.forEach((doc) => {
        portfolioCache.push({ id: doc.id, ...doc.data() });
      });
      renderPortfolio();
    }, (error) => {
      console.error('Error loading portfolio:', error);
      // 로그아웃 상태에서는 에러 무시
      if (auth.currentUser) {
        alert('Portfolio 로드 실패: ' + error.message);
      }
    });
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

  // Build sorted list
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
        '<td><button class="portfolio-edit-btn" onclick="editPortfolio(\'' + item.id + '\')">수정</button></td>' +
        '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(\'' + item.id + '\')">삭제</button></td>';
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
        '<td><button class="portfolio-edit-btn" onclick="editPortfolio(\'' + item.id + '\')">수정</button></td>' +
        '<td><button class="portfolio-delete-btn" onclick="deletePortfolio(\'' + item.id + '\')">삭제</button></td>';
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
  const uid = sessionStorage.getItem('firebaseUid');

  if (!uid) {
    alert('로그인이 필요합니다.');
    return;
  }

  if (assetType === 'stock') {
    var market = document.getElementById('portfolio-market').value;
    var ticker = document.getElementById('portfolio-ticker').value.trim().toUpperCase();
    var manualName = document.getElementById('portfolio-name').value.trim();
    var buyPrice = parseFloat(document.getElementById('portfolio-buy-price').value);
    var quantity = parseFloat(document.getElementById('portfolio-quantity').value);

    if (!ticker) { alert('티커를 입력해주세요.'); return; }
    if (!buyPrice || buyPrice <= 0) { alert('매수가를 입력해주세요.'); return; }
    if (!quantity || quantity <= 0) { alert('수량을 입력해주세요.'); return; }

    var stockData = {
      itemType: 'stock',
      category: category || '-',
      market: market,
      ticker: ticker,
      name: manualName || null,
      buyPrice: buyPrice,
      quantity: Math.round(quantity * 100) / 100,
      currentPrice: null,
      exchangeRate: null
    };

    if (portfolioEditId) {
      // Edit existing stock
      db.collection('users').doc(uid).collection('portfolio').doc(portfolioEditId).update(stockData)
        .then(() => {
          portfolioEditId = null;
          document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
          var cancelBtn = document.getElementById('portfolio-cancel-btn');
          if (cancelBtn) cancelBtn.remove();
          clearAssetForm();
        })
        .catch((error) => {
          console.error('Error updating stock:', error);
          alert('주식 수정 실패: ' + error.message);
        });
    } else {
      // Add new stock
      db.collection('users').doc(uid).collection('portfolio').add(stockData)
        .then(() => {
          clearAssetForm();
        })
        .catch((error) => {
          console.error('Error adding stock:', error);
          alert('주식 추가 실패: ' + error.message);
        });
    }
  } else if (assetType === 'cash') {
    var currency = document.getElementById('cash-currency').value;
    var amount = parseFloat(document.getElementById('cash-amount').value);

    if (!amount || amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    var cashData = {
      itemType: 'cash',
      category: category || '-',
      currency: currency,
      amount: amount,
      exchangeRate: null
    };

    if (portfolioEditId) {
      // Edit existing cash
      db.collection('users').doc(uid).collection('portfolio').doc(portfolioEditId).update(cashData)
        .then(() => {
          portfolioEditId = null;
          document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
          var cancelBtn = document.getElementById('portfolio-cancel-btn');
          if (cancelBtn) cancelBtn.remove();
          clearAssetForm();
        })
        .catch((error) => {
          console.error('Error updating cash:', error);
          alert('예수금 수정 실패: ' + error.message);
        });
    } else {
      // Add new cash
      db.collection('users').doc(uid).collection('portfolio').add(cashData)
        .then(() => {
          clearAssetForm();
        })
        .catch((error) => {
          console.error('Error adding cash:', error);
          alert('예수금 추가 실패: ' + error.message);
        });
    }
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

function editPortfolio(itemId) {
  var items = getPortfolio();
  var item = items.find(i => i.id === itemId);
  if (!item) return;

  portfolioEditId = itemId;

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
  portfolioEditId = null;
  clearAssetForm();
  document.querySelector('.portfolio-form .todo-add-btn').textContent = '추가';
  var cancelBtn = document.getElementById('portfolio-cancel-btn');
  if (cancelBtn) cancelBtn.remove();
}

function deletePortfolio(itemId) {
  const uid = sessionStorage.getItem('firebaseUid');
  if (!uid) return;

  if (!confirm('삭제하시겠습니까?')) return;

  db.collection('users').doc(uid).collection('portfolio').doc(itemId).delete()
    .catch((error) => {
      console.error('Error deleting portfolio item:', error);
      alert('삭제 실패: ' + error.message);
    });
}

function refreshPortfolio() {
  const uid = sessionStorage.getItem('firebaseUid');
  if (!uid) {
    alert('로그인이 필요합니다.');
    return;
  }

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

  // Remove 'id' field before sending to API
  var stockItemsForAPI = stockItems.map(function(item) {
    var copy = { ...item };
    delete copy.id;
    return copy;
  });

  fetch(EODHD_PROXY_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items: stockItemsForAPI, hasUS: hasUS }),
  })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Firebase Function returned an error: ' + response.statusText);
      }
      return response.json();
    })
    .then(function(data) {
      const { updatedItems, exchangeRate } = data;

      // Update Firestore with new prices
      var batch = db.batch();
      var stockIndex = 0;

      items.forEach(function(item) {
        var docRef = db.collection('users').doc(uid).collection('portfolio').doc(item.id);

        if (item.itemType === 'stock') {
          var updated = updatedItems[stockIndex++];
          batch.update(docRef, {
            currentPrice: updated.currentPrice,
            exchangeRate: updated.exchangeRate,
            name: updated.name || item.name
          });
        } else if (item.itemType === 'cash' && item.currency === 'USD') {
          // Update USD cash exchange rate
          batch.update(docRef, { exchangeRate: exchangeRate });
        }
      });

      return batch.commit().then(function() {
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
