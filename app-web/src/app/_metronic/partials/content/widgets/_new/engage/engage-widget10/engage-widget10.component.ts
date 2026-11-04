import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-engage-widget10',
    templateUrl: './engage-widget10.component.html',
    styleUrls: ['./engage-widget10.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class EngageWidget10Component implements OnInit {
  @Input() cssClass: string = ''
  constructor() { }

  ngOnInit(): void {
  }

}
