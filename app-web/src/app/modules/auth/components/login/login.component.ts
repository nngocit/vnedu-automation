import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false
})
export class LoginComponent implements OnInit, OnDestroy {
  // Tài khoản vnEdu giáo viên cô Lê Thị Diệu Huyên
  defaultVnEdu = {
    username: '051197003685',
    password: '',
    teacherName: 'Cô Lê Thị Diệu Huyên',
    school: 'Trường THCS An Lập'
  };

  loginForm: FormGroup;
  hasError = false;
  errorMessage = '';
  showPassword = false;
  returnUrl = '/vnedu/so-dau-bai';
  isLoading$: Observable<boolean>;

  private unsubscribe: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {
    this.isLoading$ = this.authService.isLoading$;

    // Nếu đã đăng nhập thì điều hướng thẳng vào trang Sổ đầu bài
    if (this.authService.currentUserValue) {
      this.router.navigate(['/vnedu/so-dau-bai']);
    }
  }

  ngOnInit(): void {
    this.initForm();
    const queryReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (queryReturnUrl && queryReturnUrl !== '/' && !queryReturnUrl.includes('login')) {
      this.returnUrl = queryReturnUrl;
    } else {
      this.returnUrl = '/vnedu/so-dau-bai';
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  initForm() {
    this.loginForm = this.fb.group({
      username: [
        this.defaultVnEdu.username,
        Validators.compose([
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(50),
        ]),
      ],
      password: [
        this.defaultVnEdu.password,
        Validators.compose([
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(100),
        ]),
      ],
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  fillQuickCredentials() {
    this.loginForm.patchValue({
      username: '051197003685',
      password: 'Huyen0907@'
    });
    this.hasError = false;
    this.errorMessage = '';
    this.cd.detectChanges();
  }

  submit() {
    this.hasError = false;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const username = this.f.username.value?.trim();
    const password = this.f.password.value;

    const loginSubscr = this.authService
      .login(username, password)
      .pipe(first())
      .subscribe({
        next: (user: UserModel) => {
          if (user) {
            this.router.navigate([this.returnUrl]);
          }
        },
        error: (err: any) => {
          this.hasError = true;
          this.errorMessage = err?.message || 'Đăng nhập vnEdu thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.';
          this.cd.detectChanges();
        }
      });

    this.unsubscribe.push(loginSubscr);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
