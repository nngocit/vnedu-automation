import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-lists-widget1',
    templateUrl: './lists-widget1.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ListsWidget1Component {
  constructor() {}
}
