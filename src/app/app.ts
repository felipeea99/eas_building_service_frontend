import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from "./layout/navbar/navbar";
import { Toast } from "./shared/toast/toast";
import { Modal } from "./shared/modal/modal";
import { Breadcrumb } from "./shared/breadcrumb/breadcrumb";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Toast, Modal, Breadcrumb],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('EAS_Services_Building_FrontEnd');
}
