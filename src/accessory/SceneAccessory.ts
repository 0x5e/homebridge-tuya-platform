import { PlatformAccessory } from 'homebridge';
import TuyaHomeDeviceManager from '../device/TuyaHomeDeviceManager';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class SceneAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.Switch)
      || this.accessory.addService(this.Service.Switch);

    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => false)
      .onSet(async (value) => {
        if (value === true) {
          const deviceManager = this.platform.deviceManager as TuyaHomeDeviceManager;
          const res = await deviceManager.executeScene(this.device.owner_id, this.device.id);
          if (res.success === false) {
            this.log.warn('[SceneAccessory] executeScene. homeId = %s, code = %s, msg = %s', this.device.owner_id, res.code, res.msg);
          }
          setTimeout(() => {
            service.getCharacteristic(this.Characteristic.On).updateValue(false);
          }, 150);
        }
      });
  }

}
