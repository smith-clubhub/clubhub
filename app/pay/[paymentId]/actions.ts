"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function confirmMockPaymentAction(formData: FormData) {
  const paymentId = String(formData.get("paymentId"));
  const returnTo = String(formData.get("returnTo") ?? "/protected");

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_mock_payment", { p_payment_id: paymentId });

  if (error) {
    redirect(`/pay/${paymentId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(returnTo);
}
