import { Component, inject, signal } from '@angular/core';
import { ParkingSpotService } from '../../../core/services/parking-spot/parking-spot-service';
import { CreateParkingSpotRequest } from '../../../core/services/parking-spot/parking-spot-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-create-parking-spot',
  imports: [],
  templateUrl: './create-parking-spot.html',
  styleUrl: './create-parking-spot.css',
})
export class CreateParkingSpot {
  private parkingSpotService = inject(ParkingSpotService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isCreating = signal(false);
  spotNumber = signal('');
  monthlyRate = signal(0);

  private get buildingId(): string {
    const data = this.modalService.state()?.data as { buildingId: string } | null;
    return data?.buildingId ?? '';
  }

  onSubmit(): void {
    const spotNumber = this.spotNumber().trim();
    if (!spotNumber) {
      this.toast.warning('Ingresa un número de espacio');
      return;
    }

    this.isCreating.set(true);
    const request: CreateParkingSpotRequest = {
      buildingId: this.buildingId,
      spotNumber,
      monthlyRate: this.monthlyRate(),
    };

    this.parkingSpotService.create(request).subscribe({
      next: () => {
        this.toast.success('Estacionamiento creado');
        this.isCreating.set(false);
        this.modalService.close();
      },
      error: (ex) => {
        this.isCreating.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al crear el estacionamiento');
      },
    });
  }

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
