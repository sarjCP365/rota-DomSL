/**
 * RoundView Component
 *
 * Split view showing round list and map for geographic planning.
 * Displays service user locations, visit routes, and round management.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays } from 'date-fns';
import {
  MapPin,
  List,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Car,
  Route,
  AlertTriangle,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Visit, RoundWithStats, DomiciliaryServiceUser, VisitType } from '@/types/domiciliary';
import { getVisitTypeDisplayName } from '@/types/domiciliary';
import { VisitType as VT } from '@/types/domiciliary';
import { getDummyData } from '@/data/dummyDataGenerator';
import {
  createRoundsFromVisits,
  getVisitsBounds,
} from '@/services/roundPlanning';
import { dataSource } from '@/services/dataSource';

// =============================================================================
// LEAFLET ICON FIX
// =============================================================================

// Fix Leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// =============================================================================
// CUSTOM MARKER ICONS
// =============================================================================

const createNumberedIcon = (number: number, colour: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${colour};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createUnassignedIcon = (number: number) => createNumberedIcon(number, '#ef4444');
const _createAssignedIcon = (number: number) => createNumberedIcon(number, '#3b82f6');

// Round colours for distinguishing different rounds
const ROUND_COLOURS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];

// =============================================================================
// MAP BOUNDS COMPONENT
// =============================================================================

interface MapBoundsProps {
  bounds: { north: number; south: number; east: number; west: number } | null;
}

function MapBounds({ bounds }: MapBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds([
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ]);
    }
  }, [map, bounds]);

  return null;
}

// =============================================================================
// ROUND CARD COMPONENT
// =============================================================================

interface RoundCardProps {
  round: RoundWithStats;
  index: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onVisitClick: (visit: Visit) => void;
  serviceUsers: Map<string, DomiciliaryServiceUser>;
}

function RoundCard({
  round,
  index,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  onVisitClick,
  serviceUsers,
}: RoundCardProps) {
  const colour = ROUND_COLOURS[index % ROUND_COLOURS.length];

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-offset-1' : ''
      }`}
      style={{ borderColor: isSelected ? colour : '#e5e7eb', '--tw-ring-color': colour } as any}
    >
      {/* Header */}
      <div
        onClick={onSelect}
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: colour }}
        >
          {String.fromCharCode(65 + index)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">{round.cp365_roundname}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {round.cp365_starttime} - {round.cp365_endtime}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {round.visits.length} visits
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!round.isFullyAssigned && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              Unassigned
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs">
        <span className="flex items-center gap-1 text-gray-600">
          <Clock className="w-3 h-3" />
          {Math.round(round.totalVisitMinutes / 60 * 10) / 10}h visits
        </span>
        <span className="flex items-center gap-1 text-gray-600">
          <Car className="w-3 h-3" />
          ~{round.totalTravelMinutes} min travel
        </span>
        <span className="flex items-center gap-1 text-gray-600">
          <Users className="w-3 h-3" />
          {round.serviceUserCount} clients
        </span>
      </div>

      {/* Expanded visit list */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {round.visits.map((visit, visitIdx) => {
            const serviceUser = serviceUsers.get(visit.cp365_serviceuserid);
            return (
              <div
                key={visit.cp365_visitid}
                onClick={() => onVisitClick(visit)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: colour }}
                >
                  {visitIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {serviceUser?.cp365_fullname || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {serviceUser?.cp365_currentaddress}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{visit.cp365_scheduledstarttime}</p>
                  <p className="text-xs text-gray-500">{visit.cp365_durationminutes} min</p>
                </div>
                {!visit.cp365_staffmemberid && (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface RoundViewProps {
  initialDate?: Date;
  onVisitSelect?: (visit: Visit) => void;
}

export function RoundView({ initialDate = new Date(), onVisitSelect }: RoundViewProps) {
  const [selectedDate, setSelectedDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType>(VT.Morning);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');

  // Fetch all data
  const dataQuery = useQuery({
    queryKey: ['domiciliary', 'roundViewData'],
    queryFn: () => getDummyData(),
    staleTime: 5 * 60 * 1000,
  });

  // Create service users map
  const serviceUsersMap = useMemo(() => {
    if (!dataQuery.data) return new Map<string, DomiciliaryServiceUser>();
    return new Map(dataQuery.data.serviceUsers.map(su => [su.cp365_serviceuserid, su]));
  }, [dataQuery.data]);

  // Filter visits for selected date
  const dateVisits = useMemo(() => {
    if (!dataQuery.data) return [];
    const filtered = dataQuery.data.visits.filter(v => v.cp365_visitdate === selectedDate);
    console.log(`📅 RoundView: ${dataQuery.data.visits.length} total visits, ${filtered.length} on ${selectedDate}`);
    return filtered;
  }, [dataQuery.data, selectedDate]);

  // Create rounds from visits
  const roundsQuery = useQuery({
    queryKey: ['rounds', selectedDate, selectedVisitType, dateVisits.length],
    queryFn: async () => {
      console.log(`🔄 Creating rounds for ${dateVisits.length} visits, type ${selectedVisitType}`);
      return createRoundsFromVisits(dateVisits, selectedVisitType, selectedDate);
    },
    enabled: dateVisits.length > 0,
    staleTime: 30 * 1000,
  });

  const rounds = roundsQuery.data || [];
  
  console.log(`📊 RoundView: roundsQuery status=${roundsQuery.status}, rounds=${rounds.length}`, roundsQuery.error);

  // Get bounds for map
  const mapBounds = useMemo(() => {
    const allVisits = rounds.flatMap(r => r.visits);
    return getVisitsBounds(allVisits, serviceUsersMap);
  }, [rounds, serviceUsersMap]);

  // Get selected round
  const _selectedRound = useMemo(() => {
    if (!selectedRoundId) return null;
    return rounds.find(r => r.cp365_roundid === selectedRoundId) || null;
  }, [rounds, selectedRoundId]);

  // Stats for the day
  const dayStats = useMemo(() => {
    const allVisits = rounds.flatMap(r => r.visits);
    const unassignedCount = allVisits.filter(v => !v.cp365_staffmemberid).length;
    const totalMinutes = allVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
    return {
      totalVisits: allVisits.length,
      unassignedCount,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      roundCount: rounds.length,
    };
  }, [rounds]);

  // Handlers
  const goToPreviousDay = useCallback(() => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  }, [selectedDate]);

  const goToNextDay = useCallback(() => {
    setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const toggleExpand = useCallback((roundId: string) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  }, []);

  const handleRoundSelect = useCallback((roundId: string) => {
    setSelectedRoundId(prev => (prev === roundId ? null : roundId));
  }, []);

  const handleVisitClick = useCallback((visit: Visit) => {
    onVisitSelect?.(visit);
  }, [onVisitSelect]);

  // Loading state
  if (dataQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading round data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="font-semibold">
              {format(new Date(selectedDate), 'EEEE d MMMM yyyy')}
            </span>
          </div>

          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Visit type filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedVisitType}
            onChange={(e) => setSelectedVisitType(Number(e.target.value) as VisitType)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(VT)
              .filter(([key]) => isNaN(Number(key)))
              .map(([key, value]) => (
                <option key={key} value={value}>
                  {getVisitTypeDisplayName(value as VisitType)}
                </option>
              ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === 'split' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm">
        <span className="flex items-center gap-1 text-gray-600">
          <Route className="w-4 h-4" />
          <strong>{dayStats.roundCount}</strong> rounds
        </span>
        <span className="flex items-center gap-1 text-gray-600">
          <MapPin className="w-4 h-4" />
          <strong>{dayStats.totalVisits}</strong> visits
        </span>
        <span className="flex items-center gap-1 text-gray-600">
          <Clock className="w-4 h-4" />
          <strong>{dayStats.totalHours}</strong>h total
        </span>
        {dayStats.unassignedCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <strong>{dayStats.unassignedCount}</strong> unassigned
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Round list */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div
            className={`${
              viewMode === 'split' ? 'w-96' : 'flex-1'
            } border-r border-gray-200 overflow-y-auto p-4 space-y-3`}
          >
            {roundsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : rounds.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No {getVisitTypeDisplayName(selectedVisitType).toLowerCase()} visits scheduled</p>
                <p className="text-sm text-gray-400 mt-1">
                  Select a different date or visit type
                </p>
              </div>
            ) : (
              rounds.map((round, index) => (
                <RoundCard
                  key={round.cp365_roundid}
                  round={round}
                  index={index}
                  isExpanded={expandedRounds.has(round.cp365_roundid)}
                  isSelected={selectedRoundId === round.cp365_roundid}
                  onToggleExpand={() => toggleExpand(round.cp365_roundid)}
                  onSelect={() => handleRoundSelect(round.cp365_roundid)}
                  onVisitClick={handleVisitClick}
                  serviceUsers={serviceUsersMap}
                />
              ))
            )}
          </div>
        )}

        {/* Map */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className="flex-1 relative">
            <MapContainer
              center={[51.5074, -0.1278]} // Default to London
              zoom={12}
              className="h-full w-full"
              style={{ background: '#f3f4f6' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={dataSource.mapTileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              />

              {mapBounds && <MapBounds bounds={mapBounds} />}

              {/* Render route lines for each round */}
              {rounds.map((round, roundIndex) => {
                const colour = ROUND_COLOURS[roundIndex % ROUND_COLOURS.length];
                const shouldShow = !selectedRoundId || selectedRoundId === round.cp365_roundid;

                if (!shouldShow) return null;

                const positions = round.visits
                  .map(v => {
                    const user = serviceUsersMap.get(v.cp365_serviceuserid);
                    return user?.cp365_latitude && user?.cp365_longitude
                      ? [user.cp365_latitude, user.cp365_longitude] as [number, number]
                      : null;
                  })
                  .filter((pos): pos is [number, number] => pos !== null);

                return positions.length > 1 ? (
                  <Polyline
                    key={`route-${round.cp365_roundid}`}
                    positions={positions}
                    color={colour}
                    weight={3}
                    opacity={0.7}
                    dashArray={selectedRoundId === round.cp365_roundid ? undefined : '5, 10'}
                  />
                ) : null;
              })}

              {/* Render markers for each round */}
              {rounds.flatMap((round, roundIndex) => {
                const colour = ROUND_COLOURS[roundIndex % ROUND_COLOURS.length];
                const shouldShow = !selectedRoundId || selectedRoundId === round.cp365_roundid;

                if (!shouldShow) return [];

                return round.visits.map((visit, visitIndex) => {
                  const serviceUser = serviceUsersMap.get(visit.cp365_serviceuserid);
                  if (!serviceUser?.cp365_latitude || !serviceUser?.cp365_longitude) {
                    return null;
                  }

                  // Use round colour for assigned, red for unassigned
                  const icon = visit.cp365_staffmemberid
                    ? createNumberedIcon(visitIndex + 1, colour)
                    : createUnassignedIcon(visitIndex + 1);

                  return (
                    <Marker
                      key={visit.cp365_visitid}
                      position={[serviceUser.cp365_latitude, serviceUser.cp365_longitude]}
                      icon={icon}
                      eventHandlers={{
                        click: () => handleVisitClick(visit),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <h4 className="font-semibold text-gray-900">
                            {serviceUser.cp365_fullname}
                          </h4>
                          <p className="text-sm text-gray-600">{serviceUser.cp365_currentaddress}</p>
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-sm">
                              <span className="text-gray-500">Time:</span>{' '}
                              <strong>{visit.cp365_scheduledstarttime} - {visit.cp365_scheduledendtime}</strong>
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-500">Duration:</span>{' '}
                              <strong>{visit.cp365_durationminutes} min</strong>
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-500">Round:</span>{' '}
                              <strong style={{ color: colour }}>{round.cp365_roundname}</strong>
                            </p>
                            {!visit.cp365_staffmemberid && (
                              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Unassigned
                              </p>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                });
              })}
            </MapContainer>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs z-[500]">
              <p className="font-semibold text-gray-700 mb-2">Legend</p>
              <div className="space-y-1.5">
                {rounds.slice(0, 4).map((round, index) => (
                  <div key={round.cp365_roundid} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: ROUND_COLOURS[index % ROUND_COLOURS.length] }}
                    />
                    <span>{round.cp365_roundname}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span>Unassigned</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoundView;
