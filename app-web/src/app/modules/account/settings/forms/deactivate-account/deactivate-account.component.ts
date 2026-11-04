import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-deactivate-account',
    templateUrl: './deactivate-account.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DeactivateAccountComponent {
  constructor() {}

  saveSettings() {
    alert('Account has been successfully deleted!');
  }
}
