import { PlatformConfig } from 'homebridge';

export interface TuyaPlatformDeviceConfig {
  id: string;
  category: string;
  // schemaTransform: Array<object>;
}

export interface TuyaPlatformCustomConfigOptions {
  projectType: '1';
  endpoint: string;
  accessId: string;
  accessKey: string;
  username: string;
  password: string;
  devices: Array<TuyaPlatformDeviceConfig>;
}

export interface TuyaPlatformHomeConfigOptions {
  projectType: '2';
  accessId: string;
  accessKey: string;
  countryCode: number;
  username: string;
  password: string;
  appSchema: string;
  homeWhitelist: Array<number>;
  devices: Array<TuyaPlatformDeviceConfig>;
}

export type TuyaPlatformConfigOptions = TuyaPlatformCustomConfigOptions | TuyaPlatformHomeConfigOptions;

export interface TuyaPlatformConfig extends PlatformConfig {
  options: TuyaPlatformConfigOptions;
}

export const customOptionsSchema = {
  properties: {
    endpoint: { type: 'string', format: 'url', required: true },
    accessId: { type: 'string', required: true },
    accessKey: { type: 'string', required: true },
    devices: { 'type': 'array' },
  },
};

export const homeOptionsSchema = {
  properties: {
    accessId: { type: 'string', required: true },
    accessKey: { type: 'string', required: true },
    countryCode: { 'type': 'integer', 'minimum': 1 },
    username: { type: 'string', required: true },
    password: { type: 'string', required: true },
    appSchema: { 'type': 'string', required: true },
    homeWhitelist: { 'type': 'array' },
    devices: { 'type': 'array' },
  },
};
