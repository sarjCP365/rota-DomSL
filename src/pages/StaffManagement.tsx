/**
 * StaffManagement Page
 * Staff list, detail view, and form management
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { SideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { StaffList } from '@/components/staff/StaffList';
import { StaffDetail } from '@/components/staff/StaffDetail';
import { StaffForm } from '@/components/staff/StaffForm';

type ViewMode = 'list' | 'detail' | 'edit' | 'create';

export function StaffManagement() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const [sideNavOpen, _setSideNavOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(staffId ? 'detail' : 'list');

  const handleSelectStaff = (id: string) => {
    void navigate(`/admin/staff/${id}`);
    setViewMode('detail');
  };

  const handleCreateNew = () => {
    void navigate('/admin/staff/new');
    setViewMode('create');
  };

  const handleEdit = () => {
    setViewMode('edit');
  };

  const handleCancel = () => {
    if (staffId) {
      setViewMode('detail');
    } else {
      void navigate('/admin/staff');
      setViewMode('list');
    }
  };

  const handleSubmit = async (_data: unknown) => {
    // TODO: Implement create/update using mutation hooks
    handleCancel();
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'create':
        return 'Create Staff Member';
      case 'edit':
        return 'Edit Staff Member';
      case 'detail':
        return 'Staff Member Details';
      default:
        return 'Staff Management';
    }
  };

  return (
    <div className="flex h-screen flex-col bg-elevation-1">
      <Header title={getTitle()} showBackButton={viewMode !== 'list'} onBack={handleCancel} />

      <div className="flex flex-1 overflow-hidden">
        <FeatureErrorBoundary featureName="Navigation">
          <SideNav isOpen={sideNavOpen} />
        </FeatureErrorBoundary>

        <main className="flex flex-1 flex-col overflow-auto bg-white">
          <div className="p-6">
            {viewMode === 'list' && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">All Staff Members</h2>
                  <button
                    onClick={handleCreateNew}
                    className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
                  >
                    Add Staff Member
                  </button>
                </div>
                <StaffList onSelectStaff={handleSelectStaff} />
              </>
            )}

            {viewMode === 'detail' && staffId && (
              <StaffDetail staffId={staffId} onEdit={handleEdit} />
            )}

            {(viewMode === 'edit' || viewMode === 'create') && (
              <StaffForm
                staffId={viewMode === 'edit' ? staffId : undefined}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
