import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador que refleja las reglas del backend (PasswordPolicy.cs):
 * - Mínimo 8 caracteres
 * - Sin espacios
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 *
 * Devuelve un objeto con las reglas que NO se cumplen.
 */
export function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';

    if (!value) return { required: true };

    const errors: ValidationErrors = {};

    if (value.length < 8)           errors['minLength'] = true;
    if (/\s/.test(value))           errors['hasWhitespace'] = true;
    if (!/[A-Z]/.test(value))       errors['missingUppercase'] = true;
    if (!/[a-z]/.test(value))       errors['missingLowercase'] = true;
    if (!/[0-9]/.test(value))       errors['missingDigit'] = true;
    if (!/[^a-zA-Z0-9\s]/.test(value)) errors['missingSpecial'] = true;

    return Object.keys(errors).length ? errors : null;
  };
}

/** Mensajes legibles para cada error de la policy */
export const PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  minLength: 'Mínimo 8 caracteres',
  hasWhitespace: 'No puede contener espacios',
  missingUppercase: 'Al menos una letra mayúscula',
  missingLowercase: 'Al menos una letra minúscula',
  missingDigit: 'Al menos un número',
  missingSpecial: 'Al menos un carácter especial (!@#$...)',
};
