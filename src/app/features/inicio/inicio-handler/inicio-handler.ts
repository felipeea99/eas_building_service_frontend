import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { InicioAdmin } from "../inicio-admin/inicio-admin";
import { InicioTenant } from "../inicio-tenant/inicio-tenant";
import { InicioGuard } from "../inicio-guard/inicio-guard";
import { InicioSuperadmin } from "../inicio-superadmin/inicio-superadmin";
import { Router } from '@angular/router';

@Component({
  selector: 'app-inicio-handler',
  imports: [InicioAdmin, InicioTenant, InicioGuard, InicioSuperadmin],
  templateUrl: './inicio-handler.html',
  styleUrl: './inicio-handler.css',
})
export class InicioHandler {
  // services
  private authService = inject(AuthService);
  private router = inject(Router);

  // variables
  public role = this.authService.getRole();

}
