import { TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureTempDisplayUnits } from './characteristic/TemperatureDisplayUnits';
import { configureLight } from './characteristic/Light';


const SCHEMA_CODE = {
  ON: ['powerswitch'],
  CURRENT_TEMP: ['currtemp', 'settemp'],
  TARGET_TEMP: ['settemp'],
  TEMP_UNIT_CONVERT: ['temp_unit_convert', 'c_f'],
  LIGHT: ['lightswitch'],
  LED: ['ledswitch'],
  // TIMER: ['settime'], // Not currently supppored by homekit
};

export default class SaunaAccessory extends BaseAccessory {


  requiredSchema() {
    return [SCHEMA_CODE.CURRENT_TEMP, SCHEMA_CODE.TARGET_TEMP];
  }

  configureServices() {
    this.configureCurrentState();
    this.configureTargetState();
    configureCurrentTemperature(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    this.configureTargetTemp();
    configureTempDisplayUnits(this, this.mainService(), this.getSchema(...SCHEMA_CODE.TEMP_UNIT_CONVERT));
    this.configureLight();


  }

  mainService() {
    return this.accessory.getService(this.Service.Thermostat)
      || this.accessory.addService(this.Service.Thermostat);
  }

  configureCurrentState() {

    const { OFF, HEAT } = this.Characteristic.CurrentHeatingCoolingState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => {
        const on = this.getStatus('powerswitch');
        if (on && on.value === false) {
          return OFF;
        } else {
          return HEAT;
        }
      });
  }



  configureTargetState() {
    const { OFF, HEAT } = this.Characteristic.TargetHeatingCoolingState;

    this.mainService().getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .onGet(() => {
        const on = this.getStatus('powerswitch');
        if (on && on.value === false) {
          return OFF;
        } else {
          return HEAT;
        }
      })

      .onSet(async value => {
        const commands: TuyaDeviceStatus[] = [];

        if (value === OFF) {
          commands.push({
            code: 'powerswitch',
            value: false,
          });
        } else if (value === HEAT) {
          commands.push({
            code: 'powerswitch',
            value: true,
          });
        }

        if (commands.length !== 0) {
          await this.sendCommands(commands);
        }
      })
      .setProps({ validValues: [OFF, HEAT] });

  }


  configureTargetTemp() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
    if (!schema) {
      this.log.warn('TargetTemperature not supported.');
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    let multiple = Math.pow(10, property.scale);
    let props = {
      minValue: Math.max(30, property.min / multiple),
      maxValue: Math.min(90, property.max / multiple),
      minStep: Math.max(0.1, property.step / multiple),
    };
    if (props.maxValue <= props.minValue) {
      this.log.warn('Invalid schema: %o, props will be reset to the default value.', schema);
      multiple = 1;
      props = { minValue: 30, maxValue: 90, minStep: 1 };
    }
    this.log.debug('Set props for TargetTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.TargetTemperature)

      .onGet(() => {
        const status = this.getStatus(schema.code);
        if (!status || typeof status.value !== 'number') {
          this.log.debug('No valid settemp available, returning default.');
          return props.minValue; // or any fallback value like 45
        }
        const temp = (status.value as number) / multiple;
        return limit(temp, props.minValue, props.maxValue);
      })

      .onSet(async value => {
        await this.sendCommands([{
          code: schema.code,
          value: value as number * multiple,
        }]);
      })
      .setProps(props);
  }

  configureLight() {

    const lightswitchSchema = this.getSchema('lightswitch');
    const ledswitchSchema = this.getSchema('ledswitch');

    const light1Service = this.accessory.getService('Sauna Main Light') ||
        this.accessory.addService(this.Service.Lightbulb, 'Sauna Main Light', 'lightswitch');

    const light2Service = this.accessory.getService('Sauna LED Light') ||
        this.accessory.addService(this.Service.Lightbulb, 'Sauna LED Light', 'ledswitch');

    if (lightswitchSchema) {
      configureLight(this, light1Service, lightswitchSchema);
    }

    if (ledswitchSchema) {
      configureLight(this, light2Service, ledswitchSchema);
    }
  }


}
