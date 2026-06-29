import KittenCard from './KittenCard';

function KittenGrid({ kittens }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {kittens.map((kitten) => (
        <KittenCard
          key={kitten.id}
          name={kitten.name}
          status={kitten.status}
          breed={kitten.breed}
        />
      ))}
    </div>
  );
}

export default KittenGrid;
