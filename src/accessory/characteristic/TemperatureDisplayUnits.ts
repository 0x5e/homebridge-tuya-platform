import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureTempDisplayUnits(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const { CELSIUS, FAHRENHEIT } = accessory.Characteristic.TemperatureDisplayUnits;
  service.getCharacteristic(accessory.Characteristic.TemperatureDisplayUnits)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return (status.value === 'c') ? CELSIUS : FAHRENHEIT;
    })
    .onSet(value => {
      accessory.sendCommands([{
        code: schema.code,
        value: (value === CELSIUS) ? 'c':'f',
      }]);
    });
}
