/**
 * Pattern Library Page
 * Displays all shift pattern templates in a searchable grid
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  CalendarClock, 
  Clock, 
  Users,
  MoreHorizontal,
  Edit2,
  Copy,
  Archive,
  Trash2,
  RefreshCw,
  ChevronLeft,
  Loader2,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { usePatternTemplates, useDeletePatternTemplate, useClonePatternTemplate, useArchivePatternTemplate, useRestorePatternTemplate, usePatternAssignmentSummaries } from '../hooks/usePatternTemplates';
import { usePatternAssignments } from '../hooks/usePatternAssignments';
import type { ShiftPatternTemplate, PatternTemplateFilters, PatternStatus } from '../types';
import { PatternStatus as PatternStatusEnum, PatternStatusLabels, GenerationWindowLabels } from '../types';
import { SideNav, useSideNav } from '../../../components/common/SideNav';
import { seedStandardPatterns, standardPatterns } from '../utils/standardPatterns';
import { IndividualAssignment } from '../components/PatternAssignment';
import { useLocations } from '../../../hooks/useLocations';
import { useLocationSettings } from '../../../store/settingsStore';
import { MapPin } from 'lucide-react';

/**
 * Pattern Card Component
 */
interface PatternCardProps {
  pattern: ShiftPatternTemplate;
  assignedCount?: number;
  locationName?: string;
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string) => void;
}

function PatternCard({
  pattern,
  assignedCount = 0,
  locationName,
  onEdit,
  onClone,
  onArchive,
  onRestore,
  onDelete,
  onAssign,
}: PatternCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const statusStyles: Record<PatternStatus, string> = {
    [PatternStatusEnum.Active]: 'bg-emerald-100 text-emerald-700',
    [PatternStatusEnum.Inactive]: 'bg-amber-100 text-amber-700',
    [PatternStatusEnum.Archived]: 'bg-gray-100 text-gray-700',
  };

  const isArchived = pattern.cp365_sp_patternstatus === PatternStatusEnum.Archived;

  return (
    <div 
      className="group relative flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer"
      onClick={() => onEdit(pattern.cp365_shiftpatterntemplatenewid)}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{pattern.cp365_name}</h3>
          {pattern.cp365_sp_description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{pattern.cp365_sp_description}</p>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {!isArchived && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAssign(pattern.cp365_shiftpatterntemplatenewid);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-gray-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign to Staff
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(pattern.cp365_shiftpatterntemplatenewid);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Pattern
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onClone(pattern.cp365_shiftpatterntemplatenewid);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4" />
                  Clone Pattern
                </button>
                <div className="my-1 border-t border-gray-100" />
                {isArchived ? (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onRestore(pattern.cp365_shiftpatterntemplatenewid);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-gray-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore Pattern
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onArchive(pattern.cp365_shiftpatterntemplatenewid);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-gray-50"
                  >
                    <Archive className="h-4 w-4" />
                    Archive Pattern
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(pattern.cp365_shiftpatterntemplatenewid);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Pattern
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Location */}
      {locationName && (
        <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <span>{locationName}</span>
        </div>
      )}

      {/* Badges */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[pattern.cp365_sp_patternstatus]}`}>
          {PatternStatusLabels[pattern.cp365_sp_patternstatus]}
        </span>
        {pattern.cp365_sp_isstandardtemplate && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Standard
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {pattern.cp365_sp_rotationcycleweeks}-Week Rotation
        </span>
      </div>

      {/* Stats */}
      <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>{pattern.cp365_sp_averageweeklyhours?.toFixed(1) || '0'} hrs/week</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4 text-slate-400" />
          <span>{assignedCount} assigned</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Pattern Library Page Component
 */
export function PatternLibraryPage() {
  const navigate = useNavigate();
  const { isOpen: isSideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();
  
  // Location data
  const { data: locations = [], isLoading: isLoadingLocations } = useLocations();
  const { selectedLocationId, setSelectedLocationId } = useLocationSettings();
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatternStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'standard' | 'custom' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'created_desc' | 'usage'>('name_asc');

  // Seed standard patterns state
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{
    created: string[];
    skipped: string[];
    updated: string[];
    errors: string[];
  } | null>(null);

  // Assignment modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignPatternId, setAssignPatternId] = useState<string | null>(null);

  // Queries - filter by selected location
  const filters: PatternTemplateFilters = useMemo(() => ({
    searchTerm: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    sortBy,
    locationId: selectedLocationId || undefined,
  }), [searchTerm, statusFilter, typeFilter, sortBy, selectedLocationId]);

  const { data: patterns, isLoading, isError, refetch } = usePatternTemplates(filters);
  
  // Fetch assignment summaries for pattern cards
  const { data: assignmentSummaries = [] } = usePatternAssignmentSummaries();
  
  // Create a lookup map from pattern ID to assigned count
  const assignmentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    assignmentSummaries.forEach(summary => {
      map.set(summary.patternTemplateId, summary.totalStaffAssigned);
    });
    return map;
  }, [assignmentSummaries]);
  
  // Get selected location name for display
  const selectedLocation = useMemo(() => 
    locations.find(l => l.cp365_locationid === selectedLocationId),
    [locations, selectedLocationId]
  );

  // Mutations
  const deletePattern = useDeletePatternTemplate();
  const clonePattern = useClonePatternTemplate();
  const archivePattern = useArchivePatternTemplate();
  const restorePattern = useRestorePatternTemplate();

  // Seed standard patterns handler
  const handleSeedStandardPatterns = useCallback(async () => {
    if (!selectedLocationId) {
      setSeedResult({
        created: [],
        skipped: [],
        updated: [],
        errors: ['Please select a location first before adding standard patterns'],
      });
      return;
    }
    
    setIsSeeding(true);
    setSeedResult(null);
    try {
      // Use updateExisting: true to also add pattern days to existing templates
      // Pass locationId to assign patterns to the selected location
      const result = await seedStandardPatterns({ 
        skipExisting: false, 
        updateExisting: true,
        locationId: selectedLocationId,
      });
      setSeedResult(result);
      // Refetch patterns after seeding
      await refetch();
    } catch (error) {
      console.error('Failed to seed standard patterns:', error);
      setSeedResult({
        created: [],
        skipped: [],
        updated: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setIsSeeding(false);
    }
  }, [refetch, selectedLocationId]);

  // Handlers
  const handleEdit = useCallback((id: string) => {
    navigate(`/patterns/${id}`);
  }, [navigate]);

  const handleClone = useCallback((id: string) => {
    const pattern = patterns?.find(p => p.cp365_shiftpatterntemplatenewid === id);
    if (pattern) {
      const newName = `${pattern.cp365_name} (Copy)`;
      clonePattern.mutate({ sourceId: id, newName });
    }
  }, [patterns, clonePattern]);

  const handleArchive = useCallback((id: string) => {
    if (confirm('Are you sure you want to archive this pattern? It will be hidden from the library.')) {
      archivePattern.mutate(id);
    }
  }, [archivePattern]);

  const handleRestore = useCallback((id: string) => {
    restorePattern.mutate(id);
  }, [restorePattern]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this pattern? This action cannot be undone.')) {
      deletePattern.mutate(id);
    }
  }, [deletePattern]);

  const handleAssign = useCallback((id: string) => {
    setAssignPatternId(id);
    setIsAssignModalOpen(true);
  }, []);

  const handleAssignmentSuccess = useCallback((assignmentId: string) => {
    console.log('Assignment created:', assignmentId);
    setIsAssignModalOpen(false);
    setAssignPatternId(null);
    // Optionally navigate to assignments or show a success message
  }, []);

  const handleAssignmentCancel = useCallback(() => {
    setIsAssignModalOpen(false);
    setAssignPatternId(null);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav isOpen={isSideNavOpen} onClose={closeSideNav} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSideNav}
                className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Shift Patterns</h1>
                <p className="text-sm text-emerald-100">Manage reusable shift pattern templates</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSeedModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
                Add Standard Patterns
              </button>
              <Link
                to="/patterns/new"
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-600 shadow-sm hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
                Create New Pattern
              </Link>
            </div>
          </div>
        </header>

        {/* Location Selector */}
        <div className="border-b border-gray-200 bg-emerald-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">Location:</span>
            <select
              value={selectedLocationId || ''}
              onChange={(e) => setSelectedLocationId(e.target.value || null)}
              disabled={isLoadingLocations}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.cp365_locationid} value={location.cp365_locationid}>
                  {location.cp365_locationname}
                </option>
              ))}
            </select>
            {selectedLocation && (
              <span className="text-sm text-emerald-600">
                Showing patterns for {selectedLocation.cp365_locationname}
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patterns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PatternStatus | 'all')}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value={PatternStatusEnum.Active}>Active</option>
              <option value={PatternStatusEnum.Inactive}>Inactive</option>
              <option value={PatternStatusEnum.Archived}>Archived</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'standard' | 'custom' | 'all')}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="custom">Custom</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="created_desc">Recently Created</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : isError ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <CalendarClock className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-medium text-gray-900">Failed to load patterns</h3>
              <p className="mt-1 text-sm text-gray-500">There was an error loading the pattern library.</p>
              <button
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Try Again
              </button>
            </div>
          ) : patterns?.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-emerald-100 p-3">
                <CalendarClock className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-medium text-gray-900">No patterns found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters or search term.'
                  : 'Create your first shift pattern to get started.'}
              </p>
              <Link
                to="/patterns/new"
                className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Create Pattern
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {patterns?.map((pattern) => {
                // Get location name from the locations list using the pattern's location value
                const patternLocationId = pattern._cr482_location_value;
                const patternLocation = patternLocationId 
                  ? locations.find(l => l.cp365_locationid === patternLocationId)
                  : null;
                
                return (
                  <PatternCard
                    key={pattern.cp365_shiftpatterntemplatenewid}
                    pattern={pattern}
                    assignedCount={assignmentCountMap.get(pattern.cp365_shiftpatterntemplatenewid) || 0}
                    locationName={patternLocation?.cp365_locationname}
                    onEdit={handleEdit}
                    onAssign={handleAssign}
                    onClone={handleClone}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Seed Standard Patterns Modal */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Add Standard Patterns</h2>
              <p className="mt-1 text-sm text-slate-500">
                Import pre-configured shift patterns commonly used in UK care settings
              </p>
              {selectedLocation ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                  <MapPin className="h-4 w-4" />
                  <span>Patterns will be added to: <strong>{selectedLocation.cp365_locationname}</strong></span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
                  <MapPin className="h-4 w-4" />
                  <span>Please select a location first</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4">
              {seedResult ? (
                // Show results
                <div className="space-y-4">
                  {seedResult.created.length > 0 && (
                    <div className="rounded-lg bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">{seedResult.created.length} patterns created</span>
                      </div>
                      <ul className="mt-2 space-y-1 pl-7 text-sm text-emerald-600">
                        {seedResult.created.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {seedResult.skipped.length > 0 && (
                    <div className="rounded-lg bg-amber-50 p-4">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">{seedResult.skipped.length} patterns already exist</span>
                      </div>
                      <ul className="mt-2 space-y-1 pl-7 text-sm text-amber-600">
                        {seedResult.skipped.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {seedResult.errors.length > 0 && (
                    <div className="rounded-lg bg-red-50 p-4">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">{seedResult.errors.length} errors occurred</span>
                      </div>
                      <ul className="mt-2 space-y-1 pl-7 text-sm text-red-600">
                        {seedResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {seedResult.created.length === 0 && seedResult.errors.length === 0 && (
                    <div className="text-center py-4">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                      <p className="mt-2 text-sm text-slate-600">
                        All standard patterns already exist in your library.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Show pattern list
                <div>
                  <p className="mb-4 text-sm text-slate-600">
                    The following {standardPatterns.length} standard patterns will be added to your library:
                  </p>
                  <div className="max-h-64 space-y-2 overflow-auto rounded-lg border border-slate-200 p-3">
                    {standardPatterns.map((pattern) => (
                      <div
                        key={pattern.name}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div>
                          <span className="text-sm font-medium text-slate-700">{pattern.name}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            {pattern.rotationCycleWeeks}-week rotation
                          </span>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Standard
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Existing patterns with the same name will be skipped.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              {seedResult ? (
                <button
                  onClick={() => {
                    setIsSeedModalOpen(false);
                    setSeedResult(null);
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsSeedModalOpen(false)}
                    disabled={isSeeding}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSeedStandardPatterns}
                    disabled={isSeeding || !selectedLocationId}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSeeding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Add {standardPatterns.length} Patterns
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Individual Assignment Modal */}
      {isAssignModalOpen && assignPatternId && (
        <IndividualAssignment
          patternTemplateId={assignPatternId}
          onSuccess={handleAssignmentSuccess}
          onCancel={handleAssignmentCancel}
          variant="modal"
        />
      )}
    </div>
  );
}

