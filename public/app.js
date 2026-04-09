/* global localStorage, Chart, lucide */
const API_URL = 'https://fintrack-api-a3by.onrender.com'

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
  pendente: '⏳',
}

// Elementos da UI
const loginSection = document.getElementById('login-section')
const dashboardSection = document.getElementById('dashboard-section')
const loginError = document.getElementById('login-error')
const btnLogout = document.getElementById('btnLogout')
const btnAtualizar = document.getElementById('btnAtualizar')
const loadingEl = document.getElementById('loading')
const errorEl = document.getElementById('error')
const monthSelect = document.getElementById('month-select')
const yearSelect = document.getElementById('year-select')

// Login / Registro
const tabLogin = document.getElementById('tab-login')
const tabRegister = document.getElementById('tab-register')
const formLogin = document.getElementById('form-login')
const formRegister = document.getElementById('form-register')
const emailInput = document.getElementById('email-input')
const passwordInput = document.getElementById('password-input')
const loginBtn = document.getElementById('login-btn')
const regName = document.getElementById('reg-name')
const regEmail = document.getElementById('reg-email')
const regPassword = document.getElementById('reg-password')
const registerBtn = document.getElementById('register-btn')

const currentTransactions = []
let currentFilter = 'all'

// ----- INICIALIZAÇÃO -----
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
  // Garante que a aba de login esteja ativa ao voltar
  tabLogin.click()
}

function showDashboard() {
  loginSection.classList.add('hidden')
  dashboardSection.classList.remove('hidden')
  lucide.createIcons()
}

function fmt(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

// ----- ALTERNÂNCIA DE ABAS -----
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('bg-slate-900', 'text-white')
  tabLogin.classList.remove('border', 'border-slate-200', 'text-slate-500')
  tabRegister.classList.remove('bg-slate-900', 'text-white')
  tabRegister.classList.add(
    'border',
    'border-slate-200',
    'text-slate-500',
    'hover:bg-slate-50',
  )
  formLogin.classList.remove('hidden')
  formRegister.classList.add('hidden')
  loginError.textContent = ''
})

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('bg-slate-900', 'text-white')
  tabRegister.classList.remove('border', 'border-slate-200', 'text-slate-500')
  tabLogin.classList.remove('bg-slate-900', 'text-white')
  tabLogin.classList.add(
    'border',
    'border-slate-200',
    'text-slate-500',
    'hover:bg-slate-50',
  )
  formRegister.classList.remove('hidden')
  formLogin.classList.add('hidden')
  loginError.textContent = ''
})

// ----- REGISTRO -----
registerBtn.addEventListener('click', async () => {
  const name = regName.value.trim()
  const email = regEmail.value.trim()
  const password = regPassword.value.trim()

  if (!name || !email || password.length < 6) {
    loginError.textContent = 'Preencha todos os campos (senha mín. 6).'
    return
  }

  registerBtn.textContent = 'Cadastrando...'
  registerBtn.disabled = true
  loginError.textContent = ''

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erro ao cadastrar')
    }

    // Login automático após registro bem-sucedido
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!loginRes.ok)
      throw new Error('Conta criada, mas falha no login automático.')

    const data = await loginRes.json()
    token = data.accessToken
    localStorage.setItem('token', token)
    showDashboard()
    loadData()
  } catch (err) {
    loginError.textContent = err.message
  } finally {
    registerBtn.textContent = 'Cadastrar'
    registerBtn.disabled = false
  }
})

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click()
})
emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') passwordInput.focus()
})

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  if (!email || !password) {
    loginError.textContent = 'Preencha e-mail e senha.'
    return
  }

  loginBtn.textContent = 'Autenticando...'
  loginBtn.disabled = true
  loginError.textContent = ''

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
  } finally {
    loginBtn.textContent = 'Autenticar'
    loginBtn.disabled = false
  }
})

btnLogout.addEventListener('click', () => {
  localStorage.removeItem('token')
  token = null
  showLogin()
})

btnAtualizar.addEventListener('click', () => {
  loadData()
})

async function loadData() {
  loadingEl.classList.remove('hidden')
  errorEl.classList.add('hidden')

  try {
    const month = monthSelect.value
    const year = yearSelect.value
    const res = await fetch(
      `${API_URL}/transactions?month=${month}&year=${year}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) throw new Error('Erro ao carregar transações.')

    const data = await res.json()
    currentTransactions.length = 0
    currentTransactions.push(...(data.transactions ?? data))

    renderTransactions()
    renderChart()
  } catch (err) {
    errorEl.textContent = err.message
    errorEl.classList.remove('hidden')
  } finally {
    loadingEl.classList.add('hidden')
  }
}

function renderChart() {
  const canvas = document.getElementById('donutChart')
  if (!canvas) return

  const totals = {}
  currentTransactions
    .filter((t) => t.type === 'debit')
    .forEach((t) => {
      totals[t.category] = (totals[t.category] ?? 0) + Number(t.amount)
    })

  const labels = Object.keys(totals)
  const values = Object.values(totals)

  if (donutChart) donutChart.destroy()

  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: COLORS, borderWidth: 0 }],
    },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false } },
    },
  })
}

function renderTransactions() {
  const filtered =
    currentFilter === 'all'
      ? currentTransactions
      : currentTransactions.filter((t) => t.type === currentFilter)

  const txList = document.getElementById('txList')
  if (!txList) return

  if (filtered.length === 0) {
    txList.innerHTML =
      '<li class="text-center text-slate-400 text-xs py-8">Nenhuma transação encontrada.</li>'
    return
  }

  txList.innerHTML = filtered
    .map((t) => {
      const icon = categoryIcons[t.category] ?? '💳'
      const isCredit = t.type === 'credit'
      const amountClass = isCredit ? 'text-emerald-500' : 'text-rose-500'
      const sign = isCredit ? '+' : '-'
      return `
        <li class="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
          <span class="text-xl w-8 text-center">${icon}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-slate-900 truncate">${t.description ?? t.category}</p>
            <p class="text-[10px] text-slate-400">${t.category}</p>
          </div>
          <span class="text-xs font-black ${amountClass}">${sign} R$ ${fmt(t.amount)}</span>
        </li>`
    })
    .join('')
}

init()
