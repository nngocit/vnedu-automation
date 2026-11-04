import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VnEduRoutingModule } from './vnedu-routing.module';
import { SoDauBaiComponent } from './so-dau-bai/so-dau-bai.component';
import { PpctConfigComponent } from './ppct-config/ppct-config.component';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';

@NgModule({
  declarations: [
    SoDauBaiComponent,
    PpctConfigComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    VnEduRoutingModule,
    SharedModule
  ]
})
export class VnEduModule {}
