'use client';

import { Customer, Retailer } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Props {
  customer: Customer;
  paidCount: number;
  totalEmis: number;
  isAdmin?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export default function CustomerDetailPanel({ customer, paidCount, totalEmis, isAdmin }: Props) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedNum, setCopiedNum] = useState<string | null>(null);

  const progress = totalEmis > 0 ? (paidCount / totalEmis) * 100 : 0;
  const retailer = customer.retailer as Retailer | null;

  // All phone numbers available for this customer
  const phoneNumbers: { label: string; number: string }[] = [
    { label: 'Primary', number: customer.mobile },
    ...(customer.alternate_number_1 ? [{ label: 'Alternate 1', number: customer.alternate_number_1 }] : []),
    ...(customer.alternate_number_2 ? [{ label: 'Alternate 2', number: customer.alternate_number_2 }] : []),
  ];

  function buildWhatsAppMessage(): string {
    const lines = [
      `🏷 *TelePoint EMI Details*`,
      ``,
      `👤 *Name:* ${customer.customer_name}`,
      ...(customer.father_name ? [`👨 *Father/C/O:* ${customer.father_name}`] : []),
      `📱 *Mobile:* ${customer.mobile}`,
      `📦 *Model:* ${customer.model_no || 'N/A'}`,
      `🔢 *IMEI:* ${customer.imei}`,
      `💰 *Purchase Value:* ${fmt(customer.purchase_value)}`,
      `⬇️ *Down Payment:* ${fmt(customer.down_payment)}`,
      `📅 *Purchase Date:* ${format(new Date(customer.purchase_date), 'd MMM yyyy')}`,
      `📆 *EMI Due Date:* ${customer.emi_due_day}th of each month`,
      `💳 *EMI Amount:* ${fmt(customer.emi_amount)}`,
      `🗓 *Tenure:* ${customer.emi_tenure} months`,
      `✅ *EMIs Paid:* ${paidCount} / ${totalEmis}`,
    ];
    return lines.join('\n');
  }

  function shareOnWhatsApp(number: string) {
    const msg = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/91${number.replace(/\D/g, '')}?text=${msg}`, '_blank');
    setShowShareMenu(false);
  }

  function copyNumber(number: string) {
    navigator.clipboard.writeText(number);
    setCopiedNum(number);
    toast.success(`Copied: ${number}`);
    setTimeout(() => setCopiedNum(null), 2000);
  }

  function copyWhatsApp() {
    navigator.clipboard.writeText(buildWhatsAppMessage());
    toast.success('WhatsApp message copied to clipboard');
    setShowShareMenu(false);
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      {/* Top section */}
      <div className="flex items-start gap-4 p-5 border-b border-white/[0.05]">
        {/* Photo */}
        {customer.customer_photo_url ? (
          <img
            src={customer.customer_photo_url}
            alt={customer.customer_name}
            className="w-20 h-20 rounded-2xl object-cover border border-white/10 flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-obsidian-700 border border-white/10 flex items-center justify-center flex-shrink-0">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-white leading-tight">{customer.customer_name}</h2>
              {customer.father_name && <p className="text-slate-500 text-sm">C/O {customer.father_name}</p>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {customer.status === 'RUNNING'
                ? <span className="badge-running">● Running</span>
                : <span className="badge-complete">✓ Complete</span>}
            </div>
          </div>

          {/* Share + contact row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Phone numbers with copy */}
            {phoneNumbers.map(({ label, number }) => (
              <button
                key={number}
                onClick={() => copyNumber(number)}
                title={`Copy ${label} number`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                  copiedNum === number
                    ? 'bg-jade-500/15 border-jade-500/30 text-jade-400'
                    : 'border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .98h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span className="font-num">{number}</span>
                {copiedNum === number && <span className="text-jade-400">✓</span>}
              </button>
            ))}

            {/* WhatsApp Share button */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-jade-500/20 bg-jade-500/8 text-jade-400 hover:bg-jade-500/15 text-xs transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Share
              </button>

              {showShareMenu && (
                <div className="absolute top-8 left-0 z-50 glass-card p-2 min-w-52 shadow-xl shadow-black/40 animate-fade-in">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest px-2 pt-1 pb-2">WhatsApp Share</p>
                  {phoneNumbers.map(({ label, number }) => (
                    <button
                      key={number}
                      onClick={() => shareOnWhatsApp(number)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-jade-400 hover:bg-jade-500/8 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-jade-500">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Send to {label} ({number})
                    </button>
                  ))}
                  <div className="h-px bg-white/[0.06] my-1" />
                  <button
                    onClick={copyWhatsApp}
                    className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    📋 Copy message text
                  </button>
                </div>
              )}
            </div>

            {/* NOC/Bill buttons (admin only) */}
            {isAdmin && (
              <>
                <Link
                  href={`/noc/${customer.id}?type=noc`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sapphire-500/20 bg-sapphire-500/8 text-sapphire-400 hover:bg-sapphire-500/15 text-xs transition-colors"
                >
                  📄 NOC
                </Link>
                <Link
                  href={`/noc/${customer.id}?type=bill`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sapphire-500/20 bg-sapphire-500/8 text-sapphire-400 hover:bg-sapphire-500/15 text-xs transition-colors"
                >
                  🧾 Bill
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="text-slate-500">EMI Progress</span>
          <span className="font-num text-slate-400">{paidCount} / {totalEmis} paid</span>
        </div>
        <div className="h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-jade-500 to-jade-400 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 divide-x divide-y divide-white/[0.05]">
        <Cell label="IMEI" value={customer.imei} mono small />
        <Cell label="Model" value={customer.model_no || '—'} />
        <Cell label="Box No." value={customer.box_no || '—'} />
        <Cell label="Retailer" value={retailer?.name || '—'} />
        <Cell label="Purchase Date" value={format(new Date(customer.purchase_date), 'd MMM yyyy')} />
        <Cell label="Purchase Value" value={fmt(customer.purchase_value)} mono />
        <Cell label="Down Payment" value={fmt(customer.down_payment)} mono />
        {customer.disburse_amount && <Cell label="Financed" value={fmt(customer.disburse_amount)} mono />}
        <Cell label="EMI Amount" value={fmt(customer.emi_amount)} mono gold />
        <Cell label="EMI Tenure" value={`${customer.emi_tenure} months`} mono />
        <Cell label="EMI Due Day" value={`${customer.emi_due_day}th`} />
        {customer.address && <Cell label="Address" value={`${customer.address}${customer.landmark ? `, ${customer.landmark}` : ''}`} />}
        {customer.aadhaar && <Cell label="Aadhaar" value={`XXXX ${customer.aadhaar.slice(-4)}`} mono />}
      </div>

      {/* Document images */}
      {(customer.customer_photo_url || customer.aadhaar_front_url || customer.aadhaar_back_url || customer.bill_photo_url) && (
        <div className="px-5 py-4 border-t border-white/[0.05]">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Documents</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Photo', url: customer.customer_photo_url },
              { label: 'Aadhaar Front', url: customer.aadhaar_front_url },
              { label: 'Aadhaar Back', url: customer.aadhaar_back_url },
              { label: 'Bill', url: customer.bill_photo_url },
            ].filter(d => d.url).map(doc => (
              <a key={doc.label} href={doc.url!} target="_blank" rel="noopener noreferrer" className="group">
                <img
                  src={doc.url!}
                  alt={doc.label}
                  className="h-20 w-28 object-cover rounded-xl border border-white/10 group-hover:border-gold-500/40 transition-colors"
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                <p className="text-[10px] text-slate-600 mt-1 text-center">{doc.label}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Completion info */}
      {customer.status === 'COMPLETE' && customer.completion_remark && (
        <div className="px-5 py-3 border-t border-white/[0.05] bg-sapphire-500/5">
          <p className="text-xs text-sapphire-400 mb-1">✓ Completion Remark</p>
          <p className="text-sm text-slate-300">{customer.completion_remark}</p>
          {customer.completion_date && <p className="text-xs text-slate-500 mt-0.5">on {format(new Date(customer.completion_date), 'd MMM yyyy')}</p>}
        </div>
      )}

      {/* 1st EMI charge status row */}
      {(customer.first_emi_charge_amount || 0) > 0 && (
        <div className={`px-5 py-3 border-t border-white/[0.05] flex items-center justify-between ${customer.first_emi_charge_paid_at ? 'bg-jade-500/5' : 'bg-gold-500/5'}`}>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">1st EMI Charge</p>
            <p className="font-num font-semibold text-white">{fmt(customer.first_emi_charge_amount)}</p>
          </div>
          {customer.first_emi_charge_paid_at
            ? <span className="badge-approved">✓ Paid {format(new Date(customer.first_emi_charge_paid_at), 'd MMM')}</span>
            : <span className="badge-pending">⚠ Pending</span>}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, mono, gold, small }: { label: string; value: string; mono?: boolean; gold?: boolean; small?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`${small ? 'text-xs' : 'text-sm'} font-medium ${gold ? 'text-gold-400' : 'text-slate-200'} ${mono ? 'font-num' : ''} break-all leading-snug`}>
        {value}
      </p>
    </div>
  );
}
