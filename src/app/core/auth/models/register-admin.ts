import { FormControl } from "@angular/forms";

export interface RegisterAdmRequest {
  companyName: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  secondLastName?: string;
  email: string;
  password: string;
}

export interface RegisterAdminForm {
  companyName: FormControl<string>;
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  secondLastName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
}
