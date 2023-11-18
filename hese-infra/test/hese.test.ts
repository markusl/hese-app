import { getHeseIceCreamStatusFinland } from '../lib/lambda/hese';

jest.setTimeout(25000);

test('getHeseIceCreamStatusFinland', async () => {
  const status = await getHeseIceCreamStatusFinland();

  expect(status).toEqual(expect.objectContaining({
    brokenIceCreamTotal: expect.any(Number),
    iceCreamInSelection: expect.any(Number),
    iceCreamNotInSelection: expect.any(Number),
    cityStatuses: expect.any(Array),
  }));
});
