import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-stats-widget6',
    templateUrl: './stats-widget6.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class StatsWidget6Component {
  @Input() progress = '';
  @Input() color = '';
  @Input() description = '';
  @Input() title = '';

  constructor() {}
}
