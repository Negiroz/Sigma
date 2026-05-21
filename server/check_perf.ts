import { getPerformanceStats } from './src/controllers/dashboardController';
import { Request, Response } from 'express';

const req = {
  query: { month: '5', year: '2026', companyId: '2' },
  user: { userId: 1, role: 'ADMIN' }
} as unknown as Request;

const res = {
  json: (data: any) => console.log(JSON.stringify(data, null, 2)),
  status: (code: number) => ({ json: (data: any) => console.log(code, data) })
} as unknown as Response;

getPerformanceStats(req, res);
