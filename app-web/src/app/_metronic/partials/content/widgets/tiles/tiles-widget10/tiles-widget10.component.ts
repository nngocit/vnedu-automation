import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-tiles-widget10',
    templateUrl: './tiles-widget10.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TilesWidget10Component {
  @Input() cssClass = '';
  @Input() widgetHeight = '130px';

  constructor() {}
}
