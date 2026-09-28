export function formatPhoneWithCode(phone?: string | null, callingCode?: string | null): string {
  if (!phone) return "";
  if (phone.trim().startsWith("+")) return phone;
  const code = (callingCode || "").replace(/\D/g, "");
  return code ? `+${code} ${phone}` : phone;
}