export interface AddressFields {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const emptyAddress = (): AddressFields => ({
  addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'United States',
});

export function formatAddress(value: AddressFields): string {
  const street = [value.addressLine1, value.addressLine2].map(part => part.trim()).filter(Boolean).join(', ');
  const region = [value.city.trim(), value.state.trim(), value.postalCode.trim()].filter(Boolean).join(', ');
  return [street, region, value.country.trim()].filter(Boolean).join(', ');
}

// Existing records were stored as one string. Populate the structured form
// conservatively; administrators can correct any ambiguous legacy address.
export function parseAddress(value?: string): AddressFields {
  const result = emptyAddress();
  if (!value) return result;
  const parts = value.split(',').map(part => part.trim()).filter(Boolean);
  result.addressLine1 = parts.shift() || '';
  result.country = parts.length > 2 ? parts.pop() || result.country : result.country;
  result.city = parts.shift() || '';
  const region = parts.join(' ').trim();
  const match = region.match(/^(.*?)(?:\s+([A-Za-z0-9][A-Za-z0-9 -]*))?$/);
  result.state = match?.[1]?.trim() || region;
  result.postalCode = match?.[2]?.trim() || '';
  return result;
}
