import React from 'react';
import { Paperclip } from 'lucide-react';
import '../styles/_complaints.scss';

const Timeline = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        No timeline events yet.
      </p>
    );
  }

  return (
    <div className="relative space-y-6 ps-8">
      {events.map((evt, index) => (
        <div key={index} className="relative">
          {/* Connector line */}
          {index !== events.length - 1 && (
            <span className="absolute start-[-25px] top-3 h-full w-px bg-stroke dark:bg-strokedark" />
          )}

          {/* Dot */}
          <span className="absolute start-[-30px] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-white dark:bg-boxdark" />

          {/* Content */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {evt.action} • {new Date(evt.date).toLocaleString()}
              {evt.userName && ` by ${evt.userName} (${evt.userRole})`}
            </div>

            {evt.remarks && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {evt.remarks}
              </div>
            )}

            {evt.attachments && evt.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {evt.attachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
