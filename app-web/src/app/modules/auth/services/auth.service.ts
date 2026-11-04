import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of, Subscription, throwError } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserModel } from '../models/user.model';
import { environment } from 'src/environments/environment';

export type UserType = UserModel | undefined;

export interface VnEduLoginResponse {
  success: boolean;
  token?: string;
  cookies?: string;
  userId?: string;
  msg?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private unsubscribe: Subscription[] = [];
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  currentUser$: Observable<UserType>;
  isLoading$: Observable<boolean>;
  currentUserSubject: BehaviorSubject<UserType>;
  isLoadingSubject: BehaviorSubject<boolean>;

  get currentUserValue(): UserType {
    return this.currentUserSubject.value;
  }

  set currentUserValue(user: UserType) {
    this.currentUserSubject.next(user);
  }

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.currentUserSubject = new BehaviorSubject<UserType>(undefined);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();

    const subscr = this.getUserByToken().subscribe();
    this.unsubscribe.push(subscr);
  }

  /**
   * Đăng nhập vnEdu chính thức qua API Node.js server
   * @param username Số điện thoại hoặc mã GV vnEdu (vd: 051197003685)
   * @param password Mật khẩu tài khoản vnEdu
   */
  login(username: string, password: string): Observable<UserModel> {
    this.isLoadingSubject.next(true);

    return this.http.post<VnEduLoginResponse>('/api/vnedu/login', { username, password }).pipe(
      map((res) => {
        if (!res || !res.success) {
          throw new Error(res?.msg || 'Đăng nhập vnEdu không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.');
        }

        const user = new UserModel();
        user.id = 1;
        user.username = username;
        user.fullname = 'Lê Thị Diệu Huyên';
        user.email = `${username}@vnedu.vn`;
        user.phone = username;
        user.occupation = 'Giáo viên THCS';
        user.companyName = 'Trường THCS An Lập';
        user.roles = [1];
        user.authToken = res.token || ('vnedu_auth_' + Date.now());
        user.pic = './assets/media/avatars/300-1.jpg';

        // Lưu thông tin phiên đăng nhập
        localStorage.setItem(this.authLocalStorageToken, JSON.stringify(user));
        if (res.token) {
          localStorage.setItem('vnedu_token', res.token);
        }
        if (res.cookies) {
          localStorage.setItem('vnedu_cookies', res.cookies);
        }

        this.currentUserSubject.next(user);
        return user;
      }),
      catchError((err) => {
        const errorMsg = err?.error?.msg || err?.message || 'Không thể kết nối tới máy chủ vnEdu. Vui lòng thử lại!';
        return throwError(() => new Error(errorMsg));
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  logout() {
    localStorage.removeItem(this.authLocalStorageToken);
    localStorage.removeItem('vnedu_token');
    localStorage.removeItem('vnedu_cookies');
    this.currentUserSubject.next(undefined);
    this.router.navigate(['/auth/login'], { queryParams: {} });

    // Gửi yêu cầu xóa phiên lên backend
    this.http.post('/api/vnedu/logout', {}).subscribe({
      error: () => {}
    });
  }

  getUserByToken(): Observable<UserType> {
    try {
      const lsValue = localStorage.getItem(this.authLocalStorageToken);
      if (lsValue) {
        const user: UserModel = JSON.parse(lsValue);
        if (user && user.authToken) {
          this.currentUserSubject.next(user);
          return of(user);
        }
      }
    } catch (e) {
      console.error('Lỗi khôi phục phiên đăng nhập:', e);
    }
    return of(undefined);
  }

  registration(user: UserModel): Observable<any> {
    return of(user);
  }

  forgotPassword(email: string): Observable<boolean> {
    return of(true);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
