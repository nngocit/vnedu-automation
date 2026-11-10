import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../../../modules/auth/services/auth.service';

@Component({
    selector: 'app-sidebar-menu',
    templateUrl: './sidebar-menu.component.html',
    styleUrls: ['./sidebar-menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class SidebarMenuComponent implements OnInit {
  isAdmin$: Observable<boolean>;

  constructor(private authService: AuthService) {
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(u => {
        const identifier = u?.phone || u?.username || u?.email;
        return Boolean(identifier === '051197003685' ||
               identifier === 'xuanngocit@gmail.com' ||
               (u as any)?.isSuperAdmin === true ||
               (u?.roles && u.roles.includes(99)));
      })
    );
  }

  ngOnInit(): void {
  }

}
