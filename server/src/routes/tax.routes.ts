import { Router } from 'express';
import { calculateTax } from '../services/tax.service.js';
import { validate } from '../middleware/validate.js';
import { calculateTaxBodySchema, type CalculateTaxBody } from '../validators/tax.schemas.js';

export const taxRouter = Router();

taxRouter.post(
  '/calculate',
  validate({ body: calculateTaxBodySchema }),
  (req, res) => {
    const { grossIncome, taxStatus } = req.body as CalculateTaxBody;
    const result = calculateTax(grossIncome, taxStatus);
    res.json({ data: result, error: null, meta: null });
  },
);

taxRouter.get('/brackets', (_req, res) => {
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
