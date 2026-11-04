import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-advance-tables-widget7',
    templateUrl: './advance-tables-widget7.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AdvanceTablesWidget7Component {
  @Input() cssClass: '';
  currentTab = 'Day';

  constructor() {}

  setCurrentTab(tab: string) {
    this.currentTab = tab;
  }
}
