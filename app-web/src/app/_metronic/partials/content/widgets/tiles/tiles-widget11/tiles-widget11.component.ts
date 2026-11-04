import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-tiles-widget11',
    templateUrl: './tiles-widget11.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TilesWidget11Component implements OnInit {
  @Input() cssClass = '';
  @Input() widgetHeight = '150px';
  @Input() baseColor = 'success';
  textInverseCSSClass = '';

  constructor() {}

  ngOnInit() {
    this.cssClass = `bg-${this.baseColor} ${this.cssClass}`;
    this.textInverseCSSClass = `text-inverse-${this.baseColor}`;
  }
}
