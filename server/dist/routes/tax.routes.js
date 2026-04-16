"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxRouter = void 0;
const express_1 = require("express");
const tax_service_js_1 = require("../services/tax.service.js");
const validate_js_1 = require("../middleware/validate.js");
const tax_schemas_js_1 = require("../validators/tax.schemas.js");
exports.taxRouter = (0, express_1.Router)();
exports.taxRouter.post('/calculate', (0, validate_js_1.validate)({ body: tax_schemas_js_1.calculateTaxBodySchema }), (req, res) => {
    const { grossIncome, taxStatus } = req.body;
    const result = (0, tax_service_js_1.calculateTax)(grossIncome, taxStatus);
    res.json({ data: result, error: null, meta: null });
});
exports.taxRouter.get('/brackets', (_req, res) => {
    res.json({
        data: {
            incomeTax: [
                { from: 0, to: 84120, rate: 10 },
                { from: 84120, to: 120720, rate: 14 },
                { from: 120720, to: 193800, rate: 20 },
                { from: 193800, to: 269280, rate: 31 },
                { from: 269280, to: 560280, rate: 35 },
                { from: 560280, to: 721560, rate: 47 },
                { from: 721560, to: null, rate: 50 },
            ],
            nationalInsurance: {
                selfEmployed: { reduced: 5.58, full: 17.83 },
                employee: { reduced: 0.4, full: 7.0 },
            },
            vat: 18,
        },
        error: null,
        meta: { year: 2026, source: 'Israel Tax Authority (approximate)' },
    });
});
//# sourceMappingURL=tax.routes.js.map