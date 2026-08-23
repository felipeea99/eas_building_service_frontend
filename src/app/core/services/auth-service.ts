import { inject, Service } from '@angular/core';
import { LoginRequest } from '../auth/models/login-request';
import { Observable, tap } from 'rxjs';
import { LoginResponse } from '../auth/models/login-response';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/development';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  // Se guarda el access token en memoria para evitar problemas de seguridad al usar localStorage o sessionStorage
  private accessTokenKey : string | null = null;

  setAccessToken(token: string): void {
    this.accessTokenKey = token;
  }

  getAccessToken(): string | null {
    return this.accessTokenKey;
  }

  clearAccessToken(): void {
    this.accessTokenKey = null;
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${environment.development}/api/auth/login`,
      request
    ).pipe(
      tap(response => {
        this.setAccessToken(response.token);
      })
    );
  }
}
