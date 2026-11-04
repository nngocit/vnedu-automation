import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-charts',
    templateUrl: './charts.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ChartsComponent {
  constructor() {}
}
