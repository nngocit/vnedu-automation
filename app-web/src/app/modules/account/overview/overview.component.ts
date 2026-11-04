import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-overview',
    templateUrl: './overview.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class OverviewComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
