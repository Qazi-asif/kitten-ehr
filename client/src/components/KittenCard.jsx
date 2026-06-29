const statusBadgeClass = {
  'In Foster Care': 'bg-emerald-100 text-emerald-800',
  'Available for Adoption': 'bg-blue-100 text-blue-800',
  Adopted: 'bg-purple-100 text-purple-800',
  'Medical Hold': 'bg-amber-100 text-amber-800',
};

function KittenCard({ name, status, breed }) {
  const badgeClass = statusBadgeClass[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-md">
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{name}</h3>
      <span
        className={`mb-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
      >
        {status}
      </span>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-700">Breed:</span> {breed}
      </p>
    </article>
  );
}

export default KittenCard;
