import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-mixed',
    templateUrl: './mixed.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MixedComponent {
  constructor() {}
}
