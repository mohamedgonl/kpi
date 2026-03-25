import { Injectable } from '@angular/core';

export const DEFAULT_WORK_GROUPS = [
  {
    id: 1,
    roman: 'I',
    name: 'Công tác xây dựng VBQPPL',
    shortName: 'Nhóm I',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    icon: '📝',
    subGroups: [
      {
        id: '1.1',
        name: 'Chủ trì soạn thảo (Lập đề nghị xây dựng, Soạn thảo VBQPPL)',
        items: [
          { id: '1.1.1', name: 'Luật (Chính sách, dự thảo)', productType: 'Luật', excelGroup: 4, coefficient: 151 },
          { id: '1.1.2', name: 'Pháp lệnh, Nghị quyết QH, UBTVQH', productType: 'PL/NQ', excelGroup: 4, coefficient: 114 },
          { id: '1.1.3', name: 'Nghị định (Nghị quyết của Chính phủ)', productType: 'Nghị định', excelGroup: 4, coefficient: 76 },
          { id: '1.1.4', name: 'Quyết định, Chỉ thị của Thủ tướng', productType: 'QĐ/CT', excelGroup: 3, coefficient: 57 },
          { id: '1.1.5', name: 'Thông tư, Thông tư liên tịch', productType: 'Thông tư', excelGroup: 3, coefficient: 57 }
        ]
      },
      {
        id: '1.2',
        name: 'Phối hợp soạn thảo',
        items: [
          { id: '1.2.1', name: 'Luật, Pháp lệnh, Nghị quyết trình QH, UBTVQH', productType: 'Văn bản có ý kiến tham gia', excelGroup: 3, coefficient: 57 },
          { id: '1.2.2', name: 'Nghị định, Quyết định Thủ tướng quy định chung', productType: 'Văn bản phối hợp, tham gia ý kiến', excelGroup: 3, coefficient: 57 },
          { id: '1.2.3', name: 'Nghị định, Quyết định TTg chuyên ngành; Thông tư', productType: 'Ý kiến, Phiếu lấy ý kiến, Chữ ký tắt...', excelGroup: 2, coefficient: 38 }
        ]
      }
    ]
  },
  {
    id: 2,
    roman: 'II',
    name: 'Xây dựng, soạn thảo Điều ước quốc tế, Thỏa thuận quốc tế',
    shortName: 'Nhóm II',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    icon: '🌍',
    subGroups: [
      {
        id: '2.1',
        name: 'Chi tiết',
        items: [
          { id: '2.1.1', name: 'Chủ trì soạn thảo ĐƯQT', productType: 'ĐƯQT', excelGroup: 4, coefficient: 76 },
          { id: '2.1.2', name: 'Chủ trì đàm phán, thỏa thuận quốc tế', productType: 'Thỏa thuận quốc tế', excelGroup: 4, coefficient: 76 },
          { id: '2.1.3', name: 'Phối hợp ĐƯQT, Thỏa thuận quốc tế', productType: 'Văn bản, ý kiến đàm phán', excelGroup: 3, coefficient: 57 }
        ]
      }
    ]
  },
  {
    id: 3,
    roman: 'III',
    name: 'Xây dựng, ban hành văn bản quy định nội bộ',
    shortName: 'Nhóm III',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    icon: '📊',
    subGroups: [
      {
        id: '3.1',
        name: 'Chi tiết',
        items: [
          { id: '3.1.1', name: 'Theo chương trình, kế hoạch đã phê duyệt', productType: 'Kế hoạch, Quyết định...', excelGroup: 2, coefficient: 38 },
          { id: '3.1.2', name: 'Chương trình công tác ban hành văn bản mật...', productType: 'Quyết định, Chương trình, Kế hoạch...', excelGroup: 2, coefficient: 38 }
        ]
      }
    ]
  },
  {
    id: 4,
    roman: 'IV',
    name: 'Thẩm định văn bản',
    shortName: 'Nhóm IV',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    icon: '✍️',
    subGroups: [
      {
        id: '4.1',
        name: 'Chi tiết',
        items: [
          { id: '4.1.1', name: 'Thẩm định văn bản QPPL do BCT ban hành', productType: 'Báo cáo thẩm định', excelGroup: 4, coefficient: 76 },
          { id: '4.1.2', name: 'Tham gia thẩm định', productType: 'Văn bản có ý kiến thẩm định, Ý kiến tại cuộc họp', excelGroup: 3, coefficient: 57 }
        ]
      }
    ]
  },
  {
    id: 5,
    roman: 'V',
    name: 'Thực hiện các nhiệm vụ chuyên môn, nghiệp vụ',
    shortName: 'Nhóm V',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    icon: '⚙️',
    subGroups: [
      {
        id: '5.1',
        name: 'Chi tiết',
        items: [
          { id: '5.1.1', name: 'Kiểm tra, rà soát, hệ thống hóa, theo dõi thi hành pháp luật...', productType: 'Kết quả kiểm tra, rà soát, Kết luận TĐTHPL, Hội nghị Phổ biến...', excelGroup: 2, coefficient: 38 },
          { id: '5.1.2', name: 'Trường hợp phát sinh tình huống phức tạp trong quá trình thực hiện các nhiệm vụ chuyên môn, nghiệp vụ', productType: 'Văn bản', excelGroup: 3, coefficient: 57 },
          { id: '5.1.3', name: 'Giải quyết tranh chấp thương mại, đầu tư quốc tế', productType: 'Văn bản ý kiến, Tờ trình', excelGroup: 3, coefficient: 57 }
        ]
      }
    ]
  },
  {
    id: 6,
    roman: 'VI',
    name: 'Nhóm hỗ trợ, phục vụ, khác',
    shortName: 'Nhóm VI',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    icon: '🤝',
    subGroups: [
      {
        id: '6.1',
        name: 'Chi tiết',
        items: [
          { id: '6.1.1', name: 'Công tác văn thư', productType: 'Lần', excelGroup: 1, coefficient: 1 },
          { id: '6.1.2', name: 'Công tác quản trị (thiết bị,...)', productType: 'Lần, Văn bản đề nghị', excelGroup: 1, coefficient: 1 },
          { id: '6.1.3', name: 'Phát hành văn bản', productType: 'Lần', excelGroup: 1, coefficient: 1 },
          { id: '6.1.4', name: 'Lưu trữ hồ sơ, tài liệu', productType: 'Lần', excelGroup: 1, coefficient: 1 },
          { id: '6.1.5', name: 'Công tác hậu cần', productType: 'Cuộc họp', excelGroup: 1, coefficient: 1 },
          { id: '6.1.6', name: 'Đăng hồ sơ dự án Luật trên Cổng pháp luật Quốc gia/Cơ sở dữ liệu quốc gia', productType: 'Hồ sơ trên website', excelGroup: 1, coefficient: 1 },
          { id: '6.1.7', name: 'Cập nhật tiến độ/hồ sơ chính sách/dự thảo VBQPPL trên Hệ thống thông tin quản lý Chương trình xây dựng VBQPPL', productType: 'Email, Tin nhắn', excelGroup: 1, coefficient: 1 },
          { id: '6.1.8', name: 'Soạn thảo văn bản hành chính thông thường', productType: 'Văn bản', excelGroup: 1, coefficient: 1 }
        ]
      }
    ]
  }
];

@Injectable({
  providedIn: 'root'
})
export class WorkGroupsService {

  constructor() { }

  getAllGroups() {
    return DEFAULT_WORK_GROUPS;
  }

  getGroupById(id: number) {
    return DEFAULT_WORK_GROUPS.find(g => g.id === id);
  }

  getAllItems() {
    const items: any[] = [];
    for (const group of DEFAULT_WORK_GROUPS) {
      if (group.subGroups) {
        for (const sub of group.subGroups) {
          if (sub.items) {
            for (const item of sub.items) {
              items.push({
                ...item,
                groupId: group.id,
                groupName: group.name,
                subGroupName: sub.name
              });
            }
          }
        }
      }
    }
    return items;
  }

  getItemById(itemId: string) {
    for (const group of DEFAULT_WORK_GROUPS) {
      if (group.subGroups) {
        for (const sub of group.subGroups) {
          if (sub.items) {
            const found = sub.items.find(i => i.id === itemId);
            if (found) {
              return {
                ...found,
                groupId: group.id,
                groupName: group.name,
                subGroupName: sub.name
              };
            }
          }
        }
      }
    }
    return null;
  }
}
