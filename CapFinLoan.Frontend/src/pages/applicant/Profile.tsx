import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import api from '../../lib/axios';

interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  mobileNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  employmentStatus: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  ifscCode: string | null;
  annualIncome: number | null;
  profilePhotoDataUrl: string | null;
  isProfileComplete: boolean;
}

interface ProfileForm {
  mobileNumber: string;
  address: string;
  dateOfBirth: string;
  employmentStatus: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  annualIncome: string;
  profilePhotoDataUrl: string;
}

const BANK_OPTIONS = [
  'SBI - State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'IDFC FIRST Bank'
];

const EMPLOYMENT_OPTIONS = [
  'SALARIED',
  'SELF_EMPLOYED',
  'BUSINESS_OWNER',
  'FREELANCER',
  'OTHER'
];

export function ApplicantProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState<ProfileForm>({
    mobileNumber: '',
    address: '',
    dateOfBirth: '',
    employmentStatus: '',
    bankName: '',
    bankAccountNumber: '',
    ifscCode: '',
    annualIncome: '',
    profilePhotoDataUrl: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get<ProfileResponse>('/auth/me');
        const profile = res.data;
        setName(profile.name);
        setEmail(profile.email);
        setForm({
          mobileNumber: profile.mobileNumber ?? '',
          address: profile.address ?? '',
          dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
          employmentStatus: profile.employmentStatus ?? '',
          bankName: profile.bankName ?? '',
          bankAccountNumber: profile.bankAccountNumber ?? '',
          ifscCode: profile.ifscCode ?? '',
          annualIncome: profile.annualIncome?.toString() ?? '',
          profilePhotoDataUrl: profile.profilePhotoDataUrl ?? ''
        });
      } catch (err) {
        console.error(err);
        setError('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const completion = useMemo(() => {
    const fields = Object.values(form);
    const done = fields.filter(v => v.trim().length > 0).length;
    return Math.round((done / fields.length) * 100);
  }, [form]);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!/^\d{10}$/.test(form.mobileNumber.trim())) return 'Mobile number must be 10 digits.';
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(form.ifscCode.trim())) return 'Enter a valid IFSC code.';
    if (!/^\d{9,18}$/.test(form.bankAccountNumber.trim())) return 'Account number should be 9-18 digits.';
    if (!form.dateOfBirth) return 'Date of birth is required.';
    if (!/^\d+(\.\d{1,2})?$/.test(form.annualIncome.trim()) || Number(form.annualIncome) <= 0) return 'Annual income must be a valid positive amount.';
    if (!form.profilePhotoDataUrl.trim()) return 'Please upload your profile photo.';
    return '';
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for profile photo.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo must be 2MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      updateField('profilePhotoDataUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/profile', {
        mobileNumber: form.mobileNumber.trim(),
        address: form.address.trim(),
        dateOfBirth: form.dateOfBirth,
        employmentStatus: form.employmentStatus,
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        annualIncome: Number(form.annualIncome),
        profilePhotoDataUrl: form.profilePhotoDataUrl
      });
      setSuccess('Profile updated successfully. You can now apply for loans.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-headline font-extrabold text-on-surface">Complete Your Profile</h2>
            <p className="text-slate-500 mt-1">Set up account details required for loan applications.</p>
          </div>
          <div className="w-40">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Completion</p>
            <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${completion}%` }}></div>
            </div>
            <p className="text-xs text-slate-400 mt-1">{completion}%</p>
          </div>
        </header>

        <section className="rounded-2xl border border-white/5 bg-surface-container-low p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Full Name</p>
              <p className="text-on-surface font-semibold mt-1">{name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Email</p>
              <p className="text-on-surface font-semibold mt-1">{email}</p>
            </div>
          </div>
        </section>

        <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-white/5 bg-surface-container-low p-6">
          {error && <div className="text-sm bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl">{error}</div>}
          {success && <div className="text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Mobile Number</span>
              <input
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm"
                value={form.mobileNumber}
                onChange={e => updateField('mobileNumber', e.target.value)}
                placeholder="10-digit number"
                maxLength={10}
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Date of Birth</span>
              <input
                type="date"
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm"
                value={form.dateOfBirth}
                onChange={e => updateField('dateOfBirth', e.target.value)}
                required
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs text-slate-400">Address</span>
              <textarea
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm h-24 resize-none"
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                placeholder="Complete current residential address"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Annual Income (INR)</span>
              <input
                type="number"
                min={1}
                step="0.01"
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm"
                value={form.annualIncome}
                onChange={e => updateField('annualIncome', e.target.value)}
                placeholder="e.g. 850000"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Upload Your Photo</span>
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-container/30 file:px-3 file:py-2 file:text-xs file:font-semibold"
                onChange={onPhotoChange}
                required={!form.profilePhotoDataUrl}
              />
              {form.profilePhotoDataUrl && (
                <img
                  src={form.profilePhotoDataUrl}
                  alt="Profile preview"
                  className="h-20 w-20 rounded-full object-cover border border-white/20 mt-2"
                />
              )}
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Employment Status</span>
              <select
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm"
                value={form.employmentStatus}
                onChange={e => updateField('employmentStatus', e.target.value)}
                required
              >
                <option value="">Select status</option>
                {EMPLOYMENT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option.replace('_', ' ')}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Bank</span>
              <select
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm"
                value={form.bankName}
                onChange={e => updateField('bankName', e.target.value)}
                required
              >
                <option value="">Select bank</option>
                {BANK_OPTIONS.map(bank => (
                  <option key={bank} value={bank}>🏦 {bank}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">Account Number</span>
              <input
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm"
                value={form.bankAccountNumber}
                onChange={e => updateField('bankAccountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Digits only"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-slate-400">IFSC Code</span>
              <input
                className="w-full rounded-xl bg-surface-container border border-white/10 px-4 py-3 text-sm uppercase"
                value={form.ifscCode}
                onChange={e => updateField('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                required
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed font-bold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
