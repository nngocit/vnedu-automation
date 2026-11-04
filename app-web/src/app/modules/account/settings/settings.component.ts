import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class SettingsComponent {
  constructor() {}
}
