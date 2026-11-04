import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-lists-widget8',
    templateUrl: './lists-widget8.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ListsWidget8Component {
  @Input() cssClass = '';
  constructor() {}
}
