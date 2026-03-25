/**
 * Assessment Popup Component
 * Two-step quality/progress evaluation when completing a task
 */
import { updateTask, syncLinkedTask } from '../data/store.js';

export function showAssessmentPopup(taskId) {
    const container = document.getElementById('modal-container');
    let qualityScore = null;
    let progressScore = null;
    let step = 1; // 1 = quality, 2 = progress

    function render() {
        if (step === 1) {
            container.innerHTML = `
        <div class="modal-overlay" id="assessOverlay">
          <div class="modal">
            <div class="assessment-popup">
              <div class="assessment-title">📋 Đánh giá chất lượng</div>
              <div class="assessment-subtitle">Công việc đã hoàn thành đạt tiêu chuẩn chất lượng không?</div>
              <div class="assessment-options">
                <button class="assessment-btn good" id="qualityGood">
                  <span class="assess-icon">✅</span>
                  <span class="assess-label">Đạt chuẩn</span>
                  <span class="assess-score">100 điểm</span>
                </button>
                <button class="assessment-btn bad" id="qualityBad">
                  <span class="assess-icon">⚠️</span>
                  <span class="assess-label">Có sai sót</span>
                  <span class="assess-score">75 điểm (trừ 25%)</span>
                </button>
              </div>
              <div class="form-actions" style="justify-content: center;">
                <button class="btn btn-secondary" id="assessCancel">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      `;
            document.getElementById('qualityGood').addEventListener('click', () => {
                qualityScore = 100;
                step = 2;
                render();
            });
            document.getElementById('qualityBad').addEventListener('click', () => {
                qualityScore = 75;
                step = 2;
                render();
            });
        } else {
            container.innerHTML = `
        <div class="modal-overlay" id="assessOverlay">
          <div class="modal">
            <div class="assessment-popup">
              <div class="assessment-title">⏱️ Đánh giá tiến độ</div>
              <div class="assessment-subtitle">Công việc đã được hoàn thành đúng tiến độ không?</div>
              <div class="assessment-options">
                <button class="assessment-btn good" id="progressGood">
                  <span class="assess-icon">⚡</span>
                  <span class="assess-label">Đúng tiến độ</span>
                  <span class="assess-score">100 điểm</span>
                </button>
                <button class="assessment-btn bad" id="progressBad">
                  <span class="assess-icon">🐌</span>
                  <span class="assess-label">Chậm tiến độ</span>
                  <span class="assess-score">75 điểm (trừ 25%)</span>
                </button>
              </div>
              <div class="form-actions" style="justify-content: center;">
                <button class="btn btn-secondary" id="assessCancel">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      `;
            document.getElementById('progressGood').addEventListener('click', () => {
                progressScore = 100;
                completeTask();
            });
            document.getElementById('progressBad').addEventListener('click', () => {
                progressScore = 75;
                completeTask();
            });
        }

        // Cancel binding
        document.getElementById('assessCancel').addEventListener('click', () => {
            container.innerHTML = '';
        });
        document.getElementById('assessOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) container.innerHTML = '';
        });
    }

    function completeTask() {
        updateTask(taskId, {
            status: 'completed',
            qualityScore,
            progressScore
        });
        syncLinkedTask(taskId);
        container.innerHTML = '';
        window.dispatchEvent(new CustomEvent('refreshDashboard'));
    }

    render();
}
