import { Injectable } from '@angular/core';

export const WORK_GROUPS_VERSION = '1.1'; // Cập nhật version để force sync

export const DEFAULT_WORK_GROUPS = [
  {
    id: 1,
    roman: 'I',
    name: 'Xây dựng thể chế, chính sách, pháp luật, điều ước quốc tế',
    shortName: 'Nhóm I',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.12)',
    icon: '📋',
    subGroups: [
      {
        id: '1.1',
        name: 'Chi tiết',
        items: [
          { id: '1.1.1', name: 'Xây dựng chính sách, chiến lược, Đề án, quan điểm, định hướng, Luật, Điều ước quốc tế (cấp QH, Nhà nước)', productType: 'Quyết định, Luật, Điều ước quốc tế, Định hướng, Chiến lược, Đề án', excelGroup: 5, coefficient: 95 },
          { id: '1.1.2', name: 'Xây dựng Nghị định, QĐ của TTg, Thông tư, Điều ước quốc tế (cấp Chính phủ)', productType: 'Nghị định, QĐ của TTg, Thông tư, Điều ước quốc tế', excelGroup: 4, coefficient: 76 },
          { id: '1.1.3', name: 'Xây dựng các Chương trình, Kế hoạch của Bộ/trình cấp có thẩm quyền', productType: 'Quyết định, Tờ trình cấp có thẩm quyền, Văn bản gửi Bộ Tư pháp', excelGroup: 4, coefficient: 76 },
          { id: '1.1.4', name: 'Tham gia ý kiến đối với các chiến lược, Đề án, định hướng, kế hoạch, chương trình, VBQPPL, ĐUQT, thỏa thuận quốc tế', productType: 'Văn bản tham gia ý kiến', excelGroup: 3, coefficient: 57 }
        ]
      }
    ]
  },
  {
    id: 2,
    roman: 'II',
    name: 'Hướng dẫn và triển khai thực hiện các văn bản (trừ VBQPPL, Đ UQT, TTQT)',
    shortName: 'Nhóm II',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    icon: '🎯',
    subGroups: [
      {
        id: '1.2',
        name: 'Chi tiết',
        items: [
          { id: '2.1.1', name: 'Triển khai thực hiện các văn bản', productType: 'Quyết định, Văn bản tham gia ý kiến, Ý kiến tại cuộc họp, Dữ liệu điện tử trên các trang/hệ thống thông tin', excelGroup: 2, coefficient: 38 },
          { id: '2.1.2', name: 'Theo dõi, đôn đốc tiến độ các chương trình, kế hoạch (đối với người đầu mối chủ trì)', productType: 'Báo cáo tiến độ/ Công văn đôn đốc', excelGroup: 2, coefficient: 38 }
        ]
      }
    ]
  },
  {
    id: 3,
    roman: 'III',
    name: 'Kiểm tra, sơ kết, tổng kết việc thực hiện các văn bản',
    shortName: 'Nhóm III',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    icon: '🔍',
    subGroups: [
      {
        id: '3.1',
        name: 'Chi tiết',
        items: [
          { id: '3.1.1', name: 'Kiểm tra, sơ kết, tổng kết', productType: 'Kết luận kiểm tra, Báo cáo sơ kết, Báo cáo tổng kết, báo cáo khác', excelGroup: 2, coefficient: 38 },
          { id: '3.1.2', name: 'Điều tra, khảo sát, tổ chức Hội nghị, hội thảo', productType: 'Phiếu điều tra, khảo sát, Hội nghị, Hội thảo', excelGroup: 2, coefficient: 38 }
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
