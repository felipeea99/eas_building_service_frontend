import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthorizedVisitService } from '../../../core/services/authorized-visits/authorized-visit-service';
import { BuildingService } from '../../../core/services/building/building-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { CreateAuthorizedVisitRequest } from '../../../core/services/authorized-visits/authorized-visit-models';
import { GetBuildingsResponse } from '../../../core/services/building/building-models';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-create-authorized-visit',
  imports: [ReactiveFormsModule],
  templateUrl: './create-authorized-visit.html',
  styleUrl: './create-authorized-visit.css',
})
export class CreateAuthorizedVisit {
  private fb = inject(FormBuilder);
  private visitService = inject(AuthorizedVisitService);
  private buildingService = inject(BuildingService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isLoading = signal(false);
  serverError = signal<string | null>(null);
  buildings = signal<GetBuildingsResponse[]>([]);
  loadingBuildings = signal(false);

  form = this.fb.nonNullable.group({
    buildingId: ['', [Validators.required]],
    visitorName: ['', [Validators.required, Validators.minLength(2)]],
    visitorPhone: [''],
    purpose: [''],
    validFrom: ['', [Validators.required]],
    validUntil: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadBuildings();
  }

  private loadBuildings(): void {
    this.loadingBuildings.set(true);
    this.buildingService.GetAllBuildings().subscribe({
      next: (data) => {
        this.buildings.set(data.items);
        this.loadingBuildings.set(false);
      },
      error: (ex) => {
        this.toast.error(ex?.error?.message ?? 'Error al cargar los edificios');
        this.loadingBuildings.set(false);
      },
    });
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const v = this.form.getRawValue();
    const request: CreateAuthorizedVisitRequest = {
      buildingId: v.buildingId,
      visitorName: v.visitorName,
      visitorPhone: v.visitorPhone || undefined,
      purpose: v.purpose || undefined,
      qrCode: crypto.randomUUID(),
      validFrom: new Date(v.validFrom).toISOString(),
      validUntil: new Date(v.validUntil).toISOString(),
    };

    this.visitService.createAuthorizedVisit(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Visita autorizada creada correctamente');
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
        this.form.reset();
      },
      error: (ex) => {
        this.isLoading.set(false);
        const msg = ex?.error?.message ?? 'Error al crear la visita autorizada';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
