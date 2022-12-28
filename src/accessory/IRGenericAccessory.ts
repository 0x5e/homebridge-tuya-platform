import { TuyaDeviceSchema, TuyaDeviceSchemaMode, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureName } from './characteristic/Name';

export default class IRGenericAccessory extends BaseAccessory {

  requiredSchema() {
    return [];
  }

  configureServices() {
    for (const schema of this.device.schema) {
      if (schema.mode === TuyaDeviceSchemaMode.READ_ONLY) {
        continue;
      }

      if (schema.type === TuyaDeviceSchemaType.String) {
        this.configureSwitch(schema);
      } else {
        this.log.warn('Unsupported schema:', schema);
      }
    }
  }

  configureSwitch(schema: TuyaDeviceSchema) {
    const command: string = schema.property['value'];
    if (!command) {
      this.log.warn('Invalid schema:', schema);
      return;
    }

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.Service.Switch, schema.code, schema.code);

    configureName(this, service, schema.code);

    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => false)
      .onSet(value => {
        if (value === false) {
          return;
        }

        this.sendCommands([{ code: schema.code, value: command }]);
        setTimeout(() => {
          service.getCharacteristic(this.Characteristic.On).updateValue(false);
        }, 150);

      });
  }

}
