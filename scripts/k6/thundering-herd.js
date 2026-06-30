import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const falhasNaoControladas = new Rate('falhas_nao_controladas');
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const vus = Number(__ENV.VUS || 10000);

export const options = {
  scenarios: {
    manada: {
      executor: 'per-vu-iterations',
      vus,
      iterations: 1,
      maxDuration: __ENV.MAX_DURATION || '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    falhas_nao_controladas: ['rate<0.05'],
  },
};

export function setup() {
  http.post(`${baseUrl}/api/v1/cache/flush`);
}

export default function () {
  const resposta = http.post(`${baseUrl}/api/v1/checkout`, JSON.stringify({
    clienteEmail: `herd-${__VU}@entregasja.com`,
    valor: 10,
    cartao: { numero: '4111111111111111', validade: '12/30', cvv: '123' },
  }), { headers: { 'Content-Type': 'application/json' } });

  const controlada = check(resposta, {
    'sem queda de processo': (r) => [200, 500].includes(r.status),
  });
  falhasNaoControladas.add(!controlada);
}
