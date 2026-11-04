import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-connections',
    templateUrl: './connections.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ConnectionsComponent {
  constructor() {}
}
