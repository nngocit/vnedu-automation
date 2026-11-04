import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SoDauBaiComponent } from './so-dau-bai/so-dau-bai.component';
import { PpctConfigComponent } from './ppct-config/ppct-config.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'so-dau-bai',
    pathMatch: 'full'
  },
  {
    path: 'so-dau-bai',
    component: SoDauBaiComponent
  },
  {
    path: 'ppct',
    component: PpctConfigComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VnEduRoutingModule {}
