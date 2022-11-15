import { PlatformAccessory, Service } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class LightAccessory extends BaseAccessory {

  constructor(
    public readonly platform: TuyaPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    for (let index = 1; index <= 3; index++) {
      const schema = this.getBrightnessSchema(index);
      if (!schema) {
        continue;
      }

      const oldService = this.accessory.getService(this.Service.Lightbulb);
      if (oldService && oldService?.subtype === undefined) {
        // todo remove old service
        platform.log.warn('Remove old service:', oldService.UUID);
        this.accessory.removeService(oldService);
      }

      const service = this.accessory.getService(schema.code)
        || this.accessory.addService(this.Service.Lightbulb, schema.code, schema.code);
      this.configureOn(service, index);
      this.configureBrightness(service, index);
    }
  }

  getOnSchema(index: number) {
    return this.getSchema(`switch_led_${index}`);
  }

  getBrightnessSchema(index: number) {
    return this.getSchema(`bright_value_${index}`);
  }


  configureOn(service: Service, index: number) {
    const schema = this.getOnSchema(index);
    if (!schema) {
      return;
    }

    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as boolean;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.On set to: ${value}`);
        this.sendCommands([{ code: schema.code, value: value as boolean }], true);
      });
  }

  configureBrightness(service: Service, index: number) {
    const schema = this.getBrightnessSchema(index);
    if (!schema) {
      return;
    }

    const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
    const range = max; // not max - min

    service.getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let value = Math.floor(100 * (status.value as number) / range);
        value = Math.max(0, value);
        value = Math.min(100, value);
        return value;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Brightness set to: ${value}`);
        let brightValue = Math.floor(value as number * range / 100);

        // TODO limit or remap?
        // const minStatus = this.getStatus(`brightness_min_${index}`);
        // const maxStatus = this.getStatus(`brightness_max_${index}`);
        // if (minStatus && maxStatus) {
        //   brightValue = Math.max((minStatus.value as number), brightValue);
        //   brightValue = Math.min((maxStatus.value as number), brightValue);
        // }

        brightValue = Math.max(min, brightValue);
        brightValue = Math.min(max, brightValue);
        this.sendCommands([{ code: schema.code, value: brightValue }], true);
      });

  }

}
