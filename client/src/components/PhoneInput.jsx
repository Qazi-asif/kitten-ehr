import { useEffect, useState } from 'react';

// Hand-built country code list (no npm package) - covers the countries most
// relevant to this rescue's applicants/donors. Same dial code can appear
// more than once (US/CA both +1) so each entry needs its own id.
export const PHONE_COUNTRY_CODES = [
  { id: 'US', code: '+1', name: 'United States' },
  { id: 'CA', code: '+1', name: 'Canada' },
  { id: 'MX', code: '+52', name: 'Mexico' },
  { id: 'GB', code: '+44', name: 'United Kingdom' },
  { id: 'AU', code: '+61', name: 'Australia' },
  { id: 'NZ', code: '+64', name: 'New Zealand' },
  { id: 'IE', code: '+353', name: 'Ireland' },
];

const DEFAULT_COUNTRY_ID = 'US';
const CODES_BY_LENGTH_DESC = [...PHONE_COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

function findCountry(countryId) {
  return PHONE_COUNTRY_CODES.find((country) => country.id === countryId) || PHONE_COUNTRY_CODES[0];
}

// Splits a combined stored value like "+1 555-123-4567" back into a
// country id + national number, so the two controlled inputs below can
// re-derive their state from a single string prop.
function splitPhoneValue(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { countryId: DEFAULT_COUNTRY_ID, national: '' };
  }

  const match = CODES_BY_LENGTH_DESC.find(
    (country) => trimmed === country.code || trimmed.startsWith(`${country.code} `),
  );
  if (match) {
    return { countryId: match.id, national: trimmed.slice(match.code.length).trim() };
  }

  return { countryId: DEFAULT_COUNTRY_ID, national: trimmed };
}

const DEFAULT_SELECT_CLASSNAME =
  'w-[92px] shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm focus:border-brand focus:ring-brand';
const DEFAULT_INPUT_CLASSNAME =
  'flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand';

function PhoneInput({
  value = '',
  onChange,
  required = false,
  name = 'phone',
  selectClassName = DEFAULT_SELECT_CLASSNAME,
  inputClassName = DEFAULT_INPUT_CLASSNAME,
  className = '',
}) {
  const [countryId, setCountryId] = useState(() => splitPhoneValue(value).countryId);
  const [national, setNational] = useState(() => splitPhoneValue(value).national);

  // Keep local state in sync if the parent resets/prefills the combined value.
  useEffect(() => {
    const next = splitPhoneValue(value);
    setCountryId(next.countryId);
    setNational(next.national);
  }, [value]);

  function emitChange(nextCountryId, nextNational) {
    if (!onChange) return;
    const combined = nextNational ? `${findCountry(nextCountryId).code} ${nextNational}` : '';
    onChange(combined);
  }

  function handleCountryChange(e) {
    const nextCountryId = e.target.value;
    setCountryId(nextCountryId);
    emitChange(nextCountryId, national);
  }

  function handleNationalChange(e) {
    const nextNational = e.target.value;
    setNational(nextNational);
    emitChange(countryId, nextNational);
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        aria-label="Country code"
        value={countryId}
        onChange={handleCountryChange}
        className={selectClassName}
      >
        {PHONE_COUNTRY_CODES.map((country) => (
          <option key={country.id} value={country.id}>
            {country.id} {country.code}
          </option>
        ))}
      </select>
      <input
        type="tel"
        name={name}
        value={national}
        onChange={handleNationalChange}
        required={required}
        placeholder="555-123-4567"
        className={inputClassName}
      />
    </div>
  );
}

export default PhoneInput;
