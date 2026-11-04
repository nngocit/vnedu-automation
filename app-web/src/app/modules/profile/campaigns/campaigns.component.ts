import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-campaigns',
    templateUrl: './campaigns.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class CampaignsComponent {
  constructor() {}
}
