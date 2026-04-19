import SwitchAccessory from './SwitchAccessory';
import { Service } from 'homebridge';

export default class OutletAccessory extends SwitchAccessory {
  mainService(): typeof Service.Outlet {
    return this.Service.Outlet;
  }
}