// ---------------------------------------------------------------------------
// Delivery stub — swap in Resend (email) or Twilio (SMS/WhatsApp) here
// ---------------------------------------------------------------------------

export type DeliveryChannel = "EMAIL" | "SMS" | "WHATSAPP";

export type DeliveryPayload = {
  channel: DeliveryChannel;
  to: string | null; // email address or phone number
  body: string;
  senderName: string;
};

export type DeliveryResult = {
  success: boolean;
  error?: string;
};

export async function deliver(payload: DeliveryPayload): Promise<DeliveryResult> {
  // TODO: replace stubs with real providers
  // EMAIL  → Resend: https://resend.com/docs
  // SMS    → Twilio SMS
  // WHATSAPP → Twilio WhatsApp API
  if (!payload.to) {
    return { success: false, error: "no_recipient" };
  }
  // Simulate successful delivery
  return { success: true };
}
