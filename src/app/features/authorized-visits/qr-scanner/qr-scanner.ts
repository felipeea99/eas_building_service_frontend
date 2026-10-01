import { Component, ElementRef, inject, signal, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { AuthorizedVisitService } from '../../../core/services/authorized-visits/authorized-visit-service';
import { ToastService } from '../../../shared/toast/toast-service';
import { ValidateQRResponse } from '../../../core/services/authorized-visits/authorized-visit-models';
import { BreadcrumbService } from '../../../shared/breadcrumb/breadcrumb-service';
import { BuildingContextService } from '../../../core/services/building/building-context-service';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner',
  imports: [],
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.css',
})
export class QrScanner implements AfterViewInit, OnDestroy {
  private visitService = inject(AuthorizedVisitService);
  private toast = inject(ToastService);
  private breadcrumbService = inject(BreadcrumbService);
  private buildingContext = inject(BuildingContextService);

  @ViewChild('qrReader', { static: false }) qrReaderEl!: ElementRef<HTMLDivElement>;

  scanning = signal(false);
  validationResult = signal<ValidateQRResponse | null>(null);
  isLoading = signal(false);
  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);
  private html5Qrcode: Html5Qrcode | null = null;
  // Id de la visita validada para registrar entrada/salida
  private visitId = signal<string | null>(null);

  ngOnInit(): void {
    const bc = this.buildingContext.current();
    this.breadcrumbService.set([
      { label: 'Edificios', path: '/inicio' },
      ...(bc ? [{ label: bc.name, path: `/building-dashboard/${bc.id}` }] : []),
      { label: 'Escáner QR', path: '/qr-scanner' },
    ]);
  }

  ngAfterViewInit(): void {
    // Iniciar escáner automáticamente al entrar
    this.startScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  async startScanner(): Promise<void> {
    this.errorMessage.set(null);
    this.validationResult.set(null);
    this.scanning.set(true);

    // Esperar a que Angular renderice el div con dimensiones
    await new Promise(resolve => setTimeout(resolve, 500));

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };
    const onSuccess = (text: string) => this.onQRCodeScanned(text);
    const noop = () => {};

    // Intento 1: facingMode user (webcam de PC / frontal móvil)
    try {
      this.html5Qrcode = new Html5Qrcode('qr-reader');
      await this.html5Qrcode.start({ facingMode: 'user' }, config, onSuccess, noop);
      return;
    } catch {
      try { await this.html5Qrcode?.stop(); } catch {}
      this.html5Qrcode = null;
      this.clearReaderDiv();
      await new Promise(r => setTimeout(r, 200));
    }

    // Intento 2: facingMode environment (trasera móvil)
    try {
      this.html5Qrcode = new Html5Qrcode('qr-reader');
      await this.html5Qrcode.start({ facingMode: 'environment' }, config, onSuccess, noop);
      return;
    } catch {
      try { await this.html5Qrcode?.stop(); } catch {}
      this.html5Qrcode = null;
      this.clearReaderDiv();
      await new Promise(r => setTimeout(r, 200));
    }

    // Intento 3: enumerar cámaras y probar cada una por ID
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        for (const cam of cameras) {
          try {
            this.html5Qrcode = new Html5Qrcode('qr-reader');
            await this.html5Qrcode.start(cam.id, config, onSuccess, noop);
            return;
          } catch {
            try { await this.html5Qrcode?.stop(); } catch {}
            this.html5Qrcode = null;
            this.clearReaderDiv();
            await new Promise(r => setTimeout(r, 200));
          }
        }
      }
    } catch {}

    this.scanning.set(false);
    this.errorMessage.set('No se pudo iniciar la cámara. Verifica los permisos del navegador.');
  }

  private clearReaderDiv(): void {
    const el = document.getElementById('qr-reader');
    if (el) el.innerHTML = '';
  }

  async stopScanner(): Promise<void> {
    if (this.html5Qrcode && this.scanning()) {
      try {
        await this.html5Qrcode.stop();
      } catch {
        // Ignorar errores al detener
      }
    }
    this.scanning.set(false);
  }

  private async onQRCodeScanned(qrCode: string): Promise<void> {
    await this.stopScanner();
    this.validateQR(qrCode);
  }

  private validateQR(qrCode: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.visitService.validateQR(qrCode).subscribe({
      next: (result) => {
        this.validationResult.set(result);
        this.isLoading.set(false);
        // Extraer el id de la visita del qrCode para poder registrar entrada/salida
        // El backend devuelve la info de validación; el qrCode es el identificador
        this.visitId.set(qrCode);
      },
      error: (ex) => {
        this.isLoading.set(false);
        this.errorMessage.set(ex?.error?.message ?? 'Error al validar el código QR');
        this.toast.error(ex?.error?.message ?? 'Error al validar el código QR');
      },
    });
  }

  registerEntry(): void {
    const id = this.visitId();
    if (!id) return;

    this.actionLoading.set(true);
    this.visitService.registerEntry(id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success('Entrada registrada correctamente');
        this.resetScanner();
      },
      error: (ex) => {
        this.actionLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al registrar la entrada');
      },
    });
  }

  registerExit(): void {
    const id = this.visitId();
    if (!id) return;

    this.actionLoading.set(true);
    this.visitService.registerExit(id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success('Salida registrada correctamente');
        this.resetScanner();
      },
      error: (ex) => {
        this.actionLoading.set(false);
        this.toast.error(ex?.error?.message ?? 'Error al registrar la salida');
      },
    });
  }

  resetScanner(): void {
    this.validationResult.set(null);
    this.visitId.set(null);
    this.errorMessage.set(null);
  }
}
