import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-feeds',
    templateUrl: './feeds.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FeedsComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
