import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const matchFieldsValidator = (fieldA: string, fieldB: string): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const valueA = control.get(fieldA)?.value;
    const valueB = control.get(fieldB)?.value;

    if (!valueA || !valueB) {
      return null;
    }

    return valueA === valueB ? null : { fieldsMismatch: true };
  };
};
