import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-mixed-widget1',
    templateUrl: './mixed-widget1.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MixedWidget1Component {
  @Input() color: string = '';
  constructor() {}
}
