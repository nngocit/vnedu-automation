import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-stats-widget1',
    templateUrl: './stats-widget1.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class StatsWidget1Component {
  @Input() title = '';
  @Input() time = '';
  @Input() description = '';

  constructor() {}
}
