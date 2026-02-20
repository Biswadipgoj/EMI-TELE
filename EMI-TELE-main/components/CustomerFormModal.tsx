'use client';

import { useState, useEffect } from 'react';
import { Customer, Retailer } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface CustomerFormModalProps {
  customer?: Customer | null;
  retailers: Retailer[];
  onClose: () => void;
  onSaved: () => void;
  isAdmin: boolean;
}

const EMPTY = {
  retailer_id: '',
  customer_name: '',
  father_name: '',
  aadhaar: '',
  voter_id: '',
  address: '',
  landmark: '',
  mobile: '',
  alternate_number_1: '',
  alternate_number_2: '',
  model_no: '',
  imei: '',
  purchase_value: '',
  down_payment: '0',
  disburse_amount: '',
  purchase_date: new Date().toISOString().split('T')[0],
  emi_due_day: '5',
  emi_amount: '',
  emi_tenure: '6',
  first_emi_charge_amount: '0',
  box_no: '',
  // Image URLs
  customer_photo_url: '',
  aadhaar_front_url: '',
  aadhaar_back_url: '',
  bill_photo_url: '',
};

type FormData = typeof EMPTY;

function isValidUrl(url: string) {
  if (!url) return true; // optional
  try { new URL(url); return true; } catch { return false; }
}

export default function CustomerFormModal({ customer, retailers, onClose, onSaved, isAdmin }: CustomerFormModalProps) {
  const supabase = createClient();
  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'info' | 'finance' | 'images'>('info');

  useEffect(() => {
    if (customer) {
      setForm({
        retailer_id: customer.retailer_id,
        customer_name: customer.customer_name,
        father_name: customer.father_name || '',
        aadhaar: customer.aadhaar || '',
        voter_id: customer.voter_id || '',
        address: customer.address || '',
        landmark: customer.landmark || '',
        mobile: customer.mobile,
        alternate_number_1: customer.alternate_number_1 || '',
        alternate_number_2: customer.alternate_number_2 || '',
        model_no: customer.model_no || '',
        imei: customer.imei,
        purchase_value: String(customer.purchase_value),
        down_payment: String(customer.down_payment),
        disburse_amount: customer.disburse_amount ? String(customer.disburse_amount) : '',
        purchase_date: customer.purchase_date,
        emi_due_day: String(customer.emi_due_day),
        emi_amount: String(customer.emi_amount),
        emi_tenure: String(customer.emi_tenure),
        first_emi_charge_amount: String(customer.first_emi_charge_amount),
        box_no: customer.box_no || '',
        customer_photo_url: customer.customer_photo_url || '',
        aadhaar_front_url: customer.aadhaar_front_url || '',
        aadhaar_back_url: customer.aadhaar_back_url || '',
        bill_photo_url: customer.bill_photo_url || '',
      });
    }
  }, [customer]);

  function set(k: keyof FormData, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  // Auto-calc disburse_amount
  const pv = parseFloat(form.purchase_value) || 0;
  const dp = parseFloat(form.down_payment) || 0;
  const autoDisburse = pv > dp ? pv - dp : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.retailer_id) { toast.error('Please select a retailer'); return; }
    if (!form.imei || form.imei.length !== 15) { toast.error('IMEI must be exactly 15 digits'); return; }
    if (form.aadhaar && form.aadhaar.length !== 12) { toast.error('Aadhaar must be 12 digits'); return; }
    if (form.mobile.length !== 10) { toast.error('Mobile must be 10 digits'); return; }
    if (form.customer_photo_url && !isValidUrl(form.customer_photo_url)) { toast.error('Customer photo URL is invalid'); return; }
    if (form.aadhaar_front_url && !isValidUrl(form.aadhaar_front_url)) { toast.error('Aadhaar front URL is invalid'); return; }
    if (form.aadhaar_back_url && !isValidUrl(form.aadhaar_back_url)) { toast.error('Aadhaar back URL is invalid'); return; }
    if (form.bill_photo_url && !isValidUrl(form.bill_photo_url)) { toast.error('Bill photo URL is invalid'); return; }

    setLoading(true);
    const payload = {
      retailer_id: form.retailer_id,
      customer_name: form.customer_name.trim(),
      father_name: form.father_name || null,
      aadhaar: form.aadhaar || null,
      voter_id: form.voter_id || null,
      address: form.address || null,
      landmark: form.landmark || null,
      mobile: form.mobile,
      alternate_number_1: form.alternate_number_1 || null,
      alternate_number_2: form.alternate_number_2 || null,
      model_no: form.model_no || null,
      imei: form.imei,
      purchase_value: pv,
      down_payment: dp,
      disburse_amount: form.disburse_amount ? parseFloat(form.disburse_amount) : autoDisburse || null,
      purchase_date: form.purchase_date,
      emi_due_day: parseInt(form.emi_due_day),
      emi_amount: parseFloat(form.emi_amount),
      emi_tenure: parseInt(form.emi_tenure),
      first_emi_charge_amount: parseFloat(form.first_emi_charge_amount) || 0,
      box_no: form.box_no || null,
      customer_photo_url: form.customer_photo_url || null,
      aadhaar_front_url: form.aadhaar_front_url || null,
      aadhaar_back_url: form.aadhaar_back_url || null,
      bill_photo_url: form.bill_photo_url || null,
    };

    try {
      let error;
      if (customer) {
        ({ error } = await supabase.from('customers').update(payload).eq('id', customer.id));
      } else {
        ({ error } = await supabase.from('customers').insert(payload));
      }
      if (error) {
        if (error.code === '23505') toast.error('IMEI already exists in the system');
        else toast.error(error.message);
      } else {
        toast.success(customer ? 'Customer updated!' : 'Customer created!');
        onSaved();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: 'info', label: 'Personal & Device' },
    { key: 'finance', label: 'Finance & EMI' },
    { key: 'images', label: '🖼 Image URLs' },
  ] as const;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-card w-full max-w-3xl max-h-[92vh] flex flex-col animate-slide-up shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-obsidian-800 px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            {customer ? 'Edit Customer' : 'New Customer'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/[0.06] bg-obsidian-900/60">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t.key ? 'text-gold-400 border-b-2 border-gold-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* ── INFO TAB ── */}
            {tab === 'info' && (
              <>
                {/* Retailer selector */}
                <section>
                  <p className="section-header">Retailer</p>
                  <div>
                    <label className="form-label">Select Retailer <span className="text-gold-400">*</span></label>
                    <select value={form.retailer_id} onChange={e => set('retailer_id', e.target.value)} required disabled={!isAdmin && !!customer} className="form-input">
                      <option value="">— Select a retailer —</option>
                      {retailers.map(r => (
                        <option key={r.id} value={r.id}>{r.name} (@{r.username})</option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* Personal */}
                <section>
                  <p className="section-header">Personal Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Customer Name" field="customer_name" form={form} set={set} required placeholder="Full name" />
                    <F label="Father Name / C/O" field="father_name" form={form} set={set} placeholder="Father or guardian" />
                    <F label="Mobile" field="mobile" form={form} set={set} required placeholder="10 digits" maxLen={10} />
                    <F label="Alternate Number 1" field="alternate_number_1" form={form} set={set} placeholder="Optional" maxLen={10} />
                    <F label="Alternate Number 2" field="alternate_number_2" form={form} set={set} placeholder="Optional" maxLen={10} />
                    <F label="Aadhaar" field="aadhaar" form={form} set={set} placeholder="12 digits" maxLen={12} />
                    <F label="Voter ID" field="voter_id" form={form} set={set} placeholder="Optional" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <F label="Address" field="address" form={form} set={set} placeholder="Full address" />
                    <F label="Landmark" field="landmark" form={form} set={set} placeholder="Nearby landmark" />
                  </div>
                </section>

                {/* Device */}
                <section>
                  <p className="section-header">Device Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Model Number" field="model_no" form={form} set={set} placeholder="Phone model" />
                    <F label="IMEI" field="imei" form={form} set={set} required placeholder="15 digits (unique)" maxLen={15} />
                    <F label="Box Number" field="box_no" form={form} set={set} placeholder="Box/serial no." />
                  </div>
                </section>
              </>
            )}

            {/* ── FINANCE TAB ── */}
            {tab === 'finance' && (
              <>
                <section>
                  <p className="section-header">Financial Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <F label="Purchase Value (₹)" field="purchase_value" form={form} set={set} type="number" required placeholder="0" />
                    <F label="Down Payment (₹)" field="down_payment" form={form} set={set} type="number" placeholder="0" />
                    <div>
                      <label className="form-label">Disburse Amount (₹)</label>
                      <input
                        type="number"
                        value={form.disburse_amount}
                        onChange={e => set('disburse_amount', e.target.value)}
                        placeholder={autoDisburse > 0 ? `Auto: ${autoDisburse.toLocaleString('en-IN')}` : '0'}
                        className="form-input"
                      />
                      {autoDisburse > 0 && !form.disburse_amount && (
                        <p className="text-xs text-slate-600 mt-1">Auto-calculated: ₹{autoDisburse.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <p className="section-header">EMI Configuration</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Purchase Date" field="purchase_date" form={form} set={set} type="date" required />
                    <div>
                      <label className="form-label">EMI Due Day (1–28) <span className="text-gold-400">*</span></label>
                      <input type="number" min={1} max={28} value={form.emi_due_day} onChange={e => set('emi_due_day', e.target.value)} required className="form-input" />
                    </div>
                    <F label="Monthly EMI (₹)" field="emi_amount" form={form} set={set} type="number" required placeholder="0" />
                    <div>
                      <label className="form-label">EMI Tenure <span className="text-gold-400">*</span></label>
                      <select value={form.emi_tenure} onChange={e => set('emi_tenure', e.target.value)} required className="form-input">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'month' : 'months'}</option>
                        ))}
                      </select>
                    </div>
                    <F label="1st EMI Charge (₹)" field="first_emi_charge_amount" form={form} set={set} type="number" placeholder="0 if none" />
                  </div>

                  {form.emi_amount && form.emi_tenure && (
                    <div className="mt-4 p-4 rounded-xl bg-obsidian-900 border border-white/[0.05] grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Monthly EMI</p>
                        <p className="font-num text-gold-400 font-semibold">₹{parseFloat(form.emi_amount || '0').toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Tenure</p>
                        <p className="font-num text-gold-400 font-semibold">{form.emi_tenure} months</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total EMI Value</p>
                        <p className="font-num text-gold-400 font-semibold">₹{(parseFloat(form.emi_amount || '0') * parseInt(form.emi_tenure || '1')).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── IMAGES TAB ── */}
            {tab === 'images' && (
              <section>
                <p className="section-header">Document Image URLs</p>
                <p className="text-xs text-slate-600 mb-5">
                  Upload images to <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-sapphire-400 hover:underline">imgbb.com</a> and paste the direct image link here. Preview will appear below each field.
                </p>
                <div className="space-y-6">
                  <ImageURLField label="Customer Photo" field="customer_photo_url" form={form} set={set} required />
                  <ImageURLField label="Aadhaar Card (Front)" field="aadhaar_front_url" form={form} set={set} required />
                  <ImageURLField label="Aadhaar Card (Back)" field="aadhaar_back_url" form={form} set={set} required />
                  <ImageURLField label="Bill / Invoice Photo" field="bill_photo_url" form={form} set={set} required />
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-obsidian-800 border-t border-white/[0.06] px-6 py-4 flex justify-between items-center">
            <div className="flex gap-2">
              {tabs.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`w-2 h-2 rounded-full transition-colors ${tab === t.key ? 'bg-gold-400' : 'bg-obsidian-600'}`}
                  aria-label={t.label}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={loading} className="btn-gold">
                {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reusable field component
function F({ label, field, form, set, type = 'text', required = false, placeholder = '', maxLen }: {
  label: string; field: keyof FormData; form: FormData;
  set: (k: keyof FormData, v: string) => void;
  type?: string; required?: boolean; placeholder?: string; maxLen?: number;
}) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-gold-400 ml-1">*</span>}</label>
      <input
        type={type}
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLen}
        required={required}
        className="form-input"
      />
    </div>
  );
}

// Image URL input with live preview
function ImageURLField({ label, field, form, set, required }: {
  label: string; field: keyof FormData; form: FormData;
  set: (k: keyof FormData, v: string) => void;
  required?: boolean;
}) {
  const url = form[field] as string;
  const valid = isValidUrl(url);

  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-gold-400 ml-1">*</span>}</label>
      <input
        type="url"
        value={url}
        onChange={e => set(field, e.target.value)}
        placeholder="https://i.ibb.co/... (paste IBB image link)"
        className={`form-input ${url && !valid ? 'border-crimson-500/50' : ''}`}
      />
      {url && !valid && <p className="text-xs text-crimson-400 mt-1">⚠ Invalid URL format</p>}
      {url && valid && (
        <div className="mt-2 relative">
          <img
            src={url}
            alt={label}
            className="h-24 rounded-lg object-cover border border-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (next) next.style.display = 'flex';
            }}
            onLoad={(e) => {
              (e.target as HTMLImageElement).style.display = 'block';
              const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (next) next.style.display = 'none';
            }}
          />
          <div className="hidden h-24 rounded-lg border border-crimson-500/30 bg-crimson-500/5 items-center justify-center">
            <p className="text-xs text-crimson-400">⚠ Could not load image — check URL</p>
          </div>
        </div>
      )}
    </div>
  );
}
