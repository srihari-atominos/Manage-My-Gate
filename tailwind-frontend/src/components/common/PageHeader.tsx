import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionButtons?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actionButtons }) => {
  return (
    <div className="mb-6 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-body dark:text-bodydark mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {actionButtons && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
