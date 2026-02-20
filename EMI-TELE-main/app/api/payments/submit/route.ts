import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    customer_id,
    emi_ids,
    emi_nos,
    mode,
    notes,
    retail_pin,
    total_emi_amount,
    fine_amount,
    first_emi_charge_amount,
    total_amount,
  } = body;

  if (!customer_id || !emi_ids?.length || !mode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!retail_pin?.trim()) {
    return NextResponse.json({ error: 'Retailer PIN is required' }, { status: 400 });
  }

  const supabase = createClient();
  const serviceClient = createServiceClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Verify retail PIN (separate from login password)
  const { data: retailer } = await serviceClient
    .from('retailers')
    .select('id, retail_pin, is_active')
    .eq('auth_user_id', user.id)
    .single();

  if (!retailer || !retailer.is_active) {
    return NextResponse.json({ error: 'Retailer account is inactive' }, { status: 403 });
  }
  if (retailer.retail_pin !== retail_pin) {
    return NextResponse.json({ error: 'Incorrect Retailer PIN' }, { status: 401 });
  }

  // Create payment request
  const { data: request, error: reqErr } = await serviceClient
    .from('payment_requests')
    .insert({
      customer_id,
      retailer_id: retailer.id,
      submitted_by: user.id,
      status: 'PENDING',
      mode,
      total_emi_amount: total_emi_amount || 0,
      fine_amount: fine_amount || 0,
      first_emi_charge_amount: first_emi_charge_amount || 0,
      total_amount: total_amount || 0,
      notes,
      selected_emi_nos: emi_nos,
    })
    .select()
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: reqErr?.message || 'Failed to create request' }, { status: 500 });
  }

  // Insert payment request items
  if (emi_ids.length > 0) {
    const items = emi_ids.map((emi_id: string, i: number) => ({
      payment_request_id: request.id,
      emi_id,
      emi_no: emi_nos[i],
      amount: total_emi_amount / emi_ids.length,
    }));
    await serviceClient.from('payment_request_items').insert(items);
  }

  // Set EMIs to PENDING_APPROVAL
  await serviceClient
    .from('emi_schedule')
    .update({ status: 'PENDING_APPROVAL' })
    .in('id', emi_ids);

  return NextResponse.json({ success: true, request_id: request.id });
}
