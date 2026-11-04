import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-overview',
    templateUrl: './overview.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class OverviewComponent {
  constructor() {}
}
