import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-tiles-widget3',
    templateUrl: './tiles-widget3.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TilesWidget3Component {
  @Input() cssClass = '';
  @Input() widgetHeight = '130px';

  constructor() {}
}
