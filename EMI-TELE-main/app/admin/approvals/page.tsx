'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PaymentRequest } from '@/lib/types';
import NavBar from '@/components/NavBar';
import SearchInput from '@/components/SearchInput';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export default function ApprovalsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<PaymentRequest[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveRemark, setApproveRemark] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setRequests(null);
      return;
    }

    setLoading(true);
    try {
      let qb = supabase
        .from('payment_requests')
        .select(`
          *,
          customer:customers(id, customer_name, imei, mobile, first_emi_charge_amount, first_emi_charge_paid_at),
          retailer:retailers(id, name, username)
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (/^\d{15}$/.test(query)) {
        const { data: cust } = await supabase.from('customers').select('id').eq('imei', query).single();
        if (cust) qb = qb.eq('customer_id', cust.id);
        else { setRequests([]); return; }
      } else if (/^\d{12}$/.test(query)) {
        const { data: cust } = await supabase.from('customers').select('id').eq('aadhaar', query).single();
        if (cust) qb = qb.eq('customer_id', cust.id);
        else { setRequests([]); return; }
      } else {
        const { data: custs } = await supabase.from('customers').select('id').ilike('customer_name', `%${query}%`);
        const ids = (custs || []).map(c => c.id);
        if (ids.length === 0) { setRequests([]); return; }
        qb = qb.in('customer_id', ids);
      }

      const { data } = await qb.limit(30);
      setRequests(data as PaymentRequest[] || []);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadAllPending() {
    setLoading(true);
    const { data } = await supabase
      .from('payment_requests')
      .select(`
        *,
        customer:customers(id, customer_name, imei, mobile, first_emi_charge_amount, first_emi_charge_paid_at),
        retailer:retailers(id, name, username)
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(50);
    setRequests(data as PaymentRequest[] || []);
    setLoading(false);
  }

  async function handleApprove(requestId: string) {
    const res = await fetch('/api/payments/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, remark: approveRemark }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Payment approved ✓');
      setApprovingId(null);
      setApproveRemark('');
      loadAllPending();
    } else {
      toast.error(data.error || 'Failed to approve');
    }
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    const res = await fetch('/api/payments/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: rejectModal.id, reason: rejectReason }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Payment rejected');
      setRejectModal(null);
      setRejectReason('');
      loadAllPending();
    } else {
      toast.error(data.error || 'Failed to reject');
    }
  }

  return (
    <div className="min-h-screen gradient-bg">
      <NavBar role="admin" userName="TELEPOINT" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Payment Approvals</h1>
            <p className="text-slate-500 text-sm mt-1">Review and approve retailer payment requests</p>
          </div>
          <button onClick={loadAllPending} className="btn-ghost flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
              <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
            </svg>
            Load All Pending
          </button>
        </div>

        <div className="mb-6">
          <SearchInput onSearch={handleSearch} placeholder="Search pending approvals by customer name, IMEI, or Aadhaar..." />
        </div>

        {requests === null && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-obsidian-800 border border-white/[0.05] flex items-center justify-center mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.4)" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <p className="text-slate-500 text-lg">Search for pending requests or click "Load All Pending"</p>
            <p className="text-slate-700 text-sm mt-1">Privacy rule: no data shown until searched</p>
          </div>
        )}

        {requests !== null && requests.length === 0 && (
          <div className="text-center py-16">
            <p className="text-jade-400 font-medium">All caught up! No pending requests.</p>
          </div>
        )}

        {requests !== null && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map(req => {
              const customer = req.customer as { customer_name?: string; imei?: string; mobile?: string; first_emi_charge_amount?: number; first_emi_charge_paid_at?: string };
              const retailer = req.retailer as { name?: string; username?: string };
              const hasFirstCharge = req.first_emi_charge_amount > 0;

              return (
                <div key={req.id} className="glass-card p-5 animate-fade-in">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-lg font-semibold text-white">{customer?.customer_name}</h3>
                        <span className="badge-pending">● PENDING APPROVAL</span>
                        {hasFirstCharge && (
                          <span className="badge-pending text-gold-300 bg-gold-500/10 border-gold-500/20">⚠ 1st Charge</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        IMEI: {customer?.imei} · Submitted by {retailer?.name} (@{retailer?.username}) · {format(new Date(req.created_at), 'd MMM yyyy, h:mm a')}
                      </p>
                    </div>
                    <Link href={`/receipt/${req.id}`} target="_blank" className="text-xs text-sapphire-400 hover:text-sapphire-300 underline underline-offset-4">
                      View Receipt →
                    </Link>
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-obsidian-900/70 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">EMI Amount</p>
                      <p className="font-num font-semibold text-white">{fmt(req.total_emi_amount)}</p>
                    </div>
                    {req.fine_amount > 0 && (
                      <div className="bg-obsidian-900/70 rounded-xl p-3">
                        <p className="text-xs text-crimson-400 mb-1">Fine</p>
                        <p className="font-num font-semibold text-crimson-400">{fmt(req.fine_amount)}</p>
                      </div>
                    )}
                    {req.first_emi_charge_amount > 0 && (
                      <div className="bg-obsidian-900/70 rounded-xl p-3">
                        <p className="text-xs text-gold-400 mb-1">1st EMI Charge</p>
                        <p className="font-num font-semibold text-gold-400">{fmt(req.first_emi_charge_amount)}</p>
                      </div>
                    )}
                    <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-3">
                      <p className="text-xs text-gold-400 mb-1">Total</p>
                      <p className="font-num font-bold text-gold-300">{fmt(req.total_amount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <span className={`font-semibold ${req.mode === 'UPI' ? 'text-sapphire-400' : 'text-jade-400'}`}>{req.mode}</span>
                    {req.notes && <span>· {req.notes}</span>}
                  </div>

                  {/* Actions */}
                  {approvingId === req.id ? (
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="form-label">Approval remark (optional)</label>
                        <input value={approveRemark} onChange={e => setApproveRemark(e.target.value)} placeholder="Optional approval note..." className="form-input" />
                      </div>
                      <button onClick={() => handleApprove(req.id)} className="btn-success">Confirm Approve</button>
                      <button onClick={() => setApprovingId(null)} className="btn-ghost">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setApprovingId(req.id)}
                        className="btn-success flex items-center gap-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectModal({ id: req.id }); setRejectReason(''); }}
                        className="btn-danger flex items-center gap-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-backdrop">
          <div className="glass-card w-full max-w-md p-6 animate-slide-up">
            <h3 className="font-display text-xl font-bold text-crimson-400 mb-2">Reject Payment Request</h3>
            <p className="text-sm text-slate-400 mb-4">The EMIs will be reverted to UNPAID. Provide a reason.</p>
            <div className="mb-4">
              <label className="form-label">Rejection Reason <span className="text-gold-400">*</span></label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Amount mismatch, incorrect payment mode..."
                className="form-input resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleReject} className="btn-danger flex-1">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
