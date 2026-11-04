import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-stats-widget5',
    templateUrl: './stats-widget5.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class StatsWidget5Component {
  @Input() svgIcon = '';
  @Input() iconColor = '';
  @Input() color = '';
  @Input() description = '';
  @Input() title = '';

  constructor() {}
}
