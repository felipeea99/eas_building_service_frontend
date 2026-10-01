import { Component, inject } from '@angular/core';
import { InicioAdmin } from "../inicio-admin/inicio-admin";
import { InicioBuildings } from "../inicio-buildings/inicio-buildings";
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth-service';

@Component({
  selector: 'app-inicio-handler',
  imports: [InicioAdmin, InicioBuildings],
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
