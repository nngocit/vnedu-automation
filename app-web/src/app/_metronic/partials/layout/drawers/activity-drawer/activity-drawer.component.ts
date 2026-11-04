import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-activity-drawer',
    templateUrl: './activity-drawer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ActivityDrawerComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
