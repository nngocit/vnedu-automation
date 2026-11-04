import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-wizards',
    templateUrl: './wizards.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class WizardsComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
