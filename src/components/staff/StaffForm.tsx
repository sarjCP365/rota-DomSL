/**
 * StaffForm Component
 * Form for creating/editing staff members
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const staffSchema = z.object({
  forename: z.string().min(1, 'Forename is required'),
  surname: z.string().min(1, 'Surname is required'),
  staffNumber: z.string().optional(),
  workEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  defaultLocationId: z.string().optional(),
  lineManagerId: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormProps {
  staffId?: string;
  initialData?: Partial<StaffFormData>;
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
}

export function StaffForm({ staffId, initialData, onSubmit, onCancel }: StaffFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: initialData,
  });

  const isEditing = !!staffId;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Forename */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Forename *</label>
          <input
            {...register('forename')}
            className="w-full rounded-lg border border-border-grey px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors.forename && <p className="mt-1 text-sm text-error">{errors.forename.message}</p>}
        </div>

        {/* Surname */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Surname *</label>
          <input
            {...register('surname')}
            className="w-full rounded-lg border border-border-grey px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors.surname && <p className="mt-1 text-sm text-error">{errors.surname.message}</p>}
        </div>

        {/* Staff Number */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Staff Number</label>
          <input
            {...register('staffNumber')}
            className="w-full rounded-lg border border-border-grey px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Work Email */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Work Email</label>
          <input
            type="email"
            {...register('workEmail')}
            className="w-full rounded-lg border border-border-grey px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors.workEmail && (
            <p className="mt-1 text-sm text-error">{errors.workEmail.message}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            {...register('dateOfBirth')}
            className="w-full rounded-lg border border-border-grey px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* TODO: Add Location and Line Manager dropdowns */}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 border-t border-border-grey pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border-grey px-4 py-2 hover:bg-elevation-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Staff Member'}
        </button>
      </div>
    </form>
  );
}
