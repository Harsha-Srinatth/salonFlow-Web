import { useEffect, useRef } from "react"

/**
 * Six-box SMS code entry.
 *
 * Rendered as one real `<input>` laid transparently over six presentational boxes,
 * rather than six separate inputs. Six inputs look identical and cost the customer
 * more: the OS one-time-code autofill only ever fills the field it is attached to,
 * so it drops the whole code into box one and the remaining five stay empty, and
 * pasting a copied code has the same problem. With a single field, autofill and
 * paste both work the way the customer expects, and focus management stops being
 * something this component has to fake.
 *
 * @param {object} props
 * @param {string} props.value Digits entered so far (0-6 characters)
 * @param {(next: string) => void} props.onChange
 * @param {(code: string) => void} [props.onComplete] Fired once the sixth digit lands
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.invalid] Paints the boxes as rejected
 * @param {boolean} [props.autoFocus]
 */
export function OtpCodeInput({ value, onChange, onComplete, disabled = false, invalid = false, autoFocus = true }) {
  const inputRef = useRef(null)
  const completedFor = useRef("")

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (value.length !== 6 || disabled) return
    // Guarded so a re-render for an unrelated reason cannot submit the same code
    // twice — a duplicate confirm burns one of the customer's five attempts.
    if (completedFor.current === value) return
    completedFor.current = value
    onComplete?.(value)
  }, [value, disabled, onComplete])

  useEffect(() => {
    if (value.length < 6) completedFor.current = ""
  }, [value])

  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "")
  const activeIndex = Math.min(value.length, 5)

  return (
    <div
      className="relative"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        // The token the OS looks for when it offers to fill a code straight from
        // the SMS notification, on both iOS and Android.
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        value={value}
        disabled={disabled}
        aria-label="6-digit verification code"
        onChange={event => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="flex justify-between gap-2">
        {digits.map((digit, index) => {
          const isActive = !disabled && index === activeIndex && value.length < 6
          return (
            <div
              key={index}
              className={`flex h-14 flex-1 items-center justify-center rounded-xl border bg-card font-sans tabular-nums text-xl font-semibold text-foreground transition-all ${
                invalid
                  ? "border-destructive"
                  : isActive
                    ? "border-primary ring-1 ring-primary/20"
                    : digit
                      ? "border-primary/40"
                      : "border-border"
              } ${disabled ? "opacity-60" : ""}`}
            >
              {digit || (isActive ? <span className="h-6 w-px animate-pulse bg-primary" /> : null)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
