'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Customer, Retailer, EMISchedule, DueBreakdown, PaymentRequest } from '@/lib/types';
import NavBar from '@/components/NavBar';
import SearchInput from '@/components/SearchInput';
import CustomerDetailPanel from '@/components/CustomerDetailPanel';
import EMIScheduleTable from '@/components/EMIScheduleTable';
import DueBreakdownPanel from '@/components/DueBreakdownPanel';
import PaymentModal from '@/components/PaymentModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export default function RetailerDashboard() {
  const supabase = createClient();
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [searchResults, setSearchResults] = useState<Customer[] | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerEmis, setCustomerEmis] = useState<EMISchedule[]>([]);
  const [breakdown, setBreakdown] = useState<DueBreakdown | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [myRequests, setMyRequests] = useState<PaymentRequest[]>([]);

  useEffect(() => {
    loadRetailerInfo();
  }, []);

  async function loadRetailerInfo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('retailers').select('*').eq('auth_user_id', user.id).single();
    if (data) {
      setRetailer(data);
      loadMyRequests(data.id);
    }
  }

  async function loadMyRequests(retailerId: string) {
    const { data } = await supabase
      .from('payment_requests')
      .select('*, customer:customers(customer_name, imei)')
      .eq('retailer_id', retailerId)
      .order('created_at', { ascending: false })
      .limit(10);
    setMyRequests(data as PaymentRequest[] || []);
  }

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults(null);
      setSelectedCustomer(null);
      return;
    }

    let qb = supabase.from('customers').select('*, retailer:retailers(*)').eq('retailer_id', retailer?.id || '');

    if (/^\d{15}$/.test(query)) {
      qb = qb.eq('imei', query);
    } else if (/^\d{12}$/.test(query)) {
      qb = qb.eq('aadhaar', query);
    } else {
      qb = qb.ilike('customer_name', `%${query}%`);
    }

    const { data } = await qb.order('customer_name').limit(20);
    const results = data || [];
    setSearchResults(results);

    if (results.length === 1) {
      selectCustomer(results[0]);
    } else {
      setSelectedCustomer(null);
    }
  }, [retailer]);

  async function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    const { data: emis } = await supabase
      .from('emi_schedule')
      .select('*')
      .eq('customer_id', customer.id)
      .order('emi_no');
    setCustomerEmis(emis || []);

    const { data: bd } = await supabase.rpc('get_due_breakdown', { p_customer_id: customer.id });
    setBreakdown(bd as DueBreakdown);
  }

  const paidCount = customerEmis.filter(e => e.status === 'APPROVED').length;

  return (
    <div className="min-h-screen gradient-bg">
      <NavBar role="retailer" userName={retailer?.name || 'Retailer'} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="glass-card p-5 mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Welcome, {retailer?.name || 'Retailer'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Search your customers to collect EMI payments</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Today</p>
            <p className="font-num text-sm text-slate-300">{format(new Date(), 'd MMM yyyy')}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchInput onSearch={handleSearch} placeholder="Search your customers by name (3+ chars), IMEI (15 digits), or Aadhaar (12 digits)..." autoFocus />
        </div>

        {/* Empty state */}
        {searchResults === null && (
          <div className="animate-fade-in">
            <div className="flex flex-col items-center justify-center py-16 text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-obsidian-800 border border-white/[0.05] flex items-center justify-center mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,0,0.4)" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <p className="text-slate-500 text-lg">Search for a customer to begin</p>
              <p className="text-slate-700 text-sm mt-1">Only your own customers are shown</p>
            </div>

            {/* Recent requests */}
            {myRequests.length > 0 && (
              <div>
                <p className="section-header">Recent Payment Requests</p>
                <div className="glass-card overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr><th>Customer</th><th>Amount</th><th>Mode</th><th>Status</th><th>Date</th><th></th></tr>
                    </thead>
                    <tbody>
                      {myRequests.map(r => {
                        const cust = r.customer as { customer_name?: string; imei?: string };
                        return (
                          <tr key={r.id}>
                            <td>
                              <p className="text-white font-medium">{cust?.customer_name}</p>
                              <p className="text-xs text-slate-500 font-num">{cust?.imei}</p>
                            </td>
                            <td><span className="font-num font-semibold">{fmt(r.total_amount)}</span></td>
                            <td><span className={`text-xs font-semibold ${r.mode === 'UPI' ? 'text-sapphire-400' : 'text-jade-400'}`}>{r.mode}</span></td>
                            <td>
                              {r.status === 'PENDING' && <span className="badge-pending">Pending</span>}
                              {r.status === 'APPROVED' && <span className="badge-approved">Approved</span>}
                              {r.status === 'REJECTED' && <span className="badge-rejected">Rejected</span>}
                            </td>
                            <td className="text-xs text-slate-500">{format(new Date(r.created_at), 'd MMM, h:mm a')}</td>
                            <td>
                              <Link href={`/receipt/${r.id}`} target="_blank" className="text-xs text-sapphire-400 hover:text-sapphire-300">
                                Receipt →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search results list */}
        {searchResults !== null && searchResults.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <p className="text-slate-500">No customers found. Try a different search.</p>
          </div>
        )}

        {searchResults !== null && searchResults.length > 1 && !selectedCustomer && (
          <div className="glass-card overflow-hidden animate-fade-in">
            <div className="px-5 py-3 border-b border-white/[0.05]">
              <span className="text-xs text-slate-400 uppercase tracking-widest">{searchResults.length} customers found</span>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>IMEI</th><th>Mobile</th><th>Status</th><th>EMI</th><th></th></tr>
              </thead>
              <tbody>
                {searchResults.map(c => (
                  <tr key={c.id} onClick={() => selectCustomer(c)} className="cursor-pointer">
                    <td>
                      <p className="text-white font-medium">{c.customer_name}</p>
                      {c.father_name && <p className="text-xs text-slate-500">C/O {c.father_name}</p>}
                    </td>
                    <td><span className="font-num text-xs">{c.imei}</span></td>
                    <td><span className="font-num">{c.mobile}</span></td>
                    <td>
                      {c.status === 'RUNNING' ? <span className="badge-running">Running</span> : <span className="badge-complete">Complete</span>}
                    </td>
                    <td><span className="font-num text-gold-400">{fmt(c.emi_amount)}</span></td>
                    <td>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected customer view */}
        {selectedCustomer && (
          <div className="space-y-5 animate-slide-up">
            {/* Back button */}
            {searchResults && searchResults.length > 1 && (
              <button onClick={() => setSelectedCustomer(null)} className="btn-ghost flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back to results
              </button>
            )}

            <CustomerDetailPanel customer={selectedCustomer} paidCount={paidCount} totalEmis={selectedCustomer.emi_tenure} />

            {breakdown && <DueBreakdownPanel breakdown={breakdown} />}

            {/* Collect payment button */}
            {selectedCustomer.status === 'RUNNING' ? (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!breakdown?.next_emi_no || breakdown?.next_emi_status === 'PENDING_APPROVAL'}
                  className="btn-gold text-base px-8 py-3.5"
                >
                  {breakdown?.next_emi_status === 'PENDING_APPROVAL'
                    ? '⏳ EMI Awaiting Approval'
                    : !breakdown?.next_emi_no
                    ? '✓ All EMIs Paid'
                    : `💳 Collect EMI #${breakdown.next_emi_no}`}
                </button>
              </div>
            ) : (
              <div className="alert-blue">
                <p className="text-sapphire-300 font-semibold">✓ Account Complete</p>
                <p className="text-sapphire-400/70 text-sm mt-0.5">Payment collection is not allowed for completed accounts.</p>
              </div>
            )}

            <EMIScheduleTable emis={customerEmis} nextUnpaidNo={breakdown?.next_emi_no ?? undefined} isAdmin={false} />
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && breakdown && (
        <PaymentModal
          customer={selectedCustomer}
          emis={customerEmis}
          breakdown={breakdown}
          onClose={() => setShowPaymentModal(false)}
          onSubmitted={() => {
            selectCustomer(selectedCustomer);
            if (retailer) loadMyRequests(retailer.id);
          }}
          isAdmin={false}
        />
      )}
    </div>
  );
}
