import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { request_id, remark } = body;
  if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 });

  const serviceClient = createServiceClient();

  // Get request with items
  const { data: request } = await serviceClient
    .from('payment_requests')
    .select('*, payment_request_items(*)')
    .eq('id', request_id)
    .single();

  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  if (request.status !== 'PENDING') return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });

  const now = new Date().toISOString();
  const emiIds = (request.payment_request_items || []).map((i: { emi_schedule_id: string }) => i.emi_schedule_id);

  // Update EMIs to APPROVED
  await serviceClient.from('emi_schedule').update({
    status: 'APPROVED',
    paid_at: now,
    mode: request.mode,
    approved_by: user.id,
  }).in('id', emiIds);

  // If first_emi_charge was included, mark it paid
  if (request.first_emi_charge_amount > 0) {
    await serviceClient.from('customers').update({ first_emi_charge_paid_at: now }).eq('id', request.customer_id);
  }

  // Update request status
  await serviceClient.from('payment_requests').update({
    status: 'APPROVED',
    approved_by: user.id,
    approved_at: now,
    notes: remark ? (request.notes ? request.notes + '\nRemark: ' + remark : 'Remark: ' + remark) : request.notes,
  }).eq('id', request_id);

  // Audit log
  await serviceClient.from('audit_log').insert({
    actor_user_id: user.id,
    actor_role: 'super_admin',
    action: 'APPROVE_PAYMENT',
    table_name: 'payment_requests',
    record_id: request_id,
    before_data: { status: 'PENDING' },
    after_data: { status: 'APPROVED' },
    remark,
  });

  return NextResponse.json({ success: true });
}
