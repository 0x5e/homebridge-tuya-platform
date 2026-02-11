import BaseAccessory from './BaseAccessory';
import { configureName } from './characteristic/Name';
import { configureOn } from './characteristic/On';

const SCHEMA_CODE = {
  SWITCH: ['switch'],
  AUTO_CLEAN: ['auto_clean'],
  MANUAL_CLEAN: ['manual_clean'],
  DEODORIZATION: ['deodorization'],
  UV: ['uv'],
  LIGHT: ['light'],
  STATUS: ['status'],
  CAT_WEIGHT: ['cat_weight'],
  EXCRETION_TIMES: ['excretion_times_day'],
  EXCRETION_TIME: ['excretion_time_day'],
  NOTIFICATION: ['notification'],
  FAULT: ['fault'],
};

export default class CatToiletAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.SWITCH];
  }

  configureServices() {
    // Main power switch
    configureOn(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SWITCH));
    configureName(this, this.mainService(), this.device.name);

    // Additional switches
    this.configureSwitch(SCHEMA_CODE.AUTO_CLEAN, 'Auto Clean');
    this.configureSwitch(SCHEMA_CODE.MANUAL_CLEAN, 'Manual Clean');
    this.configureSwitch(SCHEMA_CODE.DEODORIZATION, 'Deodorization');
    this.configureSwitch(SCHEMA_CODE.UV, 'UV Sterilization');

    // Mood light as Lightbulb
    this.configureLight();

    // Occupancy sensor for active status
    this.configureOccupancySensor();

    // Filter maintenance for garbage box full
    this.configureFilterMaintenance();

    // Fault handling
    this.configureFault();
  }

  mainService() {
    return this.accessory.getService(this.Service.Switch)
      || this.accessory.addService(this.Service.Switch, this.device.name, 'switch');
  }

  configureSwitch(schemaCodes: string[], name: string) {
    const schema = this.getSchema(...schemaCodes);
    if (!schema) {
      return;
    }

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.Service.Switch, name, schema.code);

    configureName(this, service, name);
    configureOn(this, service, schema);
  }

  configureLight() {
    const schema = this.getSchema(...SCHEMA_CODE.LIGHT);
    if (!schema) {
      return;
    }

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.Service.Lightbulb, 'Mood Light', schema.code);

    configureName(this, service, 'Mood Light');
    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        this.checkOnlineStatus();
        const status = this.getStatus(schema.code)!;
        return status.value as boolean;
      })
      .onSet(async value => {
        await this.sendCommands([{
          code: schema.code,
          value: value as boolean,
        }], true);
      });
  }

  configureOccupancySensor() {
    const schema = this.getSchema(...SCHEMA_CODE.STATUS);
    if (!schema) {
      return;
    }

    const service = this.accessory.getService(this.Service.OccupancySensor)
      || this.accessory.addService(this.Service.OccupancySensor, 'Status', 'status');

    configureName(this, service, 'Status');

    const { OCCUPANCY_DETECTED, OCCUPANCY_NOT_DETECTED } = this.Characteristic.OccupancyDetected;
    service.getCharacteristic(this.Characteristic.OccupancyDetected)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const activeStates = ['cleaning', 'uv', 'deodorization'];
        return activeStates.includes(status.value as string)
          ? OCCUPANCY_DETECTED
          : OCCUPANCY_NOT_DETECTED;
      });
  }

  configureFilterMaintenance() {
    const schema = this.getSchema(...SCHEMA_CODE.NOTIFICATION);
    if (!schema) {
      return;
    }

    const service = this.accessory.getService(this.Service.FilterMaintenance)
      || this.accessory.addService(this.Service.FilterMaintenance, 'Waste Box', 'notification');

    configureName(this, service, 'Waste Box');

    const { CHANGE_FILTER, FILTER_OK } = this.Characteristic.FilterChangeIndication;
    service.getCharacteristic(this.Characteristic.FilterChangeIndication)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        // Bit 0 = garbage_box_full
        const value = status.value as number;
        return (value & 1) ? CHANGE_FILTER : FILTER_OK;
      });
  }

  configureFault() {
    const schema = this.getSchema(...SCHEMA_CODE.FAULT);
    if (!schema) {
      return;
    }

    // Add fault status to main service
    this.mainService().getCharacteristic(this.Characteristic.StatusFault)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const { GENERAL_FAULT, NO_FAULT } = this.Characteristic.StatusFault;
        return (status.value as number) > 0 ? GENERAL_FAULT : NO_FAULT;
      });
  }
}
