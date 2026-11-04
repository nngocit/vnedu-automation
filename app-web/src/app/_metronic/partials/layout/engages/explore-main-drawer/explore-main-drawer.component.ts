import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-explore-main-drawer',
    templateUrl: './explore-main-drawer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ExploreMainDrawerComponent implements OnInit {
  appThemeName: string = environment.appThemeName;
  appPurchaseUrl: string = environment.appPurchaseUrl;
  appPreviewUrl: string = environment.appPreviewUrl;
  appDemos = environment.appDemos;

  constructor() {
  }

  ngOnInit(): void {
  }
}
