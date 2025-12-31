/**
 * Hooks Barrel Export
 *
 * Re-exports custom hooks for cleaner imports.
 */

export {
  useFormFieldStatus,
  extractFieldStatus,
  type FormFieldStatusResult,
  type UseFormFieldStatusOptions,
} from "./useFormFieldStatus";

export {
  useUnsavedChangesWarning,
  type UseUnsavedChangesWarningOptions,
} from "./useUnsavedChangesWarning";

export {
  useAllocationValidation,
  computeAllocationValidation,
  type AllocationValidationResult,
  type ComputeAllocationValidationInput,
  type UseAllocationValidationOptions,
} from "./useAllocationValidation";

export {
  useAllocationWarning,
  computeWarningState,
  type AllocationWarningState,
  type ComputeWarningStateInput,
  type UseAllocationWarningOptions,
  type UseAllocationWarningResult,
} from "./useAllocationWarning";

export { useOnboarding, type UseOnboardingReturn } from "./useOnboarding";

export {
  useStrategyAllocation,
  type AllocationView,
  type UseStrategyAllocationReturn,
} from "./useStrategyAllocation";
