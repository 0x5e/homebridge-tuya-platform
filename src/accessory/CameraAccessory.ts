import { TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { limit, remap } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureMotionDetected } from './characteristic/MotionDetected';
import { configureOn } from './characteristic/On';
import { configureProgrammableSwitchEvent, onProgrammableSwitchEvent } from './characteristic/ProgrammableSwitchEvent';

const SCHEMA_CODE = {
  MOTION_ON: ['motion_switch'],
  MOTION_DETECT: ['movement_detect_pic'],
  DOORBELL: ['doorbell_ring_exist', 'doorbell_pic'],
  LIGHT_ON: ['floodlight_switch'],
  LIGHT_BRIGHTNESS: ['floodlight_lightness'],
};

export default class MotionSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [];
  }

  configureServices() {
    this.configureFloodLight();
    this.configureMotion();
    this.configureDoorbell();
  }

  configureFloodLight() {
    const onSchema = this.getSchema(...SCHEMA_CODE.LIGHT_ON);
    if (!onSchema) {
      return;
    }

    const service = this.getLightService();

    configureOn(this, service, onSchema);

    const brightnessSchema = this.getSchema(...SCHEMA_CODE.LIGHT_BRIGHTNESS);
    if (brightnessSchema) {
      const { min, max } = brightnessSchema.property as TuyaDeviceSchemaIntegerProperty;
      service.getCharacteristic(this.Characteristic.Brightness)
        .onGet(() => {
          const status = this.getStatus(brightnessSchema.code)!;
          let value = status.value as number;
          value = remap(value, 0, max, 0, 100);
          value = Math.round(value);
          value = limit(value, min, max);
          return value;
        })
        .onSet(value => {
          this.log.debug(`Characteristic.Brightness set to: ${value}`);
          let brightValue = value as number;
          brightValue = remap(brightValue, 0, 100, 0, max);
          brightValue = Math.round(brightValue);
          brightValue = limit(brightValue, min, max);
          this.sendCommands([{ code: brightnessSchema.code, value: brightValue }], true);
        });
    }
  }

  configureMotion() {
    const onSchema = this.getSchema(...SCHEMA_CODE.MOTION_ON);
    if (onSchema) {
      const onService = this.accessory.getService(onSchema.code)
        || this.accessory.addService(this.Service.Switch, onSchema.code, onSchema.code);

      configureOn(this, onService, onSchema);
    }

    configureMotionDetected(this, undefined, this.getSchema(...SCHEMA_CODE.MOTION_DETECT));
  }

  configureDoorbell() {
    const schema = this.getSchema(...SCHEMA_CODE.DOORBELL);
    if (!schema) {
      return;
    }

    configureProgrammableSwitchEvent(this, this.getDoorbellService(), schema);
  }

  getLightService() {
    return this.accessory.getService(this.Service.Lightbulb)
      || this.accessory.addService(this.Service.Lightbulb);
  }

  getDoorbellService() {
    return this.accessory.getService(this.Service.Doorbell)
      || this.accessory.addService(this.Service.Doorbell);
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    super.onDeviceStatusUpdate(status);

    const schema = this.getSchema(...SCHEMA_CODE.DOORBELL);
    if (!schema) {
      return;
    }

    const _status = status.find(_status => _status.code === schema.code);
    if (!_status) {
      return;
    }

    onProgrammableSwitchEvent(this, this.getDoorbellService(), _status);
  }

}
