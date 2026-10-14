import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  Mail,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/ui/StatusBadge';

const UserProfile = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword && newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    try {
      const payload = { name };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      await updateProfile(payload);
      setFeedback({ type: 'success', message: 'Profile details updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const rolePermissions = {
    ADMIN: [
      'Full administrative access across all solar facilities',
      'Create, edit, configure, and delete solar plants',
      'Adjust system-wide SCADA alert thresholds & electricity tariffs',
      'Acknowledge and resolve critical alarms and work orders',
      'Manage user accounts and role privilege assignments'
    ],
    OPERATOR: [
      'Full monitoring of live generation curves and telemetry buses',
      'Acknowledge and resolve automated SCADA alarms',
      'Dispatch and manage preventive/corrective maintenance work orders',
      'Generate and download official PDF engineering audit reports',
      'Inject diagnostic simulation conditions'
    ],
    VIEWER: [
      'Read-only access to live telemetry and historical curves',
      'Inspect weather forecasts and irradiance data',
      'View IEC 61724 performance ratio and energy analytics',
      'Preview generation audit reports and financial valuations'
    ]
  };

  const permissions = rolePermissions[user?.role] || rolePermissions.VIEWER;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">User Account & Role Profile</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational credentials and access control authorization
          </p>
        </div>
        <StatusBadge status={user?.role} />
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role Privileges Overview (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Role Authorization</h3>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Current Role</span>
            <p className="text-base font-extrabold text-slate-900 mt-0.5 uppercase">{user?.role}</p>
          </div>

          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Permitted Capabilities:</span>
            <ul className="space-y-2">
              {permissions.map((p, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-600 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Profile Edit Form (2 Cols) */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <UserIcon className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Account Credentials</h3>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Email cannot be modified directly.</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Change Password (Optional)</h4>

              <div>
                <label className="block font-medium text-slate-600">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
