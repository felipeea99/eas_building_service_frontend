import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { SurveyService } from '../../../core/services/surveys/survey-service';
import { MySurveyResponse } from '../../../core/services/surveys/survey-models';
import { BuildingService } from '../../../core/services/building/building-service';
import { GetBuildingsResponse } from '../../../core/services/building/building-models';
import { ImgLoader } from '../../../shared/img-loader/img-loader';
import { ToastService } from '../../../shared/toast/toast-service';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { InfoTooltip } from '../../../shared/info-tooltip/info-tooltip';
import { AuthService } from '../../../core/services/auth/auth-service';

interface DashboardModule {
  key: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  staffOnly?: boolean;
  /** Si se indica, solo estos roles ven el módulo */
  roles?: string[];
  condition?: (building: GetBuildingsResponse) => boolean;
  /** true si la ruta no lleva el buildingId (p.ej. qr-scanner o las vistas "Mis ..." del cliente) */
  noBuildingParam?: boolean;
}

@Component({
  selector: 'app-building-dashboard',
  imports: [InfoTooltip, ImgLoader, NgClass, DatePipe, RouterLink],
  templateUrl: './building-dashboard.html',
  styleUrl: './building-dashboard.css',
})
export class BuildingDashboard implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private buildingService = inject(BuildingService);
  private toast = inject(ToastService);
  private breadcrumbService = inject(BreadcrumbService);
  private buildingContext = inject(BuildingContextService);
  private authService = inject(AuthService);
  private modalService = inject(ModalService);
  private surveyService = inject(SurveyService);

  building = signal<GetBuildingsResponse | null>(null);
  isLoading = signal(true);
  isStaff = false;
  isClient = false;
  canEdit = false;

  /** Encuestas pendientes del cliente en este edificio */
  pendingSurveys = signal<MySurveyResponse[]>([]);
  private role = '';

  private readonly staffRoles = ['SuperAdmin', 'Admin', 'Manager', 'Staff', 'Guard'];
  // mismos roles que las rutas en app.routes.ts, para no mostrar módulos que terminan en /forbidden
  private readonly tenantStaff = ['SuperAdmin', 'Admin', 'Manager', 'Staff'];

  readonly modules: DashboardModule[] = [
    {
      key: 'units',
      label: 'Unidades',
      description: 'Administra las unidades del edificio: departamentos, oficinas, locales.',
      icon: 'units',
      route: '/index-units',
      roles: [...this.tenantStaff, 'Guard'],
    },
    {
      key: 'parking',
      label: 'Estacionamiento',
      description: 'Gestiona los cajones de estacionamiento y su asignación.',
      icon: 'parking',
      route: '/parking-spots',
      roles: this.tenantStaff,
      condition: (b) => b.hasParking,
    },
    {
      key: 'reservable',
      label: 'Reservables',
      description: 'Espacios comunes disponibles para reservar: salones, terrazas, gimnasio.',
      icon: 'reservable',
      route: '/reservable-spaces',
      roles: this.tenantStaff,
      condition: (b) => b.hasReservableSpaces,
    },
    {
      key: 'my-reservations',
      label: 'Mis reservaciones',
      description: 'Aparta áreas comunes del edificio y revisa tus reservaciones.',
      icon: 'reservable',
      route: '/my-reservations',
      roles: ['Client'],
      noBuildingParam: true,
      condition: (b) => b.hasReservableSpaces,
    },
    {
      key: 'contracts',
      label: 'Contratos',
      description: 'Contratos de arrendamiento activos, vencidos y por vencer.',
      icon: 'contracts',
      route: '/contracts',
      roles: [...this.tenantStaff, 'Client'],
    },
    {
      key: 'visits',
      label: 'Visitas',
      description: 'Visitas autorizadas: registro, códigos QR y control de acceso.',
      icon: 'visits',
      route: '/authorized-visits',
    },
    {
      key: 'tenants',
      label: 'Inquilinos',
      description: 'Directorio de inquilinos y clientes asociados al edificio.',
      icon: 'tenants',
      route: '/tenant-clients',
      staffOnly: true,
      roles: this.tenantStaff,
    },
    {
      key: 'incidents',
      label: 'Incidencias',
      description: 'Morosos y problemas registrados por inquilino: pagos tardíos, vecinos, daños y más.',
      icon: 'incidents',
      route: '/incidents',
      staffOnly: true,
      roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'],
    },
    {
      key: 'surveys',
      label: 'Encuestas',
      description: 'Encuestas para los inquilinos del edificio: armado, envío y resultados.',
      icon: 'surveys',
      route: '/surveys',
      staffOnly: true,
      roles: ['SuperAdmin', 'Admin', 'Manager', 'Staff'],
    },
    {
      key: 'my-surveys',
      label: 'Mis encuestas',
      description: 'Encuestas pendientes y contestadas.',
      icon: 'surveys',
      route: '/my-surveys',
      roles: ['Client'],
      noBuildingParam: true,
    },
    {
      key: 'packages',
      label: 'Paquetes',
      description: 'Avisos de paquete de los inquilinos: en espera y recibidos en caseta.',
      icon: 'packages',
      route: '/packages',
      staffOnly: true,
    },
    {
      key: 'my-packages',
      label: 'Mis paquetes',
      description: 'Avisa a caseta de paquetes que esperas y revisa si ya llegaron.',
      icon: 'packages',
      route: '/my-packages',
      roles: ['Client'],
      noBuildingParam: true,
    },
    {
      key: 'qr-scanner',
      label: 'Escáner QR',
      description: 'Escanea códigos QR de visitantes para registrar entrada y salida.',
      icon: 'qr',
      route: '/qr-scanner',
      staffOnly: true,
      noBuildingParam: true,
    },
  ];

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.role = role ?? '';
    this.isStaff = this.staffRoles.includes(role ?? '');
    this.isClient = role === 'Client';
    this.canEdit = ['SuperAdmin', 'Admin', 'Manager'].includes(role ?? '');

    const buildingId = this.route.snapshot.paramMap.get('buildingId');
    if (!buildingId) {
      this.router.navigate(['/inicio']);
      return;
    }

    this.loadBuilding(buildingId);
    if (this.isClient) {
      this.loadPendingSurveys(buildingId);
    }
  }

  /** Cliente: encuestas abiertas sin contestar de este edificio (lo que antes estaba en su inicio) */
  private loadPendingSurveys(buildingId: string): void {
    this.surveyService
      .getMySurveys()
      .pipe(timeout(10_000))
      .subscribe({
        next: (res) =>
          this.pendingSurveys.set(
            res.filter((s) => s.buildingId === buildingId && s.isOpen && !s.respondedAt),
          ),
        // secundario: si falla, el dashboard sigue funcionando sin la sección
        error: () => this.pendingSurveys.set([]),
      });
  }

  private loadBuilding(id: string): void {
    this.isLoading.set(true);
    this.buildingService.GetBuildingById(id).subscribe({
      next: (building) => {
        this.building.set(building);
        this.buildingContext.set(building);
        this.breadcrumbService.set([
          { label: 'Edificios', path: '/inicio' },
          { label: building.name, path: `/building-dashboard/${id}` },
        ]);
        this.isLoading.set(false);
      },
      error: (ex) => {
        this.isLoading.set(false);
        if (ex?.status === 404) {
          this.toast.error('Edificio no encontrado');
          this.router.navigate(['/inicio']);
        } else {
          this.toast.error(ex?.error?.message ?? 'Error al cargar el edificio');
        }
      },
    });
  }

  openEditBuilding(): void {
    const b = this.building();
    if (!b) return;
    this.modalService.open('edit-building', b);
    // Recargar el edificio cuando se cierre el modal
    const check = setInterval(() => {
      if (!this.modalService.isOpen()) {
        clearInterval(check);
        this.loadBuilding(b.id);
      }
    }, 250);
  }

  openSendNotification(): void {
    const b = this.building();
    if (!b) return;
    this.modalService.open('send-notification', {
      buildingId: b.id,
      buildingName: b.name,
    });
  }

  getVisibleModules(): DashboardModule[] {
    const b = this.building();
    if (!b) return [];

    return this.modules.filter(m => {
      if (m.staffOnly && !this.isStaff) return false;
      if (m.roles && !m.roles.includes(this.role)) return false;
      if (m.condition && !m.condition(b)) return false;
      return true;
    });
  }

  navigateTo(mod: DashboardModule): void {
    const b = this.building();
    if (!b) return;

    if (mod.noBuildingParam) {
      this.router.navigate([mod.route]);
    } else {
      this.router.navigate([mod.route, b.id]);
    }
  }

  getOccupancyPercent(): number {
    const b = this.building();
    if (!b || b.totalUnits === 0) return 0;
    return Math.round((b.occupiedUnits / b.totalUnits) * 100);
  }

  getOccupancyClass(): string {
    const pct = this.getOccupancyPercent();
    if (pct >= 100) return 'occ-full';
    if (pct >= 76) return 'occ-high';
    if (pct >= 50) return 'occ-mid';
    return 'occ-low';
  }

}
