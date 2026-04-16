"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tax_service_js_1 = require("../tax.service.js");
(0, vitest_1.describe)('calculateTax', () => {
    (0, vitest_1.describe)('self-employed', () => {
        (0, vitest_1.it)('should return zero deductions for zero income', () => {
            const result = (0, tax_service_js_1.calculateTax)(0, 'self_employed');
            (0, vitest_1.expect)(result.grossIncome).toBe(0);
            (0, vitest_1.expect)(result.incomeTax).toBe(0);
            (0, vitest_1.expect)(result.nationalInsurance).toBe(0);
            (0, vitest_1.expect)(result.healthTax).toBe(0);
            (0, vitest_1.expect)(result.vat).toBe(0);
            (0, vitest_1.expect)(result.totalDeductions).toBe(0);
            (0, vitest_1.expect)(result.netIncome).toBe(0);
            (0, vitest_1.expect)(result.effectiveTaxRate).toBe(0);
        });
        (0, vitest_1.it)('should calculate tax for income within first bracket only', () => {
            // 5000/month = 60000/year — fully in first bracket (10%)
            const result = (0, tax_service_js_1.calculateTax)(5000, 'self_employed');
            (0, vitest_1.expect)(result.grossIncome).toBe(5000);
            (0, vitest_1.expect)(result.incomeTax).toBe(500); // 60000 * 0.10 / 12 = 500
            (0, vitest_1.expect)(result.vat).toBe(900); // 5000 * 0.18
            (0, vitest_1.expect)(result.netIncome).toBe(5000 - result.totalDeductions);
        });
        (0, vitest_1.it)('should calculate tax across multiple income brackets', () => {
            // 20000/month = 240000/year — spans brackets 1-4
            const result = (0, tax_service_js_1.calculateTax)(20000, 'self_employed');
            (0, vitest_1.expect)(result.grossIncome).toBe(20000);
            // Annual income tax:
            // bracket 1: 84120 * 0.10 = 8412
            // bracket 2: (120720-84120) * 0.14 = 36600 * 0.14 = 5124
            // bracket 3: (193800-120720) * 0.20 = 73080 * 0.20 = 14616
            // bracket 4: (240000-193800) * 0.31 = 46200 * 0.31 = 14322
            // total annual = 42474, monthly = 42474/12 = 3539.5 → rounded to 3540
            (0, vitest_1.expect)(result.incomeTax).toBe(3540);
            (0, vitest_1.expect)(result.vat).toBe(3600); // 20000 * 0.18
            (0, vitest_1.expect)(result.brackets.length).toBeGreaterThanOrEqual(4);
        });
        (0, vitest_1.it)('should calculate VAT only for self-employed', () => {
            const selfEmployed = (0, tax_service_js_1.calculateTax)(10000, 'self_employed');
            (0, vitest_1.expect)(selfEmployed.vat).toBe(1800); // 10000 * 0.18
            const employee = (0, tax_service_js_1.calculateTax)(10000, 'employee');
            (0, vitest_1.expect)(employee.vat).toBe(0);
        });
        (0, vitest_1.it)('should calculate NII at reduced rate for income below threshold', () => {
            // 5000/month — below 7522 threshold, self-employed reduced rate 5.58%
            const result = (0, tax_service_js_1.calculateTax)(5000, 'self_employed');
            (0, vitest_1.expect)(result.nationalInsurance).toBe(Math.round(5000 * 0.0558)); // 279
        });
        (0, vitest_1.it)('should calculate NII across both brackets for higher income', () => {
            // 15000/month — spans both NII brackets for self-employed
            const result = (0, tax_service_js_1.calculateTax)(15000, 'self_employed');
            // 7522 * 0.0558 + (15000-7522) * 0.1783
            const expected = Math.round(7522 * 0.0558 + (15000 - 7522) * 0.1783);
            (0, vitest_1.expect)(result.nationalInsurance).toBe(expected);
        });
        (0, vitest_1.it)('should cap NII at ceiling (49030 monthly)', () => {
            // 60000/month — NII capped at 49030
            const result = (0, tax_service_js_1.calculateTax)(60000, 'self_employed');
            const expectedNII = Math.round(7522 * 0.0558 + (49030 - 7522) * 0.1783);
            (0, vitest_1.expect)(result.nationalInsurance).toBe(expectedNII);
        });
        (0, vitest_1.it)('should calculate health tax at reduced rate for low income', () => {
            const result = (0, tax_service_js_1.calculateTax)(5000, 'self_employed');
            (0, vitest_1.expect)(result.healthTax).toBe(Math.round(5000 * 0.0312)); // 156
        });
        (0, vitest_1.it)('should calculate health tax across both brackets', () => {
            const result = (0, tax_service_js_1.calculateTax)(15000, 'self_employed');
            const expected = Math.round(7522 * 0.0312 + (15000 - 7522) * 0.05);
            (0, vitest_1.expect)(result.healthTax).toBe(expected);
        });
    });
    (0, vitest_1.describe)('employee', () => {
        (0, vitest_1.it)('should use employee NII rates (lower)', () => {
            const result = (0, tax_service_js_1.calculateTax)(15000, 'employee');
            // Employee: 7522*0.004 + (15000-7522)*0.07
            const expected = Math.round(7522 * 0.004 + (15000 - 7522) * 0.07);
            (0, vitest_1.expect)(result.nationalInsurance).toBe(expected);
        });
        (0, vitest_1.it)('should not charge VAT for employees', () => {
            const result = (0, tax_service_js_1.calculateTax)(15000, 'employee');
            (0, vitest_1.expect)(result.vat).toBe(0);
        });
        (0, vitest_1.it)('should compute correct effective tax rate', () => {
            const result = (0, tax_service_js_1.calculateTax)(10000, 'employee');
            (0, vitest_1.expect)(result.effectiveTaxRate).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.effectiveTaxRate).toBeLessThan(100);
            // effectiveTaxRate = totalDeductions / grossIncome * 100
            const expected = Math.round((result.totalDeductions / 10000) * 100 * 100) / 100;
            (0, vitest_1.expect)(result.effectiveTaxRate).toBe(expected);
        });
    });
    (0, vitest_1.describe)('high income (top brackets)', () => {
        (0, vitest_1.it)('should apply 50% marginal rate for income above 721560 annually', () => {
            // 80000/month = 960000/year — hits the top bracket
            const result = (0, tax_service_js_1.calculateTax)(80000, 'self_employed');
            (0, vitest_1.expect)(result.brackets.length).toBe(7); // all 7 brackets
            const topBracket = result.brackets[6];
            (0, vitest_1.expect)(topBracket.rate).toBe(0.50);
            (0, vitest_1.expect)(topBracket.from).toBe(721560);
        });
    });
    (0, vitest_1.describe)('edge cases', () => {
        (0, vitest_1.it)('should handle very small income', () => {
            const result = (0, tax_service_js_1.calculateTax)(1, 'self_employed');
            (0, vitest_1.expect)(result.grossIncome).toBe(1);
            (0, vitest_1.expect)(result.netIncome).toBeLessThanOrEqual(1);
        });
        (0, vitest_1.it)('should handle very large income', () => {
            const result = (0, tax_service_js_1.calculateTax)(1000000, 'self_employed');
            (0, vitest_1.expect)(result.grossIncome).toBe(1000000);
            (0, vitest_1.expect)(result.effectiveTaxRate).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.effectiveTaxRate).toBeLessThan(100);
        });
        (0, vitest_1.it)('should return all rounded values', () => {
            const result = (0, tax_service_js_1.calculateTax)(12345, 'self_employed');
            (0, vitest_1.expect)(Number.isInteger(result.incomeTax)).toBe(true);
            (0, vitest_1.expect)(Number.isInteger(result.nationalInsurance)).toBe(true);
            (0, vitest_1.expect)(Number.isInteger(result.healthTax)).toBe(true);
            (0, vitest_1.expect)(Number.isInteger(result.vat)).toBe(true);
            (0, vitest_1.expect)(Number.isInteger(result.totalDeductions)).toBe(true);
            (0, vitest_1.expect)(Number.isInteger(result.netIncome)).toBe(true);
        });
        (0, vitest_1.it)('should ensure netIncome = grossIncome - totalDeductions', () => {
            const result = (0, tax_service_js_1.calculateTax)(25000, 'self_employed');
            (0, vitest_1.expect)(result.netIncome).toBe(result.grossIncome - result.totalDeductions);
        });
    });
});
//# sourceMappingURL=tax.service.test.js.map