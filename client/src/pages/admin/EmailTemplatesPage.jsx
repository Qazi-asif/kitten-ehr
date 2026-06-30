import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Plus, Settings2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  fetchEmailLogs,
  fetchEmailTemplates,
  updateEmailSettings,
  updateEmailTemplate,
} from '../../services/api';

const TABS = [
  { id: 'templates', label: 'Templates', icon: Mail },
  { id: 'delivery', label: 'Delivery Settings', icon: Settings2 },
  { id: 'logs', label: 'Send Log', icon: Mail },
];

const EMPTY_TEMPLATE = {
  key: '',
  name: '',
  category: 'General',
  subject: '',
  bodyHtml: '',
  bodyText: '',
  description: '',
  isActive: true,
};

const EMPTY_DELIVERY = {
  emailsEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  fromEmail: '',
  fromName: '',
  adminNotifyEmail: '',
  smtpPassConfigured: false,
};

function EmailTemplatesPage() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const canView = hasPermission('emails.view');
  const canManage = hasPermission('emails.manage');
  const canConfigureDelivery = hasAnyPermission(['emails.manage', 'settings.manage']);

  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [variables, setVariables] = useState({});
  const [logs, setLogs] = useState([]);
  const [delivery, setDelivery] = useState(EMPTY_DELIVERY);
  const [selectedId, setSelectedId] = useState(null);
  const [templateForm, setTemplateForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0] ?? null,
    [templates, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEmailTemplates();
      setTemplates(data.templates || []);
      setVariables(data.variables || {});
      setSelectedId((prev) => prev ?? data.templates?.[0]?.id ?? null);
      if (data.delivery) setDelivery({ ...EMPTY_DELIVERY, ...data.delivery });

      const logsData = await fetchEmailLogs(100);
      setLogs(logsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  function openCreateTemplate() {
    setTemplateForm({ ...EMPTY_TEMPLATE });
  }

  function openEditTemplate(template) {
    setTemplateForm({
      id: template.id,
      key: template.key,
      name: template.name,
      category: template.category,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      description: template.description,
      isActive: template.isActive,
      isSystem: template.isSystem,
    });
  }

  async function saveTemplate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (templateForm.id) {
        await updateEmailTemplate(templateForm.id, {
          name: templateForm.name,
          category: templateForm.category,
          subject: templateForm.subject,
          bodyHtml: templateForm.bodyHtml,
          bodyText: templateForm.bodyText,
          description: templateForm.description,
          isActive: templateForm.isActive,
        });
      } else {
        await createEmailTemplate({
          key: templateForm.key,
          name: templateForm.name,
          category: templateForm.category,
          subject: templateForm.subject,
          bodyHtml: templateForm.bodyHtml,
          bodyText: templateForm.bodyText,
          description: templateForm.description,
          isActive: templateForm.isActive,
        });
      }
      setTemplateForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id) {
    if (!window.confirm('Delete this email template?')) return;
    try {
      await deleteEmailTemplate(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveDelivery(event) {
    event.preventDefault();
    if (!canConfigureDelivery) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...delivery };
      if (!payload.smtpPass) delete payload.smtpPass;
      delete payload.smtpPassConfigured;
      const updated = await updateEmailSettings(payload);
      setDelivery({ ...EMPTY_DELIVERY, ...updated });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-12 text-center shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="mt-2 text-sm text-slate-500">You need email template view permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading email module...</p>;
  }

  const categoryVars = selectedTemplate ? variables[selectedTemplate.category] || variables.General || [] : [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Email Module</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage automatic emails for applications and donations. Templates support variables like{' '}
              <code className="rounded bg-slate-100 px-1">{'{{applicantName}}'}</code>.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 border-b-2 py-3 text-sm font-semibold ${
                activeTab === id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Templates</h3>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreateTemplate}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
              )}
            </div>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    selectedId === template.id ? 'border-brand bg-brand-light' : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{template.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {template.category} · {template.key}
                    {!template.isActive && ' · Inactive'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
            {selectedTemplate ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedTemplate.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedTemplate.description}</p>
                    <p className="mt-2 text-xs text-slate-400">Key: {selectedTemplate.key}</p>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditTemplate(selectedTemplate)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      {!selectedTemplate.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</h4>
                    <p className="mt-1 text-sm text-slate-800">{selectedTemplate.subject}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">HTML Body</h4>
                    <div
                      className="prose prose-sm mt-2 max-w-none rounded-lg border border-slate-100 bg-slate-50 p-4"
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.bodyHtml }}
                    />
                  </div>
                  {categoryVars.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Available Variables</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {categoryVars.map((v) => (
                          <span key={v} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-600">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No templates yet. Create one to get started.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'delivery' && (
        <form onSubmit={saveDelivery} className="space-y-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900">SMTP & Delivery</h3>
            <p className="mt-1 text-sm text-slate-500">
              Enable automatic emails and configure your mail server. You can also set SMTP credentials via environment
              variables (SMTP_HOST, SMTP_USER, SMTP_PASS).
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={delivery.emailsEnabled}
              onChange={(e) => setDelivery({ ...delivery, emailsEnabled: e.target.checked })}
              disabled={!canConfigureDelivery}
            />
            Enable automatic emails
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">SMTP Host</span>
              <input
                value={delivery.smtpHost}
                onChange={(e) => setDelivery({ ...delivery, smtpHost: e.target.value })}
                disabled={!canConfigureDelivery}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">SMTP Port</span>
              <input
                type="number"
                value={delivery.smtpPort}
                onChange={(e) => setDelivery({ ...delivery, smtpPort: e.target.value })}
                disabled={!canConfigureDelivery}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">SMTP Username</span>
              <input
                value={delivery.smtpUser}
                onChange={(e) => setDelivery({ ...delivery, smtpUser: e.target.value })}
                disabled={!canConfigureDelivery}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                SMTP Password {delivery.smtpPassConfigured ? '(configured — leave blank to keep)' : ''}
              </span>
              <input
                type="password"
                value={delivery.smtpPass}
                onChange={(e) => setDelivery({ ...delivery, smtpPass: e.target.value })}
                disabled={!canConfigureDelivery}
                placeholder={delivery.smtpPassConfigured ? '••••••••' : ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">From Email</span>
              <input
                type="email"
                value={delivery.fromEmail}
                onChange={(e) => setDelivery({ ...delivery, fromEmail: e.target.value })}
                disabled={!canConfigureDelivery}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">From Name</span>
              <input
                value={delivery.fromName}
                onChange={(e) => setDelivery({ ...delivery, fromName: e.target.value })}
                disabled={!canConfigureDelivery}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">Admin Notification Email</span>
              <input
                type="email"
                value={delivery.adminNotifyEmail}
                onChange={(e) => setDelivery({ ...delivery, adminNotifyEmail: e.target.value })}
                disabled={!canConfigureDelivery}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={delivery.smtpSecure}
              onChange={(e) => setDelivery({ ...delivery, smtpSecure: e.target.checked })}
              disabled={!canConfigureDelivery}
            />
            Use SSL/TLS (port 465)
          </label>

          {canConfigureDelivery ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Delivery Settings'}
            </button>
          ) : (
            <p className="text-sm text-slate-500">You can view delivery settings but need manage permission to edit.</p>
          )}
        </form>
      )}

      {activeTab === 'logs' && (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Subject</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No email activity yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.templateKey}</td>
                    <td className="px-4 py-3 text-slate-700">{log.toEmail}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700'
                            : log.status === 'failed'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.provider || 'smtp'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={log.subject}>
                      {log.subject}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {templateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveTemplate} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">{templateForm.id ? 'Edit Template' : 'Create Template'}</h3>
            {!templateForm.id && (
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Template Key</span>
                <input
                  required
                  pattern="[a-z0-9._-]+"
                  value={templateForm.key}
                  onChange={(e) => setTemplateForm({ ...templateForm, key: e.target.value })}
                  placeholder="custom.welcome"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </label>
            )}
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
              <input
                required
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Category</span>
              <select
                value={templateForm.category}
                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Application">Application</option>
                <option value="Donation">Donation</option>
                <option value="General">General</option>
              </select>
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Subject</span>
              <input
                required
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">HTML Body</span>
              <textarea
                rows={6}
                value={templateForm.bodyHtml}
                onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Plain Text Body</span>
              <textarea
                rows={4}
                value={templateForm.bodyText}
                onChange={(e) => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Description</span>
              <input
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={templateForm.isActive}
                onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
              />
              Template is active
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setTemplateForm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default EmailTemplatesPage;
