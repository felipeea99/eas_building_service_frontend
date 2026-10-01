import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { timeout } from 'rxjs';
import { BuildingService } from '../../../core/services/building/building-service';
import { GetBuildingsResponse } from '../../../core/services/building/building-models';
import { AuthService } from '../../../core/services/auth/auth-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ImgLoader } from '../../../shared/img-loader/img-loader';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';

/**
 * Inicio para Client y Guard: tarjetas de los edificios a los que tiene acceso
 * para elegir a qué dashboard entrar. (Sin crear edificios ni datos de ocupación.)
 */
@Component({
  selector: 'app-inicio-buildings',
  imports: [ImgLoader],
  templateUrl: './inicio-buildings.html',
  styleUrl: './inicio-buildings.css',
})
export class InicioBuildings implements OnInit {
  private buildingService = inject(BuildingService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);

  buildings = signal<GetBuildingsResponse[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.breadcrumbService.set([{ label: 'Edificios', path: '/inicio' }]);
    this.loadBuildings();
  }

  private loadBuildings(): void {
    this.isLoading.set(true);
    this.buildingService
      .getBuildingsForRole(this.authService.getRole())
      .pipe(timeout(10_000))
      .subscribe({
        next: (data) => {
          this.buildings.set(data);
          this.isLoading.set(false);
        },
        error: (ex) => {
          this.isLoading.set(false);
          this.toast.error(ex?.error?.message ?? 'Error al cargar los edificios');
        },
      });
  }

  goToDashboard(building: GetBuildingsResponse): void {
    this.router.navigate(['/building-dashboard', building.id]);
  }
}
