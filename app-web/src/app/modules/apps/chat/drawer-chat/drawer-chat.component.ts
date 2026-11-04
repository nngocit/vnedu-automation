import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-drawer-chat',
    templateUrl: './drawer-chat.component.html',
    styleUrls: ['./drawer-chat.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DrawerChatComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
