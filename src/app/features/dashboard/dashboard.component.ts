import { Component, OnInit } from '@angular/core';
import { StoreService } from '../../core/services/store.service';
import { KpiService } from '../../core/services/kpi.service';
import { WorkGroupsService } from '../../core/services/work-groups.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: []
})
export class DashboardComponent implements OnInit {

  currentDate: string = new Date().toISOString().split('T')[0];
  userId: number = 1;
  canEdit = false;
  
  tasks: any[] = [];
  kpi: any = { a: 0, b: 0, c: 0, kpi: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0 };
  workGroups: any[] = [];

  // Task Form State
  isTaskFormOpen = false;
  selectedGroupIdForForm: number | null = null;
  selectedTaskForEdit: any = null;

  // Export Modal State
  exportModal = {
    isOpen: false,
    period: '',
    title: '',
    date: this.currentDate,
    month: this.currentDate.substring(0, 7),
    quarter: 1,
    half: 1,
    year: new Date().getFullYear()
  };

  constructor(
    private store: StoreService,
    private kpiService: KpiService,
    private wgService: WorkGroupsService
  ) {}

  ngOnInit(): void {
    this.workGroups = this.store.getWorkGroups();
    
    const loggedInId = this.store.getLoggedInUser();
    this.userId = loggedInId || 1; 

    // Find the currently selected viewing user logic relies on app-component or just current loggedIn
    // We update this via store events or binding
    const appEl = document.getElementById('currentUserSelect');
    if (appEl) {
       this.userId = parseInt((appEl as HTMLSelectElement).value, 10);
    }
    
    this.loadData();

    this.store.dashboardRefresh.subscribe(() => {
      // Refresh our view user
      const appSelect = document.getElementById('currentUserSelect');
      if (appSelect) this.userId = parseInt((appSelect as HTMLSelectElement).value, 10);
      else this.userId = this.store.getLoggedInUser() || 1;
      this.loadData();
    });
  }

  loadData() {
    this.canEdit = this.userId === this.store.getLoggedInUser();
    this.tasks = this.store.getTasksByUserAndDate(this.userId, this.currentDate);
    this.kpi = this.kpiService.computeKPIBreakdown(this.tasks);
  }

  openTaskForm(groupId: number) {
    this.selectedGroupIdForForm = groupId;
    this.selectedTaskForEdit = null;
    this.isTaskFormOpen = true;
  }

  editExistingTask(task: any) {
    this.selectedGroupIdForForm = task.groupId;
    this.selectedTaskForEdit = task;
    this.isTaskFormOpen = true;
  }

  closeTaskForm() {
    this.isTaskFormOpen = false;
  }

  // Export Logic
  openExportModal(period: string) {
    const currentMonth = new Date().getMonth();
    
    this.exportModal.period = period;
    this.exportModal.date = this.currentDate;
    this.exportModal.month = this.currentDate.substring(0, 7);
    this.exportModal.year = new Date().getFullYear();
    this.exportModal.quarter = currentMonth < 3 ? 1 : currentMonth < 6 ? 2 : currentMonth < 9 ? 3 : 4;
    this.exportModal.half = currentMonth < 6 ? 1 : 2;
    
    switch (period) {
      case 'daily': this.exportModal.title = '📅 Xuất theo ngày'; break;
      case 'weekly': this.exportModal.title = '📆 Xuất theo tuần'; break;
      case 'monthly': this.exportModal.title = '🗓️ Xuất theo tháng'; break;
      case 'quarterly': this.exportModal.title = '📊 Xuất theo quý'; break;
      case 'halfyear': this.exportModal.title = '📈 Xuất 6 tháng'; break;
      case 'yearly': this.exportModal.title = '🗂️ Xuất 1 năm'; break;
    }
    this.exportModal.isOpen = true;
  }

  closeExportModal() {
    this.exportModal.isOpen = false;
  }

  closeExportModalOnOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-overlay') {
      this.closeExportModal();
    }
  }

  confirmExport() {
    const range = this.getExportDateRange();
    if (range) {
      this.exportUserExcel(this.userId, range.start, range.end, range.label);
      this.closeExportModal();
    }
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getExportDateRange() {
    let start, end, label;
    const m = this.exportModal;

    switch (m.period) {
      case 'daily': {
        start = end = m.date;
        label = `Ngay_${m.date}`;
        break;
      }
      case 'weekly': {
        const d = new Date(m.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        start = this.formatDate(monday);
        end = this.formatDate(sunday);
        label = `Tuan_${start}_den_${end}`;
        break;
      }
      case 'monthly': {
        const [y, mm] = m.month.split('-').map(Number);
        const startDate = new Date(y, mm - 1, 1);
        const lastDay = new Date(y, mm, 0);
        start = this.formatDate(startDate);
        end = this.formatDate(lastDay);
        label = `Thang_${mm}_${y}`;
        break;
      }
      case 'quarterly': {
        const q = Number(m.quarter);
        const y = Number(m.year);
        const startMonth = (q - 1) * 3;
        const startDate = new Date(y, startMonth, 1);
        const endDate = new Date(y, startMonth + 3, 0);
        start = this.formatDate(startDate);
        end = this.formatDate(endDate);
        label = `Quy${q}_${y}`;
        break;
      }
      case 'halfyear': {
        const half = Number(m.half);
        const y = Number(m.year);
        if (half === 1) {
          start = `${y}-01-01`; end = `${y}-06-30`; label = `6thang_dau_${y}`;
        } else {
          start = `${y}-07-01`; end = `${y}-12-31`; label = `6thang_cuoi_${y}`;
        }
        break;
      }
      case 'yearly': {
        const y = Number(m.year);
        start = `${y}-01-01`; end = `${y}-12-31`; label = `Nam_${y}`;
        break;
      }
      default: return null;
    }
    return { start, end, label };
  }


  exportUserExcel(userId: number, startDate: string, endDate: string, label: string) {
    const user = this.store.getUserById(userId);
    const exportTasks = this.store.getTasksByUserAndDateRange(userId, startDate, endDate);

    const groupedTasks: any = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    exportTasks.forEach(t => {
      const gId = parseInt(t.groupId);
      const groupData = this.wgService.getGroupById(gId);
      
      let eg = 5;
      if (t.itemId) {
        const item = this.wgService.getItemById(t.itemId);
        if (item && item.excelGroup) eg = item.excelGroup;
      } else if (groupData && groupData.defaultExcelGroup) {
        eg = groupData.defaultExcelGroup;
      }
      
      if (groupedTasks[eg]) groupedTasks[eg].push(t);
      else groupedTasks[5].push(t);
    });

    const sheetData: any[] = [
      ['BÁO CÁO KPI CÁ NHÂN'],
      ['Họ tên:', user ? user.name : `User ${userId}`],
      ['Khoảng thời gian:', `${startDate} đến ${endDate}`],
      ['Ngày xuất:', new Date().toISOString().split('T')[0]],
      [],
      ['STT', 'Nhóm', 'Nội dung nhiệm vụ', 'Ngày hết hạn', 'Sản phẩm CV', 'Hệ số QĐ', 'SL giao', 'SL giao QĐ',
        'SL HT thực tế', 'SL HT QĐ', 'Ngày HT', 'Ngày chậm', 'SL đạt TĐ QĐ', 'Số lần làm lại', 'SL đạt CL QĐ'],
    ];

    let totalCol7 = 0, totalCol9 = 0, totalCol12 = 0, totalCol14 = 0;
    let globalStt = 1;

    for (let eg = 1; eg <= 5; eg++) {
      const groupTasks = groupedTasks[eg];
      if (groupTasks.length > 0) {
        groupTasks.forEach((task: any) => {
          const cols = this.store.computeTaskColumns(task);
          totalCol7 += cols.assignedQtyConverted;
          totalCol9 += cols.actualQtyConverted;
          totalCol12 += cols.progressQtyConverted;
          totalCol14 += cols.qualityQtyConverted;

          sheetData.push([
            globalStt++, task.groupId, task.name, task.deadline || '', task.productType || '',
            task.coefficient || 1.0, task.assignedQty || 0, cols.assignedQtyConverted,
            task.actualQty || 0, cols.actualQtyConverted, task.completionDate || '',
            cols.delayDays, cols.progressQtyConverted, task.reworkCount || 0, cols.qualityQtyConverted,
          ]);
        });
      }
    }

    const pctQty = totalCol7 > 0 ? (totalCol9 / totalCol7 * 100) : 0;
    const pctProgress = totalCol7 > 0 ? (totalCol12 / totalCol7 * 100) : 0;
    const pctQuality = totalCol7 > 0 ? (totalCol14 / totalCol7 * 100) : 0;
    const kpiScore = (pctQty + pctProgress + pctQuality) / 3;

    sheetData.push([]);
    sheetData.push(['', '', '', '', '', '', 'Tổng cộng', totalCol7, '', totalCol9, '', '', totalCol12, '', totalCol14]);
    sheetData.push(['', '', '', '', '', '', '', '', 'Tỷ lệ %', `${pctQty.toFixed(1)}%`, '', '', `${pctProgress.toFixed(1)}%`, '', `${pctQuality.toFixed(1)}%`]);
    sheetData.push(['', 'Điểm KPI =', '(a + b + c) / 3', '', '', '', '', '', '', `${kpiScore.toFixed(1)}%`]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const range = XLSX.utils.decode_range(ws['!ref'] || "A1");
    for (let r = 5; r <= range.e.r; r++) {
      const cellAddress = XLSX.utils.encode_cell({ c: 1, r: r });
      const cell = ws[cellAddress];
      if (cell && cell.v) {
        cell.s = {
          fill: { fgColor: { rgb: "FFFF00" } },
          alignment: { horizontal: "center", vertical: "center" },
          font: { bold: r === 5 }
        };
      }
      const sttAddress = XLSX.utils.encode_cell({ c: 0, r: r });
      const sttCell = ws[sttAddress];
      if (sttCell && sttCell.v) {
         sttCell.s = { alignment: { horizontal: "center", vertical: "center" } };
      }
    }

    ws['!cols'] = [
      { wch: 5 }, { wch: 8 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KPI Report');

    const userName = user ? user.name.replace(/\s+/g, '_') : `User_${userId}`;
    XLSX.writeFile(wb, `KPI_${userName}_${label}.xlsx`);
  }
}
