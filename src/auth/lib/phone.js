export function toE164Phone(phone, defaultCountryCode = "91") {
  const trimmed = `${phone ?? ""}`.trim()
  if (!trimmed) return ""

  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return ""

  if (trimmed.startsWith("+")) return `+${digits}`
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`
  return `+${digits}`
}

export function isValidE164Phone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone)
}
