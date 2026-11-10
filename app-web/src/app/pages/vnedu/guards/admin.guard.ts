import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../modules/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.currentUser$.pipe(
      map(user => {
        // Đặc quyền tối cao dành riêng cho Cô Lê Thị Diệu Huyên
        const phone = user?.phone || user?.username;
        if (phone === '051197003685' || user?.username === '051197003685') {
          return true;
        }
        // Các tài khoản khác sẽ bị chuyển hướng về Sổ đầu bài
        return this.router.parseUrl('/vnedu/so-dau-bai');
      })
    );
  }
}
