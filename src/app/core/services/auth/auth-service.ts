import { inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, filter, take, tap } from 'rxjs';
import { ChangeUserStatusRequest, LoginRequest, LoginResponse } from '../../auth/models/login-models';
import { RefreshResponse } from '../../auth/models/refresh-response';
import { environment } from '../../../../environments/environment.development';
import { RegisterAdmRequest } from '../../auth/models/register-admin';
import { TenantUserResponse } from '../../auth/models/register-users';
import { RegisterUserRequest, RegisterUserResponse } from '../../auth/models/register-users';
import { ChangePasswordRequest, ForgotPasswordRequest } from '../../auth/models/passwords-models';
import { ResetPasswordRequest } from '../../auth/models/passwords-models';

@Service()
export class AuthService {
  private http = inject(HttpClient);

  private accessTokenKey = signal<LoginResponse | null>(null);

  private isRefreshing = false;

  private refreshSubject = new BehaviorSubject<string | null>(null);
  private refreshErrorSubject = new Subject<unknown>();

  setAccessToken(token: LoginResponse): void {
    this.accessTokenKey.set(token);
  }

  getAccessToken(): LoginResponse | null {
    return this.accessTokenKey();
  }

  getRole(): string | null {
    return this.getAccessToken()?.role ?? null;
  }

  clearAccessToken(): void {
    this.accessTokenKey.set(null);
    localStorage.removeItem('hasLogin');
  }

  refresh(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(
        `${environment.apiUrl}/api/auth/refresh`,
        {},
        {
          withCredentials: true,
        },
      )
      .pipe(
        tap((response) => {
          this.setAccessToken(response);
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/api/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap({
          next: () => {
            localStorage.removeItem('hasLogin');
            this.clearAccessToken();
          },
          error: () => this.clearAccessToken(), // limpia igual aunque falle la llamada
        }),
      );
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, request, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.setAccessToken(response);
          localStorage.setItem('hasLogin', 'sesionActiva'); // usada por guesGuard
        }),
      );
  }

  getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  startRefreshing(): void {
    this.isRefreshing = true;
    this.refreshSubject.next(null);
  }

  finishRefreshing(token: string): void {
    this.isRefreshing = false;
    this.refreshSubject.next(token);
  }

  failRefreshing(error: unknown): void {
    this.isRefreshing = false;
    this.refreshSubject.next(null);
    this.refreshErrorSubject.next(error);
  }

  waitForRefresh(): Observable<string> {
    return new Observable<string>((subscriber) => {
      const tokenSubscription = this.refreshSubject
        .pipe(
          filter((token): token is string => token !== null),
          take(1),
        )
        .subscribe({
          next: (token) => {
            subscriber.next(token);
            subscriber.complete();
          },
        });

      const errorSubscription = this.refreshErrorSubject.pipe(take(1)).subscribe({
        next: (error) => {
          subscriber.error(error);
        },
      });

      return () => {
        tokenSubscription.unsubscribe();
        errorSubscription.unsubscribe();
      };
    });
  }

  registerAdmin(request: RegisterAdmRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/register`, request, {
      withCredentials: true,
    });
  }

  registerUser(request: RegisterUserRequest): Observable<RegisterUserResponse> {
    return this.http.post<RegisterUserResponse>(`${environment.apiUrl}/api/auth`, request, {
      withCredentials: true,
    });
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/forgot-password`, request, {
      withCredentials: true,
    });
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/api/auth/reset-password`, request, {
      withCredentials: true,
    });
  }

  changeTemporaryPassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/api/auth/change-password`, request, {
      withCredentials: true,
    });
  }

    validateToken(token: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/api/auth/validate-token/${token}`, {
      withCredentials: true,
    });
  }



    ChangeUserStatusRequest(request: ChangeUserStatusRequest): Observable<boolean> {
    return this.http.post<boolean>(`${environment.apiUrl}/api/auth/change-user-status`, request, {
      withCredentials: true,
    });
  }

}
