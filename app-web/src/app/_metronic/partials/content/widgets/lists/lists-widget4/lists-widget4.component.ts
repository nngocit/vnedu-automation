import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-lists-widget4',
    templateUrl: './lists-widget4.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ListsWidget4Component {
  @Input() items: number = 6;
  constructor() {}
}
