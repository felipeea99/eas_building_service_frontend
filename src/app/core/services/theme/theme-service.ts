import { Service, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'eas-theme';

/**
 * Maneja el tema (claro/oscuro) de toda la app.
 * - Persiste la preferencia del usuario en localStorage.
 * - Si el usuario nunca eligió manualmente, respeta prefers-color-scheme.
 * - Aplica el tema como atributo [data-theme] en <html>, que es lo que
 *   consumen las variables de color definidas en styles.css.
 *
 * El atributo inicial ya lo pone un script inline en index.html (antes
 * de que Angular arranque) para evitar parpadeos de tema.
 */
@Service()
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.applyTheme(mode);

    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage no disponible (modo privado, etc.): no bloquea el cambio visual
    }
  }

  private applyTheme(mode: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', mode);
  }

  private readInitialTheme(): ThemeMode {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') {
      return attr;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // ignorar y caer al default por preferencia del sistema
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
