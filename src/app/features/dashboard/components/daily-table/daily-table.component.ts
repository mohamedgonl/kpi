import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef } from '@angular/core';
import { StoreService } from '../../../../core/services/store.service';
import { WorkGroupsService } from '../../../../core/services/work-groups.service';

@Component({
  selector: 'app-daily-table',
  templateUrl: './daily-table.component.html',
  styleUrls: []
})
export class DailyTableComponent implements OnChanges {
  @Input() tasks: any[] = [];
  @Input() canEdit: boolean = false;
  @Input() showSummary: boolean = false;
  @Output() editTask = new EventEmitter<any>();

  isAdmin = false;
  mappedTasks: any[] = [];
  summary: any = {};

  editingId: number | null = null;
  editingField: string | null = null;
  editValue: any = null;

  constructor(
    private store: StoreService,
    private wgService: WorkGroupsService,
    private el: ElementRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const loggedInId = this.store.getLoggedInUser();
    this.isAdmin = loggedInId !== null && loggedInId <= 5;
    
    this.mapTasks();
    if (this.showSummary) {
      this.calculateSummary();
    }
  }

  mapTasks() {
    this.mappedTasks = this.tasks.map(t => ({
      task: t,
      cols: this.store.computeTaskColumns(t),
      group: this.wgService.getGroupById(t.groupId)
    }));
  }

  calculateSummary() {
    let totalCol7 = 0, totalCol9 = 0, totalCol12 = 0, totalCol14 = 0;
    this.mappedTasks.forEach(t => {
      totalCol7 += t.cols.assignedQtyConverted;
      totalCol9 += t.cols.actualQtyConverted;
      totalCol12 += t.cols.progressQtyConverted;
      totalCol14 += t.cols.qualityQtyConverted;
    });

    const pctQty = totalCol7 > 0 ? ((totalCol9 / totalCol7) * 100) : 0;
    const pctProgress = totalCol7 > 0 ? ((totalCol12 / totalCol7) * 100) : 0;
    const pctQuality = totalCol7 > 0 ? ((totalCol14 / totalCol7) * 100) : 0;
    const kpiScore = (pctQty + pctProgress + pctQuality) / 3;

    this.summary = {
      totalCol7, totalCol9, totalCol12, totalCol14,
      pctQty, pctProgress, pctQuality, kpiScore
    };
  }

  fmt(n: any): string {
    if (n === null || n === undefined || n === '') return '';
    const val = Math.round(n * 10) / 10;
    return val.toFixed(1).replace('.', ',');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  onDeleteTask(taskId: number) {
    if (confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      this.store.deleteTask(taskId);
      this.store.dashboardRefresh.emit();
    }
  }

  startEdit(task: any, field: string, hasPermission: boolean) {
    if (!hasPermission) return;
    if (this.editingId === task.id && this.editingField === field) return;
    
    this.editingId = task.id;
    this.editingField = field;
    this.editValue = task[field] !== undefined ? task[field] : (field === 'reworkCount' ? 0 : '');

    // Focus Hack on next tick
    setTimeout(() => {
      const inputs = this.el.nativeElement.querySelectorAll('.inline-input');
      if (inputs.length > 0) {
        inputs[0].focus();
        if(inputs[0].select) inputs[0].select();
      }
    }, 10);
  }

  saveEdit(task: any) {
    if (this.editingId === null || !this.editingField) return;

    let newVal = this.editValue;
    const field = this.editingField;
    
    if (field === 'assignedQty' || field === 'actualQty' || field === 'reworkCount') {
        newVal = parseFloat(newVal) || 0;
    }

    const updates: any = { [field]: newVal };

    // Auto-set completion
    if (field === 'completionDate' && newVal) {
      updates.status = 'completed';
    }
    if (field === 'actualQty' && newVal > 0 && !task.completionDate) {
      updates.status = 'completed';
      updates.completionDate = new Date().toISOString().split('T')[0];
    }

    this.store.updateTask(task.id, updates);
    this.store.syncLinkedTask(task.id);
    
    this.editingId = null;
    this.editingField = null;
    this.editValue = null;
    
    this.store.dashboardRefresh.emit();
  }
}
