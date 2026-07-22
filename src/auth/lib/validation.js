export function isValidFullName(value) {
  const normalized = value.trim().replace(/\s+/g, " ")
  if (normalized.length < 4) return false

  const words = normalized.split(" ")
  if (words.length < 2) return false
  if (!/^[A-Za-z][A-Za-z\s'.-]+$/.test(normalized)) return false

  const lettersOnly = normalized.replace(/[^A-Za-z]/g, "").toLowerCase()
  if (lettersOnly.length < 4) return false

  let run = 1
  let maxRun = 1
  for (let index = 1; index < lettersOnly.length; index += 1) {
    run = lettersOnly[index] === lettersOnly[index - 1] ? run + 1 : 1
    maxRun = Math.max(maxRun, run)
  }
  if (maxRun >= 4) return false

  return new Set(lettersOnly).size > 3
}

export function mapGenderToApi(gender) {
  switch (gender) {
    case "Male":
      return "MALE"
    case "Female":
      return "FEMALE"
    default:
      return "OTHER"
  }
}
