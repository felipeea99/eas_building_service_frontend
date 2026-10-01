import { Component, inject, signal } from '@angular/core';
import { ReservableSpaceService } from '../../../core/services/reservable-spaces/reservable-spaces';
import {
  CreateReservableSpaceRequest,
  ReservableSpaceType,
  ReservableSpaceTypeLabels,
  ReservationRateType,
  ReservationRateTypeLabels,
} from '../../../core/services/reservable-spaces/reservable-space-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-create-reservable-space',
  imports: [],
  templateUrl: './create-reservable-space.html',
  styleUrl: './create-reservable-space.css',
})
export class CreateReservableSpace {
  private reservableSpaceService = inject(ReservableSpaceService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isCreating = signal(false);
  name = signal('');
  type = signal<ReservableSpaceType>(ReservableSpaceType.MeetingRoom);
  capacity = signal(0);
  hasCost = signal(false);
  rate = signal(0);
  requiresApproval = signal(false);
  reservationRateType = signal<ReservationRateType>(ReservationRateType.PerReservation);
  imagePreview = signal<string | null>(null);
  private selectedFile: File | null = null;

  readonly spaceTypes = Object.entries(ReservableSpaceTypeLabels).map(([value, label]) => ({
    value: Number(value),
    label,
  }));

  readonly rateTypes = Object.entries(ReservationRateTypeLabels).map(([value, label]) => ({
    value: Number(value),
    label,
  }));

  private get buildingId(): string {
    const data = this.modalService.state()?.data as { buildingId: string } | null;
    return data?.buildingId ?? '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.imagePreview.set(null);
    }
    // Permite volver a seleccionar el mismo archivo después de quitarlo
    input.value = '';
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview.set(null);
  }

  onSubmit(): void {
    const spaceName = this.name().trim();
    if (!spaceName) {
      this.toast.warning('Ingresa un nombre para el espacio');
      return;
    }
    if (this.capacity() <= 0) {
      this.toast.warning('La capacidad debe ser mayor a 0');
      return;
    }

    this.isCreating.set(true);
    const request: CreateReservableSpaceRequest = {
      buildingId: this.buildingId,
      name: spaceName,
      type: this.type(),
      capacity: this.capacity(),
      hasCost: this.hasCost(),
      rate: this.hasCost() ? this.rate() : 0,
      requiresApproval: this.requiresApproval(),
      reservationRateType: this.reservationRateType(),
      imageFileS3: this.selectedFile,
    };

    this.reservableSpaceService.create(request).subscribe({
      next: () => {
        this.toast.success('Espacio reservable creado');
        this.isCreating.set(false);
        this.modalService.close();
      },
      error: (ex) => {
        this.isCreating.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al crear el espacio reservable');
      },
    });
  }

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
