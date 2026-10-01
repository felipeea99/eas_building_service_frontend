import { Component, input, output, signal } from '@angular/core';

export interface ToolbarFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface ToolbarFilterChange {
  key: string;
  value: string;
}

@Component({
  selector: 'app-toolbar',
  imports: [],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.css',
})
export class Toolbar {
  placeholder = input<string>('Buscar...');
  filters = input<ToolbarFilter[]>([]);
  addLabel = input<string>('');

  search = output<string>();
  filterChange = output<ToolbarFilterChange>();
  addClick = output<void>();

  searchValue = signal('');

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue.set(value);
    this.search.emit(value);
  }

  onFilterChange(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterChange.emit({ key, value });
  }

  onAdd(): void {
    this.addClick.emit();
  }

  clearSearch(): void {
    this.searchValue.set('');
    this.search.emit('');
  }
}
