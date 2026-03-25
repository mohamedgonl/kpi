import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { StoreService } from '../../core/services/store.service';
import { KpiService } from '../../core/services/kpi.service';
import { WorkGroupsService } from '../../core/services/work-groups.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: []
})
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('kpiChart', { static: false }) kpiChartRef!: ElementRef<HTMLCanvasElement>;

  reportDate: string = new Date().toISOString().split('T')[0];
  currentPeriod = 'daily';
  
  rows: any[] = [];
  chartData: any[] = [];

  selectedUser: any = null;
  selectedUserTasks: any[] = [];

  exportModal = {
    isOpen: false,
    period: 'daily',
    date: this.reportDate,
    month: this.reportDate.substring(0, 7),
    quarter: 1,
    half: 1,
    year: new Date().getFullYear()
  };

  private currentRange = { start: '', end: '' };

  constructor(
    private store: StoreService,
    private kpiService: KpiService,
    private wgService: WorkGroupsService
  ) {}

  ngOnInit(): void {
    this.refreshReport();
    this.store.dashboardRefresh.subscribe(() => {
      this.refreshReport();
    });
  }

  ngAfterViewInit(): void {
    this.drawChart();
  }

  setPeriod(period: string) {
    this.currentPeriod = period;
    this.selectedUser = null;
    this.refreshReport();
  }

  getDateRange(period: string, baseDate: string) {
    const d = new Date(baseDate);
    let start, end;
    if (period === 'daily') {
      start = end = baseDate;
    } else if (period === 'weekly') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = monday.toISOString().split('T')[0];
      end = sunday.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      start = `${baseDate.substring(0, 7)}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      end = lastDay.toISOString().split('T')[0];
    } else if (period === 'quarterly') {
      const qm = Math.floor(d.getMonth() / 3) * 3;
      start = new Date(d.getFullYear(), qm, 1).toISOString().split('T')[0];
      end = new Date(d.getFullYear(), qm + 3, 0).toISOString().split('T')[0];
    } else if (period === 'halfyear') {
      if (d.getMonth() < 6) {
        start = `${d.getFullYear()}-01-01`; end = `${d.getFullYear()}-06-30`;
      } else {
        start = `${d.getFullYear()}-07-01`; end = `${d.getFullYear()}-12-31`;
      }
    } else if (period === 'yearly') {
      start = `${d.getFullYear()}-01-01`; end = `${d.getFullYear()}-12-31`;
    }
    return { start: start || '', end: end || '' };
  }

  refreshReport() {
    const users = this.store.getUsers();
    this.currentRange = this.getDateRange(this.currentPeriod, this.reportDate);
    
    this.rows = [];
    this.chartData = [];

    users.forEach(user => {
      const tasks = this.store.getTasksByUserAndDateRange(user.id, this.currentRange.start, this.currentRange.end);
      const kpi = this.kpiService.computeKPIBreakdown(tasks);

      let kpiClass = 'poor';
      if (kpi.kpi >= 90) kpiClass = 'excellent';
      else if (kpi.kpi >= 75) kpiClass = 'good';
      else if (kpi.kpi >= 50) kpiClass = 'average';

      this.chartData.push({ name: user.name, kpi: kpi.kpi });
      
      this.rows.push({
        userId: user.id,
        name: user.name,
        kpi,
        kpiClass
      });
    });

    setTimeout(() => this.drawChart(), 50);
  }

  showIndividualReport(userId: number) {
    this.selectedUser = this.store.getUserById(userId);
    this.selectedUserTasks = this.store.getTasksByUserAndDateRange(userId, this.currentRange.start, this.currentRange.end);
    setTimeout(() => {
        const panel = document.querySelector('.individual-report-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  drawChart() {
    if (!this.kpiChartRef) return;
    const canvas = this.kpiChartRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement?.getBoundingClientRect() || { width: 800 };

    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '300px';
    
    // Using simple scale without breaking state
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 300;
    const padding = { top: 20, right: 20, bottom: 60, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    if (this.chartData.length === 0) {
      ctx.fillStyle = '#9090b0';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa có dữ liệu', w / 2, h / 2);
      return;
    }

    const barWidth = Math.min(30, (chartW / this.chartData.length) * 0.7);
    const gap = (chartW - barWidth * this.chartData.length) / (this.chartData.length + 1);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#606080';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((100 - i * 25) + '%', padding.left - 8, y + 4);
    }

    // Bars
    this.chartData.forEach((d, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      const barH = (Math.min(d.kpi, 100) / 100) * chartH;
      const y = padding.top + chartH - barH;

      const gradient = ctx.createLinearGradient(x, y, x, y + barH);
      if (d.kpi >= 90) { gradient.addColorStop(0, '#10b981'); gradient.addColorStop(1, '#059669'); }
      else if (d.kpi >= 75) { gradient.addColorStop(0, '#06b6d4'); gradient.addColorStop(1, '#0891b2'); }
      else if (d.kpi >= 50) { gradient.addColorStop(0, '#f59e0b'); gradient.addColorStop(1, '#d97706'); }
      else { gradient.addColorStop(0, '#ef4444'); gradient.addColorStop(1, '#dc2626'); }

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      this.roundRect(ctx, x + 2, y + 2, barWidth, barH, 4); ctx.fill();
      ctx.fillStyle = gradient;
      this.roundRect(ctx, x, y, barWidth, barH, 4); ctx.fill();

      ctx.fillStyle = '#e8e8f0';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.kpi.toFixed(0) + '%', x + barWidth / 2, y - 6);

      ctx.save();
      ctx.translate(x + barWidth / 2, h - padding.bottom + 14);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#9090b0';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      const lbl = d.name.length > 8 ? d.name.substring(0, 8) + '…' : d.name;
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    });
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  // Export Logic
  openExportModal() {
    this.exportModal.period = this.currentPeriod;
    const currentMonth = new Date().getMonth();
    this.exportModal.quarter = currentMonth < 3 ? 1 : currentMonth < 6 ? 2 : currentMonth < 9 ? 3 : 4;
    this.exportModal.half = currentMonth < 6 ? 1 : 2;
    this.exportModal.isOpen = true;
  }

  closeExportModalOnOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-overlay') {
      this.exportModal.isOpen = false;
    }
  }

  confirmExport() {
    const range = this.getReportExportRange();
    if (range) {
      this.exportReportToExcel(range.start, range.end, this.exportModal.period, range.label);
      this.exportModal.isOpen = false;
    }
  }

  getReportExportRange() {
    let start, end, label;
    const m = this.exportModal;

    switch (m.period) {
      case 'daily': {
        start = end = m.date; label = `Ngay_${m.date}`; break;
      }
      case 'weekly': {
        const d = new Date(m.date);
        const day = d.getDay();
        const monday = new Date(d); monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        start = monday.toISOString().split('T')[0]; end = sunday.toISOString().split('T')[0];
        label = `Tuan_${start}_den_${end}`; break;
      }
      case 'monthly': {
        const [y, mm] = m.month.split('-').map(Number);
        start = `${m.month}-01`; end = new Date(y, mm, 0).toISOString().split('T')[0];
        label = `Thang_${mm}_${y}`; break;
      }
      case 'quarterly': {
        const q = Number(m.quarter); const y = Number(m.year);
        const sm = (q - 1) * 3;
        start = new Date(y, sm, 1).toISOString().split('T')[0]; end = new Date(y, sm + 3, 0).toISOString().split('T')[0];
        label = `Quy${q}_${y}`; break;
      }
      case 'halfyear': {
        const half = Number(m.half); const y = Number(m.year);
        if (half === 1) { start = `${y}-01-01`; end = `${y}-06-30`; label = `6thang_dau_${y}`; }
        else { start = `${y}-07-01`; end = `${y}-12-31`; label = `6thang_cuoi_${y}`; }
        break;
      }
      case 'yearly': {
        const y = Number(m.year);
        start = `${y}-01-01`; end = `${y}-12-31`; label = `Nam_${y}`; break;
      }
      default: return null;
    }
    return { start, end, label };
  }

  exportReportToExcel(startDate: string, endDate: string, period: string, label: string) {
    const users = this.store.getUsers();
    const periodLabels: any = { daily: 'Ngày', weekly: 'Tuần', monthly: 'Tháng', quarterly: 'Quý', halfyear: '6 tháng', yearly: 'Năm' };

    const overviewData: any[] = [
      ['BÁO CÁO KPI TỔNG HỢP'],
      ['Loại báo cáo:', periodLabels[period] || period],
      ['Khoảng thời gian:', `${startDate} đến ${endDate}`],
      ['Ngày xuất:', new Date().toISOString().split('T')[0]],
      [],
      ['#', 'Tên', 'Tổng CV', 'Hoàn thành', 'a (SL%)', 'b (CL%)', 'c (TĐ%)', 'KPI'],
    ];

    users.forEach((user, idx) => {
      const tasks = this.store.getTasksByUserAndDateRange(user.id, startDate, endDate);
      const kpi = this.kpiService.computeKPIBreakdown(tasks);
      overviewData.push([idx + 1, user.name, kpi.totalTasks, kpi.completedTasks,
      `${kpi.a.toFixed(1)}%`, `${kpi.b.toFixed(1)}%`, `${kpi.c.toFixed(1)}%`, `${kpi.kpi.toFixed(1)}%`]);
    });

    const wb = XLSX.utils.book_new();
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    wsOverview['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng hợp');

    users.forEach(user => {
      const tasks = this.store.getTasksByUserAndDateRange(user.id, startDate, endDate);
      const userData: any[] = [
        [`BÁO CÁO CÁ NHÂN: ${user.name}`],
        ['Khoảng thời gian:', `${startDate} đến ${endDate}`],
        [],
        ['STT', 'Nhóm', 'Nội dung nhiệm vụ', 'Ngày hết hạn', 'Sản phẩm CV', 'Hệ số QĐ', 'SL giao', 'SL giao QĐ',
          'SL HT thực tế', 'SL HT QĐ', 'Ngày HT', 'Ngày chậm', 'SL đạt TĐ QĐ', 'Số lần làm lại', 'SL đạt CL QĐ'],
      ];

      const groupedTasks: any = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      tasks.forEach(task => {
        let eg = 5;
        if (task.itemId) {
          const item = this.wgService.getItemById(task.itemId);
          if (item && item.excelGroup) eg = item.excelGroup;
        } else {
          const gId = parseInt(task.groupId);
          if (gId === 1) eg = 5;
          else if (gId === 2 || gId === 3) eg = 2;
          else if (gId === 5 || gId === 6) eg = 3;
          else if (gId === 7) eg = 1;
        }
        groupedTasks[eg].push(task);
      });

      let tCol7 = 0, tCol9 = 0, tCol12 = 0, tCol14 = 0;
      let globalStt = 1;

      for (let eg = 1; eg <= 5; eg++) {
        const groupTasks = groupedTasks[eg];
        if (groupTasks.length > 0) {
          groupTasks.forEach((task: any) => {
            const cols = this.store.computeTaskColumns(task);
            tCol7 += cols.assignedQtyConverted;
            tCol9 += cols.actualQtyConverted;
            tCol12 += cols.progressQtyConverted;
            tCol14 += cols.qualityQtyConverted;

            userData.push([
              globalStt++, eg, task.name, task.deadline || '', task.productType || '',
              task.coefficient || 1.0, task.assignedQty || 0, cols.assignedQtyConverted,
              task.actualQty || 0, cols.actualQtyConverted, task.completionDate || '',
              cols.delayDays, cols.progressQtyConverted, task.reworkCount || 0, cols.qualityQtyConverted,
            ]);
          });
        }
      }

      const pctA = tCol7 > 0 ? (tCol9 / tCol7 * 100) : 0;
      const pctC = tCol7 > 0 ? (tCol12 / tCol7 * 100) : 0;
      const pctB = tCol7 > 0 ? (tCol14 / tCol7 * 100) : 0;
      const kpiVal = (pctA + pctB + pctC) / 3;

      userData.push([]);
      userData.push(['', '', '', '', '', '', 'Tổng cộng', tCol7, '', tCol9, '', '', tCol12, '', tCol14]);
      userData.push(['', '', '', '', '', '', '', '', 'Tỷ lệ %', `${pctA.toFixed(1)}%`, '', '', `${pctC.toFixed(1)}%`, '', `${pctB.toFixed(1)}%`]);
      userData.push(['', 'Điểm KPI =', '(a + b + c) / 3', '', '', '', '', '', '', `${kpiVal.toFixed(1)}%`]);

      let sheetName = user.name.length > 28 ? user.name.substring(0, 28) + '...' : user.name;
      sheetName = sheetName.replace(/[\\\/\\?\*\[\]]/g, '_');
      const ws = XLSX.utils.aoa_to_sheet(userData);
      
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let r = 3; r <= range.e.r; r++) {
        const cellAddress = XLSX.utils.encode_cell({ c: 1, r: r });
        if (ws[cellAddress]) ws[cellAddress].s = { fill: { fgColor: { rgb: "FFFF00" } }, alignment: { horizontal: "center", vertical: "center" }, font: { bold: r === 3 }};
      }
      ws['!cols'] = [
        { wch: 5 }, { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `Bao_cao_KPI_${label}.xlsx`);
  }
}
