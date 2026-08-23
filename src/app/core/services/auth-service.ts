import { inject, Service } from '@angular/core';
import { LoginRequest } from '../auth/models/login-request';
import { Observable, tap } from 'rxjs';
import { LoginResponse } from '../auth/models/login-response';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/development';
import { RefreshResponse } from '../auth/models/refresh-response';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  // Se guarda el access token en memoria para evitar problemas de seguridad al usar localStorage o sessionStorage
  private accessTokenKey : LoginResponse | null = null;

  setAccessToken(token: LoginResponse): void {
    this.accessTokenKey = token;
  }

  getAccessToken(): LoginResponse | null {
    return this.accessTokenKey;
  }

  getRole(): string | null {
    return this.getAccessToken()?.role ?? null;
  }

  clearAccessToken(): void {
    this.accessTokenKey = null;
  }

  refresh(): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>(
      `${environment.development}/api/auth/refresh`,
      {},
      {
        withCredentials: true
      }
    ).pipe(
      tap(response => {
        this.setAccessToken(response);
      })
    );
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${environment.development}/api/auth/login`,
      request,
      {
        withCredentials: true,
      }
    ).pipe(
      tap(response => {
        this.setAccessToken(response);
      })
    );
  }
}
