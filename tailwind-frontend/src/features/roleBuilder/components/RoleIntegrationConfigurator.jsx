import React, { useRef } from 'react';
import { Button } from 'src/components/ui/button';
import { Badge } from 'src/components/ui/badge';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useRoleIntegrationConfigurator from '../hooks/useRoleIntegrationConfigurator.js';

// Providers metadata matching the backend catalog list
const PROVIDERS = [
  { id: 'smtp', name: 'SMTP Email', icon: '✉️' },
  { id: 'twilio', name: 'Twilio SMS', icon: '📱' },
  { id: 'openai', name: 'OpenAI (AI)', icon: '🤖' },
  { id: 'resend', name: 'Resend Email', icon: '✉️' },
];

export const RoleIntegrationConfigurator = ({ isOpen, onClose, mappings, onApply }) => {
  const carouselRef = useRef(null);

  const {
    isLoading,
    filteredConnections,
    selectedProvider,
    setSelectedProvider,
    tempMappings,
    handleSelectConnection,
    handleApply,
  } = useRoleIntegrationConfigurator(isOpen, mappings, onApply, onClose);

  if (!isOpen) return null;

  // Carousel scrolling helpers
  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="role-integration-configurator mt-3 p-4 border border-stroke dark:border-strokedark rounded-md bg-gray-50 dark:bg-meta-4/20 space-y-4">
      <div className="flex justify-between items-center">
        <h6 className="font-bold text-sm text-primary">
          Configure Role Integrations
        </h6>
        <span className="text-gray-500 dark:text-gray-400 text-xs">Select at most 1 connection per provider</span>
      </div>

      {/* Provider Carousel */}
      <div className="relative flex items-center px-6">
        <button
          type="button"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full border border-stroke bg-white dark:border-strokedark dark:bg-boxdark text-gray-500 hover:bg-gray-100 dark:hover:bg-meta-4 shadow-sm z-10 font-bold"
          onClick={scrollLeft}
        >
          ‹
        </button>

        <div
          ref={carouselRef}
          className="flex gap-2 overflow-x-auto py-1.5 scrollbar-hidden w-full"
        >
          {PROVIDERS.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            const isMapped = !!tempMappings[provider.id];

            return (
              <button
                key={provider.id}
                type="button"
                className={`px-3 py-2 border rounded text-center bg-white dark:bg-boxdark flex-shrink-0 flex flex-column items-center gap-1.5 min-w-[110px] cursor-pointer transition-all hover:border-primary ${
                  isSelected
                    ? 'border-primary border-2 dark:border-primary shadow-sm bg-gray-50/50 dark:bg-meta-4/10'
                    : 'border-stroke dark:border-strokedark'
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <span className="text-lg">{provider.icon}</span>
                <span className="font-semibold text-xs text-black dark:text-white">{provider.name}</span>
                {isMapped && (
                  <Badge variant="lightSuccess" className="text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full border border-stroke bg-white dark:border-strokedark dark:bg-boxdark text-gray-500 hover:bg-gray-100 dark:hover:bg-meta-4 shadow-sm z-10 font-bold"
          onClick={scrollRight}
        >
          ›
        </button>
      </div>

      {/* Connections Table */}
      <div className="relative rounded-md border border-stroke dark:border-strokedark bg-white dark:bg-boxdark overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-6 gap-2">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
            <span className="text-gray-500 dark:text-gray-400 text-xs">Loading connections...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
              <tr>
                <th className="py-2 px-3 font-semibold text-black dark:text-white text-center w-12">Select</th>
                <th className="py-2 px-3 font-semibold text-black dark:text-white">Connection Name / Label</th>
                <th className="py-2 px-3 font-semibold text-black dark:text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* None / Disconnect Option */}
              <tr
                onClick={() => handleSelectConnection(null)}
                className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/20 cursor-pointer"
              >
                <td className="py-2.5 px-3 text-center">
                  <input
                    type="radio"
                    id="conn-radio-none"
                    name={`conn-radio-${selectedProvider}`}
                    checked={!tempMappings[selectedProvider]}
                    onChange={() => handleSelectConnection(null)}
                    className="h-4 w-4 border-stroke dark:border-strokedark text-primary focus:ring-primary bg-transparent"
                  />
                </td>
                <td className="py-2.5 px-3 text-gray-400 dark:text-gray-500 font-semibold italic">
                  (None / Disconnect)
                </td>
                <td className="py-2.5 px-3 text-gray-400 dark:text-gray-500">—</td>
              </tr>

              {/* Connections List */}
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-gray-400 dark:text-gray-500">
                    No connections connected yet. Set up connections in the Integration Hub.
                  </td>
                </tr>
              ) : (
                filteredConnections.map((conn) => {
                  const isChecked = tempMappings[selectedProvider] === conn.id;
                  return (
                    <tr
                      key={conn.id}
                      onClick={() => handleSelectConnection(conn.id)}
                      className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/20 cursor-pointer"
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="radio"
                          id={`conn-radio-${conn.id}`}
                          name={`conn-radio-${selectedProvider}`}
                          checked={isChecked}
                          onChange={() => handleSelectConnection(conn.id)}
                          className="h-4 w-4 border-stroke dark:border-strokedark text-primary focus:ring-primary bg-transparent"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-black dark:text-white">
                        {conn.accountLabel}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="success" className="px-2 py-0.5 rounded text-[10px] font-semibold">
                          Connected
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-2 pt-3 border-t border-stroke dark:border-strokedark">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleApply}
          className="text-xs font-semibold px-4 py-2"
        >
          Apply Mappings
        </Button>
      </div>
    </div>
  );
};

export default RoleIntegrationConfigurator;
