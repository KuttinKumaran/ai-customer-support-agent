const request = require('supertest');
const createApp = require('../src/app');

describe('Support API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /health', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('POST /api/support', () => {
    it('returns support response for ORD1001', async () => {
      const res = await request(app)
        .post('/api/support')
        .send({
          customerName: 'Kumaran',
          customerMessage: "My Samsung TV order hasn't arrived. Please help me.",
          orderId: 'ORD1001',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer).toBe('Kumaran');
      expect(res.body.data.orderId).toBe('ORD1001');
      expect(res.body.data.status).toBe('Delayed');
      expect(res.body.data.daysDelayed).toBe(4);
      expect(res.body.data.coupon).toBe(500);
      expect(res.body.data.message).toBeTruthy();
      expect(res.body.meta.requestId).toBeTruthy();
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/support')
        .send({ customerName: 'Kumaran' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for unknown order', async () => {
      const res = await request(app)
        .post('/api/support')
        .send({
          customerName: 'Test',
          customerMessage: 'Where is my order?',
          orderId: 'ORD9999',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('Mock admin routes', () => {
    it('lists mock orders', async () => {
      const res = await request(app).get('/api/mock/oms/orders');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('resets mock OMS data', async () => {
      const res = await request(app).post('/api/mock/oms/reset');

      expect(res.status).toBe(200);
      expect(res.body.data.orderCount).toBeGreaterThan(0);
    });
  });
});
