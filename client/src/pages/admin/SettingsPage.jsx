import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Shield, Trash2, UserCog, Users } from 'lucide-react';
import WishlistManager from '../../components/admin/WishlistManager';
import { useAuth } from '../../context/AuthContext';
import { ORG_SETTINGS_ID, WISHLIST_OWNER_TYPES } from '../../constants/wishlists';
import { fetchSettings, testSocialSettingsConnection, updateSettings } from '../../services/api';
import { invalidatePublicSettingsCache } from '../../services/publicApi';
import { DEFAULT_GIVEBUTTER_EMBED, ensureGivebutterEmbed } from '../../constants/givebutterDefaults';
import {
  createRole,
  createUser,
  deactivateUser,
  deleteRole,
  fetchPermissions,
  fetchRoles,
  fetchUsers,
  updateRole,
  updateUser,
} from '../../services/authApi';

const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
];

const EMPTY_ORG = {
  orgName: '',
  orgEin: '',
  contactPhone: '',
  contactEmail: '',
  contactAddress: '',
  missionStatement: '',
  defaultDonationAmount: 50,
  facebookUrl: '',
  instagramUrl: '',
  socialPostingEnabled: false,
  facebookPageId: '',
  facebookPageAccessToken: '',
  instagramBusinessAccountId: '',
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  groqApiKeyConfigured: false,
  aiEnabled: true,
  donationWidgetCode: '',
  donatePageLive: false,
  paypalLink: '',
  stripeLink: '',
  venmoQrCodeUrl: '',
  venmoHandle: '',
  orgLogoUrl: '',
  emailsEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  smtpPassConfigured: false,
  fromEmail: '',
  fromName: '',
  adminNotifyEmail: '',
};

const EMPTY_USER = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  roleId: '',
  isActive: true,
};

const EMPTY_ROLE = {
  name: '',
  description: '',
  permissions: [],
};

function mapOrgSettingsFromApi(settingsData = {}) {
  return {
    orgName: settingsData.orgName || '',
    orgEin: settingsData.orgEin || '',
    contactPhone: settingsData.contactPhone || '',
    contactEmail: settingsData.contactEmail || '',
    contactAddress: settingsData.contactAddress || '',
    missionStatement: settingsData.missionStatement || '',
    defaultDonationAmount: settingsData.defaultDonationAmount ?? 50,
    facebookUrl: settingsData.facebookUrl || '',
    instagramUrl: settingsData.instagramUrl || '',
    socialPostingEnabled: Boolean(settingsData.socialPostingEnabled),
    facebookPageId: settingsData.facebookPageId || '',
    facebookPageAccessToken: '',
    instagramBusinessAccountId: settingsData.instagramBusinessAccountId || '',
    groqApiKey: '',
    groqModel: settingsData.groqModel || settingsData.grokModel || 'llama-3.3-70b-versatile',
    groqApiKeyConfigured: Boolean(settingsData.groqApiKeyConfigured ?? settingsData.xaiApiKeyConfigured),
    aiEnabled: settingsData.aiEnabled !== false,
    donationWidgetCode: settingsData.donationWidgetCode || '',
    donatePageLive: Boolean(settingsData.donatePageLive),
    paypalLink: settingsData.paypalLink || '',
    stripeLink: settingsData.stripeLink || '',
    venmoQrCodeUrl: settingsData.venmoQrCodeUrl || '',
    venmoHandle: settingsData.venmoHandle || '',
    orgLogoUrl: settingsData.orgLogoUrl || '',
    emailsEnabled: Boolean(settingsData.emailsEnabled),
    smtpHost: settingsData.smtpHost || '',
    smtpPort: settingsData.smtpPort ?? 587,
    smtpSecure: Boolean(settingsData.smtpSecure),
    smtpUser: settingsData.smtpUser || '',
    smtpPass: '',
    smtpPassConfigured: Boolean(settingsData.smtpPassConfigured),
    fromEmail: settingsData.fromEmail || '',
    fromName: settingsData.fromName || '',
    adminNotifyEmail: settingsData.adminNotifyEmail || '',
  };
}

function SettingsPage() {
  const { user: currentUser, refreshUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [orgSettings, setOrgSettings] = useState(EMPTY_ORG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userForm, setUserForm] = useState(null);
  const [roleForm, setRoleForm] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [orgSaving, setOrgSaving] = useState(false);
  const [socialTesting, setSocialTesting] = useState(false);
  const [socialTestMessage, setSocialTestMessage] = useState('');
  const [donationStatusMessage, setDonationStatusMessage] = useState('');

  const canManageUsers = hasPermission('users.manage');
  const canManageRoles = hasPermission('roles.manage');
  const canManageOrg = hasPermission('settings.manage');
  const canViewUsers = hasPermission('users.view');
  const canViewSettings = canViewUsers || canManageRoles || canManageOrg;

  const permissionsByModule = useMemo(() => {
    const groups = {};
    permissions.forEach((p) => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const settingsData = await fetchSettings();
      setOrgSettings(mapOrgSettingsFromApi(settingsData));

      const tasks = [];
      if (canViewUsers) tasks.push(fetchUsers().then(setUsers));
      if (canManageRoles || canViewUsers) {
        tasks.push(
          fetchRoles().then((rolesData) => {
            setRoles(rolesData);
            setSelectedRoleId((prev) => prev ?? rolesData[0]?.id ?? null);
          }),
          fetchPermissions().then(setPermissions),
        );
      }
      await Promise.all(tasks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canViewUsers, canManageRoles]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveOrganization(event) {
    event.preventDefault();
    if (!canManageOrg) return;
    setOrgSaving(true);
    setError('');
    try {
      const updated = await updateSettings({
        ...orgSettings,
        defaultDonationAmount: Number.parseInt(orgSettings.defaultDonationAmount, 10) || 50,
      });
      setOrgSettings(mapOrgSettingsFromApi(updated));
      invalidatePublicSettingsCache();
    } catch (err) {
      setError(err.message);
    } finally {
      setOrgSaving(false);
    }
  }

  function handleOrgFieldChange(field, value) {
    setOrgSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function setDonationPageLive(live) {
    if (!canManageOrg) return;
    setOrgSaving(true);
    setError('');
    setDonationStatusMessage('');
    try {
      const updated = await updateSettings({
        donatePageLive: live,
        donationWidgetCode: live
          ? ensureGivebutterEmbed(orgSettings.donationWidgetCode?.trim() || DEFAULT_GIVEBUTTER_EMBED)
          : orgSettings.donationWidgetCode,
      });
      setOrgSettings(mapOrgSettingsFromApi(updated));
      invalidatePublicSettingsCache();
      setDonationStatusMessage(
        live
          ? 'Donations are live. Open /donate in a new tab to test the public page.'
          : 'Donations are turned off. The public donate page now shows the coming-soon message.',
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setOrgSaving(false);
    }
  }

  function handleVenmoQrUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Venmo QR code must be an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Venmo QR code must be 5MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleOrgFieldChange('venmoQrCodeUrl', reader.result);
      setError('');
    };
    reader.onerror = () => setError('Could not read the Venmo QR image.');
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function handleOrgLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      setError('Logo must be a PNG or JPEG image.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be 5MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleOrgFieldChange('orgLogoUrl', reader.result);
      setError('');
    };
    reader.onerror = () => setError('Could not read the logo image.');
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function handleTestSocialConnection() {
    setSocialTesting(true);
    setSocialTestMessage('');
    setError('');
    try {
      const result = await testSocialSettingsConnection();
      setSocialTestMessage(result.message || 'Social connection successful.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSocialTesting(false);
    }
  }

  function openCreateUser() {
    setUserForm({ ...EMPTY_USER, roleId: roles[0]?.id || '' });
  }

  function openEditUser(user) {
    setUserForm({
      id: user.id,
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      isActive: user.isActive,
    });
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        email: userForm.email,
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        roleId: Number.parseInt(userForm.roleId, 10),
        isActive: userForm.isActive,
      };
      if (userForm.password) payload.password = userForm.password;

      if (userForm.id) {
        await updateUser(userForm.id, payload);
        if (currentUser?.id === userForm.id) {
          await refreshUser();
        }
      } else {
        if (!userForm.password) throw new Error('Password is required for new users');
        await createUser(payload);
      }

      setUserForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateUser(id) {
    if (!window.confirm('Deactivate this user? They will no longer be able to sign in.')) return;
    try {
      await deactivateUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function openCreateRole() {
    setRoleForm({ ...EMPTY_ROLE, permissions: [] });
  }

  function openEditRole(role) {
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
      isSystem: role.isSystem,
    });
  }

  function toggleRolePermission(key) {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  }

  async function saveRole(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (roleForm.id) {
        await updateRole(roleForm.id, {
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        });
        if (currentUser?.roleId === roleForm.id) {
          await refreshUser();
        }
      } else {
        await createRole(roleForm);
      }
      setRoleForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(id) {
    if (!window.confirm('Delete this role permanently?')) return;
    try {
      await deleteRole(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading settings...</p>;
  }

  if (!canViewSettings) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-12 text-center shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="mt-2 text-sm text-slate-500">You need permission to manage organization settings, users, or roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Organization & Access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage public-facing website text, donation defaults, and staff accounts.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.filter((tab) => {
            if (tab.id === 'organization') return canManageOrg || canViewSettings;
            if (tab.id === 'users') return canViewUsers;
            if (tab.id === 'roles') return canManageRoles || canViewUsers;
            return true;
          }).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 border-b-2 py-3 text-sm font-semibold ${
                activeTab === id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'organization' && (
        <form onSubmit={saveOrganization} className="space-y-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900">Public Website Content</h3>
            <p className="mt-1 text-sm text-slate-500">
              These values appear on the public site navbar, footer, home page, and donate page.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Organization Name</span>
            <input
              value={orgSettings.orgName}
              onChange={(e) => handleOrgFieldChange('orgName', e.target.value)}
              disabled={!canManageOrg}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Mission Statement</span>
            <textarea
              rows={4}
              value={orgSettings.missionStatement}
              onChange={(e) => handleOrgFieldChange('missionStatement', e.target.value)}
              disabled={!canManageOrg}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
            <p className="mt-1 text-sm text-slate-600">
              Shown on the public contact page, donate page, and site footer.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">EIN</span>
                <input
                  value={orgSettings.orgEin}
                  onChange={(e) => handleOrgFieldChange('orgEin', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="42-3678960"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Contact Phone</span>
                <input
                  type="tel"
                  value={orgSettings.contactPhone}
                  onChange={(e) => handleOrgFieldChange('contactPhone', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="(951) 830-1825"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Contact Email</span>
              <input
                type="email"
                value={orgSettings.contactEmail}
                onChange={(e) => handleOrgFieldChange('contactEmail', e.target.value)}
                disabled={!canManageOrg}
                placeholder="hello@pawsitivetransformations.org"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Mailing Address</span>
              <textarea
                rows={3}
                value={orgSettings.contactAddress}
                onChange={(e) => handleOrgFieldChange('contactAddress', e.target.value)}
                disabled={!canManageOrg}
                placeholder={'12523 Limonite, Suite 440412\nMira Loma, CA 91752\nRiverside County'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
              />
              <p className="mt-1 text-xs text-slate-500">One line per address row.</p>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-bold text-slate-900">Document Logo</h3>
            <p className="mt-1 text-sm text-slate-600">
              Appears on the first page header of generated agreement PDFs only. This is separate from the
              public website logo and does not change anything on the public site.
            </p>

            <label className="mt-4 block max-w-sm">
              <span className="mb-1 block text-xs font-medium text-slate-600">Logo (PNG or JPEG)</span>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleOrgLogoUpload}
                disabled={!canManageOrg}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
              />
              {orgSettings.orgLogoUrl ? (
                <div className="mt-3 flex items-start gap-4">
                  <img
                    src={orgSettings.orgLogoUrl}
                    alt="Document logo preview"
                    className="h-16 w-40 rounded-lg border border-slate-200 bg-white object-contain p-2"
                  />
                  {canManageOrg ? (
                    <button
                      type="button"
                      onClick={() => handleOrgFieldChange('orgLogoUrl', '')}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove logo
                    </button>
                  ) : null}
                </div>
              ) : null}
            </label>
          </div>

          <label className="block max-w-xs">
            <span className="mb-1 block text-xs font-medium text-slate-600">Default Donation Amount ($)</span>
            <input
              type="number"
              min="1"
              value={orgSettings.defaultDonationAmount}
              onChange={(e) => handleOrgFieldChange('defaultDonationAmount', e.target.value)}
              disabled={!canManageOrg}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>

          <WishlistManager
            ownerType={WISHLIST_OWNER_TYPES.ORG}
            ownerId={ORG_SETTINGS_ID}
            canManage={canManageOrg}
            title="Organization Wishlists"
            description="Manage global Amazon, Chewy, and Walmart wishlist links for the rescue."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Facebook URL</span>
              <input
                type="text"
                placeholder="https://facebook.com/your-page"
                value={orgSettings.facebookUrl}
                onChange={(e) => handleOrgFieldChange('facebookUrl', e.target.value)}
                disabled={!canManageOrg}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Instagram URL</span>
              <input
                type="text"
                placeholder="https://instagram.com/your-page"
                value={orgSettings.instagramUrl}
                onChange={(e) => handleOrgFieldChange('instagramUrl', e.target.value)}
                disabled={!canManageOrg}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Donation Page</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Turn the public donate page and kitten sponsorship checkout on or off without redeploying.
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  orgSettings.donatePageLive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {orgSettings.donatePageLive ? 'Live' : 'Off'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {canManageOrg ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDonationPageLive(true)}
                    disabled={orgSaving || orgSettings.donatePageLive}
                    className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {orgSaving ? 'Saving...' : 'Enable Donations & Test'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonationPageLive(false)}
                    disabled={orgSaving || !orgSettings.donatePageLive}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Turn Off Donations
                  </button>
                  <a
                    href="/donate"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-brand/30 bg-white px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light/40"
                  >
                    Preview Donate Page
                  </a>
                </>
              ) : null}
            </div>

            {donationStatusMessage ? (
              <p className="mt-3 text-sm font-medium text-emerald-700">{donationStatusMessage}</p>
            ) : null}

            <p className="mt-4 text-sm text-slate-600">
              Paste the full embed from Givebutter Dashboard → Sharing → Widgets (Form). It must include
              both the <code className="rounded bg-slate-200 px-1 text-xs">&lt;script&gt;</code> tag and a
              {' '}<code className="rounded bg-slate-200 px-1 text-xs">&lt;givebutter-giving-form&gt;</code> or
              {' '}<code className="rounded bg-slate-200 px-1 text-xs">&lt;givebutter-widget&gt;</code> tag.
              Enable saves a starter embed if the field is empty and upgrades script-only snippets automatically.
              After going live, point Givebutter webhooks to{' '}
              <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">/api/webhooks/givebutter</code>{' '}
              with event <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">transaction.succeeded</code>.
            </p>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">GiveButter Embed Code</span>
              <textarea
                rows={5}
                value={orgSettings.donationWidgetCode}
                onChange={(e) => handleOrgFieldChange('donationWidgetCode', e.target.value)}
                disabled={!canManageOrg}
                placeholder={DEFAULT_GIVEBUTTER_EMBED}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs disabled:bg-white"
              />
            </label>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Stripe Donation Link</span>
                <input
                  type="url"
                  value={orgSettings.stripeLink}
                  onChange={(e) => handleOrgFieldChange('stripeLink', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="https://buy.stripe.com/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">PayPal Donation Link</span>
                <input
                  type="url"
                  value={orgSettings.paypalLink}
                  onChange={(e) => handleOrgFieldChange('paypalLink', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="https://paypal.me/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Venmo Handle</span>
                <input
                  type="text"
                  value={orgSettings.venmoHandle}
                  onChange={(e) => handleOrgFieldChange('venmoHandle', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="@Pawsitive-Rescue"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Venmo QR Code</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleVenmoQrUpload}
                  disabled={!canManageOrg}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                />
                {orgSettings.venmoQrCodeUrl ? (
                  <div className="mt-3 flex items-start gap-4">
                    <img
                      src={orgSettings.venmoQrCodeUrl}
                      alt="Venmo QR code preview"
                      className="h-28 w-28 rounded-lg border border-slate-200 bg-white object-contain p-2"
                    />
                    {canManageOrg ? (
                      <button
                        type="button"
                        onClick={() => handleOrgFieldChange('venmoQrCodeUrl', '')}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove QR image
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-brand/20 bg-brand-light/30 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">AI Content Generation</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Organization-wide control for AI-assisted social captions (NIST GOVERN / opt-out).
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Enable AI Content Generation</span>
                <span className="relative inline-flex h-6 w-11 shrink-0">
                  <input
                    type="checkbox"
                    checked={orgSettings.aiEnabled}
                    onChange={(e) => handleOrgFieldChange('aiEnabled', e.target.checked)}
                    disabled={!canManageOrg}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-disabled:opacity-50" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
              </label>
            </div>

            <h4 className="mt-5 text-sm font-bold text-slate-900">AI Copywriter (Groq)</h4>
            <p className="mt-1 text-sm text-slate-600">
              Powers the Generate AI Caption button on the Publishing tab when AI is enabled. Save your Groq key here, or set{' '}
              <code className="rounded bg-white px-1 py-0.5 text-xs">GROQ_API_KEY</code> in Vercel environment
              variables.
            </p>
            {orgSettings.groqApiKeyConfigured && (
              <p className="mt-2 text-xs font-semibold text-emerald-700">Groq API key is configured.</p>
            )}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Groq API Key</span>
                <input
                  type="password"
                  value={orgSettings.groqApiKey}
                  onChange={(e) => handleOrgFieldChange('groqApiKey', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="Leave blank to keep existing key"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Groq Model</span>
                <input
                  type="text"
                  value={orgSettings.groqModel}
                  onChange={(e) => handleOrgFieldChange('groqModel', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="llama-3.3-70b-versatile"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email Delivery (SMTP)</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Powers all outbound email - application updates, donation receipts, and contract agreements,
                  including the signed-PDF action on the Contracts page. When disabled, emails are logged but
                  not sent.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Enable Email Sending</span>
                <span className="relative inline-flex h-6 w-11 shrink-0">
                  <input
                    type="checkbox"
                    checked={orgSettings.emailsEnabled}
                    onChange={(e) => handleOrgFieldChange('emailsEnabled', e.target.checked)}
                    disabled={!canManageOrg}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-disabled:opacity-50" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">SMTP Host</span>
                <input
                  type="text"
                  value={orgSettings.smtpHost}
                  onChange={(e) => handleOrgFieldChange('smtpHost', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="smtp.example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">SMTP Port</span>
                <input
                  type="number"
                  min="1"
                  value={orgSettings.smtpPort}
                  onChange={(e) => handleOrgFieldChange('smtpPort', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="587"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">SMTP Username</span>
                <input
                  type="text"
                  value={orgSettings.smtpUser}
                  onChange={(e) => handleOrgFieldChange('smtpUser', e.target.value)}
                  disabled={!canManageOrg}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">SMTP Password</span>
                <input
                  type="password"
                  value={orgSettings.smtpPass}
                  onChange={(e) => handleOrgFieldChange('smtpPass', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="Leave blank to keep existing password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
                {orgSettings.smtpPassConfigured && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">Password is configured.</p>
                )}
              </label>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={orgSettings.smtpSecure}
                onChange={(e) => handleOrgFieldChange('smtpSecure', e.target.checked)}
                disabled={!canManageOrg}
              />
              Use SSL/TLS (typically port 465 - leave unchecked for STARTTLS on port 587)
            </label>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">From Email</span>
                <input
                  type="email"
                  value={orgSettings.fromEmail}
                  onChange={(e) => handleOrgFieldChange('fromEmail', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="hello@pawsitivetransformations.org"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">From Name</span>
                <input
                  type="text"
                  value={orgSettings.fromName}
                  onChange={(e) => handleOrgFieldChange('fromName', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="Pawsitive Transformations"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Admin Notification Email</span>
                <input
                  type="email"
                  value={orgSettings.adminNotifyEmail}
                  onChange={(e) => handleOrgFieldChange('adminNotifyEmail', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="Where new-application and donation alerts are sent"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-bold text-slate-900">Automatic Social Posting (Facebook & Instagram)</h3>
            <p className="mt-1 text-sm text-slate-600">
              Profile URLs above appear on the public site footer. Add Facebook Graph API credentials here to publish
              kitten updates directly from the Publishing tab.
            </p>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={orgSettings.socialPostingEnabled}
                onChange={(e) => handleOrgFieldChange('socialPostingEnabled', e.target.checked)}
                disabled={!canManageOrg}
              />
              Enable automatic posting via Facebook Graph API
            </label>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Facebook Page ID</span>
                <input
                  type="text"
                  value={orgSettings.facebookPageId}
                  onChange={(e) => handleOrgFieldChange('facebookPageId', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="123456789012345"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Instagram Business Account ID (optional)</span>
                <input
                  type="text"
                  value={orgSettings.instagramBusinessAccountId}
                  onChange={(e) => handleOrgFieldChange('instagramBusinessAccountId', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="Auto-detected from Facebook page"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Facebook Page Access Token</span>
                <input
                  type="password"
                  value={orgSettings.facebookPageAccessToken}
                  onChange={(e) => handleOrgFieldChange('facebookPageAccessToken', e.target.value)}
                  disabled={!canManageOrg}
                  placeholder="Leave blank to keep existing token"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-white"
                />
              </label>
            </div>

            {canManageOrg && (
              <button
                type="button"
                onClick={handleTestSocialConnection}
                disabled={socialTesting}
                className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                {socialTesting ? 'Testing...' : 'Test Facebook Connection'}
              </button>
            )}

            {socialTestMessage && (
              <p className="mt-3 text-sm text-emerald-700">{socialTestMessage}</p>
            )}
          </div>

          {canManageOrg ? (
            <button
              type="submit"
              disabled={orgSaving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {orgSaving ? 'Saving...' : 'Save Organization Settings'}
            </button>
          ) : (
            <p className="text-sm text-slate-500">You can view these settings but need organization management permission to edit.</p>
          )}
        </form>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">User Accounts</h3>
            {canManageUsers && (
              <button
                type="button"
                onClick={openCreateUser}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                Add User
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  {canManageUsers && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.role?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManageUsers && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openEditUser(user)} className="text-brand hover:underline">
                            Edit
                          </button>
                          {user.isActive && (
                            <button type="button" onClick={() => handleDeactivateUser(user.id)} className="text-red-600 hover:underline">
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Roles</h3>
              {canManageRoles && (
                <button type="button" onClick={openCreateRole} className="text-sm font-semibold text-brand hover:underline">
                  + New Role
                </button>
              )}
            </div>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    selectedRoleId === role.id
                      ? 'border-brand bg-brand-light'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{role.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{role.userCount} users · {role.permissions.length} permissions</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
            {selectedRole ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedRole.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedRole.description}</p>
                    {selectedRole.isSystem && (
                      <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                        System Role
                      </span>
                    )}
                  </div>
                  {canManageRoles && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEditRole(selectedRole)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Edit Permissions
                      </button>
                      {!selectedRole.isSystem && (
                        <button type="button" onClick={() => handleDeleteRole(selectedRole.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  {Object.entries(permissionsByModule).map(([module, modulePermissions]) => {
                    const enabled = modulePermissions.filter((p) => selectedRole.permissions.includes(p.key));
                    if (enabled.length === 0) return null;
                    return (
                      <div key={module}>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{module}</h4>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {enabled.map((p) => (
                            <li key={p.key} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              {p.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a role to view its permissions.</p>
            )}
          </div>
        </div>
      )}

      {userForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveUser} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">{userForm.id ? 'Edit User' : 'Create User Account'}</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">First Name</span>
                <input required value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Last Name</span>
                <input required value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
              <input type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">{userForm.id ? 'New Password (optional)' : 'Password'}</span>
              <input type="password" required={!userForm.id} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Role</span>
              <select required value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={userForm.isActive} onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })} />
              Account is active
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setUserForm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {saving ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {roleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveRole} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">{roleForm.id ? 'Edit Role' : 'Create Role'}</h3>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Role Name</span>
              <input required value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Description</span>
              <input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="mt-6 space-y-4">
              {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                <div key={module}>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{module}</h4>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {modulePermissions.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={roleForm.permissions.includes(p.key)}
                          onChange={() => toggleRolePermission(p.key)}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setRoleForm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
