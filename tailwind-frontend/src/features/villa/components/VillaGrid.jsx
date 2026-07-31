import React from 'react';
import VillaCard from './VillaCard';

export const VillaGrid = ({ villas, onCardClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
      {villas.map((villa) => (
        <VillaCard
          key={villa._id}
          villa={villa}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
};

export default VillaGrid;
