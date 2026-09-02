import { body, validationResult } from 'express-validator';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/', [
  body('capacity').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  res.json(errors.array());
});

app.listen(5005, async () => {
  const axios = (await import('axios')).default;
  const res = await axios.post('http://localhost:5005/', { capacity: 50 });
  console.log('With number:', res.data);
  
  const res2 = await axios.post('http://localhost:5005/', { capacity: '50' });
  console.log('With string:', res2.data);
  process.exit(0);
});
