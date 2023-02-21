import { TuyaIRRemoteKeyListItem } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureName } from './characteristic/Name';

export default class IRGenericAccessory extends BaseAccessory {

  configureServices() {
    if (!this.device.remote_keys) {
      return;
    }

    // Max 100 accessories allowed
    if (this.device.remote_keys.key_list.length > 100) {
      this.log.warn(`Skipping ${this.device.remote_keys.key_list.length - 100} keys for ${this.device.name}, ` +
       'as we reached the limit of HomeKit (100 services per accessory)');
    }
    const limitedAccessories = this.device.remote_keys.key_list.slice(0, 99);
    for (const key of limitedAccessories) {
      this.configureSwitch(key);
    }
  }

  configureSwitch(key: TuyaIRRemoteKeyListItem) {
    const service = this.accessory.getService(key.key)
      || this.accessory.addService(this.Service.Switch, key.key, key.key);

    configureName(this, service, key.key_name);

    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => false)
      .onSet(value => {
        if (value === false) {
          return;
        }

        this.sendInfraredCommands(key);
        setTimeout(() => {
          service.getCharacteristic(this.Characteristic.On).updateValue(false);
        }, 150);

      });
  }

  async sendInfraredCommands(key: TuyaIRRemoteKeyListItem) {
    const { parent_id, id } = this.device;
    const { category_id, remote_index } = this.device.remote_keys;
    const res = await this.deviceManager.sendInfraredCommands(parent_id, id, category_id, remote_index, key.key, key.key_id);
    return res;
  }

}
