import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-engages',
    templateUrl: './engages.component.html',
    styleUrls: ['./engages.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class EngagesComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
