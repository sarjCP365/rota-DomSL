/**
 * ExportModal Component
 * Modal for exporting the daily rota as PDF or printing
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 12
 */

import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  X,
  Download,
  Printer,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { generatePDF } from '../../api/flows/flows';
import type { ShiftViewData } from '../../api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

interface ExportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Selected date */
  selectedDate: Date;
  /** Sublocation name */
  sublocationName: string;
  /** Sublocation ID */
  sublocationId: string;
  /** Rota ID (optional, for server-side export) */
  rotaId?: string;
  /** Shifts data for print view */
  shifts: ShiftViewData[];
  /** Statistics */
  stats: {
    staffCount: number;
    totalHours: number;
  };
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

// =============================================================================
// Helper Functions
// =============================================================================

function formatShiftTime(shift: ShiftViewData): string {
  const start = shift['Shift Start Time']
    ? format(new Date(shift['Shift Start Time']), 'HH:mm')
    : '--:--';
  const end = shift['Shift End Time']
    ? format(new Date(shift['Shift End Time']), 'HH:mm')
    : '--:--';
  return `${start} - ${end}`;
}

function calculateWorkingHours(shift: ShiftViewData): string {
  const start = shift['Shift Start Time'];
  const end = shift['Shift End Time'];
  if (!start || !end) return '-';

  const startDate = new Date(start);
  const endDate = new Date(end);
  let diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
  
  const hours = diffMs / (1000 * 60 * 60) - (shift['Shift Break Duration'] || 0) / 60;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function getShiftType(shift: ShiftViewData): string {
  if (shift['Sleep In']) return 'Sleep In';
  const startHour = shift['Shift Start Time']
    ? new Date(shift['Shift Start Time']).getHours()
    : 8;
  if (startHour >= 20 || startHour < 6) return 'Night';
  return 'Day';
}

// =============================================================================
// Component
// =============================================================================

export function ExportModal({
  isOpen,
  onClose,
  selectedDate,
  sublocationName,
  sublocationId,
  rotaId,
  shifts,
  stats,
}: ExportModalProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // Reset state when modal opens
  const handleClose = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setDownloadUrl(null);
    onClose();
  }, [onClose]);

  // Generate print-friendly HTML content
  const generatePrintContent = useCallback(() => {
    const dateStr = format(selectedDate, 'EEEE, d MMMM yyyy');
    const groupedShifts = new Map<string, ShiftViewData[]>();
    
    // Group shifts by department
    shifts.forEach(shift => {
      const dept = shift['Department'] || shift['Job Title'] || 'General';
      if (!groupedShifts.has(dept)) {
        groupedShifts.set(dept, []);
      }
      groupedShifts.get(dept)!.push(shift);
    });

    // Sort departments alphabetically
    const sortedDepts = Array.from(groupedShifts.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Rota - ${dateStr}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #1f2937;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #7BC8B5;
          }
          .header h1 {
            font-size: 20px;
            color: #7BC8B5;
            margin-bottom: 4px;
          }
          .header h2 {
            font-size: 14px;
            font-weight: 500;
            color: #6b7280;
          }
          .header .date {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          .stats {
            display: flex;
            gap: 30px;
            margin-bottom: 20px;
            padding: 10px 15px;
            background: #f3f4f6;
            border-radius: 6px;
          }
          .stat {
            display: flex;
            align-items: baseline;
            gap: 6px;
          }
          .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #7BC8B5;
          }
          .stat-label {
            font-size: 11px;
            color: #6b7280;
          }
          .department {
            margin-bottom: 20px;
          }
          .department-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            padding: 8px 12px;
            background: #f9fafb;
            border-left: 4px solid #7BC8B5;
          }
          .department-name {
            font-size: 13px;
            font-weight: 600;
          }
          .department-count {
            background: #e5e7eb;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th {
            background: #7BC8B5;
            color: white;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 4px;
          }
          .badge-lead { background: #fed7aa; color: #9a3412; }
          .badge-actup { background: #ddd6fe; color: #5b21b6; }
          .badge-ot { background: #fecaca; color: #dc2626; }
          .type-day { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; }
          .type-night { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; }
          .type-sleep { background: #e9d5ff; color: #6b21a8; padding: 2px 8px; border-radius: 10px; }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #9ca3af;
            text-align: center;
          }
          @media print {
            body { padding: 10px; }
            .department { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>CarePoint365 - Daily Rota</h1>
            <h2>${sublocationName}</h2>
          </div>
          <div class="date">${dateStr}</div>
        </div>

        <div class="stats">
          <div class="stat">
            <span class="stat-value">${stats.staffCount}</span>
            <span class="stat-label">Staff on Shifts</span>
          </div>
          <div class="stat">
            <span class="stat-value">${stats.totalHours}</span>
            <span class="stat-label">Total Rostered Hours</span>
          </div>
        </div>

        ${sortedDepts.map(([deptName, deptShifts]) => `
          <div class="department">
            <div class="department-header">
              <span class="department-name">${deptName}</span>
              <span class="department-count">${deptShifts.length}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 25%">Staff</th>
                  <th style="width: 15%">Time</th>
                  <th style="width: 10%">Hours</th>
                  <th style="width: 20%">Activity</th>
                  <th style="width: 10%">Break</th>
                  <th style="width: 10%">Type</th>
                </tr>
              </thead>
              <tbody>
                ${deptShifts.map(shift => {
                  const shiftType = getShiftType(shift);
                  const typeClass = shiftType === 'Night' ? 'type-night' : 
                                   shiftType === 'Sleep In' ? 'type-sleep' : 'type-day';
                  return `
                    <tr>
                      <td>
                        <strong>${shift['Staff Member Name'] || 'Unassigned'}</strong>
                        ${shift['Shift Leader'] ? '<span class="badge badge-lead">Lead</span>' : ''}
                        ${shift['Act Up'] ? '<span class="badge badge-actup">Act-Up</span>' : ''}
                        ${shift['Overtime Shift'] ? '<span class="badge badge-ot">OT</span>' : ''}
                        <br/>
                        <span style="color: #6b7280; font-size: 9px;">${shift['Job Title'] || ''}</span>
                      </td>
                      <td>${formatShiftTime(shift)}</td>
                      <td>${calculateWorkingHours(shift)}</td>
                      <td>${shift['Shift Activity'] || 'Standard Care'}</td>
                      <td>${shift['Shift Break Duration'] ? `${shift['Shift Break Duration']} min` : '-'}</td>
                      <td><span class="${typeClass}">${shiftType}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <div class="footer">
          Generated by CarePoint365 on ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </body>
      </html>
    `;
  }, [selectedDate, sublocationName, shifts, stats]);

  // Handle print (opens browser print dialog)
  const handlePrint = useCallback(() => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [generatePrintContent]);

  // Handle server-side PDF export (if flow is configured)
  const handleServerExport = useCallback(async () => {
    if (!rotaId) {
      setErrorMessage('No active rota found for export');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const blob = await generatePDF({
        rotaId,
        startDate: dateStr,
        endDate: dateStr,
        sublocationName,
      });

      if (!blob) {
        throw new Error('PDF generation is not configured. Please use the Print option instead.');
      }

      // Create download URL
      const url = URL.createObjectURL(blob);
      const generatedFileName = `DailyRota_${format(selectedDate, 'ddMMMyyyy')}.pdf`;
      
      setDownloadUrl(url);
      setFileName(generatedFileName);
      setStatus('success');
    } catch (error) {
      console.error('PDF export failed:', error);
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to generate PDF. Please try the Print option instead.'
      );
      setStatus('error');
    }
  }, [rotaId, selectedDate, sublocationName]);

  // Handle download click
  const handleDownload = useCallback(() => {
    if (downloadUrl && fileName) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [downloadUrl, fileName]);

  // Handle open in new tab
  const handleOpenFile = useCallback(() => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  }, [downloadUrl]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-xl bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-grey px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h2 id="export-modal-title" className="text-lg font-semibold text-gray-900">
                Export Daily Rota
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Date & Location Info */}
            <div className="mb-5 rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-600">
                <strong>Date:</strong> {format(selectedDate, 'EEEE, d MMMM yyyy')}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                <strong>Location:</strong> {sublocationName}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                <strong>Shifts:</strong> {shifts.length} ({stats.staffCount} staff, {stats.totalHours} hours)
              </div>
            </div>

            {/* Status Display */}
            {status === 'loading' && (
              <div className="mb-5 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-primary">Generating PDF...</span>
              </div>
            )}

            {status === 'success' && (
              <div className="mb-5 space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Export Successful!</div>
                    <div className="text-sm text-green-600">File: {fileName}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={handleOpenFile}
                    className="flex items-center gap-2 rounded-lg border border-border-grey px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <div className="font-medium text-red-800">Export Failed</div>
                  <div className="text-sm text-red-600">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Export Options */}
            {status !== 'success' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Choose an export option:</p>
                
                {/* Print Option (Always available) */}
                <button
                  onClick={handlePrint}
                  disabled={status === 'loading'}
                  className="flex w-full items-center gap-4 rounded-lg border border-border-grey p-4 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Printer className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Print / Save as PDF</div>
                    <div className="text-sm text-gray-500">
                      Opens print dialog - use "Save as PDF" option
                    </div>
                  </div>
                </button>

                {/* Server Export Option */}
                <button
                  onClick={handleServerExport}
                  disabled={status === 'loading' || !rotaId}
                  className="flex w-full items-center gap-4 rounded-lg border border-border-grey p-4 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Download PDF</div>
                    <div className="text-sm text-gray-500">
                      {rotaId 
                        ? 'Generate and download PDF file' 
                        : 'No active rota available'}
                    </div>
                  </div>
                  {status === 'loading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border-grey px-5 py-4">
            <button
              onClick={handleClose}
              className="w-full rounded-lg border border-border-grey px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {status === 'success' ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden iframe for printing (fallback) */}
      <iframe
        ref={printFrameRef}
        className="hidden"
        title="Print Frame"
      />
    </>
  );
}

export default ExportModal;

