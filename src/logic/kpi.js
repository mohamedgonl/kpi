/**
 * KPI Calculation Logic — Enhanced Column-Based System
 * Formula: KPI = (a + b + c) / 3
 * a = quantity %  = Σcol9 / Σcol7
 * b = quality %   = Σcol14 / Σcol7
 * c = progress %  = Σcol12 / Σcol7
 */
import { computeTaskColumns } from '../data/store.js';

/**
 * Calculate quantity percentage (a)
 * a = Σ(actualQtyConverted) / Σ(assignedQtyConverted) × 100
 */
export function calcQuantity(tasks) {
    if (tasks.length === 0) return 0;
    let totalAssigned = 0;
    let totalActual = 0;
    tasks.forEach(task => {
        const cols = computeTaskColumns(task);
        totalAssigned += cols.assignedQtyConverted;
        totalActual += cols.actualQtyConverted;
    });
    if (totalAssigned === 0) return 0;
    return (totalActual / totalAssigned) * 100;
}

/**
 * Calculate quality percentage (b)
 * b = Σ(qualityQtyConverted) / Σ(assignedQtyConverted) × 100
 */
export function calcQuality(tasks) {
    if (tasks.length === 0) return 0;
    let totalAssigned = 0;
    let totalQuality = 0;
    tasks.forEach(task => {
        const cols = computeTaskColumns(task);
        totalAssigned += cols.assignedQtyConverted;
        totalQuality += cols.qualityQtyConverted;
    });
    if (totalAssigned === 0) return 0;
    return (totalQuality / totalAssigned) * 100;
}

/**
 * Calculate progress percentage (c)
 * c = Σ(progressQtyConverted) / Σ(assignedQtyConverted) × 100
 */
export function calcProgress(tasks) {
    if (tasks.length === 0) return 0;
    let totalAssigned = 0;
    let totalProgress = 0;
    tasks.forEach(task => {
        const cols = computeTaskColumns(task);
        totalAssigned += cols.assignedQtyConverted;
        totalProgress += cols.progressQtyConverted;
    });
    if (totalAssigned === 0) return 0;
    return (totalProgress / totalAssigned) * 100;
}

/**
 * Calculate final KPI score
 * KPI = (a + b + c) / 3
 */
export function calcKPI(a, b, c) {
    return (a + b + c) / 3;
}

/**
 * Compute full KPI breakdown for a set of tasks
 * Returns all aggregated values needed for reports
 */
export function computeKPIBreakdown(tasks) {
    // Compute column totals
    let totalCol7 = 0;  // Σ assigned qty converted
    let totalCol9 = 0;  // Σ actual qty converted
    let totalCol12 = 0; // Σ progress qty converted
    let totalCol14 = 0; // Σ quality qty converted

    tasks.forEach(task => {
        const cols = computeTaskColumns(task);
        totalCol7 += cols.assignedQtyConverted;
        totalCol9 += cols.actualQtyConverted;
        totalCol12 += cols.progressQtyConverted;
        totalCol14 += cols.qualityQtyConverted;
    });

    // Percentage scores
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
        // Raw totals for report summary rows
        totalCol7: Math.round(totalCol7 * 100) / 100,
        totalCol9: Math.round(totalCol9 * 100) / 100,
        totalCol12: Math.round(totalCol12 * 100) / 100,
        totalCol14: Math.round(totalCol14 * 100) / 100,
    };
}
