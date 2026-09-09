// A preview of the endpoint-testing habit that Week 6 formalises with a full
// suite (see PLAN.md's "Key decisions"). This already works today because
// app.js/server.js are split: supertest exercises real Express routing and
// middleware against the exported `app`, with no port bound and no database
// involved.
import request from 'supertest';
import app from '../../src/app.js';

describe('GET/POST /tickets', () => {
  it('GET /tickets returns the seeded list', async () => {
    const res = await request(app).get('/tickets');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /tickets creates a ticket', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({ subject: 'Cannot reset password', description: 'Link expired' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      subject: 'Cannot reset password',
      status: 'open',
    });
  });

  it('POST /tickets without a subject returns 400', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({ description: 'Missing subject' });

    expect(res.status).toBe(400);
  });
});
