import { Component, HostBinding, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-card4',
    templateUrl: './card4.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class Card4Component {
  @Input() icon: string = '';
  @Input() title: string = '';
  @Input() description: string = '';
  @HostBinding('class') class = 'card h-100';

  constructor() {}
}
