import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-advance-tables-widget1',
    templateUrl: './advance-tables-widget1.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AdvanceTablesWidget1Component {
  @Input() cssClass: '';
  constructor() {}
}
