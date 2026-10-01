import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BuildingService } from '../../../core/services/building/building-service';
import { CreateBuildingRequest } from '../models/building-models';
import { ToastService } from '../../../shared/toast/toast-service';
import { ModalService } from '../../../shared/modal/modal-service';

@Component({
  selector: 'app-create-building',
  imports: [ReactiveFormsModule],
  templateUrl: './create-building.html',
  styleUrl: './create-building.css',
})
export class CreateBuilding {
  private fb = inject(FormBuilder);
  private buildingService = inject(BuildingService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private modalService = inject(ModalService);

  isSubmitting = signal(false);
  imagePreview = signal<string | null>(null);
  private selectedFile: File | null = null;

  createBuildingForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    hasReservableSpaces: [false],
    hasParking: [false],
    trackWater: [false],
    trackElectricity: [false],
    trackGas: [false],
  });

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
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview.set(null);
  }

  onSubmit(): void {
    if (this.createBuildingForm.invalid) {
      this.createBuildingForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const request: CreateBuildingRequest = {
      ...this.createBuildingForm.value as Omit<CreateBuildingRequest, 'imageS3'>,
      imageFileS3: this.selectedFile,
    };

    this.buildingService.createBuilding(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success("Edificio creado correctamente", 5000);
        if (this.modalService.isOpen()) {
          this.modalService.close();
        } else {
          this.router.navigate(['/buildings']);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error("La Solicitud de agregar edificio fallo", 5000);
      },
    });
  }
}
