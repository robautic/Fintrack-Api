/* global localStorage, alert, confirm, Chart */
const API_URL = 'https://fintrack-api-a3by.onrender.com'

// Paleta Clara Premium (Azul Corporativo, Verde Suave, Laranja, etc)
const COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#64748b',
  '#14b8a6',
]

let donutChart = null
let token = localStorage.getItem('token')

const categoryIcons = {
  Alimentação: '🍔',
  Transporte: '🚗',
  Moradia: '🏠',
  Lazer: '🎮',
  Saúde: '💊',
  Educação: '📚',
  Serviços: '🛠️',
  Outros: '📦',
  Receita: '💰',
  Salário: '💼',
  manual: '✏️',
}

const loginSection = document.getElementById('login-section')
const dashboardSection = document.getElementById('dashboard-section')
const emailInput = document.getElementById('email-input')
const passwordInput = document.getElementById('password-input')
const loginBtn = document.getElementById('login-btn')
const loginError = document.getElementById('login-error')
const btnLogout = document.getElementById('btnLogout')
const btnAtualizar = document.getElementById('btnAtualizar')
const loadingEl = document.getElementById('loading')
const errorEl = document.getElementById('error')
const contentEl = document.getElementById('content')
const monthSelect = document.getElementById('month-select')
const yearSelect = document.getElementById('year-select')

let currentTransactions = []
let currentFilter = 'all'

function init() {
  if (token) {
    showDashboard()
    loadData()
  } else {
    showLogin()
  }

  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  monthSelect.innerHTML = months
    .map((m, i) => `<option value="${i + 1}">${m}</option>`)
    .join('')

  yearSelect.innerHTML = ''
  const currentYear = new Date().getFullYear()
  for (let y = currentYear; y >= currentYear - 5; y--) {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`
  }

  const now = new Date()
  monthSelect.value = now.getMonth() + 1
  yearSelect.value = now.getFullYear()

  // Filtros
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => {
        b.classList.remove('active', 'bg-slate-900', 'text-white')
      })
      btn.classList.add('active', 'bg-slate-900', 'text-white')
      currentFilter = btn.dataset.filter
      renderTransactions()
    })
  })
}

function showLogin() {
  loginSection.classList.remove('hidden')
  dashboardSection.classList.add('hidden')
}
function showDashboard() {
  loginSection.classList.add('hidden')
  dashboardSection.classList.remove('hidden')
}
function fmt(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function showLoading() {
  loadingEl.classList.remove('hidden')
  contentEl.classList.add('hidden')
}
function showError(msg) {
  loadingEl.classList.add('hidden')
  errorEl.textContent = msg
  errorEl.classList.remove('hidden')
}
function showContent() {
  loadingEl.classList.add('hidden')
  errorEl.classList.add('hidden')
  contentEl.classList.remove('hidden')
}

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error('Credenciais inválidas')
    const data = await res.json()
    token = data.accessToken
    localStorage.setItem('token', token)
    showDashboard()
    loadData()
  } catch (err) {
    loginError.textContent = err.message
  }
})

btnLogout.addEventListener('click', () => {
  localStorage.removeItem('token')
  token = null
  showLogin()
})

async function loadData() {
  showLoading()
  const month = monthSelect.value
  const year = yearSelect.value
  const metricsUrl = `${API_URL}/transactions/metrics/summary?month=${month}&year=${year}`
  try {
    const [metricsRes, txRes] = await Promise.all([
      fetch(metricsUrl, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
    if (!metricsRes.ok || !txRes.ok)
      throw new Error('Erro ao carregar os dados.')

    const metrics = await metricsRes.json()
    const { transactions } = await txRes.json()

    const filtered = transactions.filter((tx) => {
      const d = new Date(tx.created_at)
      return (
        (!month || d.getMonth() + 1 === parseInt(month)) &&
        (!year || d.getFullYear() === parseInt(year))
      )
    })

    currentTransactions = filtered
    renderKPIs(metrics)
    renderDonut(metrics.categories)
    renderTransactions()
    renderBudget(metrics.categories)
    showContent()
  } catch (err) {
    showError(err.message)
  }
}

btnAtualizar.addEventListener('click', loadData)
monthSelect.addEventListener('change', loadData)
yearSelect.addEventListener('change', loadData)

document.getElementById('add-manual').addEventListener('click', async () => {
  const title = document.getElementById('manual-title').value.trim()
  const amount = parseFloat(document.getElementById('manual-amount').value)
  const type = document.getElementById('manual-type').value
  if (!title || isNaN(amount) || amount <= 0) {
    alert('Preencha os campos corretamente.')
    return
  }
  try {
    const res = await fetch(`${API_URL}/transactions/manual`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, amount, type }),
    })
    if (!res.ok) throw new Error('Erro ao registrar transação.')
    document.getElementById('manual-title').value = ''
    document.getElementById('manual-amount').value = ''
    loadData()
  } catch (err) {
    alert(err.message)
  }
})

async function deleteTransaction(id) {
  if (!confirm('Excluir esta transação?')) return
  await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  loadData()
}

function renderKPIs(data) {
  document.getElementById('kpi-balance').textContent = `R$ ${fmt(data.balance)}`
  document.getElementById('kpi-income').textContent =
    `R$ ${fmt(data.totalIncome)}`
  document.getElementById('kpi-expenses').textContent =
    `R$ ${fmt(data.totalExpenses)}`
}

function renderDonut(categories) {
  if (!categories?.length) return
  if (donutChart) donutChart.destroy()
  const canvas = document.getElementById('donutChart')

  // Configuração para Tema Claro
  Chart.defaults.color = '#64748b' // text-slate-500
  Chart.defaults.font.family = 'Inter'

  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: categories.map((c) => c.category),
      datasets: [
        {
          data: categories.map((c) => c.total),
          backgroundColor: COLORS,
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: { cutout: '70%', plugins: { legend: { display: false } } },
  })

  // Legenda no Tema Claro
  document.getElementById('legend').innerHTML = categories
    .map(
      (c, i) => `
    <li class="flex justify-between items-center text-xs font-medium">
      <div class="flex items-center gap-2 text-slate-600">
        <span class="w-3 h-3 rounded-full" style="background:${COLORS[i % COLORS.length]}"></span>
        ${c.category}
      </div>
      <span class="text-slate-900 font-bold">R$ ${fmt(c.total)}</span>
    </li>
  `,
    )
    .join('')
}

function renderTransactions() {
  const list = document.getElementById('txList')
  let filtered =
    currentFilter === 'all'
      ? currentTransactions
      : currentTransactions.filter(
          (tx) => tx.amount > 0 === (currentFilter === 'credit'),
        )
  filtered = [...filtered].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )

  if (!filtered.length) {
    list.innerHTML =
      '<li class="text-center text-slate-400 text-xs py-4">Nenhuma transação encontrada.</li>'
    return
  }

  // Lista Limpa e Minimalista
  list.innerHTML = filtered
    .map((tx) => {
      const icon = categoryIcons[tx.category] || (tx.amount > 0 ? '💰' : '📌')
      const isPos = tx.amount > 0
      const colorVal = isPos ? 'text-emerald-500' : 'text-slate-900'
      const bgIcon = isPos
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-slate-100 text-slate-600'

      return `
      <li class="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100">
        <div class="flex gap-4 items-center">
          <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${bgIcon}">${icon}</div>
          <div>
            <p class="text-sm font-bold text-slate-900">${tx.title}</p>
            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">${tx.category} • ${new Date(tx.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm font-black ${colorVal}">${isPos ? '+' : '-'} R$ ${fmt(Math.abs(tx.amount))}</span>
          <button class="delete-btn opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all cursor-pointer" data-id="${tx.id}">🗑️</button>
        </div>
      </li>`
    })
    .join('')

  document
    .querySelectorAll('.delete-btn')
    .forEach((b) =>
      b.addEventListener('click', () => deleteTransaction(b.dataset.id)),
    )
}

function renderBudget(categories) {
  const limits = {
    Alimentação: 1000,
    Transporte: 600,
    Lazer: 400,
    Saúde: 300,
    Moradia: 2000,
  }
  const budgetDiv = document.getElementById('budgetList')

  budgetDiv.innerHTML = categories
    .slice(0, 4)
    .map((cat) => {
      const spent = cat.total
      const limit = limits[cat.category] || 500
      const percent = Math.min((spent / limit) * 100, 100)

      let colorClass = 'bg-slate-800' // Escuro para focar no minimalismo
      if (percent > 90) colorClass = 'bg-rose-500'
      else if (percent > 70) colorClass = 'bg-amber-500'

      return `
      <div class="space-y-2 mb-4">
        <div class="flex justify-between text-xs font-bold text-slate-600">
          <span>${cat.category}</span>
          <span class="text-slate-900">R$ ${fmt(spent)} <span class="text-slate-400 font-medium">/ R$ ${fmt(limit)}</span></span>
        </div>
        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full ${colorClass} transition-all duration-1000" style="width:${percent}%"></div>
        </div>
      </div>`
    })
    .join('')
}

init()
