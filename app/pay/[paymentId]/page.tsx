import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/membership";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmMockPaymentAction } from "./actions";

export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { paymentId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*, clubs(name, slug), events(title)")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) notFound();

  const club = payment.clubs as unknown as { name: string; slug: string };
  const event = payment.events as unknown as { title: string } | null;
  const returnTo = event ? `/c/${club.slug}/events/${payment.event_id}` : `/c/${club.slug}`;

  return (
    <main className="min-h-screen flex flex-col items-center">
      <SiteHeader />
      <div className="w-full max-w-md p-5 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>
              This is a dev stand-in for a hosted checkout (Stripe/PayFast/Yoco). No card details are
              collected here — swap in a real PaymentProvider implementation to go live.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Club</span>
              <span>{club.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">For</span>
              <span>{event ? event.title : "Membership fee"}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatMoney(payment.amount_cents, payment.currency)}</span>
            </div>
            {payment.status === "succeeded" ? (
              <p className="text-sm text-green-600">Already paid.</p>
            ) : (
              <form action={confirmMockPaymentAction}>
                <input type="hidden" name="paymentId" value={paymentId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <Button type="submit" className="w-full">
                  Simulate successful payment
                </Button>
              </form>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
