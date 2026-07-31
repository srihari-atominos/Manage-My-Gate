import React, { useRef } from 'react';
import { CloudUpload } from 'lucide-react';

interface CSVImportZoneProps {
  fileName?: string;
  onFileSelected: (file: File) => void;
  onError: (errorMsg: string) => void;
  accept?: string;
  maxSizeMB?: number;
}

const CSVImportZone: React.FC<CSVImportZoneProps> = ({
  fileName,
  onFileSelected,
  onError,
  accept = '.csv',
  maxSizeMB = 2,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    // Validate file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const expectedExtension = accept.replace('.', '').toLowerCase();
    
    if (extension !== expectedExtension && file.type !== 'text/csv') {
      onError(`Please upload a valid ${expectedExtension.toUpperCase()} file.`);
      return;
    }

    // Validate size limit
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError(`Maximum file size allowed is ${maxSizeMB}MB.`);
      return;
    }

    onError('');
    onFileSelected(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="p-6 border border-dashed border-stroke dark:border-strokedark rounded text-center bg-gray-50 dark:bg-meta-4/20 cursor-pointer hover:bg-gray-100 dark:hover:bg-meta-4/30 transition-colors duration-150"
    >
      <input
        type="file"
        accept={accept}
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <CloudUpload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
      {fileName ? (
        <div>
          <div className="font-semibold text-sm text-primary mb-1">{fileName}</div>
          <div className="text-gray-400 dark:text-gray-500 text-xs">Click or drag another file to replace</div>
        </div>
      ) : (
        <div>
          <div className="font-semibold text-sm mb-1 text-black dark:text-white">Click to Upload or Drag & Drop File</div>
          <div className="text-gray-400 dark:text-gray-500 text-xs">
            {accept.replace('.', '').toUpperCase()} files only. Maximum file size {maxSizeMB}MB.
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVImportZone;
