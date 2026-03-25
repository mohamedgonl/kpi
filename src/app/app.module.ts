import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ReportsComponent } from './features/reports/reports.component';
import { SettingsComponent } from './features/settings/settings.component';

import { FormsModule } from '@angular/forms';
import { TaskFormComponent } from './features/dashboard/components/task-form/task-form.component';
import { DailyTableComponent } from './features/dashboard/components/daily-table/daily-table.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    ReportsComponent,
    SettingsComponent,
    TaskFormComponent,
    DailyTableComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
