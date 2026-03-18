/* ===========================
   MotoSales Analytics — JS
   =========================== */

// ─── GLOBALS ──────────────────────────────────────────────────────────────────
let ALL_DATA   = [];
let FILT_DATA  = [];
const CHARTS   = {};

const PRODUCT_COLORS = {
  'Braking system'      : '#6c63ff',
  'Suspension & traction': '#06b6d4',
  'Frame & body'        : '#f59e0b',
  'Engine'              : '#ef4444',
  'Electrical system'   : '#10b981',
  'Miscellaneous'       : '#a855f7',
};

const MONTH_NAMES = { 6: 'June', 7: 'July', 8: 'August' };

// ─── Chart.js defaults ────────────────────────────────────────────────────────
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(14,21,37,0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(108,99,255,0.4)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 10;

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtN = v => Number(v).toLocaleString('en-US');
const pct  = (a, b) => b ? ((a/b)*100).toFixed(1)+'%' : '0%';

function groupBy(data, key) {
  return data.reduce((acc, row) => {
    (acc[row[key]] = acc[row[key]] || []).push(row);
    return acc;
  }, {});
}

function sumField(arr, field) {
  return arr.reduce((s, r) => s + (Number(r[field]) || 0), 0);
}

function destroyChart(id) {
  if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; }
}

function makeGradient(ctx, hex, direction = 'vertical') {
  let grad;
  if (direction === 'vertical') {
    const { height } = ctx.canvas;
    grad = ctx.createLinearGradient(0, 0, 0, height);
  } else {
    const { width } = ctx.canvas;
    grad = ctx.createLinearGradient(0, 0, width, 0);
  }
  grad.addColorStop(0, hex + 'cc');
  grad.addColorStop(1, hex + '11');
  return grad;
}

// ─── LOAD CSV ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loading-state').classList.add('active');

  Papa.parse('revenue_by_product_line.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: results => {
      ALL_DATA = results.data.filter(r => r.order_number);
      FILT_DATA = [...ALL_DATA];
      document.getElementById('loading-state').classList.remove('active');
      document.getElementById('record-count').textContent = `${ALL_DATA.length} records loaded`;
      renderAll();
    },
    error: () => {
      document.getElementById('loading-state').innerHTML =
        '<p style="color:#ef4444">⚠️ Could not load CSV. Please open via a local server.</p>';
    }
  });
});

// ─── FILTER ───────────────────────────────────────────────────────────────────
function applyFilters() {
  const wh = document.getElementById('filter-warehouse').value;
  const cl = document.getElementById('filter-client').value;
  const mo = document.getElementById('filter-month').value;

  FILT_DATA = ALL_DATA.filter(r => {
    const date = new Date(r.date);
    const month = date.getMonth() + 1;
    return (wh === 'all' || r.warehouse === wh)
        && (cl === 'all' || r.client_type === cl)
        && (mo === 'all' || month === Number(mo));
  });

  renderAll();
}

function renderAll() {
  renderOverview();
  renderProducts();
  renderWarehouse();
  renderClients();
  renderPayments();
  renderTrends();
}

// ─── SECTION NAV ──────────────────────────────────────────────────────────────
const SECTION_TITLES = {
  overview : 'Overview',
  products : 'Product Lines',
  warehouse: 'Warehouses',
  clients  : 'Client Types',
  payments : 'Payments',
  trends   : 'Trends',
};

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
  document.getElementById('topbar-title').textContent = SECTION_TITLES[id];
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function renderOverview() {
  const d = FILT_DATA;
  const totalRev = sumField(d, 'total');
  const totalOrders = d.length;
  const totalQty = sumField(d, 'quantity');
  const avgOrder = totalOrders ? totalRev / totalOrders : 0;

  document.getElementById('kpi-total-revenue').textContent = fmt(totalRev);
  document.getElementById('kpi-revenue-sub').textContent = `from ${totalOrders} orders`;
  document.getElementById('kpi-total-orders').textContent = fmtN(totalOrders);
  document.getElementById('kpi-orders-sub').textContent = `across all warehouses`;
  document.getElementById('kpi-total-qty').textContent = fmtN(totalQty);
  document.getElementById('kpi-qty-sub').textContent = `units`;
  document.getElementById('kpi-avg-order').textContent = fmt(avgOrder);
  document.getElementById('kpi-avg-sub').textContent = `per order`;

  // Bar by product line
  const byProd = groupBy(d, 'product_line');
  const prodLabels = Object.keys(PRODUCT_COLORS);
  const prodRevs = prodLabels.map(p => sumField(byProd[p] || [], 'total'));

  destroyChart('product-bar');
  const ctx1 = document.getElementById('chart-product-bar').getContext('2d');
  CHARTS['product-bar'] = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: prodLabels.map(l => l.replace(' & ', ' &\n')),
      datasets: [{
        label: 'Revenue ($)',
        data: prodRevs,
        backgroundColor: prodLabels.map(p => PRODUCT_COLORS[p] + 'cc'),
        borderColor: prodLabels.map(p => PRODUCT_COLORS[p]),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed.y) } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });

  // Donut
  destroyChart('product-donut');
  const ctx2 = document.getElementById('chart-product-donut').getContext('2d');
  CHARTS['product-donut'] = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: prodLabels,
      datasets: [{
        data: prodRevs,
        backgroundColor: prodLabels.map(p => PRODUCT_COLORS[p] + 'cc'),
        borderColor: prodLabels.map(p => PRODUCT_COLORS[p]),
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } }
      }
    }
  });

  // Daily revenue line
  const byDate = {};
  d.forEach(r => {
    const dt = r.date.substring(0, 10);
    byDate[dt] = (byDate[dt] || 0) + Number(r.total);
  });
  const sortedDates = Object.keys(byDate).sort();
  const dailyRevs = sortedDates.map(dt => byDate[dt]);

  destroyChart('daily-revenue');
  const ctx3 = document.getElementById('chart-daily-revenue').getContext('2d');
  const grad3 = makeGradient(ctx3, '#6c63ff');
  CHARTS['daily-revenue'] = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: sortedDates.map(d => d.substring(5)),
      datasets: [{
        label: 'Daily Revenue',
        data: dailyRevs,
        borderColor: '#6c63ff',
        backgroundColor: grad3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });

  // Payment pie
  const byPay = groupBy(d, 'payment');
  destroyChart('payment-pie');
  const ctx4 = document.getElementById('chart-payment-pie').getContext('2d');
  CHARTS['payment-pie'] = new Chart(ctx4, {
    type: 'pie',
    data: {
      labels: Object.keys(byPay),
      datasets: [{
        data: Object.values(byPay).map(arr => arr.length),
        backgroundColor: ['#6c63ff99', '#06b6d499', '#f59e0b99'],
        borderColor: ['#6c63ff', '#06b6d4', '#f59e0b'],
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} orders` } }
      }
    }
  });
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
function renderProducts() {
  const d = FILT_DATA;
  const totalRev = sumField(d, 'total');
  const byProd = groupBy(d, 'product_line');
  const prodLabels = Object.keys(PRODUCT_COLORS);

  // Leader cards
  const stats = prodLabels.map(p => {
    const arr = byProd[p] || [];
    const rev = sumField(arr, 'total');
    const qty = sumField(arr, 'quantity');
    const avgPrice = qty ? sumField(arr, 'total') / qty : 0;
    return { name: p, rev, qty, orders: arr.length, avgPrice,
      pct: totalRev ? ((rev/totalRev)*100).toFixed(1) : 0 };
  }).sort((a,b) => b.rev - a.rev);

  const leaderEl = document.getElementById('product-leader-row');
  leaderEl.innerHTML = stats.map((s, i) => {
    const col = PRODUCT_COLORS[s.name];
    return `
    <div class="leader-card" style="border-top: 3px solid ${col}">
      <div class="lc-rank">#${i+1} by Revenue</div>
      <div class="lc-name">${s.name}</div>
      <div class="lc-value" style="color:${col}">${fmt(s.rev)}</div>
      <div class="lc-pct">${s.pct}% of total</div>
      <div class="lc-bar"><div class="lc-fill" style="width:${s.pct}%;background:${col}"></div></div>
    </div>`;
  }).join('');

  // Grouped bar: revenue + qty
  const revs = prodLabels.map(p => sumField(byProd[p]||[], 'total'));
  const qtys = prodLabels.map(p => sumField(byProd[p]||[], 'quantity'));

  destroyChart('product-grouped');
  const ctx1 = document.getElementById('chart-product-grouped').getContext('2d');
  CHARTS['product-grouped'] = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: prodLabels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revs,
          backgroundColor: prodLabels.map(p => PRODUCT_COLORS[p] + 'bb'),
          borderColor: prodLabels.map(p => PRODUCT_COLORS[p]),
          borderWidth: 2, borderRadius: 6, yAxisID: 'y',
        },
        {
          label: 'Units Sold',
          data: qtys,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.4)',
          borderWidth: 2, type: 'line', yAxisID: 'y1',
          tension: 0.4, pointRadius: 5,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: { callbacks: { label: c => c.datasetIndex === 0 ? ' Revenue: ' + fmt(c.parsed.y) : ' Units: ' + fmtN(c.parsed.y) } }
      },
      scales: {
        x: { grid: { display: false } },
        y: { position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } },
        y1: { position: 'right', grid: { display: false }, ticks: { callback: v => fmtK(v) } }
      }
    }
  });

  // Radar: avg unit price
  const avgPrices = prodLabels.map(p => {
    const arr = byProd[p] || [];
    const qty = sumField(arr, 'quantity');
    return qty ? sumField(arr, 'total') / qty : 0;
  });

  destroyChart('product-radar');
  const ctx2 = document.getElementById('chart-product-radar').getContext('2d');
  CHARTS['product-radar'] = new Chart(ctx2, {
    type: 'radar',
    data: {
      labels: prodLabels,
      datasets: [{
        label: 'Avg Unit Price ($)',
        data: avgPrices,
        backgroundColor: 'rgba(108,99,255,0.2)',
        borderColor: '#6c63ff',
        borderWidth: 2,
        pointBackgroundColor: prodLabels.map(p => PRODUCT_COLORS[p]),
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { font: { size: 10 }, color: '#94a3b8' },
          ticks: { display: false }
        }
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' $' + c.parsed.r.toFixed(2) } } }
    }
  });

  // Table
  const tbody = document.getElementById('product-table-body');
  tbody.innerHTML = stats.map(s => {
    const col = PRODUCT_COLORS[s.name];
    return `<tr>
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};margin-right:8px"></span>${s.name}</td>
      <td>${fmtN(s.orders)}</td>
      <td>${fmtN(s.qty)}</td>
      <td>${fmt(s.rev)}</td>
      <td>${fmt(s.orders ? s.rev/s.orders : 0)}</td>
      <td>$${s.avgPrice.toFixed(2)}</td>
      <td>
        <div class="share-bar-wrap">
          <div class="share-bar-bg"><div class="share-bar-fill" style="width:${s.pct}%;background:${col}"></div></div>
          <span class="share-pct">${s.pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── WAREHOUSE ────────────────────────────────────────────────────────────────
function renderWarehouse() {
  const d = FILT_DATA;
  const byWH = groupBy(d, 'warehouse');
  const warehouses = ['North', 'Central'];
  const colorMap = { North: '#6c63ff', Central: '#06b6d4' };
  const iconMap  = { North: '🏔️', Central: '🏙️' };

  // Comparison cards
  const compEl = document.getElementById('warehouse-comparison');
  compEl.innerHTML = warehouses.map(w => {
    const arr = byWH[w] || [];
    const rev = sumField(arr, 'total');
    const orders = arr.length;
    const qty = sumField(arr, 'quantity');
    const col = colorMap[w];
    return `
    <div class="wh-card" style="border-top:3px solid ${col}">
      <div class="wh-title" style="color:${col}">${iconMap[w]} ${w} Warehouse</div>
      <div class="wh-stats">
        <div class="wh-stat-item">
          <span class="stat-val" style="color:${col}">${fmt(rev)}</span>
          <span class="stat-lbl">Revenue</span>
        </div>
        <div class="wh-stat-item">
          <span class="stat-val">${fmtN(orders)}</span>
          <span class="stat-lbl">Orders</span>
        </div>
        <div class="wh-stat-item">
          <span class="stat-val">${fmtN(qty)}</span>
          <span class="stat-lbl">Units</span>
        </div>
      </div>
    </div>`;
  }).join('');

  // Revenue bar
  destroyChart('warehouse-revenue');
  const ctx1 = document.getElementById('chart-warehouse-revenue').getContext('2d');
  CHARTS['warehouse-revenue'] = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: warehouses,
      datasets: [{
        label: 'Revenue',
        data: warehouses.map(w => sumField(byWH[w]||[], 'total')),
        backgroundColor: warehouses.map(w => colorMap[w] + 'bb'),
        borderColor: warehouses.map(w => colorMap[w]),
        borderWidth: 2, borderRadius: 10,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });

  // North product pie
  const northByProd = groupBy(byWH['North'] || [], 'product_line');
  const prodLabels = Object.keys(PRODUCT_COLORS);
  destroyChart('north-product');
  const ctx2 = document.getElementById('chart-north-product').getContext('2d');
  CHARTS['north-product'] = new Chart(ctx2, {
    type: 'pie',
    data: {
      labels: prodLabels,
      datasets: [{
        data: prodLabels.map(p => sumField(northByProd[p]||[], 'total')),
        backgroundColor: prodLabels.map(p => PRODUCT_COLORS[p] + '99'),
        borderColor: prodLabels.map(p => PRODUCT_COLORS[p]),
        borderWidth: 2, hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)}` } } }
    }
  });

  // Central product pie
  const centralByProd = groupBy(byWH['Central'] || [], 'product_line');
  destroyChart('central-product');
  const ctx3 = document.getElementById('chart-central-product').getContext('2d');
  CHARTS['central-product'] = new Chart(ctx3, {
    type: 'pie',
    data: {
      labels: prodLabels,
      datasets: [{
        data: prodLabels.map(p => sumField(centralByProd[p]||[], 'total')),
        backgroundColor: prodLabels.map(p => PRODUCT_COLORS[p] + '99'),
        borderColor: prodLabels.map(p => PRODUCT_COLORS[p]),
        borderWidth: 2, hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)}` } } }
    }
  });

  // Monthly line by warehouse
  const months = [6, 7, 8];
  const monthlyData = warehouses.map(w => {
    return months.map(m => {
      const arr = (byWH[w] || []).filter(r => new Date(r.date).getMonth() + 1 === m);
      return sumField(arr, 'total');
    });
  });

  destroyChart('warehouse-monthly');
  const ctx4 = document.getElementById('chart-warehouse-monthly').getContext('2d');
  CHARTS['warehouse-monthly'] = new Chart(ctx4, {
    type: 'line',
    data: {
      labels: months.map(m => MONTH_NAMES[m]),
      datasets: warehouses.map((w, i) => ({
        label: w,
        data: monthlyData[i],
        borderColor: colorMap[w],
        backgroundColor: colorMap[w] + '22',
        fill: true, tension: 0.4, borderWidth: 3,
        pointRadius: 8, pointHoverRadius: 10,
        pointBackgroundColor: colorMap[w],
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
function renderClients() {
  const d = FILT_DATA;
  const byCl = groupBy(d, 'client_type');
  const colors = { Retail: '#6c63ff', Wholesale: '#f59e0b' };
  const icons  = { Retail: '🛍️', Wholesale: '📦' };

  const splitEl = document.getElementById('client-split');
  splitEl.innerHTML = ['Retail', 'Wholesale'].map(cl => {
    const arr = byCl[cl] || [];
    const rev = sumField(arr, 'total');
    const orders = arr.length;
    const qty = sumField(arr, 'quantity');
    const col = colors[cl];
    return `
    <div class="cs-card" style="border-top:3px solid ${col}">
      <div class="cs-title" style="color:${col}">${icons[cl]} ${cl}</div>
      <div class="cs-metrics">
        <div class="cs-metric"><span class="val" style="color:${col}">${fmt(rev)}</span><span class="lbl">Revenue</span></div>
        <div class="cs-metric"><span class="val">${fmtN(orders)}</span><span class="lbl">Orders</span></div>
        <div class="cs-metric"><span class="val">${fmtN(qty)}</span><span class="lbl">Units</span></div>
      </div>
    </div>`;
  }).join('');

  // Doughnut
  destroyChart('client-split');
  const ctx1 = document.getElementById('chart-client-split').getContext('2d');
  CHARTS['client-split'] = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: ['Retail', 'Wholesale'],
      datasets: [{
        data: ['Retail','Wholesale'].map(cl => sumField(byCl[cl]||[], 'total')),
        backgroundColor: ['#6c63ff99', '#f59e0b99'],
        borderColor: ['#6c63ff', '#f59e0b'],
        borderWidth: 2, hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)}` } } }
    }
  });

  // Grouped: avg order value retail vs wholesale per product
  const prodLabels = Object.keys(PRODUCT_COLORS);
  const retailByProd = groupBy(byCl['Retail'] || [], 'product_line');
  const wholesaleByProd = groupBy(byCl['Wholesale'] || [], 'product_line');
  const avgOrderRetail = prodLabels.map(p => {
    const arr = retailByProd[p] || [];
    return arr.length ? sumField(arr, 'total') / arr.length : 0;
  });
  const avgOrderWholesale = prodLabels.map(p => {
    const arr = wholesaleByProd[p] || [];
    return arr.length ? sumField(arr, 'total') / arr.length : 0;
  });

  destroyChart('client-product');
  const ctx2 = document.getElementById('chart-client-product').getContext('2d');
  CHARTS['client-product'] = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: prodLabels,
      datasets: [
        { label: 'Retail', data: avgOrderRetail, backgroundColor: '#6c63ff99', borderColor: '#6c63ff', borderWidth: 2, borderRadius: 6 },
        { label: 'Wholesale', data: avgOrderWholesale, backgroundColor: '#f59e0b99', borderColor: '#f59e0b', borderWidth: 2, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });

  // Daily orders line
  const byDate = {'Retail': {}, 'Wholesale': {}};
  d.forEach(r => {
    const dt = r.date.substring(0, 10);
    byDate[r.client_type][dt] = (byDate[r.client_type][dt] || 0) + 1;
  });
  const allDates = [...new Set(d.map(r => r.date.substring(0,10)))].sort();

  destroyChart('client-daily');
  const ctx3 = document.getElementById('chart-client-daily').getContext('2d');
  CHARTS['client-daily'] = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: allDates.map(d => d.substring(5)),
      datasets: [
        { label: 'Retail', data: allDates.map(dt => byDate['Retail'][dt] || 0), borderColor: '#6c63ff', backgroundColor: '#6c63ff22', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 },
        { label: 'Wholesale', data: allDates.map(dt => byDate['Wholesale'][dt] || 0), borderColor: '#f59e0b', backgroundColor: '#f59e0b22', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 15, font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1 } }
      }
    }
  });
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
function renderPayments() {
  const d = FILT_DATA;
  const byPay = groupBy(d, 'payment');
  const payIcons = { 'Cash': '💵', 'Credit card': '💳', 'Transfer': '🏦' };
  const payColors = { 'Cash': '#10b981', 'Credit card': '#6c63ff', 'Transfer': '#06b6d4' };

  // Payment cards
  const payCardsEl = document.getElementById('payment-cards');
  payCardsEl.innerHTML = Object.entries(byPay).map(([pay, arr]) => {
    const rev = sumField(arr, 'total');
    const fee = arr.reduce((s,r) => s + (Number(r.payment_fee) || 0) * Number(r.total), 0);
    const col = payColors[pay] || '#6c63ff';
    return `
    <div class="pay-card" style="border-top:3px solid ${col}">
      <div class="pay-icon">${payIcons[pay] || '💰'}</div>
      <div class="pay-name">${pay}</div>
      <div class="pay-stats">
        <div class="pay-stat"><span>Orders</span><span style="color:${col}">${fmtN(arr.length)}</span></div>
        <div class="pay-stat"><span>Revenue</span><span>${fmt(rev)}</span></div>
        <div class="pay-stat"><span>Est. Fees</span><span style="color:#ef4444">${fmt(fee)}</span></div>
        <div class="pay-stat"><span>Avg Order</span><span>${fmt(arr.length ? rev/arr.length : 0)}</span></div>
      </div>
    </div>`;
  }).join('');

  const payLabels = Object.keys(byPay);
  const payColorsArr = payLabels.map(p => payColors[p] + '99' || '#6c63ff99');
  const payBorderArr = payLabels.map(p => payColors[p] || '#6c63ff');

  // Doughnut
  destroyChart('pay-method');
  const ctx1 = document.getElementById('chart-pay-method').getContext('2d');
  CHARTS['pay-method'] = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: payLabels,
      datasets: [{
        data: payLabels.map(p => byPay[p].length),
        backgroundColor: payColorsArr,
        borderColor: payBorderArr,
        borderWidth: 2, hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} orders` } } }
    }
  });

  // Revenue bar
  destroyChart('pay-revenue');
  const ctx2 = document.getElementById('chart-pay-revenue').getContext('2d');
  CHARTS['pay-revenue'] = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: payLabels,
      datasets: [{
        label: 'Revenue',
        data: payLabels.map(p => sumField(byPay[p], 'total')),
        backgroundColor: payColorsArr,
        borderColor: payBorderArr,
        borderWidth: 2, borderRadius: 10,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });

  // Stacked bar: payment by client type
  const byCl = groupBy(d, 'client_type');
  const clLabels = ['Retail', 'Wholesale'];
  destroyChart('pay-client');
  const ctx3 = document.getElementById('chart-pay-client').getContext('2d');
  CHARTS['pay-client'] = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: clLabels,
      datasets: payLabels.map(pay => ({
        label: pay,
        data: clLabels.map(cl => {
          const arr = (byCl[cl] || []).filter(r => r.payment === pay);
          return arr.length;
        }),
        backgroundColor: (payColors[pay] || '#6c63ff') + '99',
        borderColor: payColors[pay] || '#6c63ff',
        borderWidth: 2, borderRadius: 4,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// ─── TRENDS ───────────────────────────────────────────────────────────────────
function renderTrends() {
  const d = FILT_DATA;
  const months = [6, 7, 8];

  // Monthly area
  const monthlyRevs = months.map(m => sumField(d.filter(r => new Date(r.date).getMonth()+1 === m), 'total'));
  const monthlyOrders = months.map(m => d.filter(r => new Date(r.date).getMonth()+1 === m).length);

  destroyChart('monthly-area');
  const ctx1 = document.getElementById('chart-monthly-area').getContext('2d');
  const grad1 = makeGradient(ctx1, '#6c63ff');
  CHARTS['monthly-area'] = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: months.map(m => MONTH_NAMES[m]),
      datasets: [
        {
          label: 'Revenue ($)',
          data: monthlyRevs,
          borderColor: '#6c63ff',
          backgroundColor: grad1,
          fill: true, tension: 0.4, borderWidth: 3,
          pointRadius: 10, pointHoverRadius: 13,
          pointBackgroundColor: '#6c63ff',
          yAxisID: 'y',
        },
        {
          label: 'Orders',
          data: monthlyOrders,
          borderColor: '#06b6d4',
          backgroundColor: '#06b6d422',
          fill: true, tension: 0.4, borderWidth: 2,
          pointRadius: 8, pointHoverRadius: 10,
          pointBackgroundColor: '#06b6d4',
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { callbacks: {
        label: c => c.datasetIndex === 0 ? ` Revenue: ${fmt(c.parsed.y)}` : ` Orders: ${fmtN(c.parsed.y)}`
      } } },
      scales: {
        x: { grid: { display: false } },
        y: { position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } },
        y1: { position: 'right', grid: { display: false } }
      }
    }
  });

  // Weekly stacked by product
  const getWeek = dateStr => {
    const d = new Date(dateStr);
    const start = new Date('2021-06-01');
    return Math.floor((d - start) / (7 * 24 * 3600 * 1000));
  };
  const weekSet = [...new Set(d.map(r => getWeek(r.date)))].sort((a,b) => a-b);
  const prodLabels = Object.keys(PRODUCT_COLORS);

  destroyChart('weekly-stacked');
  const ctx2 = document.getElementById('chart-weekly-stacked').getContext('2d');
  CHARTS['weekly-stacked'] = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: weekSet.map(w => `Wk ${w+1}`),
      datasets: prodLabels.map(p => ({
        label: p,
        data: weekSet.map(w => {
          const arr = d.filter(r => getWeek(r.date) === w && r.product_line === p);
          return sumField(arr, 'total');
        }),
        backgroundColor: PRODUCT_COLORS[p] + 'bb',
        borderColor: PRODUCT_COLORS[p],
        borderWidth: 1, stack: 'total',
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });

  // Day of week polar
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowCounts = new Array(7).fill(0);
  d.forEach(r => {
    const day = new Date(r.date).getDay();
    dowCounts[day]++;
  });

  destroyChart('dow');
  const ctx3 = document.getElementById('chart-dow').getContext('2d');
  CHARTS['dow'] = new Chart(ctx3, {
    type: 'polarArea',
    data: {
      labels: DOW,
      datasets: [{
        data: dowCounts,
        backgroundColor: ['#6c63ff88','#06b6d488','#f59e0b88','#10b98188','#ef444488','#a855f788','#ec489988'],
        borderColor: ['#6c63ff','#06b6d4','#f59e0b','#10b981','#ef4444','#a855f7','#ec4899'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { display: false } } },
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
    }
  });

  // Monthly product grouped
  const prodMonthlyRevs = prodLabels.map(p => months.map(m => {
    const arr = d.filter(r => r.product_line === p && new Date(r.date).getMonth()+1 === m);
    return sumField(arr, 'total');
  }));

  destroyChart('monthly-product');
  const ctx4 = document.getElementById('chart-monthly-product').getContext('2d');
  CHARTS['monthly-product'] = new Chart(ctx4, {
    type: 'bar',
    data: {
      labels: months.map(m => MONTH_NAMES[m]),
      datasets: prodLabels.map((p, i) => ({
        label: p,
        data: prodMonthlyRevs[i],
        backgroundColor: PRODUCT_COLORS[p] + 'bb',
        borderColor: PRODUCT_COLORS[p],
        borderWidth: 2, borderRadius: 5,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '$'+fmtK(v) } }
      }
    }
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtK(v) {
  if (v >= 1000000) return (v/1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v/1000).toFixed(0) + 'K';
  return v.toFixed(0);
}
