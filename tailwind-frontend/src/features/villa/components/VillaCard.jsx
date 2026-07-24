import React from 'react';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const VillaCard = ({ villa, onClick }) => {
  const { t } = useTranslation();

  const getOccupancyStyles = (status) => {
    switch (status) {
      case 'Occupied':
        return 'border-green-500 bg-green-50/10 dark:bg-green-950/5 hover:border-green-600 shadow-sm';
      case 'Under Maintenance':
        return 'border-warning bg-warning/5 hover:border-warning/80 shadow-sm';
      default:
        return 'border-dashed border-stroke dark:border-strokedark bg-transparent opacity-80 hover:border-primary';
    }
  };

  const getBadgeClass = (status) => {
    switch (status) {
      case 'Occupied':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/40';
      case 'Under Maintenance':
        return 'bg-lightwarning text-warning border border-warning/20';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-meta-4 dark:text-gray-400 border border-stroke dark:border-strokedark';
    }
  };

  return (
    <div
      onClick={() => onClick(villa)}
      className={`group rounded-xl border p-5 flex flex-col justify-between h-40 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-white dark:bg-boxdark ${getOccupancyStyles(
        villa.status
      )}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-black dark:text-white group-hover:text-primary transition-colors">
            {villa.unitNumber}
          </span>
          {villa.blockOrBuilding && (
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-meta-4/40 px-1.5 py-0.5 rounded mt-1.5 self-start uppercase tracking-wider">
              {villa.blockOrBuilding}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full uppercase ${getBadgeClass(
            villa.status
          )}`}
        >
          {t(`villas.statusTypes.${villa.status}`, villa.status)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mt-auto">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Home className="h-3.5 w-3.5 opacity-60" />
          <span>{t(`villas.types.${villa.type}`, villa.type)}</span>
        </div>
        {villa.floorAreaSqFt && (
          <div className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            {villa.floorAreaSqFt} Sq Ft
          </div>
        )}
      </div>
    </div>
  );
};

export default VillaCard;
