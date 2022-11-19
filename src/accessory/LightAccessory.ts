import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  ON: ['switch_led'],
  BRIGHTNESS: ['bright_value', 'bright_value_v2'],
  COLOR_TEMP: ['temp_value', 'temp_value_v2'],
  COLOR: ['colour_data', 'colour_data_v2'],
  WORK_MODE: ['work_mode'],
};

enum LightAccessoryType {
  Unknown = -1,
  Normal = 0, // Normal Accessory, similar to SwitchAccessory, OutletAccessory.
  C = 1, // Accessory with brightness.
  CW = 2, // Accessory with brightness and color temperature (Cold and Warm).
  RGB = 3, // Accessory with color (RGB <--> HSB).
  RGBC = 4, // Accessory with color and brightness.
  RGBCW = 5, // Accessory with color, brightness and color temperature (two work mode).
}

type TuyaDeviceSchemaColorProperty = {
  h: TuyaDeviceSchemaIntegerProperty;
  s: TuyaDeviceSchemaIntegerProperty;
  v: TuyaDeviceSchemaIntegerProperty;
};

export default class LightAccessory extends BaseAccessory {
  static readonly LightAccessoryType = LightAccessoryType;

  constructor(
    public readonly platform: TuyaPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // platform.log.debug(`${JSON.stringify(this.device.functions)}, ${JSON.stringify(this.device.status)}`);
    switch (this.getAccessoryType()) {
      case LightAccessoryType.Normal:
        this.configureOn();
        break;
      case LightAccessoryType.C:
        this.configureOn();
        this.configureBrightness();
        break;
      case LightAccessoryType.CW:
        this.configureOn();
        this.configureBrightness();
        this.configureColourTemperature();
        break;
      case LightAccessoryType.RGB:
        this.configureOn();
        this.configureBrightness();
        this.configureHue();
        this.configureSaturation();
        break;
      case LightAccessoryType.RGBC:
      case LightAccessoryType.RGBCW:
        this.configureOn();
        this.configureBrightness();
        this.configureColourTemperature();
        this.configureHue();
        this.configureSaturation();
        break;
    }
  }

  getLightService() {
    return this.accessory.getService(this.Service.Lightbulb)
    || this.accessory.addService(this.Service.Lightbulb);
  }

  getAccessoryType() {
    const on = this.getSchema(...SCHEMA_CODE.ON);
    const bright = this.getSchema(...SCHEMA_CODE.BRIGHTNESS);
    const temp = this.getSchema(...SCHEMA_CODE.COLOR_TEMP);
    const color = this.getSchema(...SCHEMA_CODE.COLOR);
    const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE)?.property as TuyaDeviceSchemaEnumProperty;
    const { h, s, v } = (color?.property || {}) as never;

    let accessoryType: LightAccessoryType;
    if (on && bright && temp && h && s && v && mode && mode.range.includes('colour') && mode.range.includes('white')) {
      accessoryType = LightAccessoryType.RGBCW;
    } else if (on && bright && !temp && h && s && v && mode && mode.range.includes('colour') && mode.range.includes('white')) {
      accessoryType = LightAccessoryType.RGBC;
    } else if (on && !temp && h && s && v) {
      accessoryType = LightAccessoryType.RGB;
    } else if (on && bright && temp && !color) {
      accessoryType = LightAccessoryType.CW;
    } else if (on && bright && !temp && !color) {
      accessoryType = LightAccessoryType.C;
    } else if (on && !bright && !temp && !color) {
      accessoryType = LightAccessoryType.Normal;
    } else {
      accessoryType = LightAccessoryType.Unknown;
    }

    return accessoryType;
  }

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  getColorValue() {
    const schema = this.getSchema(...SCHEMA_CODE.COLOR);
    const status = this.getStatus(schema!.code);
    if (!status || !status.value || status.value === '' || status.value === '{}') {
      return { h: 0, s: 0, v: 0 };
    }

    const { h, s, v } = JSON.parse(status.value as string);
    return {
      h: h as number,
      s: s as number,
      v: v as number,
    };
  }

  inWhiteMode() {
    const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
    if (!mode) {
      return false;
    }
    const status = this.getStatus(mode.code);
    if (!status) {
      return false;
    }
    return (status.value === 'white');
  }

  inColorMode() {
    const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
    if (!mode) {
      return false;
    }
    const status = this.getStatus(mode.code);
    if (!status) {
      return false;
    }
    return (status.value === 'colour');
  }

  configureOn() {
    const service = this.getLightService();
    const schema = this.getSchema(...SCHEMA_CODE.ON)!;

    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        return !!status && status!.value;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.On set to: ${value}`);
        this.sendCommands([{ code: schema.code, value: value as boolean }], true);
      });
  }

  configureBrightness() {
    const service = this.getLightService();

    service.getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {

        // Color mode, get brightness from hsv
        if (this.inColorMode()) {
          const { max } = (this.getSchema(...SCHEMA_CODE.COLOR)?.property as TuyaDeviceSchemaColorProperty).v;
          const status = this.getColorValue().v;
          const value = Math.floor(100 * status / max);
          return limit(value, 0, 100);
        }

        const schema = this.getSchema(...SCHEMA_CODE.BRIGHTNESS)!;
        const { max } = schema.property as TuyaDeviceSchemaIntegerProperty;
        const status = this.getStatus(schema.code)!;
        const value = Math.floor(100 * (status.value as number) / max);
        return limit(value, 0, 100);
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Brightness set to: ${value}`);

        // Color mode, set brightness to hsv
        if (this.inColorMode()) {
          const { min, max } = (this.getSchema(...SCHEMA_CODE.COLOR)?.property as TuyaDeviceSchemaColorProperty).v;
          const colorSchema = this.getSchema(...SCHEMA_CODE.COLOR)!;
          const colorValue = this.getColorValue();
          colorValue.v = Math.floor(value as number * max / 100);
          colorValue.v = limit(colorValue.v, min, max);
          this.sendCommands([{ code: colorSchema.code, value: JSON.stringify(colorValue) }], true);
          return;
        }

        const brightSchema = this.getSchema(...SCHEMA_CODE.BRIGHTNESS)!;
        const { min, max } = brightSchema.property as TuyaDeviceSchemaIntegerProperty;
        let brightValue = Math.floor(value as number * max / 100);
        brightValue = limit(brightValue, min, max);
        this.sendCommands([{ code: brightSchema.code, value: brightValue }], true);
      });

  }

  configureColourTemperature() {
    const type = this.getAccessoryType();
    const props = { minValue: 140, maxValue: 500, minStep: 1 };

    const service = this.getLightService();
    service.getCharacteristic(this.Characteristic.ColorTemperature)
      .onGet(() => {
        if (type === LightAccessoryType.RGBC) {
          return 153;
        }

        const schema = this.getSchema(...SCHEMA_CODE.COLOR_TEMP)!;
        const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
        const status = this.getStatus(schema.code)!;
        const miredValue = Math.floor(1000000 / ((status.value as number - min) * (7142 - 2000) / (max - min) + 2000));
        return limit(miredValue, 140, 500);
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.ColorTemperature set to: ${value}`);

        const commands: TuyaDeviceStatus[] = [];
        const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
        if (mode) {
          commands.push({ code: mode.code, value: 'white' });
        }

        if (type !== LightAccessoryType.RGBC) {
          const schema = this.getSchema(...SCHEMA_CODE.COLOR_TEMP)!;
          const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
          const temp = Math.floor((1000000 / (value as number) - 2000) * (max - min) / (7142 - 2000) + min);
          commands.push({ code: schema.code, value: temp });
        }

        this.sendCommands(commands, true);
      })
      .setProps(props);

  }

  configureHue() {
    const service = this.getLightService();
    const colorSchema = this.getSchema(...SCHEMA_CODE.COLOR)!;
    const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).h;
    service.getCharacteristic(this.Characteristic.Hue)
      .onGet(() => {
        // White mode, return fixed Hue 0
        if (this.inWhiteMode()) {
          return 0;
        }

        const hue = Math.floor(360 * this.getColorValue().h / max);
        return limit(hue, 0, 360);
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Hue set to: ${value}`);
        const colorValue = this.getColorValue();
        colorValue.h = Math.floor(value as number * max / 360);
        colorValue.h = limit(colorValue.h, min, max);
        const commands: TuyaDeviceStatus[] = [{
          code: colorSchema.code,
          value: JSON.stringify(colorValue),
        }];

        const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
        if (mode) {
          commands.push({ code: mode.code, value: 'colour' });
        }

        this.sendCommands(commands, true);
      });
  }

  configureSaturation() {
    const service = this.getLightService();
    const colorSchema = this.getSchema(...SCHEMA_CODE.COLOR)!;
    const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).s;
    service.getCharacteristic(this.Characteristic.Saturation)
      .onGet(() => {
        // White mode, return fixed Saturation 0
        if (this.inWhiteMode()) {
          return 0;
        }

        const saturation = Math.floor(100 * this.getColorValue().s / max);
        return limit(saturation, 0, 100);
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Saturation set to: ${value}`);
        const colorValue = this.getColorValue();
        colorValue.s = Math.floor(value as number * max / 100);
        colorValue.s = limit(colorValue.s, min, max);
        const commands: TuyaDeviceStatus[] = [{
          code: colorSchema.code,
          value: JSON.stringify(colorValue),
        }];

        const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
        if (mode) {
          commands.push({ code: mode.code, value: 'colour' });
        }

        this.sendCommands(commands, true);
      });
  }

}
