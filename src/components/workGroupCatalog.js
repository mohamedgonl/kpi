/**
 * Work Group Catalog Component
 * Read-only hierarchical reference display of all work groups,
 * sub-groups, and detailed tasks with conversion coefficients.
 */
import { getWorkGroups } from '../data/store.js';

export function renderWorkGroupCatalog(container, activeGroupId, targetDate) {
    const WORK_GROUPS = getWorkGroups();
    container.innerHTML = `
    <div class="catalog-section">
      <div class="catalog-header">
        <h2 class="section-title">📚 Danh mục công việc theo nhóm</h2>
        <p class="catalog-desc">Tham khảo danh mục công việc và hệ số quy đổi. Nhấn vào nhóm để xem chi tiết.</p>
      </div>
      <div class="catalog-groups">
        ${WORK_GROUPS.map(group => `
          <div class="catalog-group" data-group-id="${group.id}">
            <div class="catalog-group-header" data-toggle="${group.id}">
              <div class="catalog-group-left">
                <span class="catalog-roman" style="color:${group.color}">${group.roman}</span>
                <span class="catalog-group-icon">${group.icon}</span>
                <div class="catalog-group-info">
                  <span class="catalog-group-name">${group.name}</span>
                  <span class="catalog-group-tag" style="color:${group.color}">${group.shortName}</span>
                </div>
              </div>
              <span class="catalog-chevron" id="chevron-${group.id}">▶</span>
            </div>
            <div class="catalog-group-body" id="catalog-body-${group.id}" style="display:none;">
              ${group.subGroups.map(sub => `
                <div class="catalog-subgroup">
                  <div class="catalog-subgroup-header">${sub.id}. ${sub.name}</div>
                  <div class="catalog-items">
                    ${sub.items.map(item => `
                      <div class="catalog-item">
                        <span class="catalog-item-id">${item.id}</span>
                        <span class="catalog-item-name">${item.name}</span>
                        <span class="catalog-item-coeff" style="color:${group.color}">×${item.coefficient}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

    // Toggle collapse/expand
    container.querySelectorAll('.catalog-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const groupId = header.dataset.toggle;
            const body = document.getElementById(`catalog-body-${groupId}`);
            const chevron = document.getElementById(`chevron-${groupId}`);
            if (body.style.display === 'none') {
                body.style.display = 'block';
                chevron.textContent = '▼';
                chevron.classList.add('open');
            } else {
                body.style.display = 'none';
                chevron.textContent = '▶';
                chevron.classList.remove('open');
            }
        });
    });
}
