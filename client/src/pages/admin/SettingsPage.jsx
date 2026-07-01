import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchSettings, testSocialSettingsConnection, updateSettings } from '../../services/api';
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
  missionStatement: '',
  defaultDonationAmount: 50,
  amazonWishlistUrl: '',
  chewyWishlistUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  socialPostingEnabled: false,
  facebookPageId: '',
  facebookPageAccessToken: '',
  instagramBusinessAccountId: '',
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  groqApiKeyConfigured: false,
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
      setOrgSettings({
        orgName: settingsData.orgName || '',
        missionStatement: settingsData.missionStatement || '',
        defaultDonationAmount: settingsData.defaultDonationAmount ?? 50,
        amazonWishlistUrl: settingsData.amazonWishlistUrl || '',
        chewyWishlistUrl: settingsData.chewyWishlistUrl || '',
        facebookUrl: settingsData.facebookUrl || '',
        instagramUrl: settingsData.instagramUrl || '',
        socialPostingEnabled: Boolean(settingsData.socialPostingEnabled),
        facebookPageId: settingsData.facebookPageId || '',
        facebookPageAccessToken: '',
        instagramBusinessAccountId: settingsData.instagramBusinessAccountId || '',
        groqApiKey: '',
        groqModel: settingsData.groqModel || settingsData.grokModel || 'llama-3.3-70b-versatile',
        groqApiKeyConfigured: Boolean(settingsData.groqApiKeyConfigured ?? settingsData.xaiApiKeyConfigured),
      });

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
      setOrgSettings({
        orgName: updated.orgName || '',
        missionStatement: updated.missionStatement || '',
        defaultDonationAmount: updated.defaultDonationAmount ?? 50,
        amazonWishlistUrl: updated.amazonWishlistUrl || '',
        chewyWishlistUrl: updated.chewyWishlistUrl || '',
        facebookUrl: updated.facebookUrl || '',
        instagramUrl: updated.instagramUrl || '',
        socialPostingEnabled: Boolean(updated.socialPostingEnabled),
        facebookPageId: updated.facebookPageId || '',
        facebookPageAccessToken: '',
        instagramBusinessAccountId: updated.instagramBusinessAccountId || '',
        groqApiKey: '',
        groqModel: updated.groqModel || updated.grokModel || 'llama-3.3-70b-versatile',
        groqApiKeyConfigured: Boolean(updated.groqApiKeyConfigured ?? updated.xaiApiKeyConfigured),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setOrgSaving(false);
    }
  }

  function handleOrgFieldChange(field, value) {
    setOrgSettings((prev) => ({ ...prev, [field]: value }));
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Amazon Wishlist URL</span>
              <input
                type="url"
                value={orgSettings.amazonWishlistUrl}
                onChange={(e) => handleOrgFieldChange('amazonWishlistUrl', e.target.value)}
                disabled={!canManageOrg}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Chewy Wishlist URL</span>
              <input
                type="url"
                value={orgSettings.chewyWishlistUrl}
                onChange={(e) => handleOrgFieldChange('chewyWishlistUrl', e.target.value)}
                disabled={!canManageOrg}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>
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

          <div className="rounded-xl border border-brand/20 bg-brand-light/30 p-5">
            <h3 className="text-sm font-bold text-slate-900">AI Copywriter (Groq)</h3>
            <p className="mt-1 text-sm text-slate-600">
              Powers the Generate AI Caption button on the Publishing tab. Save your Groq key here, or set{' '}
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
