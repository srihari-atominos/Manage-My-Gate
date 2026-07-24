import React from 'react';
import { Button } from 'src/components/ui/button';
import { CloudDownload } from 'lucide-react';

interface DownloadTemplateButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

const DownloadTemplateButton: React.FC<DownloadTemplateButtonProps> = ({
  onClick,
  label = 'Download Template',
  disabled = false,
}) => {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white hover:bg-gray-50 dark:hover:bg-meta-4/30"
    >
      <CloudDownload className="h-4 w-4" />
      {label}
    </Button>
  );
};

export default DownloadTemplateButton;
