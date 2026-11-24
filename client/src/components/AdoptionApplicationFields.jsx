const NOT_LISTED = '__not_listed__';

const BONDED_PAIR_OPTIONS = ['Yes', 'No', 'Maybe'];
const YES_NO = ['Yes', 'No'];
const HOURS_ALONE = ['Under 4 hrs', '4 to 8 hrs', '8 to 10 hrs', '10+ hrs'];
const HOME_TYPES = ['House', 'Apartment', 'Condo or townhouse', 'Mobile home', 'Other'];
const RENT_OWN = ['Rent', 'Own', 'Live with family'];
const LEASE_ALLOWS = ['Yes', 'No', 'Checking'];
const LAST_VET = ['Within 12 months', '1 to 2 years ago', 'More than 2 years ago', 'Never'];
const DECLAW_NEW = ['Yes', 'No', 'Not sure'];
const OUTDOOR_OPTIONS = [
  'On a leash or harness',
  'In a catio',
  'In a yard with a cat fence',
  'Outside unsupervised',
  'No, never',
];

const inputClass = 'w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand';
const labelClass = 'mb-2 block text-sm font-semibold text-slate-800';

function RadioRow({ name, value, options, onChange, required }) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((option) => (
        <label key={option} className="inline-flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={onChange}
            required={required}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

function OutdoorCheckboxes({ name, selected, onToggle }) {
  const values = Array.isArray(selected) ? selected : [];
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {OUTDOOR_OPTIONS.map((option) => (
        <label key={option} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={values.includes(option)}
            onChange={(e) => onToggle(name, option, e.target.checked)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function SectionTitle({ n, children }) {
  return (
    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs text-brand">{n}</span>
      {children}
    </h3>
  );
}

function AdoptionApplicationFields({
  form,
  onChange,
  onToggleOutdoor,
  onToggleCat,
  availableKittens,
  lockedKitten,
}) {
  const selected = Array.isArray(form.selectedCatIds) ? form.selectedCatIds : [];
  const includesNotListed = selected.includes(NOT_LISTED);
  const renting = form.ownOrRent === 'Rent';
  const hasPets = form.hasCurrentPets === 'Yes';
  const hadPastPets = form.hadPastPets === 'Yes';
  const showVet = hasPets || hadPastPets;

  return (
    <>
      <SectionTitle n={2}>The cat you want</SectionTitle>
      <div className="mb-10 grid grid-cols-1 gap-6">
        <fieldset>
          <legend className={labelClass}>Which cat(s) are you applying for?</legend>
          <p className="mb-3 text-xs text-slate-500">Select all that apply. Choose “Not listed” if you do not see the cat here.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {availableKittens.map((kitten) => (
              <label key={kitten.id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(String(kitten.id))}
                  disabled={lockedKitten && String(kitten.id) === String(form.lockedCatId)}
                  onChange={(e) => onToggleCat(String(kitten.id), e.target.checked)}
                />
                <span>
                  {kitten.name}
                  {kitten.status ? ` — ${kitten.status}` : ''}
                </span>
              </label>
            ))}
            <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={includesNotListed}
                onChange={(e) => onToggleCat(NOT_LISTED, e.target.checked)}
              />
              <span>Not listed</span>
            </label>
          </div>
          {lockedKitten && (
            <p className="mt-2 text-xs font-medium text-brand">Pre-filled from the cat profile. You can add others.</p>
          )}
        </fieldset>

        {includesNotListed && (
          <label className="block">
            <span className={labelClass}>Name or description of the cat you saw, and where you saw it *</span>
            <input
              name="unlistedCatDescription"
              value={form.unlistedCatDescription}
              onChange={onChange}
              required
              className={inputClass}
            />
          </label>
        )}

        <label className="block">
          <span className={labelClass}>Why this cat, or what are you looking for in a cat? *</span>
          <textarea name="whyThisCat" value={form.whyThisCat} onChange={onChange} required rows={4} className={inputClass} />
        </label>

        <fieldset>
          <legend className={labelClass}>Are you open to adopting a bonded pair? *</legend>
          <RadioRow name="bondedPair" value={form.bondedPair} options={BONDED_PAIR_OPTIONS} onChange={onChange} required />
        </fieldset>
      </div>

      <SectionTitle n={3}>Household</SectionTitle>
      <div className="mb-10 grid grid-cols-1 gap-6">
        <label className="block">
          <span className={labelClass}>Who lives in the home? List adults, and ages of any children living there or visiting often *</span>
          <textarea name="householdMembers" value={form.householdMembers} onChange={onChange} required rows={4} className={inputClass} />
        </label>
        <fieldset>
          <legend className={labelClass}>Is anyone in the home allergic to cats? *</legend>
          <RadioRow name="allergicToCats" value={form.allergicToCats} options={YES_NO} onChange={onChange} required />
        </fieldset>
        {form.allergicToCats === 'Yes' && (
          <label className="block">
            <span className={labelClass}>What is your plan for the allergy? *</span>
            <input name="allergyPlan" value={form.allergyPlan} onChange={onChange} required className={inputClass} />
          </label>
        )}
        <label className="block">
          <span className={labelClass}>Who will be the cat&apos;s primary caregiver? *</span>
          <input name="primaryCaregiver" value={form.primaryCaregiver} onChange={onChange} required className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>On a typical day, how long will the cat be home alone? *</span>
          <select name="hoursHomeAlone" value={form.hoursHomeAlone} onChange={onChange} required className={`${inputClass} bg-white`}>
            <option value="" disabled>Select an option</option>
            {HOURS_ALONE.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Who cares for your pets when you travel? *</span>
          <input name="travelCare" value={form.travelCare} onChange={onChange} required className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>If you could no longer care for the cat, temporarily or permanently, what is your plan? *</span>
          <textarea name="unableToCarePlan" value={form.unableToCarePlan} onChange={onChange} required rows={4} className={inputClass} />
        </label>
      </div>

      <SectionTitle n={4}>Your home</SectionTitle>
      <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Home type *</span>
          <select name="homeType" value={form.homeType} onChange={onChange} required className={`${inputClass} bg-white`}>
            <option value="" disabled>Select an option</option>
            {HOME_TYPES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <fieldset className="block sm:col-span-2">
          <legend className={labelClass}>Do you rent or own? *</legend>
          <RadioRow name="ownOrRent" value={form.ownOrRent} options={RENT_OWN} onChange={onChange} required />
        </fieldset>
        {renting && (
          <>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Landlord or property manager name and phone *</span>
              <input name="landlordContact" value={form.landlordContact} onChange={onChange} required className={inputClass} />
            </label>
            <fieldset className="block sm:col-span-2">
              <legend className={labelClass}>Does your lease allow cats? *</legend>
              <RadioRow name="leaseAllowsCats" value={form.leaseAllowsCats} options={LEASE_ALLOWS} onChange={onChange} required />
            </fieldset>
          </>
        )}
        <label className="block sm:col-span-2">
          <span className={labelClass}>If you move, what happens to your pets? *</span>
          <input name="ifMovePlan" value={form.ifMovePlan} onChange={onChange} required className={inputClass} />
        </label>
      </div>

      <SectionTitle n={5}>Current and past pets</SectionTitle>
      <div className="mb-10 grid grid-cols-1 gap-6">
        <fieldset>
          <legend className={labelClass}>Do you currently have pets? *</legend>
          <RadioRow name="hasCurrentPets" value={form.hasCurrentPets} options={YES_NO} onChange={onChange} required />
        </fieldset>
        {hasPets && (
          <>
            <label className="block">
              <span className={labelClass}>List each pet: species, age, sex, spayed or neutered, vaccines current *</span>
              <textarea name="currentPetDetails" value={form.currentPetDetails} onChange={onChange} required rows={4} className={inputClass} />
            </label>
            <fieldset>
              <legend className={labelClass}>Do your current cats go outside? *</legend>
              <OutdoorCheckboxes name="currentCatsOutside" selected={form.currentCatsOutside} onToggle={onToggleOutdoor} />
            </fieldset>
            <fieldset>
              <legend className={labelClass}>Are any of your current cats declawed? *</legend>
              <RadioRow name="currentCatsDeclawed" value={form.currentCatsDeclawed} options={YES_NO} onChange={onChange} required />
            </fieldset>
            <label className="block">
              <span className={labelClass}>When did your pets last see a vet for an exam or vaccines? *</span>
              <select name="lastVetVisit" value={form.lastVetVisit} onChange={onChange} required className={`${inputClass} bg-white`}>
                <option value="" disabled>Select an option</option>
                {LAST_VET.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <fieldset>
          <legend className={labelClass}>Have you had pets in the last 5 years that are no longer with you? *</legend>
          <RadioRow name="hadPastPets" value={form.hadPastPets} options={YES_NO} onChange={onChange} required />
        </fieldset>
        {hadPastPets && (
          <label className="block">
            <span className={labelClass}>For each one: species, how long you had them, and what happened *</span>
            <textarea name="pastPetsDetails" value={form.pastPetsDetails} onChange={onChange} required rows={4} className={inputClass} />
          </label>
        )}
        {showVet && (
          <>
            <label className="block">
              <span className={labelClass}>Vet or clinic name and phone *</span>
              <input name="vetContact" value={form.vetContact} onChange={onChange} required className={inputClass} />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                name="vetContactConsent"
                checked={Boolean(form.vetContactConsent)}
                onChange={(e) => onChange({ target: { name: 'vetContactConsent', value: e.target.checked } })}
                required
                className="mt-1"
              />
              <span>We may contact your vet to confirm your pets&apos; records *</span>
            </label>
          </>
        )}
      </div>

      <SectionTitle n={6}>Care and commitment</SectionTitle>
      <div className="mb-10 grid grid-cols-1 gap-6">
        <fieldset>
          <legend className={labelClass}>Will your new cat go outside? *</legend>
          <OutdoorCheckboxes name="newCatOutside" selected={form.newCatOutside} onToggle={onToggleOutdoor} />
        </fieldset>
        <fieldset>
          <legend className={labelClass}>Would you consider declawing your new cat? *</legend>
          <RadioRow name="considerDeclawing" value={form.considerDeclawing} options={DECLAW_NEW} onChange={onChange} required />
        </fieldset>
        <p className={labelClass}>What would you do if your cat:</p>
        <label className="block">
          <span className={labelClass}>(a) stopped using the litter box *</span>
          <input name="litterBoxPlan" value={form.litterBoxPlan} onChange={onChange} required className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>(b) scratched furniture *</span>
          <input name="scratchingPlan" value={form.scratchingPlan} onChange={onChange} required className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>(c) didn&apos;t get along with your other pets *</span>
          <input name="otherPetsConflictPlan" value={form.otherPetsConflictPlan} onChange={onChange} required className={inputClass} />
        </label>
        <fieldset>
          <legend className={labelClass}>Can you cover routine vet care plus an unexpected bill of $500 or more? *</legend>
          <RadioRow name="canCoverVetBill" value={form.canCoverVetBill} options={YES_NO} onChange={onChange} required />
        </fieldset>
        <fieldset>
          <legend className={labelClass}>Agreements *</legend>
          <div className="space-y-3">
            {[
              ['agreeHomeCheck', 'I agree to an in-person or video home check.'],
              ['agreeSpayNeuter', 'If my cat is not yet spayed or neutered at adoption, I agree to the spay/neuter agreement and refundable deposit.'],
              ['agreeTruthful', 'My answers are true; false information can void the adoption.'],
              ['agreeMayDecline', 'Pawsitive Transformations may decline any application.'],
            ].map(([name, label]) => (
              <label key={name} className="flex items-start gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  name={name}
                  checked={Boolean(form[name])}
                  onChange={(e) => onChange({ target: { name, value: e.target.checked } })}
                  required
                  className="mt-1"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className={labelClass}>Anything else you want us to know?</span>
          <textarea name="message" value={form.message} onChange={onChange} rows={4} className={inputClass} />
        </label>
      </div>
    </>
  );
}

export { NOT_LISTED, OUTDOOR_OPTIONS };
export default AdoptionApplicationFields;
