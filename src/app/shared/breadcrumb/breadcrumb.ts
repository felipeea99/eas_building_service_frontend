import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbService } from './breadcrumb-service';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
})
export class Breadcrumb {
  private breadcrumbService = inject(BreadcrumbService);

  readonly segments = this.breadcrumbService.segments;
  readonly hasSegments = computed(() => this.segments().length > 0);
}
