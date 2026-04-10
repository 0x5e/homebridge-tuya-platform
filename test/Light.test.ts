/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { configureLight } from '../src/accessory/characteristic/Light';

describe('configureLight - ON handler bundles brightness', () => {
  let mockAccessory: any;
  let mockService: any;
  let handlers: Record<string, { onGet?: Function; onSet?: Function }>;

  beforeEach(() => {
    handlers = {};

    const makeCharChain = (name: string) => ({
      onGet: jest.fn(function (this: any, handler: Function) {
        handlers[name] = handlers[name] || {};
        handlers[name].onGet = handler;
        return this;
      }),
      onSet: jest.fn(function (this: any, handler: Function) {
        handlers[name] = handlers[name] || {};
        handlers[name].onSet = handler;
        return this;
      }),
      setProps: jest.fn().mockReturnThis(),
      updateValue: jest.fn().mockReturnThis(),
    });

    const onChar = makeCharChain('On');
    const brightChar = makeCharChain('Brightness');

    mockService = {
      getCharacteristic: jest.fn((charType: any) => {
        if (charType === 'MockOn') return onChar;
        if (charType === 'MockBrightness') return brightChar;
        return makeCharChain('other');
      }),
    };

    mockAccessory = {
      Characteristic: { On: 'MockOn', Brightness: 'MockBrightness' },
      Service: { Lightbulb: 'MockLightbulb' },
      accessory: {
        displayName: 'Test Light',
        getService: jest.fn(() => null),
        addService: jest.fn(() => mockService),
      },
      log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
      platform: { getDeviceConfig: jest.fn(() => undefined) },
      checkOnlineStatus: jest.fn(),
      getStatus: jest.fn((code: string) => {
        if (code === 'light') return { code: 'light', value: true };
        if (code === 'bright_value') return { code: 'bright_value', value: 420 };
        if (code === 'switch_led') return { code: 'switch_led', value: false };
        if (code === 'bright_value_1') return { code: 'bright_value_1', value: 100 };
        return undefined;
      }),
      sendCommands: jest.fn(),
    };
  });

  function makeSchema(code: string, type = 'Boolean', property: any = {}) {
    return { code, mode: 'rw', type, property };
  }

  function brightSchema(code = 'bright_value') {
    return makeSchema(code, 'Integer', { min: 10, max: 1000, scale: 0, step: 1 });
  }

  test('LightType.C: ON sends both on + cached brightness', async () => {
    configureLight(
      mockAccessory,
      mockService,
      makeSchema('light') as any,
      brightSchema() as any,
    );

    expect(handlers['On']?.onSet).toBeDefined();
    await handlers['On'].onSet!(true);

    expect(mockAccessory.sendCommands).toHaveBeenCalledWith(
      [
        { code: 'light', value: true },
        { code: 'bright_value', value: 420 },
      ],
      true,
    );
  });

  test('LightType.C: OFF sends only the on command (no brightness)', async () => {
    configureLight(
      mockAccessory,
      mockService,
      makeSchema('light') as any,
      brightSchema() as any,
    );

    await handlers['On'].onSet!(false);

    expect(mockAccessory.sendCommands).toHaveBeenCalledWith(
      [{ code: 'light', value: false }],
      true,
    );
  });

  test('dual-light warm channel: ON bundles warm brightness', async () => {
    configureLight(
      mockAccessory,
      mockService,
      makeSchema('light') as any,
      brightSchema('bright_value') as any,
    );

    await handlers['On'].onSet!(true);

    expect(mockAccessory.sendCommands).toHaveBeenCalledWith(
      [
        { code: 'light', value: true },
        { code: 'bright_value', value: 420 },
      ],
      true,
    );
  });

  test('dual-light white channel: ON bundles white brightness', async () => {
    configureLight(
      mockAccessory,
      mockService,
      makeSchema('switch_led') as any,
      brightSchema('bright_value_1') as any,
    );

    await handlers['On'].onSet!(true);

    expect(mockAccessory.sendCommands).toHaveBeenCalledWith(
      [
        { code: 'switch_led', value: true },
        { code: 'bright_value_1', value: 100 },
      ],
      true,
    );
  });

  test('brightness-only set does not include on command', async () => {
    configureLight(
      mockAccessory,
      mockService,
      makeSchema('light') as any,
      brightSchema() as any,
    );

    await handlers['Brightness'].onSet!(42);

    expect(mockAccessory.sendCommands).toHaveBeenCalledWith(
      [{ code: 'bright_value', value: 420 }],
      true,
    );
  });

  test('ON without brightness schema does not crash', async () => {
    configureLight(
      mockAccessory,
      mockService,
      makeSchema('light') as any,
    );

    expect(handlers['On']?.onSet).toBeDefined();
    await handlers['On'].onSet!(true);

    expect(mockAccessory.sendCommands).toHaveBeenCalledWith(
      [{ code: 'light', value: true }],
      true,
    );
  });
});
