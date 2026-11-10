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
        // Quyền quản trị hệ thống dành cho Super Admin (xuanngocit@gmail.com) và Cô Lê Thị Diệu Huyên (051197003685)
        const identifier = user?.phone || user?.username || user?.email;
        if (
          identifier === 'xuanngocit@gmail.com' ||
          identifier === '051197003685' ||
          user?.username === '051197003685' ||
          user?.username === 'xuanngocit@gmail.com' ||
          user?.email === 'xuanngocit@gmail.com' ||
          user?.roles?.includes(99) ||
          (user as any)?.isSuperAdmin === true ||
          (user as any)?.role === 'SUPER_ADMIN'
        ) {
          return true;
        }
        // Các tài khoản không có quyền sẽ bị chuyển hướng về Sổ đầu bài
        return this.router.parseUrl('/vnedu/so-dau-bai');
      })
    );
  }
}
