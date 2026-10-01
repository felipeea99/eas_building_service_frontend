import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme/theme-service';

/**
 * Botón reutilizable para alternar entre modo claro y oscuro.
 * Toma el color del texto/ícono heredado del contenedor (currentColor),
 * así que se ve bien tanto en el navbar (blanco sobre negro) como en los
 * headers de los formularios (negro/blanco según el tema o el fondo).
 */
@Component({
  selector: 'app-theme-toggle',
  imports: [],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
})
export class ThemeToggle {
  private themeService = inject(ThemeService);

  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');

  toggle(): void {
    this.themeService.toggleTheme();
  }
}
