'use client';

import { useState, useEffect } from 'react';
import { Customer, EMISchedule, DueBreakdown } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PaymentModalProps {
  customer: Customer;
  emis: EMISchedule[];
  breakdown: DueBreakdown;
  onClose: () => void;
  onSubmitted: () => void;
  isAdmin?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export default function PaymentModal({ customer, emis, breakdown, onClose, onSubmitted, isAdmin }: PaymentModalProps) {
  const unpaidEmis = emis.filter(e => e.status === 'UNPAID');
  const defaultEmiNo = breakdown.next_emi_no ?? unpaidEmis[0]?.emi_no;

  const [selectedEmiNo, setSelectedEmiNo] = useState<number>(defaultEmiNo ?? 0);
  const [mode, setMode] = useState<'CASH' | 'UPI'>('CASH');
  const [retailerPin, setRetailerPin] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const selectedEmi = unpaidEmis.find(e => e.emi_no === selectedEmiNo);
  const emiAmount = selectedEmi?.amount ?? 0;
  const fineAmount = breakdown.fine_due;
  const firstEmiCharge = breakdown.first_emi_charge_due;
  const totalPayable = emiAmount + fineAmount + firstEmiCharge;

  // Generate QR code when UPI selected
  useEffect(() => {
    if (mode === 'UPI' && totalPayable > 0) {
      import('qrcode').then(QRCode => {
        const upiStr = `upi://pay?pa=telepoint@upi&pn=TelePoint&am=${totalPayable}&tn=EMI_${customer.imei}&cu=INR`;
        QRCode.toDataURL(upiStr, { width: 220, margin: 1 }).then(setQrDataUrl);
      });
    }
  }, [mode, totalPayable, customer.imei]);

  async function handleSubmit() {
    if (!isAdmin && !retailerPin.trim()) {
      toast.error('Retailer PIN is required to submit payment');
      return;
    }
    if (!selectedEmi) {
      toast.error('Please select an EMI to pay');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isAdmin ? '/api/payments/approve-direct' : '/api/payments/submit';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          emi_ids: [selectedEmi.id],
          emi_nos: [selectedEmi.emi_no],
          mode,
          notes: notes || null,
          retail_pin: isAdmin ? undefined : retailerPin,
          total_emi_amount: emiAmount,
          fine_amount: fineAmount,
          first_emi_charge_amount: firstEmiCharge,
          total_amount: totalPayable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed');
      } else {
        toast.success(isAdmin ? 'Payment recorded and approved!' : 'Payment request submitted — awaiting admin approval');
        onSubmitted();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-card w-full max-w-lg max-h-[92vh] overflow-y-auto animate-slide-up shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] bg-obsidian-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              {isAdmin ? 'Record Payment' : 'Submit Payment Request'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{customer.customer_name} · {customer.imei}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* 1st EMI Charge alert */}
          {breakdown.popup_first_emi_charge && (
            <div className="alert-gold">
              <p className="text-gold-300 font-semibold text-sm">⚠️ 1st EMI Charge Pending</p>
              <p className="text-gold-400/70 text-xs mt-0.5">This one-time charge of {fmt(firstEmiCharge)} will be included in the total.</p>
            </div>
          )}

          {/* Fine alert */}
          {breakdown.popup_fine_due && (
            <div className="alert-red">
              <p className="text-crimson-300 font-semibold text-sm">🔴 Late Fine: {fmt(fineAmount)}</p>
              <p className="text-crimson-400/70 text-xs mt-0.5">EMI is overdue. Fine applies to this payment.</p>
            </div>
          )}

          {/* EMI Selection — MUST show all unpaid, let user pick */}
          <div>
            <label className="form-label">Select EMI to Pay <span className="text-gold-400">*</span></label>
            {unpaidEmis.length === 0 ? (
              <div className="p-4 rounded-xl bg-jade-500/10 border border-jade-500/20 text-jade-400 text-sm text-center">
                ✓ All EMIs are paid or pending approval
              </div>
            ) : (
              <div className="space-y-2">
                {unpaidEmis.map(emi => {
                  const isNext = emi.emi_no === breakdown.next_emi_no;
                  const isOverdue = new Date(emi.due_date) < new Date();
                  const isSelected = selectedEmiNo === emi.emi_no;
                  return (
                    <button
                      key={emi.id}
                      type="button"
                      onClick={() => setSelectedEmiNo(emi.emi_no)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-gold-500/15 border-gold-500/40'
                          : 'border-white/[0.08] hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-gold-500 border-gold-500' : 'border-white/20'
                        }`}>
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span className={`text-sm font-semibold ${isSelected ? 'text-gold-300' : 'text-slate-200'}`}>
                            EMI #{emi.emi_no}
                          </span>
                          {isNext && <span className="ml-2 text-[10px] bg-jade-500/20 text-jade-400 px-1.5 py-0.5 rounded-full font-bold">NEXT DUE</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-num text-sm text-white">{fmt(emi.amount)}</p>
                        <p className={`text-xs font-num ${isOverdue ? 'text-crimson-400' : 'text-slate-500'}`}>
                          {format(new Date(emi.due_date), 'd MMM yyyy')}
                          {isOverdue && ' ⚠'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment mode */}
          <div>
            <label className="form-label">Payment Mode</label>
            <div className="flex gap-3">
              {(['CASH', 'UPI'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    mode === m
                      ? m === 'UPI'
                        ? 'bg-sapphire-500/20 border-sapphire-500/40 text-sapphire-300'
                        : 'bg-jade-500/20 border-jade-500/40 text-jade-300'
                      : 'border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {m === 'CASH' ? '💵 Cash' : '📱 UPI'}
                </button>
              ))}
            </div>
          </div>

          {/* UPI QR */}
          {mode === 'UPI' && qrDataUrl && (
            <div className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white">
              <img src={qrDataUrl} alt="UPI QR" className="w-48 h-48" />
              <p className="text-obsidian-900 text-sm font-bold">{fmt(totalPayable)}</p>
              <p className="text-obsidian-600 text-xs">telepoint@upi · TelePoint</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional notes..." className="form-input resize-none" />
          </div>

          {/* Retailer PIN (not admin) */}
          {!isAdmin && (
            <div>
              <label className="form-label">Retailer PIN <span className="text-gold-400">*</span></label>
              <input
                type="password"
                value={retailerPin}
                onChange={e => setRetailerPin(e.target.value)}
                placeholder="Enter your Retail PIN to confirm"
                className="form-input"
                autoComplete="off"
                inputMode="numeric"
              />
              <p className="text-xs text-slate-600 mt-1.5">Your 4–6 digit Retail PIN — separate from your login password.</p>
            </div>
          )}

          {/* Total breakdown */}
          <div className="rounded-2xl border border-gold-500/20 bg-gold-500/8 p-5 space-y-2">
            {emiAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">EMI #{selectedEmiNo}</span>
                <span className="font-num text-white">{fmt(emiAmount)}</span>
              </div>
            )}
            {firstEmiCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gold-400">1st EMI Charge</span>
                <span className="font-num text-gold-400">{fmt(firstEmiCharge)}</span>
              </div>
            )}
            {fineAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-crimson-400">Late Fine</span>
                <span className="font-num text-crimson-400">{fmt(fineAmount)}</span>
              </div>
            )}
            <div className="h-px bg-white/[0.06] my-2" />
            <div className="flex items-center justify-between">
              <span className="text-gold-300 font-semibold">Total Payable</span>
              <span className="font-num text-2xl font-bold text-gold-400">{fmt(totalPayable)}</span>
            </div>
            <p className="text-xs text-gold-500/50">
              {isAdmin ? '→ Will be instantly approved' : '→ Submitted for admin approval'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={loading || unpaidEmis.length === 0 || !selectedEmi}
              className="btn-gold flex-1"
            >
              {loading ? 'Processing...' : isAdmin ? 'Record Payment' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
