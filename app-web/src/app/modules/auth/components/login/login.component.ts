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

  savedTeachers: any[] = [];
  currentTeacher: any = null;
  isNewTeacherMode: boolean = false;

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

    // Kiểm tra query parameter mode=new hoặc mode=switch khi mở từ menu đổi tài khoản
    const mode = this.route.snapshot.queryParams['mode'];
    if (mode === 'new') {
      this.isNewTeacherMode = true;
      this.authService.logoutWithoutRedirect();
    } else if (mode === 'switch') {
      // Chế độ đổi tài khoản: ở lại màn hình đăng nhập để chọn hồ sơ hoặc thêm mới
    } else if (this.authService.currentUserValue) {
      // Nếu đã đăng nhập và không phải chuyển đổi/thêm mới thì điều hướng thẳng vào trang Sổ đầu bài
      this.router.navigate(['/vnedu/so-dau-bai']);
    }
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParams['mode'];
    if (mode === 'new') {
      this.isNewTeacherMode = true;
      this.authService.logoutWithoutRedirect();
    }
    this.initForm();
    this.loadSavedTeachers();
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
        this.isNewTeacherMode ? '' : this.defaultVnEdu.username,
        Validators.compose([
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(50),
        ]),
      ],
      password: [
        this.isNewTeacherMode ? '' : this.defaultVnEdu.password,
        Validators.compose([
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(100),
        ]),
      ],
      teacherName: [''],
      subject: [''],
      gender: ['unknown']
    });
  }

  cancelNewTeacherMode() {
    this.isNewTeacherMode = false;
    this.initForm();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null },
      queryParamsHandling: 'merge'
    });
    this.cd.detectChanges();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  loadSavedTeachers(): void {
    this.authService.getSavedTeachers().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.teachers) && res.teachers.length > 0) {
          this.savedTeachers = res.teachers;
          this.currentTeacher = res.current || res.teachers[0];
          this.cd.detectChanges();
        }
      },
      error: () => {}
    });
  }

  getTeacherInitial(name?: string): string {
    if (!name) return 'H';
    const parts = name.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    return (lastName ? lastName.charAt(0) : 'H').toUpperCase();
  }

  quickSwitch(t: any): void {
    if (!t || !t.username) return;
    this.authService.switchTeacher(t.username).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.router.navigate([this.returnUrl]);
        } else {
          this.selectTeacher(t);
        }
      },
      error: () => {
        this.selectTeacher(t);
      }
    });
  }

  selectTeacher(t: any): void {
    this.loginForm.patchValue({
      username: t.username,
      password: t.username === '051197003685' ? 'Huyen0907@' : ''
    });
    this.hasError = false;
    this.errorMessage = '';
    this.cd.detectChanges();
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
    const teacherName = this.f.teacherName?.value?.trim();
    const subject = this.f.subject?.value?.trim();
    const gender = this.f.gender?.value;

    const teacherExtra = (this.isNewTeacherMode || teacherName || subject) ? {
      teacherName,
      subject,
      gender
    } : undefined;

    const loginSubscr = this.authService
      .login(username, password, teacherExtra)
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
