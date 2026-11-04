import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-lists',
    templateUrl: './lists.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ListsComponent {
  constructor() {}
}
