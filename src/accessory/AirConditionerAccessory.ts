/* eslint-disable @typescript-eslint/no-unused-vars */
import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureLockPhysicalControls } from './characteristic/LockPhysicalControls';
import { configureRotationSpeedLevel } from './characteristic/RotationSpeed';
import { configureSwingMode } from './characteristic/SwingMode';
import { configureTempDisplayUnits } from './characteristic/TemperatureDisplayUnits';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  MODE: ['mode'],
  WORK_STATE: ['work_status', 'mode'],
  CURRENT_TEMP: ['temp_current'],
  TARGET_TEMP: ['temp_set'],
  CURRENT_HUMIDITY: ['humidity_current'],
  SPEED_LEVEL: ['fan_speed_enum', 'windspeed'],
  LOCK: ['lock'],
  SWING: ['switch_horizontal', 'switch_vertical'],
  TEMP_UNIT_CONVERT: ['temp_unit_convert', 'c_f'],
};

export default class AirConditionerAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE, SCHEMA_CODE.MODE, SCHEMA_CODE.WORK_STATE, SCHEMA_CODE.CURRENT_TEMP];
  }

  configureServices() {
    // Required Characteristics
    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureCurrentState();
    this.configureTargetState();
    configureCurrentTemperature(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));

    // Optional Characteristics
    configureLockPhysicalControls(this, this.mainService(), this.getSchema(...SCHEMA_CODE.LOCK));
    configureRotationSpeedLevel(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SPEED_LEVEL), ['auto']);
    configureSwingMode(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SWING));
    this.configureCoolingThreshouldTemp();
    this.configureHeatingThreshouldTemp();
    configureTempDisplayUnits(this, this.mainService(), this.getSchema(...SCHEMA_CODE.TEMP_UNIT_CONVERT));

    // Other
    configureCurrentRelativeHumidity(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
  }


  mainService() {
    return this.accessory.getService(this.Service.HeaterCooler)
      || this.accessory.addService(this.Service.HeaterCooler);
  }

  configureCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.WORK_STATE);
    if (!schema) {
      return;
    }

    const { INACTIVE, IDLE, HEATING, COOLING } = this.Characteristic.CurrentHeaterCoolerState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        if (status.value === 'heating') {
          return HEATING;
        } else if (status.value === 'cooling') {
          return COOLING;
        } else if (status.value === 'ventilation') {
          return IDLE;
        }
        return INACTIVE;
      });
  }

  configureTargetState() {
    const schema = this.getSchema(...SCHEMA_CODE.MODE);
    if (!schema) {
      return;
    }

    const { AUTO, HEAT, COOL } = this.Characteristic.TargetHeaterCoolerState;

    const validValues = [ AUTO ];
    const property = schema.property as TuyaDeviceSchemaEnumProperty;
    if (property.range.includes('hot')) {
      validValues.push(HEAT);
    }
    if (property.range.includes('cold')) {
      validValues.push(COOL);
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        if (status.value === 'hot') {
          return HEAT;
        } else if (status.value === 'cold') {
          return COOL;
        } else {
          return AUTO;
        }
      })
      .onSet(value => {

        let mode: string;
        if (value === HEAT) {
          mode = 'hot';
        } else if (value === COOL) {
          mode = 'cold';
        } else {
          mode = 'auto';
        }

        this.sendCommands([{ code: schema.code, value: mode }], true);
      })
      .setProps({ validValues });
  }

  configureCoolingThreshouldTemp() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = property ? Math.pow(10, property.scale) : 1;
    const props = {
      minValue: Math.max(10, property.min / multiple),
      maxValue: Math.min(35, property.max / multiple),
      minStep: Math.max(0.1, property.step / multiple),
    };
    this.log.debug('Set props for CoolingThresholdTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
      .onGet(() => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          return props.minValue;
        }

        const status = this.getStatus(schema.code)!;
        const temp = status.value as number / multiple;
        return limit(temp, props.minValue, props.maxValue);
      })
      .onSet(value => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
            .updateValue(props.minValue);
          return;
        }

        this.sendCommands([{ code: schema.code, value: (value as number) * multiple}], true);
      })
      .setProps(props);
  }

  configureHeatingThreshouldTemp() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = property ? Math.pow(10, property.scale) : 1;
    const props = {
      minValue: Math.max(0, property.min / multiple),
      maxValue: Math.min(25, property.max / multiple),
      minStep: Math.max(0.1, property.step / multiple),
    };
    this.log.debug('Set props for HeatingThresholdTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .onGet(() => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          return props.maxValue;
        }

        const status = this.getStatus(schema.code)!;
        const temp = status.value as number / multiple;
        return limit(temp, props.minValue, props.maxValue);
      })
      .onSet(value => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
            .updateValue(props.maxValue);
          return;
        }

        this.sendCommands([{ code: schema.code, value: (value as number) * multiple}], true);
      })
      .setProps(props);
  }

}
