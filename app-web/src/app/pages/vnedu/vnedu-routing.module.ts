import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SoDauBaiComponent } from './so-dau-bai/so-dau-bai.component';
import { PpctConfigComponent } from './ppct-config/ppct-config.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminGuard } from './guards/admin.guard';

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
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [AdminGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VnEduRoutingModule {}
