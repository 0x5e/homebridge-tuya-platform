/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { API, PlatformAccessory } from 'homebridge';
import FanAccessory from '../src/accessory/FanAccessory';
import TuyaDevice, { TuyaDeviceSchemaMode, TuyaDeviceSchemaType } from '../src/device/TuyaDevice';
import { TuyaPlatform } from '../src/platform';

const mockConfigureLight = jest.fn();
const mockConfigureOn = jest.fn();
jest.mock('../src/accessory/characteristic/Light', () => ({
  configureLight: (...args: any[]) => mockConfigureLight(...args),
}));
jest.mock('../src/accessory/characteristic/On', () => ({
  configureOn: (...args: any[]) => mockConfigureOn(...args),
}));
jest.mock('../src/accessory/characteristic/Active');
jest.mock('../src/accessory/characteristic/RotationSpeed');
jest.mock('../src/accessory/characteristic/SwingMode');
jest.mock('../src/accessory/characteristic/LockPhysicalControls');

describe('FanAccessory', () => {
  let mockPlatform: any;
  let mockAccessory: any;
  let mockAPI: any;
  let mockDeviceManager: any;

  beforeEach(() => {
    mockConfigureLight.mockClear();
    mockConfigureOn.mockClear();

    mockAPI = {
      hap: {
        Service: {
          Fan: jest.fn(),
          Fanv2: jest.fn(),
          Lightbulb: jest.fn(),
          Switch: jest.fn(),
          AccessoryInformation: jest.fn(),
        },
        Characteristic: {
          On: jest.fn(),
          Active: jest.fn(),
          RotationSpeed: jest.fn(),
          RotationDirection: jest.fn(),
          Brightness: jest.fn(),
        },
        uuid: {
          generate: jest.fn(() => 'mock-uuid'),
        },
      },
      user: {
        persistPath: jest.fn(() => '/mock/path'),
      },
    } as unknown as API;

    mockDeviceManager = {
      getDevice: jest.fn(),
      sendCommands: jest.fn(),
    };

    mockPlatform = {
      api: mockAPI,
      Service: mockAPI.hap.Service,
      Characteristic: mockAPI.hap.Characteristic,
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      options: {
        debug: false,
        debugLevel: '',
      },
      deviceManager: mockDeviceManager,
      getDeviceConfig: jest.fn(() => undefined),
      getDeviceSchemaConfig: jest.fn(() => undefined),
    } as unknown as TuyaPlatform;

    mockAccessory = {
      UUID: 'mock-uuid',
      displayName: 'Test Fan',
      context: {
        deviceID: 'test-device-id',
      },
      services: [],
      getService: jest.fn((name: string) => {
        return mockAccessory.services.find((s: any) => s.displayName === name || s.UUID === name);
      }),
      addService: jest.fn((serviceType: any, name?: string, subtype?: string) => {
        const service = {
          UUID: subtype || name || 'mock-service',
          displayName: name || 'Mock Service',
          subtype: subtype,
          getCharacteristic: jest.fn(() => ({
            onGet: jest.fn().mockReturnThis(),
            onSet: jest.fn().mockReturnThis(),
            setProps: jest.fn().mockReturnThis(),
            updateValue: jest.fn().mockReturnThis(),
          })),
          setCharacteristic: jest.fn().mockReturnThis(),
        };
        mockAccessory.services.push(service);
        return service;
      }),
      removeService: jest.fn(),
    } as unknown as PlatformAccessory;
  });

  function createMockDevice(codes: string[]): TuyaDevice {
    const schema = codes.map(code => ({
      code,
      mode: TuyaDeviceSchemaMode.READ_WRITE,
      type: code.includes('bright') ? TuyaDeviceSchemaType.Integer : TuyaDeviceSchemaType.Boolean,
      property: code.includes('bright')
        ? { min: 10, max: 1000, scale: 0, step: 1 }
        : {},
    }));

    const status = codes.map(code => ({
      code,
      value: code.includes('bright') ? 500 : true,
    }));

    return new TuyaDevice({
      id: 'test-device-id',
      uuid: 'test-uuid',
      name: 'Test Fan',
      online: true,
      owner_id: 'owner-1',
      product_id: 'fs',
      product_name: 'Smart Fan',
      category: 'fs',
      schema,
      status,
    });
  }

  function setupAndConfigure(codes: string[]) {
    const device = createMockDevice(codes);
    mockDeviceManager.getDevice.mockReturnValue(device);
    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);
    fanAccessory.configureServices();
    return fanAccessory;
  }

  function getDualLightServices() {
    return mockAccessory.addService.mock.calls.filter((call: any[]) =>
      call[1] === 'Warm Light' || call[1] === 'White Light',
    );
  }

  function expectNoDualLight() {
    expect(getDualLightServices().length).toBe(0);
  }

  function expectLightCall(index: number, onCode: string, brightCode?: string) {
    const args = mockConfigureLight.mock.calls[index];
    expect(args[2]).toEqual(expect.objectContaining({ code: onCode }));
    if (brightCode) {
      expect(args[3]).toEqual(expect.objectContaining({ code: brightCode }));
    } else {
      expect(args[3]).toBeUndefined();
    }
  }

  // ─── Fan service type ─────────────────────────────────────────────

  describe('fan service type', () => {
    test('should use Fanv2 when child_lock present', () => {
      const fanAccessory = setupAndConfigure(['switch', 'fan_speed', 'child_lock']);
      expect(fanAccessory.fanServiceType()).toBe(mockAPI.hap.Service.Fanv2);
    });

    test('should use Fanv2 when swing present', () => {
      const fanAccessory = setupAndConfigure(['switch', 'fan_speed', 'switch_horizontal']);
      expect(fanAccessory.fanServiceType()).toBe(mockAPI.hap.Service.Fanv2);
    });

    test('should use Fan when no lock or swing present', () => {
      const fanAccessory = setupAndConfigure(['switch', 'fan_speed']);
      expect(fanAccessory.fanServiceType()).toBe(mockAPI.hap.Service.Fan);
    });
  });

  // ─── A. Dual-light path ───────────────────────────────────────────
  // Requires ALL 4: light + bright_value + switch_led + bright_value_1

  describe('dual-light (all 4 DPs present)', () => {
    test('light + bright_value + switch_led + bright_value_1', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'bright_value', 'switch_led', 'bright_value_1',
      ]);

      const lightServices = getDualLightServices();
      expect(lightServices.length).toBe(2);
      expect(lightServices[0][1]).toBe('Warm Light');
      expect(lightServices[0][2]).toBe('warm_light');
      expect(lightServices[1][1]).toBe('White Light');
      expect(lightServices[1][2]).toBe('white_light');

      expect(mockConfigureLight).toHaveBeenCalledTimes(2);
      expectLightCall(0, 'light', 'bright_value');
      expectLightCall(1, 'switch_led', 'bright_value_1');
    });

    test('dual-light with extra bright_value_v2 (ignored)', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'bright_value', 'bright_value_v2', 'switch_led', 'bright_value_1',
      ]);

      expect(getDualLightServices().length).toBe(2);
      expect(mockConfigureLight).toHaveBeenCalledTimes(2);
      expectLightCall(0, 'light', 'bright_value');
      expectLightCall(1, 'switch_led', 'bright_value_1');
    });

    test('dual-light with extra temp_value (not passed to dual-light configureLight)', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'bright_value', 'switch_led', 'bright_value_1', 'temp_value',
      ]);

      expect(getDualLightServices().length).toBe(2);
      expect(mockConfigureLight).toHaveBeenCalledTimes(2);
      // Dual-light calls only pass on+bright, not temp/color/mode
      expect(mockConfigureLight.mock.calls[0].length).toBe(4);
      expect(mockConfigureLight.mock.calls[1].length).toBe(4);
    });
  });

  // ─── B. Single-light Lightbulb path ───────────────────────────────
  // Has LIGHT_ON match + at least one of: bright_value/v2, temp_value/v2, colour_data, work_mode

  describe('single-light as Lightbulb', () => {
    test('light + bright_value', () => {
      setupAndConfigure(['switch', 'fan_speed', 'light', 'bright_value']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'light', 'bright_value');
    });

    test('light + bright_value_v2', () => {
      setupAndConfigure(['switch', 'fan_speed', 'light', 'bright_value_v2']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'light', 'bright_value_v2');
    });

    test('switch_led + bright_value', () => {
      setupAndConfigure(['switch', 'fan_speed', 'switch_led', 'bright_value']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'switch_led', 'bright_value');
    });

    test('switch_led + bright_value_v2', () => {
      setupAndConfigure(['switch', 'fan_speed', 'switch_led', 'bright_value_v2']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'switch_led', 'bright_value_v2');
    });

    test('light + bright_value + both bright versions (prefers bright_value)', () => {
      setupAndConfigure(['switch', 'fan_speed', 'light', 'bright_value', 'bright_value_v2']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'light', 'bright_value');
    });

    test('light + temp_value only (no brightness)', () => {
      setupAndConfigure(['switch', 'fan_speed', 'light', 'temp_value']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      const args = mockConfigureLight.mock.calls[0];
      expect(args[2]).toEqual(expect.objectContaining({ code: 'light' }));
      expect(args[3]).toBeUndefined(); // no brightness DP
      expect(args[4]).toEqual(expect.objectContaining({ code: 'temp_value' }));
    });

    test('switch_led + temp_value_v2 only', () => {
      setupAndConfigure(['switch', 'fan_speed', 'switch_led', 'temp_value_v2']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      const args = mockConfigureLight.mock.calls[0];
      expect(args[2]).toEqual(expect.objectContaining({ code: 'switch_led' }));
      expect(args[4]).toEqual(expect.objectContaining({ code: 'temp_value_v2' }));
    });

    test('light + bright_value + temp_value + colour_data + work_mode (full feature set)', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'bright_value', 'temp_value', 'colour_data', 'work_mode',
      ]);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      const args = mockConfigureLight.mock.calls[0];
      expect(args[2]).toEqual(expect.objectContaining({ code: 'light' }));
      expect(args[3]).toEqual(expect.objectContaining({ code: 'bright_value' }));
      expect(args[4]).toEqual(expect.objectContaining({ code: 'temp_value' }));
      expect(args[5]).toEqual(expect.objectContaining({ code: 'colour_data' }));
      expect(args[6]).toEqual(expect.objectContaining({ code: 'work_mode' }));
    });

    test('both on/off DPs + switch_led fallback: prefers light (LIGHT_ON order)', () => {
      setupAndConfigure(['switch', 'fan_speed', 'light', 'switch_led', 'bright_value']);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'light', 'bright_value');
    });
  });

  // ─── C. Single-light Switch path ──────────────────────────────────
  // Has LIGHT_ON match but NO brightness/temp/color/mode DPs

  describe('single-light as Switch (on/off only)', () => {
    test('light only', () => {
      setupAndConfigure(['switch', 'fan_speed', 'light']);

      expectNoDualLight();
      expect(mockConfigureLight).not.toHaveBeenCalled();
      expect(mockConfigureOn).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({ code: 'light' }),
      );
    });

    test('switch_led only', () => {
      setupAndConfigure(['switch', 'fan_speed', 'switch_led']);

      expectNoDualLight();
      expect(mockConfigureLight).not.toHaveBeenCalled();
      expect(mockConfigureOn).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({ code: 'switch_led' }),
      );
    });

    test('light + switch_led, no brightness (prefers light)', () => {
      setupAndConfigure(['switch', 'fan_speed', 'light', 'switch_led']);

      expectNoDualLight();
      expect(mockConfigureLight).not.toHaveBeenCalled();
      expect(mockConfigureOn).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({ code: 'light' }),
      );
    });
  });

  // ─── D. No light ──────────────────────────────────────────────────

  describe('no light at all', () => {
    test('fan-only device', () => {
      setupAndConfigure(['switch', 'fan_speed']);

      expectNoDualLight();
      expect(mockConfigureLight).not.toHaveBeenCalled();
    });

    test('brightness DPs without any on/off DP are ignored', () => {
      setupAndConfigure(['switch', 'fan_speed', 'bright_value']);

      expectNoDualLight();
      expect(mockConfigureLight).not.toHaveBeenCalled();
    });

    test('bright_value_1 alone is ignored', () => {
      setupAndConfigure(['switch', 'fan_speed', 'bright_value_1']);

      expectNoDualLight();
      expect(mockConfigureLight).not.toHaveBeenCalled();
    });
  });

  // ─── E. Edge cases: dual-light guard must NOT match ────────────────
  // These are the critical backward-compatibility scenarios.
  // Each has 3 of the 4 required DPs but not the 4th,
  // so must fall through to the single-light path.

  describe('partial dual-light DPs (must NOT trigger dual-light)', () => {
    test('missing bright_value_1: light + bright_value + switch_led', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'bright_value', 'switch_led',
      ]);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'light', 'bright_value');
    });

    test('missing switch_led: light + bright_value + bright_value_1', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'bright_value', 'bright_value_1',
      ]);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'light', 'bright_value');
    });

    test('missing bright_value: light + switch_led + bright_value_1', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'switch_led', 'bright_value_1',
      ]);

      expectNoDualLight();
      // lightServiceType: no bright_value/v2, no temp, no color, no mode → Switch
      expect(mockConfigureLight).not.toHaveBeenCalled();
      expect(mockConfigureOn).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({ code: 'light' }),
      );
    });

    test('missing light: switch_led + bright_value + bright_value_1', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'switch_led', 'bright_value', 'bright_value_1',
      ]);

      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'switch_led', 'bright_value');
    });

    test('has bright_value_v2 instead of bright_value: light + bright_value_v2 + switch_led + bright_value_1', () => {
      setupAndConfigure([
        'switch', 'fan_speed',
        'light', 'bright_value_v2', 'switch_led', 'bright_value_1',
      ]);

      // bright_value is MISSING so dual-light guard fails
      expectNoDualLight();
      expect(mockConfigureLight).toHaveBeenCalledTimes(1);
      expectLightCall(0, 'light', 'bright_value_v2');
    });
  });
});
