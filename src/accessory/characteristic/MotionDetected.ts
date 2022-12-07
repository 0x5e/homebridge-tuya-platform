import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureMotionDetected(accessory: BaseAccessory, service?: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  if (!service) {
    service = accessory.accessory.getService(accessory.Service.MotionSensor)
      || accessory.accessory.addService(accessory.Service.MotionSensor);
  }

  service.getCharacteristic(accessory.Characteristic.MotionDetected)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      if (schema.type === TuyaDeviceSchemaType.Enum) { // pir
        return (status.value === 'pir');
      } else if (schema.type === TuyaDeviceSchemaType.Raw) { // camera
        const url = Buffer.from(status.value as string, 'base64').toString('binary');
        if (url.length > 0) {
          accessory.log.info('Motion event picture:', url);
          return true;
        }
      }
      return false;
    });
}
