import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-documents',
    templateUrl: './documents.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DocumentsComponent {
  constructor() {}
}
