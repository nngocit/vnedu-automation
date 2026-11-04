import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-widgets-examples',
    templateUrl: './widgets-examples.component.html',
    styleUrls: ['./widgets-examples.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class WidgetsExamplesComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
