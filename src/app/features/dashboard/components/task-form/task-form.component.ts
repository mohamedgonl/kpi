import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StoreService } from '../../../../core/services/store.service';
import { WorkGroupsService } from '../../../../core/services/work-groups.service';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: []
})
export class TaskFormComponent {
  @Input() isOpen = false;
  @Input() userId!: number;
  @Input() date!: string;
  @Input() existingTask: any = null;
  @Input() selectedGroupId: number | null = null;
  
  @Output() formClosed = new EventEmitter<void>();

  workGroups: any[] = [];
  allItems: any[] = [];
  filteredItems: any[] = [];
  group: any = null;

  formData: any = {
    itemId: '',
    name: '',
    groupId: '',
    coefficient: 1.0,
    productType: '',
    deadline: '',
    assignedQty: 1,
    leaderId: ''
  };

  dynamicPlaceholder = 'Nhập tên công việc...';

  constructor(
    private store: StoreService,
    private wgService: WorkGroupsService
  ) {}

  ngOnChanges() {
    if (this.isOpen) {
      this.initForm();
    }
  }

  initForm() {
    this.workGroups = this.store.getWorkGroups();
    this.allItems = this.wgService.getAllItems();

    const effectiveGroupId = this.existingTask ? this.existingTask.groupId : this.selectedGroupId;
    this.filteredItems = effectiveGroupId 
        ? this.allItems.filter(i => i.groupId === effectiveGroupId) 
        : this.allItems;
    
    this.group = this.workGroups.find(g => g.id === effectiveGroupId);

    if (this.existingTask) {
      this.formData = {
        itemId: this.existingTask.itemId || '',
        name: this.existingTask.name || '',
        groupId: effectiveGroupId,
        coefficient: this.existingTask.coefficient || 1.0,
        productType: this.existingTask.productType || '',
        deadline: this.existingTask.deadline || this.date,
        assignedQty: this.existingTask.assignedQty || 1,
        leaderId: ''
      };
    } else {
      this.formData = {
        itemId: '',
        name: '',
        groupId: effectiveGroupId || (this.workGroups.length > 0 ? this.workGroups[0].id : 1),
        coefficient: 1.0,
        productType: '',
        deadline: this.date,
        assignedQty: 1,
        leaderId: ''
      };
      this.dynamicPlaceholder = 'Nhập tên công việc...';
    }
  }

  onItemSelect(event: any) {
    const selectedId = this.formData.itemId;
    const item = this.allItems.find(i => i.id === selectedId);
    if (item) {
      this.formData.coefficient = item.coefficient || 1.0;
      this.formData.groupId = item.groupId;
      this.formData.name = '';
      this.dynamicPlaceholder = item.name;
    }
  }

  close() {
    this.isOpen = false;
    this.formClosed.emit();
  }

  closeOnOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-overlay') {
      this.close();
    }
  }

  onSubmit() {
    const selectedItem = this.formData.itemId;
    let name = this.formData.name.trim();

    if (!name && selectedItem) {
      const item = this.allItems.find(i => i.id === selectedItem);
      if (item) {
         name = item.name.replace(/^\[[\d.]+\]\s*/, '').replace(/\s*\(\×[\d.]+\)$/, '');
      }
    }

    if (!name) {
      alert('Vui lòng nhập tên công việc!');
      return;
    }

    const taskData = {
      name,
      groupId: parseInt(this.formData.groupId),
      itemId: selectedItem || '',
      coefficient: parseFloat(this.formData.coefficient) || 1.0,
      productType: this.formData.productType.trim(),
      deadline: this.formData.deadline,
      assignedQty: parseFloat(this.formData.assignedQty) || 1,
      assignedBy: this.userId,
    };

    if (this.existingTask) {
      this.store.updateTask(this.existingTask.id, taskData);
    } else {
      // 1. Add specialist task
      const specialistTask = this.store.addTask({
        ...taskData,
        userId: this.userId,
        date: this.date,
      });

      // 2. Leader Task assignment
      const leaderIdStr = this.formData.leaderId;
      if (leaderIdStr) {
        const leaderId = parseInt(leaderIdStr);
        if (leaderId !== this.userId && specialistTask) {
          const leaderTask = this.store.addTask({
            ...taskData,
            userId: leaderId,
            date: this.date,
            linkedTaskId: specialistTask.id,
          }, true);

          if (leaderTask) {
            this.store.updateTask(specialistTask.id, { linkedTaskId: leaderTask.id });
          }
        }
      }
    }

    this.store.dashboardRefresh.emit();
    this.close();
  }
}
