import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createTransaction,
  deleteTransaction,
  fetchFinanceStats,
  fetchKittens,
  fetchTransactions,
} from '../../services/api';

const TYPE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'INCOME', label: 'Income' },
  { id: 'EXPENSE', label: 'Expense' },
];

const INCOME_CATEGORIES = ['Donation', 'Sponsorship', 'Grant', 'Fundraiser', 'Other Income'];
const EXPENSE_CATEGORIES = ['Vet Bill', 'Food', 'Supplies', 'Medication', 'Transport', 'Other Expense'];

const EMPTY_FORM = {
  type: 'INCOME',
  category: 'Donation',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  kittenId: '',
};

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTransactionDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { timeZone: 'UTC' });
}

function FinancePage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('donations.manage');
  const [stats, setStats] = useState({
    income: { month: 0 },
    expenses: { month: 0 },
    netProfitMonth: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [kittens, setKittens] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const categoryOptions = useMemo(
    () => (form.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
    [form.type],
  );

  const loadStats = useCallback(async () => {
    const data = await fetchFinanceStats();
    setStats(data);
  }, []);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const data = await fetchTransactions({
        type: typeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setTransactions(data);
    } finally {
      setTransactionsLoading(false);
    }
  }, [typeFilter, startDate, endDate]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, kittensData] = await Promise.all([fetchFinanceStats(), fetchKittens()]);
      setStats(statsData);
      setKittens(kittensData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadTransactions().catch((err) => setError(err.message));
  }, [loadTransactions]);

  function handleFormTypeChange(type) {
    const defaultCategory = type === 'INCOME' ? 'Donation' : 'Vet Bill';
    setForm((prev) => ({ ...prev, type, category: defaultCategory }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createTransaction({
        type: form.type,
        category: form.category,
        amount: form.amount,
        date: form.date,
        description: form.description,
        kittenId: form.kittenId || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await Promise.all([loadStats(), loadTransactions()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;

    setError('');
    try {
      await deleteTransaction(id);
      await Promise.all([loadStats(), loadTransactions()]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
          <p className="mt-1 text-sm text-slate-500">Track rescue income, expenses, and monthly balance.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-800">Income this Month</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{formatCurrency(stats.income?.month)}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-800">Expenses this Month</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{formatCurrency(stats.expenses?.month)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
          <p className="text-sm font-medium text-slate-300">Net Balance</p>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(stats.netProfitMonth)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.id || 'all'}
                type="button"
                onClick={() => setTypeFilter(filter.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  typeFilter === filter.id
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading finance summary...</p>}

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Kitten</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Description</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {transactionsLoading ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatTransactionDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.type === 'INCOME' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{tx.category}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.kitten?.name || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.description || '—'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(tx.id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {showForm && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Add Transaction</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Type</span>
                <select
                  value={form.type}
                  onChange={(e) => handleFormTypeChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Category</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Amount</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Date</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Linked Kitten (optional)</span>
                <select
                  value={form.kittenId}
                  onChange={(e) => setForm((prev) => ({ ...prev, kittenId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {kittens.map((kitten) => (
                    <option key={kitten.id} value={kitten.id}>{kitten.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default FinancePage;
