import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-messenger-drawer',
    templateUrl: './messenger-drawer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MessengerDrawerComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
