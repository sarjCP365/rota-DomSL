/**
 * UnitForm Component
 * Modal form for creating and editing units
 */

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateUnit, useUpdateUnit } from '@/hooks/useUnits';
import type { Unit } from '@/api/dataverse/types';
import { UnitTypeCode } from '@/api/dataverse/types';

interface UnitFormProps {
  /** Unit to edit (null for create mode) */
  unit: Unit | null;
  /** Parent location ID */
  locationId: string;
  /** Callback when form is closed */
  onClose: () => void;
  /** Callback when form is successfully submitted */
  onSuccess: () => void;
}

/**
 * Unit type options for dropdown
 */
const unitTypeOptions = [
  { value: '', label: 'Select type...' },
  { value: UnitTypeCode.Dementia, label: 'Dementia' },
  { value: UnitTypeCode.Residential, label: 'Residential' },
  { value: UnitTypeCode.ComplexCare, label: 'Complex Care' },
  { value: UnitTypeCode.Nursing, label: 'Nursing' },
  { value: UnitTypeCode.Other, label: 'Other' },
];

export function UnitForm({ unit, locationId, onClose, onSuccess }: UnitFormProps) {
  const isEditMode = !!unit;

  // Form state
  const [formData, setFormData] = useState({
    unitName: '',
    wardName: '',
    floorLevel: '',
    displayOrder: 0,
    unitTypeCode: '' as string | number,
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutations
  const createUnitMutation = useCreateUnit();
  const updateUnitMutation = useUpdateUnit();

  const isSubmitting = createUnitMutation.isPending || updateUnitMutation.isPending;

  // Populate form when editing - intentionally sync props to state for form editing
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (unit) {
      setFormData({
        unitName: unit.cp365_unitname || '',
        wardName: '', // Field removed from Dataverse
        floorLevel: '', // Field removed from Dataverse
        displayOrder: 0, // Field removed from Dataverse
        unitTypeCode: '', // Field removed from Dataverse
        isActive: true, // Field removed from Dataverse
      });
    }
  }, [unit]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));

    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.unitName.trim()) {
      newErrors.unitName = 'Unit name is required';
    } else if (formData.unitName.length > 100) {
      newErrors.unitName = 'Unit name must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const unitData: Partial<Unit> = {
        cp365_unitname: formData.unitName.trim(),
        _cp365_location_value: locationId,
      };

      if (isEditMode && unit) {
        await updateUnitMutation.mutateAsync({
          unitId: unit.cp365_unitid,
          unit: unitData,
        });
      } else {
        await createUnitMutation.mutateAsync(unitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save unit:', error);
      setErrors({ submit: 'Failed to save unit. Please try again.' });
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-grey px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Unit' : 'Create Unit'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Unit Name */}
            <div>
              <label htmlFor="unitName" className="mb-1 block text-sm font-medium text-gray-700">
                Unit Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="unitName"
                name="unitName"
                value={formData.unitName}
                onChange={handleChange}
                placeholder="e.g., Dementia Unit"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.unitName
                    ? 'border-error focus:border-error focus:ring-error'
                    : 'border-border-grey focus:border-primary focus:ring-primary'
                }`}
              />
              {errors.unitName && <p className="mt-1 text-xs text-error">{errors.unitName}</p>}
            </div>

            {/* Ward Name and Floor Level (side by side) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="wardName" className="mb-1 block text-sm font-medium text-gray-700">
                  Ward Name
                </label>
                <input
                  type="text"
                  id="wardName"
                  name="wardName"
                  value={formData.wardName}
                  onChange={handleChange}
                  placeholder="e.g., Ward A"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.wardName
                      ? 'border-error focus:border-error focus:ring-error'
                      : 'border-border-grey focus:border-primary focus:ring-primary'
                  }`}
                />
                {errors.wardName && <p className="mt-1 text-xs text-error">{errors.wardName}</p>}
              </div>
              <div>
                <label
                  htmlFor="floorLevel"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Floor Level
                </label>
                <input
                  type="text"
                  id="floorLevel"
                  name="floorLevel"
                  value={formData.floorLevel}
                  onChange={handleChange}
                  placeholder="e.g., Ground Floor"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.floorLevel
                      ? 'border-error focus:border-error focus:ring-error'
                      : 'border-border-grey focus:border-primary focus:ring-primary'
                  }`}
                />
                {errors.floorLevel && (
                  <p className="mt-1 text-xs text-error">{errors.floorLevel}</p>
                )}
              </div>
            </div>

            {/* Unit Type and Display Order (side by side) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="unitTypeCode"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Unit Type
                </label>
                <select
                  id="unitTypeCode"
                  name="unitTypeCode"
                  value={formData.unitTypeCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border-grey px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {unitTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="displayOrder"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Display Order
                </label>
                <input
                  type="number"
                  id="displayOrder"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={handleChange}
                  min={0}
                  className="w-full rounded-lg border border-border-grey px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first in the rota view
                </p>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border-grey p-3">
              <div>
                <label htmlFor="isActive" className="font-medium text-gray-900">
                  Active
                </label>
                <p className="text-xs text-gray-500">
                  Inactive units are hidden from the rota view
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-4 peer-focus:ring-primary/20"></div>
              </label>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-border-grey px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
