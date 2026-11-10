import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VnEduRoutingModule } from './vnedu-routing.module';
import { SoDauBaiComponent } from './so-dau-bai/so-dau-bai.component';
import { PpctConfigComponent } from './ppct-config/ppct-config.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AiAssistantWidgetComponent } from './components/ai-assistant-widget/ai-assistant-widget.component';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';

@NgModule({
  declarations: [
    SoDauBaiComponent,
    PpctConfigComponent,
    AdminDashboardComponent,
    AiAssistantWidgetComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    VnEduRoutingModule,
    SharedModule
  ],
  exports: [
    AiAssistantWidgetComponent
  ]
})
export class VnEduModule {}
