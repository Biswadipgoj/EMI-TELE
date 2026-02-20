'use client';

import { DueBreakdown } from '@/lib/types';
import { format } from 'date-fns';

interface DueBreakdownPanelProps {
  breakdown: DueBreakdown;
  onClose?: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export default function DueBreakdownPanel({ breakdown, onClose }: DueBreakdownPanelProps) {
  const hasPopup = breakdown.popup_first_emi_charge || breakdown.popup_fine_due;

  return (
    <div className="space-y-3">
      {/* Popup alerts */}
      {breakdown.popup_first_emi_charge && (
        <div className="alert-gold animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-gold-400 text-lg">⚠️</span>
            <div>
              <p className="text-gold-300 font-semibold text-sm">1st EMI Charge Pending</p>
              <p className="text-gold-400/70 text-xs mt-0.5">
                A one-time charge of {fmt(breakdown.first_emi_charge_due)} must be collected.
              </p>
            </div>
          </div>
        </div>
      )}

      {breakdown.popup_fine_due && (
        <div className="alert-red animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-crimson-400 text-lg">🔴</span>
            <div>
              <p className="text-crimson-300 font-semibold text-sm">Fine Due — EMI Overdue</p>
              <p className="text-crimson-400/70 text-xs mt-0.5">
                A late fine of {fmt(breakdown.fine_due)} applies on this EMI.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Payment Breakdown</span>
          {breakdown.next_emi_due_date && (
            <span className={`text-xs font-mono ${breakdown.is_overdue ? 'text-crimson-400' : 'text-slate-500'}`}>
              Due: {format(new Date(breakdown.next_emi_due_date), 'd MMM yyyy')}
              {breakdown.is_overdue && ' ⚠ OVERDUE'}
            </span>
          )}
        </div>

        <div className="p-5 space-y-2.5">
          {breakdown.next_emi_no && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">EMI #{breakdown.next_emi_no}</span>
              <span className="font-num text-slate-200">{fmt(breakdown.next_emi_amount || 0)}</span>
            </div>
          )}

          {breakdown.first_emi_charge_due > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gold-400">1st EMI Charge</span>
              <span className="font-num text-gold-400">{fmt(breakdown.first_emi_charge_due)}</span>
            </div>
          )}

          {breakdown.fine_due > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-crimson-400">Late Fine</span>
              <span className="font-num text-crimson-400">{fmt(breakdown.fine_due)}</span>
            </div>
          )}

          <div className="h-px bg-white/[0.06] my-1" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Total Payable</span>
            <span className="font-num text-lg font-bold text-gold-400">{fmt(breakdown.total_payable)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
