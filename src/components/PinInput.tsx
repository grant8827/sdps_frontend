import type { Ref } from 'react';

/** A masked 6-digit PIN box: digits only, numeric keypad on phones, never autofilled or remembered. */
export function PinInput({ id, value, onChange, inputRef, label }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
}) {
  return (
    <>
      <label className="field-label" style={{ margin: 0 }} htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        className="input pin-input"
        type="password"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
    </>
  );
}

/** The same quick checks the server makes, so most mistakes are caught before sending. */
export function pinProblem(pin: string, confirm?: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'Enter 6 digits.';
  if (/^(\d)\1{5}$/.test(pin) || ['123456', '654321', '012345', '123123', '112233', '121212', '123321'].includes(pin)) return 'That PIN is too easy to guess. Choose a different one.';
  if (confirm !== undefined && pin !== confirm) return "The two PINs don't match.";
  return null;
}
