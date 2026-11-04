import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-feeds-widget2',
    templateUrl: './feeds-widget2.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FeedsWidget2Component implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
