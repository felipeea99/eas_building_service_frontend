import { Component, AfterViewInit, ElementRef, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ThemeToggle],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;
  private glowHandler = (e: MouseEvent) => this.handleGlow(e);

  ngAfterViewInit(): void {
    // Scroll animations for .anim elements
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer!.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = this.el.nativeElement.querySelectorAll('.anim');
    elements.forEach((el: Element) => this.observer!.observe(el));

    // Staggered card animations
    const cards = this.el.nativeElement.querySelectorAll('.card');
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const delay = card.dataset['delay'] || '0';
            card.style.transitionDelay = delay + 'ms';
            card.classList.add('card-visible');
            cardObserver.unobserve(card);
          }
        });
      },
      { threshold: 0.08 }
    );

    cards.forEach((card: Element, i: number) => {
      (card as HTMLElement).dataset['delay'] = String((i % 3) * 120);
      cardObserver.observe(card);
    });

    // Animated stat counters
    const stats = this.el.nativeElement.querySelectorAll('.stat-number');
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateCounter(entry.target as HTMLElement);
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    stats.forEach((stat: Element) => statObserver.observe(stat));

    // Cursor glow on cards
    document.addEventListener('mousemove', this.glowHandler);
  }

  private handleGlow(e: MouseEvent): void {
    const cards = this.el.nativeElement.querySelectorAll('.card');
    cards.forEach((card: HTMLElement) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--glow-x', x + 'px');
      card.style.setProperty('--glow-y', y + 'px');
    });
  }

  private animateCounter(el: HTMLElement): void {
    const text = el.textContent?.trim() || '';
    if (text.includes('/')) {
      el.classList.add('stat-pop');
      return;
    }
    const suffix = text.replace(/[0-9]/g, '');
    const target = parseInt(text, 10);
    if (isNaN(target)) {
      el.classList.add('stat-pop');
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    el.classList.add('stat-pop');
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    document.removeEventListener('mousemove', this.glowHandler);
  }
}
