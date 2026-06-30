const YES_NO_OPTIONS = ['', 'Yes', 'No'];

export function createEmptyHouseholdPet() {
  return {
    name: '',
    species: '',
    age: '',
    fixed: '',
    goodWithOtherAnimals: '',
  };
}

function HouseholdPetsSection({ pets, onChange }) {
  function updatePet(index, field, value) {
    onChange(pets.map((pet, i) => (i === index ? { ...pet, [field]: value } : pet)));
  }

  function removePet(index) {
    onChange(pets.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Current Pets in Household</h3>
          <p className="mt-1 text-xs text-gray-500">Add each pet currently living in your home.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...pets, createEmptyHouseholdPet()])}
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Add Pet
        </button>
      </div>

      {pets.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No pets added yet. Click &quot;Add Pet&quot; if you have pets at home.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {pets.map((pet, index) => (
            <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Pet {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removePet(index)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">Name</span>
                  <input
                    value={pet.name}
                    onChange={(e) => updatePet(index, 'name', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">Species</span>
                  <input
                    value={pet.species}
                    onChange={(e) => updatePet(index, 'species', e.target.value)}
                    required
                    placeholder="e.g. Cat, Dog"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">Age</span>
                  <input
                    value={pet.age}
                    onChange={(e) => updatePet(index, 'age', e.target.value)}
                    required
                    placeholder="e.g. 2 years"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">Fixed</span>
                  <select
                    value={pet.fixed}
                    onChange={(e) => updatePet(index, 'fixed', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {YES_NO_OPTIONS.filter(Boolean).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-gray-600">Good with Other Animals</span>
                  <select
                    value={pet.goodWithOtherAnimals}
                    onChange={(e) => updatePet(index, 'goodWithOtherAnimals', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {YES_NO_OPTIONS.filter(Boolean).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default HouseholdPetsSection;
