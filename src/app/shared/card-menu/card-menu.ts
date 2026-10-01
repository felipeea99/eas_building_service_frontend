import { Component, computed, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth-service';


export interface CardMenuAction {
  label: string;
  icon: string;       // nombre del ícono (se mapea en el template)
  destructive?: boolean;
  roles?: string[];   // roles permitidos para ver esta acción (si no se define, todos la ven)
}

@Component({
  selector: 'app-card-menu',
  imports: [],
  templateUrl: './card-menu.html',
  styleUrl: './card-menu.css',
})
export class CardMenu {
  private el = inject(ElementRef);
  private authService = inject(AuthService);

  actions = input.required<CardMenuAction[]>();
  actionClick = output<CardMenuAction>();

  isOpen = signal(false);
  isMobile = signal(window.innerWidth <= 768);

  /** Acciones filtradas por el rol del usuario actual */
  visibleActions = computed(() => {
    const userRole = this.authService.getRole();
    return this.actions().filter(action => {
      if (!action.roles || action.roles.length === 0) return true;
      return userRole ? action.roles.includes(userRole) : false;
    });
  });

  /** Si no hay acciones visibles, se oculta el menú completo */
  hasVisibleActions = computed(() => this.visibleActions().length > 0);

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onAction(action: CardMenuAction): void {
    this.actionClick.emit(action);
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth <= 768);
  }
}
