import { Component, HostBinding, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-card1',
    templateUrl: './card1.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class Card1Component implements OnInit {
  @HostBinding('class') class = 'card';
  @Input() color: string = '';
  @Input() avatar: string = '';
  @Input() online: boolean = false;
  @Input() name: string = '';
  @Input() job: string = '';
  @Input() avgEarnings: string = '';
  @Input() totalEarnings: string = '';
  constructor() {}

  ngOnInit(): void {}
}
