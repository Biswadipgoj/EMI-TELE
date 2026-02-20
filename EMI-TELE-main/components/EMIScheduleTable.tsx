'use client';

import { useState } from 'react';
import { EMISchedule } from '@/lib/types';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface EMIScheduleTableProps {
  emis: EMISchedule[];
  selectedEmis?: string[];
  onToggleEmi?: (emiId: string, emiNo: number) => void;
  selectable?: boolean;
  nextUnpaidNo?: number;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export default function EMIScheduleTable({
  emis,
  selectedEmis = [],
  onToggleEmi,
  selectable,
  nextUnpaidNo,
  isAdmin,
  onRefresh,
}: EMIScheduleTableProps) {
  const supabase = createClient();
  const today = new Date();

  // Admin per-EMI edit state
  const [editingEmiId, setEditingEmiId] = useState<string | null>(null);
  const [fineOverride, setFineOverride] = useState('');
  const [dueDateOverride, setDueDateOverride] = useState('');
  const [savingEmi, setSavingEmi] = useState(false);

  function openEdit(emi: EMISchedule) {
    setEditingEmiId(emi.id);
    setFineOverride(String(emi.fine_amount || 0));
    setDueDateOverride(emi.due_date);
  }

  function cancelEdit() {
    setEditingEmiId(null);
    setFineOverride('');
    setDueDateOverride('');
  }

  async function saveEmiEdit(emi: EMISchedule) {
    setSavingEmi(true);
    const updates: Partial<EMISchedule> = {
      due_date: dueDateOverride,
      fine_amount: parseFloat(fineOverride) || 0,
    };
    const { error } = await supabase.from('emi_schedule').update(updates).eq('id', emi.id);
    setSavingEmi(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`EMI #${emi.emi_no} updated`);
      setEditingEmiId(null);
      onRefresh?.();
    }
  }

  async function waiveFine(emi: EMISchedule) {
    const { error } = await supabase
      .from('emi_schedule')
      .update({ fine_waived: true, fine_amount: 0 })
      .eq('id', emi.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Fine waived for EMI #${emi.emi_no}`);
      onRefresh?.();
    }
  }

  async function restoreFine(emi: EMISchedule) {
    // Get default fine from settings
    const { data } = await supabase.from('fine_settings').select('default_fine_amount').eq('id', 1).single();
    const defaultFine = data?.default_fine_amount || 450;
    const { error } = await supabase
      .from('emi_schedule')
      .update({ fine_waived: false, fine_amount: defaultFine })
      .eq('id', emi.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Fine restored to ₹${defaultFine} for EMI #${emi.emi_no}`);
      onRefresh?.();
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">EMI Schedule</span>
          <span className="text-xs text-slate-600">({emis.length} instalments)</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-jade-400 inline-block" /> Paid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gold-400 inline-block" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Unpaid
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {selectable && <th className="w-10" />}
              <th>EMI</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Fine</th>
              <th>Paid On</th>
              <th>Mode</th>
              {isAdmin && <th>Admin</th>}
            </tr>
          </thead>
          <tbody>
            {emis.map((emi) => {
              const isOverdue = emi.status === 'UNPAID' && new Date(emi.due_date) < today;
              const isSelected = selectedEmis.includes(emi.id);
              const isNextUnpaid = emi.emi_no === nextUnpaidNo;
              const canSelect = selectable && emi.status === 'UNPAID' && emi.emi_no >= (nextUnpaidNo || 1);
              const isEditing = editingEmiId === emi.id;

              return (
                <>
                  <tr
                    key={emi.id}
                    onClick={() => canSelect && onToggleEmi?.(emi.id, emi.emi_no)}
                    className={[
                      canSelect ? 'cursor-pointer' : '',
                      isSelected ? 'bg-gold-500/8' : '',
                      isNextUnpaid && emi.status === 'UNPAID' ? 'bg-jade-500/5' : '',
                    ].join(' ')}
                  >
                    {selectable && (
                      <td>
                        {canSelect ? (
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-gold-500 border-gold-500' : 'border-white/20 hover:border-gold-500/50'
                          }`}>
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                        ) : null}
                      </td>
                    )}

                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-num font-medium text-white">#{emi.emi_no}</span>
                        {isNextUnpaid && emi.status === 'UNPAID' && (
                          <span className="text-[9px] bg-jade-500/20 text-jade-400 px-1.5 py-0.5 rounded-full font-bold tracking-wide">NEXT</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {isEditing && isAdmin ? (
                        <input
                          type="date"
                          value={dueDateOverride}
                          onChange={(e) => setDueDateOverride(e.target.value)}
                          className="form-input text-xs py-1.5 w-36"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={`font-num text-xs ${isOverdue ? 'text-crimson-400 font-semibold' : 'text-slate-400'}`}>
                          {format(new Date(emi.due_date), 'd MMM yyyy')}
                          {isOverdue && <span className="ml-1 text-crimson-500">⚠</span>}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="font-num">{fmt(emi.amount)}</span>
                    </td>

                    <td>
                      {emi.status === 'UNPAID' && <span className="badge-unpaid">Unpaid</span>}
                      {emi.status === 'PENDING_APPROVAL' && <span className="badge-pending">Pending</span>}
                      {emi.status === 'APPROVED' && <span className="badge-approved">✓ Paid</span>}
                    </td>

                    <td>
                      {isEditing && isAdmin && !emi.fine_waived ? (
                        <input
                          type="number"
                          value={fineOverride}
                          onChange={(e) => setFineOverride(e.target.value)}
                          className="form-input text-xs py-1.5 w-24"
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Fine ₹"
                        />
                      ) : emi.fine_waived ? (
                        <span className="text-xs text-slate-600 italic">Waived</span>
                      ) : emi.fine_amount > 0 ? (
                        <span className="font-num text-crimson-400 text-xs font-semibold">{fmt(emi.fine_amount)}</span>
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </td>

                    <td>
                      {emi.paid_at ? (
                        <span className="font-num text-xs text-jade-400">{format(new Date(emi.paid_at), 'd MMM yyyy')}</span>
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </td>

                    <td>
                      {emi.mode ? (
                        <span className={`text-xs font-bold ${emi.mode === 'UPI' ? 'text-sapphire-400' : 'text-jade-400'}`}>
                          {emi.mode}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </td>

                    {isAdmin && (
                      <td onClick={(e) => e.stopPropagation()}>
                        {emi.status !== 'APPROVED' && (
                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEmiEdit(emi)}
                                  disabled={savingEmi}
                                  className="px-2.5 py-1 text-[10px] bg-jade-500/20 hover:bg-jade-500/30 border border-jade-500/30 text-jade-400 rounded-lg font-semibold transition-colors"
                                >
                                  {savingEmi ? '...' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-2.5 py-1 text-[10px] border border-white/10 text-slate-400 rounded-lg transition-colors hover:border-white/20"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEdit(emi)}
                                  className="px-2.5 py-1 text-[10px] border border-white/10 hover:border-gold-500/30 hover:text-gold-400 text-slate-500 rounded-lg transition-colors"
                                  title="Edit due date / fine amount"
                                >
                                  ✏ Edit
                                </button>
                                {emi.fine_amount > 0 && !emi.fine_waived ? (
                                  <button
                                    onClick={() => waiveFine(emi)}
                                    className="px-2.5 py-1 text-[10px] border border-crimson-500/20 hover:border-crimson-500/40 text-crimson-400 rounded-lg transition-colors"
                                    title="Waive fine for this EMI"
                                  >
                                    Waive Fine
                                  </button>
                                ) : emi.fine_waived ? (
                                  <button
                                    onClick={() => restoreFine(emi)}
                                    className="px-2.5 py-1 text-[10px] border border-white/10 hover:border-white/20 text-slate-500 rounded-lg transition-colors"
                                    title="Restore default fine"
                                  >
                                    Restore Fine
                                  </button>
                                ) : null}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Editing hint row */}
                  {isEditing && isAdmin && (
                    <tr key={`${emi.id}-hint`} className="bg-gold-500/5">
                      <td colSpan={9} className="py-2 px-4">
                        <p className="text-xs text-gold-500/60">
                          ✏ Editing EMI #{emi.emi_no} — change due date and/or override fine amount above, then click Save.
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
