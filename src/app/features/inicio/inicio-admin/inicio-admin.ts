import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inicio-admin',
  imports: [],
  templateUrl: './inicio-admin.html',
  styleUrl: './inicio-admin.css',
})
export class InicioAdmin {

  private http = inject(HttpClient);

  ngOnInit() {
    this.http.get('https://localhost:7272/api/buildings?page=1&pageSize=40')
      .subscribe({
        next: (response) => {
          console.log(response);
        },
        error: (error) => {
          console.error(error);
        }
      });
  }
}
