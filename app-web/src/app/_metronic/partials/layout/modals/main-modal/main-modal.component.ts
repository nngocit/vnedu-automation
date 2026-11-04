import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-main-modal',
    templateUrl: './main-modal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MainModalComponent {
  constructor() {}
}
