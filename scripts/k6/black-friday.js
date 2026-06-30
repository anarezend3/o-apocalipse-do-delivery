import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const falhasInesperadas = new Rate('falhas_inesperadas');
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '20s', target: Number(__ENV.PEAK_VUS || 100) },
    { duration: __ENV.STEADY || '40s', target: Number(__ENV.PEAK_VUS || 100) },
    { duration: __ENV.RAMP_DOWN || '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2500'],
    falhas_inesperadas: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const resposta = http.post(`${baseUrl}/api/v1/checkout`, JSON.stringify({
    clienteEmail: `carga-${__VU}-${__ITER}@entregasja.com`,
    valor: 99.9,
    cartao: { numero: '4111111111111111', validade: '12/30', cvv: '123' },
  }), { headers: { 'Content-Type': 'application/json' } });

  const sucesso = check(resposta, { 'checkout aprovado': (r) => r.status === 200 });
  falhasInesperadas.add(!sucesso);
}
