import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {environment} from 'src/environments/environment';

@Component({
    selector: 'app-help-drawer',
    templateUrl: './help-drawer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HelpDrawerComponent implements OnInit {
  appThemeName: string = environment.appThemeName;
  appPurchaseUrl: string = environment.appPurchaseUrl;

  constructor() {
  }

  ngOnInit(): void {
  }
}
