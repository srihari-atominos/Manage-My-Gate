import express from 'express';
import { body, validationResult } from 'express-validator';

const app = express();
app.use(express.json());

const createMaintenanceRules = [
  body('startDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Start date must be in YYYY-MM-DD format'),
  body('endDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('End date must be in YYYY-MM-DD format'),
  body('endDate').custom((value, { req }) => {
    if (req.body.startDate && value < req.body.startDate) {
      throw new Error('End date must be after or equal to start date');
    }
    return true;
  })
];

app.post('/test', createMaintenanceRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  res.json({ success: true });
});

app.listen(3000, async () => {
  console.log('Server running');
  try {
    const res = await fetch('http://localhost:3000/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2026-08-20', endDate: '2026-08-19' })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
