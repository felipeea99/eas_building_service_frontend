import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BuildingService } from '../../../core/services/building/building-service';
import { UpdateBuildingRequest } from '../models/building-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';
import { GetBuildingsResponse } from '../../../core/services/building/building-models';

@Component({
  selector: 'app-edit-building',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-building.html',
  styleUrl: './edit-building.css',
})
export class EditBuilding implements OnInit {
  private fb = inject(FormBuilder);
  private buildingService = inject(BuildingService);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isSubmitting = signal(false);
  imagePreview = signal<string | null>(null);
  currentImageUrl = signal<string | null>(null);
  private selectedFile: File | null = null;

  editBuildingForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    hasReservableSpaces: [false],
    hasParking: [false],
    trackWater: [false],
    trackElectricity: [false],
    trackGas: [false],
  });

  private buildingId = '';

  ngOnInit(): void {
    const data = this.modalService.state()?.data as GetBuildingsResponse | null;
    if (data) {
      this.buildingId = data.id;
      this.editBuildingForm.patchValue({
        name: data.name,
        address: data.address,
        hasReservableSpaces: data.hasReservableSpaces,
        hasParking: data.hasParking,
        trackWater: data.trackWater,
        trackElectricity: data.trackElectricity,
        trackGas: data.trackGas,
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
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.currentImageUrl.set(null);
  }

  onSubmit(): void {
    if (this.editBuildingForm.invalid) {
      this.editBuildingForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const request: UpdateBuildingRequest = {
      buildingId: this.buildingId,
      ...this.editBuildingForm.value as Omit<UpdateBuildingRequest, 'buildingId' | 'imageFileS3'>,
      imageFileS3: this.selectedFile,
    };

    this.buildingService.updateBuilding(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Edificio actualizado correctamente', 5000);
        if (this.modalService.isOpen()) {
          this.modalService.close();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Error al actualizar el edificio', 5000);
      },
    });
  }
}
