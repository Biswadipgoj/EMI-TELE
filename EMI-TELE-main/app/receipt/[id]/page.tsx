import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/PrintButton';

// ✅ FIX: Explicit union type prevents "can't index type with 'any'" TS error
type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: '#f5c842',
  APPROVED: '#60a5fa',
  REJECTED: '#f87171',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(n);
}

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: request } = await supabase
    .from('payment_requests')
    .select(`
      *,
      customer:customers(customer_name, imei, mobile, model_no, first_emi_charge_amount),
      retailer:retailers(name, username),
      items:payment_request_items(emi_no, amount)
    `)
    .eq('id', params.id)
    .single();

  if (!request) notFound();

  // ✅ Safe cast to union type before indexing STATUS_COLORS
  const status = (request.status as PaymentStatus) ?? 'PENDING';
  const isValidStatus = (s: string): s is PaymentStatus =>
    ['PENDING', 'APPROVED', 'REJECTED'].includes(s);
  const statusColor = isValidStatus(status) ? STATUS_COLORS[status] : '#64748b';

  const customer = request.customer as {
    customer_name?: string;
    imei?: string;
    mobile?: string;
    model_no?: string;
    first_emi_charge_amount?: number;
  } | null;

  const retailer = request.retailer as {
    name?: string;
    username?: string;
  } | null;

  const items = (request.items as Array<{ emi_no: number; amount: number }>) ?? [];

  const cell = (label: string, value: React.ReactNode) => (
    <div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>{value}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(232,184,0,0.05) 0%, transparent 70%), #060810', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Receipt Card */}
        <div style={{ background: '#0f1425', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>

          {/* Header */}
          <div style={{ background: '#0a0d1a', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'rgba(232,184,0,0.1)', border: '1px solid rgba(232,184,0,0.2)', marginBottom: '1rem' }}>
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L2 9V23L16 30L30 23V9L16 2Z" stroke="#e8b800" strokeWidth="2" fill="rgba(232,184,0,0.1)" />
                <circle cx="16" cy="14" r="4" fill="#e8b800" />
              </svg>
            </div>
            <h1 style={{ fontFamily: 'Georgia, serif', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>TelePoint</h1>
            <p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.25rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>EMI Payment Receipt</p>
          </div>

          {/* Status row */}
          <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Receipt ID</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>{params.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span style={{ padding: '0.35rem 0.9rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: statusColor, border: `1px solid ${statusColor}55`, background: `${statusColor}18` }}>
              ● {status}
            </span>
          </div>

          {/* Customer */}
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Customer Details</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {customer?.customer_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#94a3b8' }}>Name</span>
                  <span style={{ color: 'white', fontWeight: 500 }}>{customer.customer_name}</span>
                </div>
              )}
              {customer?.imei && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#94a3b8' }}>IMEI</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.75rem' }}>{customer.imei}</span>
                </div>
              )}
              {customer?.mobile && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#94a3b8' }}>Mobile</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{customer.mobile}</span>
                </div>
              )}
              {customer?.model_no && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#94a3b8' }}>Model</span>
                  <span style={{ color: '#cbd5e1' }}>{customer.model_no}</span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Payment Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {items.map((item) => (
                <div key={item.emi_no} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#94a3b8' }}>EMI #{item.emi_no}</span>
                  <span style={{ color: 'white', fontFamily: 'monospace' }}>{fmt(item.amount)}</span>
                </div>
              ))}

              {/* 1st EMI Charge — GLOBAL RULE: always shown when present */}
              {(request.first_emi_charge_amount ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#fcd97a' }}>1st EMI Charge</span>
                  <span style={{ color: '#fcd97a', fontFamily: 'monospace' }}>{fmt(request.first_emi_charge_amount)}</span>
                </div>
              )}

              {/* Fine — only shown if > 0 */}
              {(request.fine_amount ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#f87171' }}>Late Fine</span>
                  <span style={{ color: '#f87171', fontFamily: 'monospace' }}>{fmt(request.fine_amount)}</span>
                </div>
              )}

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0.25rem 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>Total</span>
                <span style={{ color: '#f5c842', fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700 }}>{fmt(request.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {cell('Payment Mode', <span style={{ color: request.mode === 'UPI' ? '#60a5fa' : '#34d399', fontWeight: 700 }}>{request.mode}</span>)}
              {cell('Submitted By', <>{retailer?.name}<br /><span style={{ fontSize: '0.7rem', color: '#64748b' }}>@{retailer?.username}</span></>)}
              {cell('Submitted On', <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{format(new Date(request.created_at), 'd MMM yyyy, h:mm a')}</span>)}
              {request.approved_at && cell('Approved On', <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{format(new Date(request.approved_at), 'd MMM yyyy, h:mm a')}</span>)}
            </div>
          </div>

          {request.notes && (
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Notes</p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{request.notes}</p>
            </div>
          )}

          {request.rejection_reason && (
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(239,68,68,0.05)' }}>
              <p style={{ fontSize: '0.65rem', color: '#f87171', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Rejection Reason</p>
              <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>{request.rejection_reason}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: '1.25rem 2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: '#475569' }}>TelePoint EMI Portal · Thank you for your payment</p>
            <p style={{ fontSize: '0.65rem', color: '#334155', fontFamily: 'monospace', marginTop: '0.25rem' }}>#{params.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* Print button — client component */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
