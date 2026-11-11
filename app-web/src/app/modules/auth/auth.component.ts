import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';

// const BODY_CLASSES = ['bgi-size-cover', 'bgi-position-center', 'bgi-no-repeat'];

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: '<body[root]>',
    templateUrl: './auth.component.html',
    styleUrls: ['./auth.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AuthComponent implements OnInit, OnDestroy {
  today: Date = new Date();
  appVersion: string = 'v2.6.0';

  constructor() {}

  ngOnInit(): void {
    // BODY_CLASSES.forEach((c) => document.body.classList.add(c));
  }

  ngOnDestroy() {
    // BODY_CLASSES.forEach((c) => document.body.classList.remove(c));
  }
}
