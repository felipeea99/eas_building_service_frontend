import { Component, Input, signal, HostListener, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'app-info-tooltip',
  imports: [],
  templateUrl: './info-tooltip.html',
  styleUrl: './info-tooltip.css',
})
export class InfoTooltip {
  @Input({ required: true }) text!: string;

  private elRef = inject(ElementRef);
  visible = signal(false);

  toggle(event: Event): void {
    event.stopPropagation();
    this.visible.update(v => !v);
  }

  show(): void {
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target && !this.elRef.nativeElement.contains(target)) {
      this.visible.set(false);
    }
  }
}
