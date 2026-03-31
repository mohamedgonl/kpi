import { Injectable } from '@angular/core';
import { StoreService } from './store.service';

@Injectable({
  providedIn: 'root'
})
export class KpiService {

  constructor(private store: StoreService) { }

  calcQuantity(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    let totalAssigned = 0;
    let totalActual = 0;
    tasks.forEach(task => {
        const cols = this.store.computeTaskColumns(task);
        totalAssigned += cols.assignedQtyConverted;
        totalActual += cols.actualQtyConverted;
    });
    if (totalAssigned === 0) return 0;
    return (totalActual / totalAssigned) * 100;
  }

  calcQuality(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    let totalAssigned = 0;
    let totalQuality = 0;
    tasks.forEach(task => {
        const cols = this.store.computeTaskColumns(task);
        totalAssigned += cols.assignedQtyConverted;
        totalQuality += cols.qualityQtyConverted;
    });
    if (totalAssigned === 0) return 0;
    return (totalQuality / totalAssigned) * 100;
  }

  calcProgress(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    let totalAssigned = 0;
    let totalProgress = 0;
    tasks.forEach(task => {
        const cols = this.store.computeTaskColumns(task);
        totalAssigned += cols.assignedQtyConverted;
        totalProgress += cols.progressQtyConverted;
    });
    if (totalAssigned === 0) return 0;
    return (totalProgress / totalAssigned) * 100;
  }

  calcKPI(a: number, b: number, c: number): number {
    return (a + b + c) / 3;
  }

  computeKPIBreakdown(tasks: any[]) {
    let totalCol7 = 0;
    let totalCol9 = 0;
    let totalCol12 = 0;
    let totalCol14 = 0;

    tasks.forEach(task => {
        const cols = this.store.computeTaskColumns(task);
        totalCol7 += cols.assignedQtyConverted;
        totalCol9 += cols.actualQtyConverted;
        totalCol12 += cols.progressQtyConverted;
        totalCol14 += cols.qualityQtyConverted;
    });

    const a = totalCol7 > 0 ? (totalCol9 / totalCol7) * 100 : 0;
    const b = totalCol7 > 0 ? (totalCol14 / totalCol7) * 100 : 0;
    const c = totalCol7 > 0 ? (totalCol12 / totalCol7) * 100 : 0;
    const kpi = (a + b + c) / 3;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;

    return {
        a: Math.round(a * 100) / 100,
        b: Math.round(b * 100) / 100,
        c: Math.round(c * 100) / 100,
        kpi: Math.round(kpi * 100) / 100,
        totalTasks,
        completedTasks,
        pendingTasks,
        totalCol7: Math.round(totalCol7 * 100) / 100,
        totalCol9: Math.round(totalCol9 * 100) / 100,
        totalCol12: Math.round(totalCol12 * 100) / 100,
        totalCol14: Math.round(totalCol14 * 100) / 100,
    };
  }
}
