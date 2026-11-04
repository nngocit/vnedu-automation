import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-invite-users-modal',
    templateUrl: './invite-users-modal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class InviteUsersModalComponent {
  constructor() {}
}
