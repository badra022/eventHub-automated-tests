import type { CreateBookingInput } from '../../api/types';
import type { BookingField } from '../../pages';

/**
 * Booking field rules, observed on 2026-11-13 through both layers. Shared by the API and UI parts of S32,
 * so a mismatch between the layers (risk R7, gap G2) is a fact checked by tests, not an assumption.
 */
export interface FieldRuleCase {
  label: string;
  field: 'customerName' | 'customerEmail' | 'customerPhone';
  value: string;
  /** What POST /bookings answers today */
  apiStatus: 201 | 400;
  /** Validation message the booking form shows today; null when the form submits the booking */
  uiError: string | null;
  clarification?: string;
}

const UI_FIELD: Record<FieldRuleCase['field'], BookingField> = {
  customerName: 'name',
  customerEmail: 'email',
  customerPhone: 'phone',
};

export const FIELD_RULE_CASES: FieldRuleCase[] = [
  { label: 'name of 1 character', field: 'customerName', value: 'A', apiStatus: 400, uiError: 'Name must be at least 2 chars' },
  { label: 'name of 2 characters', field: 'customerName', value: 'Al', apiStatus: 201, uiError: null },
  { label: 'email without @', field: 'customerEmail', value: 'plainaddress', apiStatus: 400, uiError: 'Enter a valid email' },
  { label: 'email without domain', field: 'customerEmail', value: 'user@', apiStatus: 400, uiError: 'Enter a valid email' },
  { label: 'email with a space', field: 'customerEmail', value: 'us er@example.com', apiStatus: 400, uiError: 'Enter a valid email' },
  { label: 'phone of 9 digits', field: 'customerPhone', value: '987654321', apiStatus: 400, uiError: 'Enter a valid 10-digit phone' },
  { label: 'phone of 10 digits', field: 'customerPhone', value: '9876543210', apiStatus: 201, uiError: null },
  { label: 'phone of letters', field: 'customerPhone', value: 'abcdefghij', apiStatus: 400, uiError: 'Enter a valid 10-digit phone' },
  {
    label: 'phone with no digits (----------)',
    field: 'customerPhone',
    value: '----------',
    apiStatus: 201,
    uiError: 'Enter a valid 10-digit phone',
    clarification: 'G2: the API counts characters and accepts "----------", the UI needs 10 digits and rejects it (risk R7)',
  },
];

export function toOverride(rule: FieldRuleCase): Partial<CreateBookingInput> {
  return { [rule.field]: rule.value };
}

export function toUiField(rule: FieldRuleCase): BookingField {
  return UI_FIELD[rule.field];
}

/** True when the API and the booking form disagree on whether the value is valid. */
export function layersDisagree(rule: FieldRuleCase): boolean {
  return (rule.apiStatus === 201) !== (rule.uiError === null);
}
