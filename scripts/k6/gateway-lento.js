import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const falhasNaoControladas = new Rate('falhas_nao_controladas');
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: Number(__ENV.VUS || 100),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    falhas_nao_controladas: ['rate<0.05'],
  },
};

export default function () {
  const resposta = http.post(`${baseUrl}/api/v1/checkout`, JSON.stringify({
    clienteEmail: `caos-${__VU}-${__ITER}@entregasja.com`,
    valor: 50,
    cartao: { numero: '4111111111111111', validade: '12/30', cvv: '123' },
  }), { headers: { 'Content-Type': 'application/json' } });

  const controlada = check(resposta, {
    'resposta controlada': (r) => [200, 500].includes(r.status),
    'processo disponível': (r) => r.status !== 0,
  });
  falhasNaoControladas.add(!controlada);
}
