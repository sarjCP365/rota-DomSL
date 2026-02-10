/**
 * StaffDetail Component
 * Full staff member profile view with tabs
 */

import { useState } from 'react';

interface StaffDetailProps {
  staffId: string;
  onEdit?: () => void;
}

type TabKey = 'personal' | 'employment' | 'addresses' | 'bank' | 'contacts' | 'documents';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'personal', label: 'Personal Details' },
  { key: 'employment', label: 'Employment' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'bank', label: 'Bank Details' },
  { key: 'contacts', label: 'Emergency Contacts' },
  { key: 'documents', label: 'Documents' },
];

export function StaffDetail({ staffId, onEdit }: StaffDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('personal');

  // TODO: Fetch staff data using useStaff hook

  return (
    <div className="flex flex-col">
      {/* Staff Header */}
      <div className="flex items-center justify-between border-b border-border-grey p-6">
        <div>
          <h2 className="text-2xl font-semibold">Staff Member Name</h2>
          <p className="text-gray-500">Staff ID: {staffId}</p>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          >
            Edit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border-grey">
        <div className="flex gap-1 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6">
        {/* TODO: Implement tab content based on activeTab */}
        <p className="text-gray-500">
          {activeTab} tab content placeholder for staff {staffId}
        </p>
      </div>
    </div>
  );
}
