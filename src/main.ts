import './style.css'

type ExpenseCategory =
  | 'Makan'
  | 'Bensin'
  | 'Transportasi'
  | 'Listrik'
  | 'Internet'
  | 'Cicilan'
  | 'Hiburan'
  | 'Tabungan'
  | 'Investasi'
  | 'Lainnya'

type TransactionType = 'income' | 'expense'

type Transaction = {
  id: string
  title: string
  amount: number
  category: ExpenseCategory | 'Pemasukan'
  date: string
  type: TransactionType
  note: string
}

type BudgetState = {
  monthlyIncome: number
  transactions: Transaction[]
}

type StatusMessage = {
  type: 'error' | 'success'
  text: string
}

const STORAGE_KEY = 'pengatur-keuangan-state-v1'
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Makan',
  'Bensin',
  'Transportasi',
  'Listrik',
  'Internet',
  'Cicilan',
  'Hiburan',
  'Tabungan',
  'Investasi',
  'Lainnya',
]

const appRoot = document.querySelector<HTMLDivElement>('#app')

if (!appRoot) {
  throw new Error('Root element #app tidak ditemukan.')
}

let editingId: string | null = null
let statusMessage: StatusMessage | null = null
let state: BudgetState = loadState()

document.title = 'Pengatur Keuangan Pribadi'

function loadState(): BudgetState {
  const fallback: BudgetState = {
    monthlyIncome: 5000000,
    transactions: [],
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as Partial<BudgetState>

    if (!parsed || typeof parsed !== 'object') {
      return fallback
    }

    const monthlyIncome = Number(parsed.monthlyIncome)
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : []

    return {
      monthlyIncome: Number.isFinite(monthlyIncome) && monthlyIncome > 0 ? monthlyIncome : fallback.monthlyIncome,
      transactions: transactions.filter((item): item is Transaction => {
        return (
          item &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.date === 'string' &&
          typeof item.type === 'string' &&
          typeof item.note === 'string' &&
          typeof item.amount === 'number' &&
          Number.isFinite(item.amount) &&
          item.amount > 0
        )
      }),
    }
  } catch {
    statusMessage = {
      type: 'error',
      text: 'Data lokal rusak dan tidak bisa dibaca. Silakan mulai dengan data baru.',
    }
    return fallback
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getTotalIncome(): number {
  const additionalIncome = state.transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0)

  return state.monthlyIncome + additionalIncome
}

function getTotalExpenses(): number {
  return state.transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0)
}

function getRemainingBudget(): number {
  return getTotalIncome() - getTotalExpenses()
}

function getCategoryTotals(): Array<{ label: ExpenseCategory; total: number }> {
  const categoryTotals = new Map<ExpenseCategory, number>()

  for (const category of EXPENSE_CATEGORIES) {
    categoryTotals.set(category, 0)
  }

  for (const transaction of state.transactions) {
    if (transaction.type === 'expense') {
      const current = categoryTotals.get(transaction.category as ExpenseCategory) ?? 0
      categoryTotals.set(transaction.category as ExpenseCategory, current + transaction.amount)
    }
  }

  return EXPENSE_CATEGORIES.map((label) => ({
    label,
    total: categoryTotals.get(label) ?? 0,
  })).sort((a, b) => b.total - a.total)
}

function getFormDefaults() {
  const transaction = state.transactions.find((item) => item.id === editingId)

  if (transaction) {
    return {
      title: transaction.title,
      amount: String(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      note: transaction.note,
      type: transaction.type,
    }
  }

  return {
    title: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    note: '',
    type: 'expense' as TransactionType,
  }
}

function showStatus(type: 'error' | 'success', text: string) {
  statusMessage = { type, text }
  render()
}

function resetData() {
  state = {
    monthlyIncome: 5000000,
    transactions: [],
  }
  editingId = null
  statusMessage = {
    type: 'success',
    text: 'Data berhasil dibersihkan. Anda bisa memulai dari awal.',
  }
  saveState()
  render()
}

function loadDemoData() {
  state = {
    monthlyIncome: 7000000,
    transactions: [
      {
        id: 'demo-1',
        title: 'Makan siang',
        amount: 120000,
        category: 'Makan',
        date: '2026-09-02',
        type: 'expense',
        note: 'Warung dekat kantor',
      },
      {
        id: 'demo-2',
        title: 'Bensin',
        amount: 200000,
        category: 'Bensin',
        date: '2026-09-04',
        type: 'expense',
        note: 'Pengisian minggu ini',
      },
      {
        id: 'demo-3',
        title: 'Langganan internet',
        amount: 150000,
        category: 'Internet',
        date: '2026-09-05',
        type: 'expense',
        note: 'Internet rumah',
      },
      {
        id: 'demo-4',
        title: 'Nonton bioskop',
        amount: 90000,
        category: 'Hiburan',
        date: '2026-09-08',
        type: 'expense',
        note: 'Akhir pekan',
      },
    ],
  }
  editingId = null
  statusMessage = {
    type: 'success',
    text: 'Data demo sudah dimuat. Silakan sesuaikan sesuai kebutuhan Anda.',
  }
  saveState()
  render()
}

function handleBudgetSubmit(event: SubmitEvent) {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const input = form.querySelector<HTMLInputElement>('#monthly-income')
  const value = Number(input?.value ?? 0)

  if (!Number.isFinite(value) || value <= 0) {
    showStatus('error', 'Pemasukan bulanan harus berupa angka dan lebih dari 0.')
    return
  }

  state.monthlyIncome = value
  saveState()
  showStatus('success', 'Pemasukan bulanan berhasil diperbarui.')
}

function handleTransactionSubmit(event: SubmitEvent) {
  event.preventDefault()

  const form = event.currentTarget as HTMLFormElement
  const formData = new FormData(form)
  const title = String(formData.get('title') ?? '').trim()
  const amountValue = Number(formData.get('amount') ?? 0)
  const category = String(formData.get('category') ?? '') as ExpenseCategory
  const date = String(formData.get('date') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  const type = String(formData.get('type') ?? 'expense') as TransactionType

  if (!title) {
    showStatus('error', 'Judul transaksi wajib diisi.')
    return
  }

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    showStatus('error', 'Nominal transaksi harus lebih dari 0.')
    return
  }

  if (!date) {
    showStatus('error', 'Tanggal transaksi wajib diisi.')
    return
  }

  if (type === 'expense' && !EXPENSE_CATEGORIES.includes(category)) {
    showStatus('error', 'Kategori pengeluaran belum dipilih dengan benar.')
    return
  }

  const transaction: Transaction = {
    id: editingId ?? crypto.randomUUID(),
    title,
    amount: amountValue,
    category: type === 'income' ? 'Pemasukan' : category,
    date,
    note,
    type,
  }

  if (editingId) {
    state.transactions = state.transactions.map((item) => (item.id === editingId ? transaction : item))
    statusMessage = {
      type: 'success',
      text: 'Transaksi berhasil diperbarui.',
    }
  } else {
    state.transactions = [transaction, ...state.transactions]
    statusMessage = {
      type: 'success',
      text: 'Transaksi baru berhasil ditambahkan.',
    }
  }

  editingId = null
  saveState()
  render()
}

function handleDeleteTransaction(id: string) {
  const target = state.transactions.find((item) => item.id === id)

  if (!target) {
    return
  }

  const confirmed = window.confirm(`Hapus transaksi "${target.title}"?`)

  if (!confirmed) {
    return
  }

  state.transactions = state.transactions.filter((item) => item.id !== id)
  if (editingId === id) {
    editingId = null
  }
  saveState()
  showStatus('success', 'Transaksi berhasil dihapus.')
}

function handleEditTransaction(id: string) {
  editingId = id
  render()
}

function render() {
  const totalIncome = getTotalIncome()
  const totalExpenses = getTotalExpenses()
  const remainingBudget = getRemainingBudget()
  const categoryTotals = getCategoryTotals()
  const maxCategoryValue = Math.max(...categoryTotals.map((item) => item.total), 1)
  const formState = getFormDefaults()

  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Dashboard pribadi</p>
          <h1>Pengatur Keuangan</h1>
        </div>
        <div class="header-actions">
          <button class="button ghost" type="button" id="demo-button">Muat data demo</button>
          <button class="button danger" type="button" id="reset-button">Reset data</button>
        </div>
      </header>

      ${statusMessage ? `<div class="status-banner ${statusMessage.type}">${statusMessage.text}</div>` : ''}

      <section class="panel budget-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Pendapatan bulan ini</p>
            <h2>Anggaran bulanan</h2>
          </div>
        </div>

        <form id="budget-form" class="inline-form">
          <label class="field">
            <span>Pemasukan bulanan</span>
            <input id="monthly-income" name="monthly-income" type="number" min="0" step="1000" value="${state.monthlyIncome}" aria-label="Pemasukan bulanan" />
          </label>
          <button class="button primary" type="submit">Simpan</button>
        </form>
      </section>

      <section class="metrics-grid" aria-label="Ringkasan keuangan">
        <article class="metric card accent">
          <p>Total pemasukan</p>
          <strong>${formatCurrency(totalIncome)}</strong>
          <span>Seluruh pemasukan masuk</span>
        </article>
        <article class="metric card warning">
          <p>Total pengeluaran</p>
          <strong>${formatCurrency(totalExpenses)}</strong>
          <span>Belanja per kategori</span>
        </article>
        <article class="metric card success">
          <p>Sisa uang</p>
          <strong>${formatCurrency(remainingBudget)}</strong>
          <span>Saldo tersisa</span>
        </article>
      </section>

      ${totalExpenses > state.monthlyIncome && state.monthlyIncome > 0 ? `
        <section class="alert-banner" role="alert" aria-live="polite">
          Peringatan: pengeluaran Anda saat ini melebihi anggaran bulanan sebesar ${formatCurrency(totalExpenses - state.monthlyIncome)}.
        </section>
      ` : ''}

      <div class="content-grid">
        <section class="panel">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Kategori pengeluaran</p>
              <h2>Grafik pengeluaran</h2>
            </div>
          </div>

          <div class="category-list">
            ${categoryTotals
              .map((item) => {
                const width = (item.total / maxCategoryValue) * 100
                return `
                  <div class="category-row">
                    <div class="category-meta">
                      <span>${item.label}</span>
                      <strong>${formatCurrency(item.total)}</strong>
                    </div>
                    <div class="progress-shell" aria-label="${item.label}: ${formatCurrency(item.total)}">
                      <div class="progress-bar" style="width: ${width}%"></div>
                    </div>
                  </div>
                `
              })
              .join('')}
          </div>
        </section>

        <section class="panel">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Catatan harian</p>
              <h2>${editingId ? 'Edit transaksi' : 'Tambah transaksi'}</h2>
            </div>
          </div>

          <form id="transaction-form" class="transaction-form">
            <div class="field-row two-column">
              <label class="field">
                <span>Jenis</span>
                <select name="type" aria-label="Jenis transaksi">
                  <option value="expense" ${formState.type === 'expense' ? 'selected' : ''}>Pengeluaran</option>
                  <option value="income" ${formState.type === 'income' ? 'selected' : ''}>Pemasukan</option>
                </select>
              </label>

              <label class="field">
                <span>Tanggal</span>
                <input name="date" type="date" value="${formState.date}" aria-label="Tanggal transaksi" />
              </label>
            </div>

            <label class="field">
              <span>Judul</span>
              <input name="title" type="text" value="${formState.title}" placeholder="Contoh: Makan siang" aria-label="Judul transaksi" />
            </label>

            <div class="field-row two-column">
              <label class="field">
                <span>Nominal</span>
                <input name="amount" type="number" min="0" step="1" inputmode="numeric" value="${formState.amount}" placeholder="50000" aria-label="Nominal transaksi" required />
              </label>

              <label class="field">
                <span>Kategori</span>
                <select name="category" aria-label="Kategori transaksi">
                  ${EXPENSE_CATEGORIES.map((category) => {
                    const selected = formState.category === category ? 'selected' : ''
                    return `<option value="${category}" ${selected}>${category}</option>`
                  }).join('')}
                </select>
              </label>
            </div>

            <label class="field">
              <span>Catatan</span>
              <textarea name="note" rows="3" placeholder="Opsional" aria-label="Catatan transaksi">${formState.note}</textarea>
            </label>

            <div class="form-actions">
              <button class="button primary" type="submit">${editingId ? 'Simpan perubahan' : 'Tambah transaksi'}</button>
              ${editingId ? '<button class="button ghost" type="button" id="cancel-edit">Batal</button>' : ''}
            </div>
          </form>
        </section>
      </div>

      <section class="panel transactions-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Semua transaksi</p>
            <h2>Riwayat harian</h2>
          </div>
        </div>

        ${state.transactions.length === 0 ? `
          <div class="empty-state">
            <p>Belum ada transaksi. Tambahkan catatan harian pertama Anda.</p>
          </div>
        ` : `
          <div class="transaction-list">
            ${state.transactions
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((transaction) => `
                <article class="transaction-item ${transaction.type === 'expense' ? 'expense' : 'income'}">
                  <div class="transaction-main">
                    <div class="transaction-copy">
                      <h3>${transaction.title}</h3>
                      <p>${transaction.category} • ${formatDate(transaction.date)}</p>
                      ${transaction.note ? `<small>${transaction.note}</small>` : ''}
                    </div>
                    <div class="transaction-amount">
                      <strong>${transaction.type === 'expense' ? '-' : '+'}${formatCurrency(transaction.amount)}</strong>
                    </div>
                  </div>
                  <div class="transaction-actions">
                    <button class="button ghost small" type="button" data-action="edit" data-id="${transaction.id}">Edit</button>
                    <button class="button danger small" type="button" data-action="delete" data-id="${transaction.id}">Hapus</button>
                  </div>
                </article>
              `)
              .join('')}
          </div>
        `}
      </section>

      <footer class="site-footer">Website milik Abimanyu</footer>
    </div>
  `

  const budgetForm = appRoot.querySelector<HTMLFormElement>('#budget-form')
  budgetForm?.addEventListener('submit', handleBudgetSubmit)

  const transactionForm = appRoot.querySelector<HTMLFormElement>('#transaction-form')
  transactionForm?.addEventListener('submit', handleTransactionSubmit)

  const resetButton = appRoot.querySelector<HTMLButtonElement>('#reset-button')
  resetButton?.addEventListener('click', resetData)

  const demoButton = appRoot.querySelector<HTMLButtonElement>('#demo-button')
  demoButton?.addEventListener('click', loadDemoData)

  const cancelEditButton = appRoot.querySelector<HTMLButtonElement>('#cancel-edit')
  cancelEditButton?.addEventListener('click', () => {
    editingId = null
    statusMessage = null
    render()
  })

  appRoot.querySelectorAll<HTMLButtonElement>('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id
      if (id) {
        handleEditTransaction(id)
      }
    })
  })

  appRoot.querySelectorAll<HTMLButtonElement>('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id
      if (id) {
        handleDeleteTransaction(id)
      }
    })
  })
}

render()
