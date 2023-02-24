import BaseAccessory from './BaseAccessory';
import { configureSecuritySystemCurrentState, onAlarmTriggered } from './characteristic/SecuritySystemCurrentState';
import { configureSecuritySystemTargetState } from './characteristic/SecuritySystemTargetState';
import { TuyaDeviceStatus } from '../device/TuyaDevice';

const SCHEMA_CODE = {
  MASTER_MODE: ['master_mode'],
  SOS_STATE: ['sos_state'],
};

export default class SecuritySystemAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.MASTER_MODE, SCHEMA_CODE.SOS_STATE];
  }

  configureServices() {
    const service = this.accessory.getService(this.Service.SecuritySystem)
      || this.accessory.addService(this.Service.SecuritySystem);

    configureSecuritySystemCurrentState(this, service, this.getSchema(...SCHEMA_CODE.MASTER_MODE),
      this.getSchema(...SCHEMA_CODE.SOS_STATE));
    configureSecuritySystemTargetState(this, service, this.getSchema(...SCHEMA_CODE.MASTER_MODE),
      this.getSchema(...SCHEMA_CODE.SOS_STATE));
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    const sosStateSchema = this.getSchema(...SCHEMA_CODE.SOS_STATE);
    const sosStateStatus = sosStateSchema && status.find(_status => _status.code === sosStateSchema.code);

    const service = this.accessory.getService(this.Service.SecuritySystem);

    if (service && sosStateStatus && sosStateStatus.value) {
      onAlarmTriggered(this, service, sosStateStatus);
    } else {
      super.onDeviceStatusUpdate(status);
    }
  }
}
