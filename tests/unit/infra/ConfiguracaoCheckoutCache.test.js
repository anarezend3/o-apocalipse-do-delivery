const { ConfiguracaoCheckoutCache } = require('../../../src/infra/ConfiguracaoCheckoutCache');
const { Metricas } = require('../../../src/infra/Metricas');

function redisFake() {
  const dados = new Map();
  return {
    get: jest.fn(async (key) => dados.get(key) || null),
    set: jest.fn(async (key, value, options) => {
      if (options?.NX && dados.has(key)) return null;
      dados.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (key) => dados.delete(key)),
  };
}

describe('ConfiguracaoCheckoutCache', () => {
  test('cache miss concorrente consulta o banco uma única vez', async () => {
    const redis = redisFake();
    const repository = { obter: jest.fn().mockResolvedValue({ pagamentosAtivos: true }) };
    const cache = new ConfiguracaoCheckoutCache({
      redis,
      repository,
      metricas: new Metricas(),
      aleatorio: () => 0,
    });

    const resultados = await Promise.all(Array.from({ length: 100 }, () => cache.obter()));

    expect(repository.obter).toHaveBeenCalledTimes(1);
    expect(resultados.every((item) => item.pagamentosAtivos)).toBe(true);
  });

  test('retorna last known good quando Redis falha', async () => {
    const redis = redisFake();
    const repository = { obter: jest.fn().mockResolvedValue({ pagamentosAtivos: true }) };
    const metricas = new Metricas();
    const cache = new ConfiguracaoCheckoutCache({ redis, repository, metricas });
    await cache.obter();
    redis.get.mockRejectedValue(new Error('redis indisponível'));

    const configuracao = await cache.obter();

    expect(configuracao.pagamentosAtivos).toBe(true);
    expect(repository.obter).toHaveBeenCalledTimes(1);
    expect(metricas.cacheFallback).toBe(1);
  });

  test('cache hit evita banco e atualiza métricas', async () => {
    const redis = redisFake();
    await redis.set('checkout:config:v1', JSON.stringify({ pagamentosAtivos: true }));
    const repository = { obter: jest.fn() };
    const metricas = new Metricas();
    const cache = new ConfiguracaoCheckoutCache({ redis, repository, metricas });

    expect(await cache.obter()).toEqual({ pagamentosAtivos: true });
    expect(repository.obter).not.toHaveBeenCalled();
    expect(metricas.cacheHit).toBe(1);
    expect(metricas.cacheMiss).toBe(0);
  });

  test('usa lock com TTL, grava cache com TTL e libera apenas o próprio lock', async () => {
    const redis = redisFake();
    const repository = { obter: jest.fn().mockResolvedValue({ versao: 1 }) };
    const metricas = new Metricas();
    const cache = new ConfiguracaoCheckoutCache({
      redis,
      repository,
      metricas,
      ttlSegundos: 45,
      lockTtlMs: 900,
      aleatorio: () => 0,
    });

    await cache.obter();

    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      'checkout:config:v1:lock',
      expect.stringMatching(/^\d+-\d+-0$/),
      { NX: true, PX: 900 },
    );
    expect(redis.set).toHaveBeenNthCalledWith(
      2,
      'checkout:config:v1',
      '{"versao":1}',
      { EX: 45 },
    );
    expect(redis.del).toHaveBeenCalledWith('checkout:config:v1:lock');
    expect(metricas.cacheMiss).toBe(1);
  });

  test('aguarda o detentor do lock preencher o cache sem consultar banco', async () => {
    const redis = redisFake();
    let leituras = 0;
    redis.set.mockResolvedValueOnce(null);
    redis.get.mockImplementation(async () => {
      leituras += 1;
      return leituras >= 3 ? '{"versao":2}' : null;
    });
    const esperas = [];
    const repository = { obter: jest.fn() };
    const metricas = new Metricas();
    const cache = new ConfiguracaoCheckoutCache({
      redis,
      repository,
      metricas,
      aleatorio: () => 0,
      aguardar: async (ms) => esperas.push(ms),
    });

    expect(await cache.obter()).toEqual({ versao: 2 });
    expect(esperas).toEqual([25, 50]);
    expect(repository.obter).not.toHaveBeenCalled();
    expect(metricas.cacheHit).toBe(1);
  });

  test('consulta banco diretamente quando Redis falha sem last known good', async () => {
    const redis = redisFake();
    redis.get.mockRejectedValue(new Error('fora'));
    const repository = { obter: jest.fn().mockResolvedValue({ versao: 3 }) };
    const metricas = new Metricas();
    const cache = new ConfiguracaoCheckoutCache({ redis, repository, metricas });

    expect(await cache.obter()).toEqual({ versao: 3 });
    expect(repository.obter).toHaveBeenCalledTimes(1);
    expect(metricas.cacheFallback).toBe(1);
  });

  test('mantém configuração carregada se Redis falhar durante a escrita', async () => {
    const redis = redisFake();
    redis.set
      .mockResolvedValueOnce('OK')
      .mockRejectedValueOnce(new Error('redis caiu'));
    const repository = { obter: jest.fn().mockResolvedValue({ versao: 4 }) };
    const metricas = new Metricas();
    const cache = new ConfiguracaoCheckoutCache({ redis, repository, metricas });

    expect(await cache.obter()).toEqual({ versao: 4 });
    expect(metricas.cacheFallback).toBe(1);
  });

  test('limpar remove a chave real do cache', async () => {
    const redis = redisFake();
    const cache = new ConfiguracaoCheckoutCache({
      redis,
      repository: { obter: jest.fn() },
      metricas: new Metricas(),
    });
    await cache.limpar();
    expect(redis.del).toHaveBeenCalledWith('checkout:config:v1');
  });
});
