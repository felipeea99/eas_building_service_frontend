import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-img-loader',
  templateUrl: './img-loader.html',
  styleUrl: './img-loader.css',
})
export class ImgLoader {
  src = input.required<string>();
  alt = input<string>('');
  radius = input<string>('0');

  loaded = signal(false);
  errored = signal(false);

  onLoad(): void {
    this.loaded.set(true);
  }

  onError(): void {
    this.errored.set(true);
  }
}
