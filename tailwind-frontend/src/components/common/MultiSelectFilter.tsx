import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from 'src/components/ui/dropdown-menu';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  selectedValues,
  onToggle,
  onClear,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-between gap-2.5 rounded border border-stroke bg-transparent py-1.5 px-3 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 outline-none cursor-pointer min-w-[120px]"
        >
          <span className="flex items-center gap-1.5">
            {label}
            {selectedValues.length > 0 && (
              <span className="flex h-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-bold text-white leading-none">
                {selectedValues.length}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[180px] bg-white dark:bg-boxdark border border-stroke dark:border-strokedark p-1 shadow-default">
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selectedValues.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
            className="cursor-pointer text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4/20 focus:bg-gray-100 dark:focus:bg-meta-4/20"
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
        {onClear && selectedValues.length > 0 && (
          <>
            <DropdownMenuSeparator className="border-stroke dark:border-strokedark" />
            <DropdownMenuItem
              onClick={onClear}
              className="cursor-pointer text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium px-2 py-1.5"
            >
              Clear filter
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSelectFilter;
