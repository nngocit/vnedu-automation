import { Component, HostBinding, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-private-chat',
    templateUrl: './private-chat.component.html',
    styleUrls: ['./private-chat.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PrivateChatComponent implements OnInit {
  @HostBinding('class') class = 'd-flex flex-column flex-lg-row';

  constructor() {}

  ngOnInit(): void {}
}
