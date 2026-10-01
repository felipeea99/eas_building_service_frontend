import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReservableSpaceService } from '../../../core/services/reservable-spaces/reservable-spaces';
import {
  UpdateReservableSpaceRequest,
  ReservableSpaceResponse,
  ReservableSpaceType,
  ReservableSpaceTypeLabels,
  ReservationRateType,
  ReservationRateTypeLabels,
} from '../../../core/services/reservable-spaces/reservable-space-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

/** Map the string type from GET response back to enum */
const TYPE_FROM_LABEL: Record<string, ReservableSpaceType> = {
  MeetingRoom: ReservableSpaceType.MeetingRoom,
  Rooftop: ReservableSpaceType.Rooftop,
  EventArea: ReservableSpaceType.EventArea,
  Terrace: ReservableSpaceType.Terrace,
  Other: ReservableSpaceType.Other,
};

const RATE_TYPE_FROM_LABEL: Record<string, ReservationRateType> = {
  PerReservation: ReservationRateType.PerReservation,
  PerHour: ReservationRateType.PerHour,
  PerDay: ReservationRateType.PerDay,
};

@Component({
  selector: 'app-edit-reservable-space',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-reservable-space.html',
  styleUrl: './edit-reservable-space.css',
})
export class EditReservableSpace implements OnInit {
  private fb = inject(FormBuilder);
  private reservableSpaceService = inject(ReservableSpaceService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isSubmitting = signal(false);
  serverError = signal<string | null>(null);
  imagePreview = signal<string | null>(null);
  currentImageUrl = signal<string | null>(null);
  private selectedFile: File | null = null;
  private spaceId = '';

  readonly spaceTypes = Object.entries(ReservableSpaceTypeLabels).map(([value, label]) => ({
    value: Number(value),
    label,
  }));

  readonly rateTypes = Object.entries(ReservationRateTypeLabels).map(([value, label]) => ({
    value: Number(value),
    label,
  }));

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: [ReservableSpaceType.MeetingRoom, [Validators.required]],
    capacity: [1, [Validators.required, Validators.min(1)]],
    hasCost: [false],
    rate: [0, [Validators.min(0)]],
    requiresApproval: [false],
    reservationRateType: [ReservationRateType.PerReservation],
  });

  ngOnInit(): void {
    const data = this.modalService.state()?.data as ReservableSpaceResponse | null;
    if (data) {
      this.spaceId = data.reservableSpaceId;
      this.form.patchValue({
        name: data.name,
        type: TYPE_FROM_LABEL[data.type] ?? ReservableSpaceType.MeetingRoom,
        capacity: data.capacity,
        hasCost: data.hasCost,
        rate: data.rate,
        requiresApproval: data.requiresApproval,
        reservationRateType: RATE_TYPE_FROM_LABEL[data.reservationRateType] ?? ReservationRateType.PerReservation,
      });
      if (data.imageS3) {
        this.currentImageUrl.set(data.imageS3);
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
      this.currentImageUrl.set(null);
    } else {
      this.imagePreview.set(null);
    }
    // Permite volver a seleccionar el mismo archivo después de quitarlo
    input.value = '';
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.currentImageUrl.set(null);
  }

  get hasCost(): boolean {
    return this.form.getRawValue().hasCost;
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const v = this.form.getRawValue();
    const request: UpdateReservableSpaceRequest = {
      reservableSpaceId: this.spaceId,
      name: v.name.trim(),
      type: Number(v.type),
      capacity: Number(v.capacity),
      hasCost: v.hasCost,
      rate: v.hasCost ? Number(v.rate) : 0,
      requiresApproval: v.requiresApproval,
      reservationRateType: Number(v.reservationRateType),
      imageFileS3: this.selectedFile,
    };

    this.reservableSpaceService.update(this.spaceId, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Espacio reservable actualizado');
        this.modalService.close();
      },
      error: (ex) => {
        this.isSubmitting.set(false);
        const msg = ex?.error?.message ?? 'Error al actualizar el espacio reservable';
        this.serverError.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
