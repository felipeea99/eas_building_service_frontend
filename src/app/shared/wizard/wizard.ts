import { Component, HostListener, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { WizardService, WizardStep } from './wizard-service';

@Component({
  selector: 'app-wizard',
  providers: [WizardService],
  templateUrl: './wizard.html',
  styleUrl: './wizard.css',
})
export class Wizard implements OnInit, OnDestroy {
  protected readonly wizard = inject(WizardService);

  /** Inputs */
  steps = input.required<WizardStep[]>();
  /** Texto del botón del último paso */
  finishLabel = input<string>('Finalizar');
  /**
   * false = al finalizar solo emite (finished) y NO se cierra; el padre decide cuándo quitarlo
   * (útil cuando se guarda en la API y hay que esperar la respuesta). Default: true.
   */
  closeOnFinish = input<boolean>(true);
  /** true = petición en curso: bloquea botones y cierre */
  busy = input<boolean>(false);

  /** Outputs */
  finished = output<Record<string, unknown>>();
  cancelled = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.wizard.isOpen() && !this.busy()) {
      this.onClose();
    }
  }

  ngOnInit(): void {
    this.wizard.init(this.steps());
  }

  ngOnDestroy(): void {
    this.wizard.reset();
  }

  onNext(): void {
    if (this.busy()) return;
    if (this.wizard.isLast()) {
      this.finished.emit(this.wizard.data() as Record<string, unknown>);
      if (this.closeOnFinish()) {
        this.wizard.close();
      }
    } else {
      this.wizard.next();
    }
  }

  onPrevious(): void {
    if (this.busy()) return;
    this.wizard.previous();
  }

  onClose(): void {
    if (this.busy()) return;
    this.cancelled.emit();
    this.wizard.close();
  }
}
