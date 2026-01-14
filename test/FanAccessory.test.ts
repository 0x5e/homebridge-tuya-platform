/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { API, PlatformAccessory } from 'homebridge';
import FanAccessory from '../src/accessory/FanAccessory';
import TuyaDevice, { TuyaDeviceSchemaMode, TuyaDeviceSchemaType } from '../src/device/TuyaDevice';
import { TuyaPlatform } from '../src/platform';

// Mock modules
jest.mock('../src/accessory/characteristic/Light');
jest.mock('../src/accessory/characteristic/On');
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
    // Mock API
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

    // Mock device manager
    mockDeviceManager = {
      getDevice: jest.fn(),
      sendCommands: jest.fn(),
    };

    // Mock platform
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

    // Mock accessory
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

  test('should detect dual-light when all 4 DPs are present', () => {
    const device = createMockDevice([
      'switch',
      'fan_speed',
      'light',
      'bright_value',
      'switch_led',
      'bright_value_1',
    ]);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);
    fanAccessory.configureServices();

    // Should create two separate Lightbulb services
    const services = mockAccessory.addService.mock.calls;
    const lightServices = services.filter((call: any[]) =>
      call[1] === 'Warm Light' || call[1] === 'White Light',
    );

    expect(lightServices.length).toBe(2);
    expect(lightServices[0][1]).toBe('Warm Light');
    expect(lightServices[0][2]).toBe('warm_light');
    expect(lightServices[1][1]).toBe('White Light');
    expect(lightServices[1][2]).toBe('white_light');
  });

  test('should fallback to single light when only one set of DPs present', () => {
    const device = createMockDevice([
      'switch',
      'fan_speed',
      'light',
      'bright_value',
    ]);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);
    fanAccessory.configureServices();

    // Should NOT create separate Warm/White services
    const services = mockAccessory.addService.mock.calls;
    const dualLightServices = services.filter((call: any[]) =>
      call[1] === 'Warm Light' || call[1] === 'White Light',
    );

    expect(dualLightServices.length).toBe(0);
  });

  test('should not detect dual-light when only switch_led without bright_value_1', () => {
    const device = createMockDevice([
      'switch',
      'fan_speed',
      'light',
      'bright_value',
      'switch_led', // Missing bright_value_1
    ]);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);
    fanAccessory.configureServices();

    // Should NOT create separate Warm/White services
    const services = mockAccessory.addService.mock.calls;
    const dualLightServices = services.filter((call: any[]) =>
      call[1] === 'Warm Light' || call[1] === 'White Light',
    );

    expect(dualLightServices.length).toBe(0);
  });

  test('should not detect dual-light when only bright_value_1 without switch_led', () => {
    const device = createMockDevice([
      'switch',
      'fan_speed',
      'light',
      'bright_value',
      'bright_value_1', // Missing switch_led
    ]);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);
    fanAccessory.configureServices();

    // Should NOT create separate Warm/White services
    const services = mockAccessory.addService.mock.calls;
    const dualLightServices = services.filter((call: any[]) =>
      call[1] === 'Warm Light' || call[1] === 'White Light',
    );

    expect(dualLightServices.length).toBe(0);
  });

  test('should handle fan with no light at all', () => {
    const device = createMockDevice([
      'switch',
      'fan_speed',
    ]);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);
    fanAccessory.configureServices();

    // Should NOT create any light services
    const services = mockAccessory.addService.mock.calls;
    const lightServices = services.filter((call: any[]) =>
      call[0].name === 'Lightbulb' || call[1]?.includes('Light'),
    );

    expect(lightServices.length).toBe(0);
  });

  test('should use Fanv2 when lock or swing present', () => {
    const device = createMockDevice([
      'switch',
      'fan_speed',
      'child_lock',
    ]);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);

    expect(fanAccessory.fanServiceType()).toBe(mockAPI.hap.Service.Fanv2);
  });

  test('should use Fan when no lock or swing present', () => {
    const device = createMockDevice([
      'switch',
      'fan_speed',
    ]);

    mockDeviceManager.getDevice.mockReturnValue(device);

    const fanAccessory = new FanAccessory(mockPlatform, mockAccessory);

    expect(fanAccessory.fanServiceType()).toBe(mockAPI.hap.Service.Fan);
  });
});
