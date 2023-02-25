import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceStatus } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

const TUYA_CODES = {
  MASTER_MODE: {
    ARMED: 'arm',
    DISARMED: 'disarmed',
    HOME: 'home',
  },
};

function getTuyaHomebridgeMap(accessory: BaseAccessory) {
  const tuyaHomebridgeMap = new Map();

  tuyaHomebridgeMap.set(TUYA_CODES.MASTER_MODE.ARMED, accessory.Characteristic.SecuritySystemCurrentState.AWAY_ARM);
  tuyaHomebridgeMap.set(TUYA_CODES.MASTER_MODE.DISARMED, accessory.Characteristic.SecuritySystemCurrentState.DISARMED);
  tuyaHomebridgeMap.set(TUYA_CODES.MASTER_MODE.HOME, accessory.Characteristic.SecuritySystemCurrentState.STAY_ARM);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.AWAY_ARM, TUYA_CODES.MASTER_MODE.ARMED);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.DISARMED, TUYA_CODES.MASTER_MODE.DISARMED);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.STAY_ARM, TUYA_CODES.MASTER_MODE.HOME);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.NIGHT_ARM, TUYA_CODES.MASTER_MODE.HOME);

  return tuyaHomebridgeMap;
}

export function configureSecuritySystemCurrentState(accessory: BaseAccessory, service: Service,
  masterModeSchema?: TuyaDeviceSchema, sosStateSchema?: TuyaDeviceSchema) {
  if (!masterModeSchema || !sosStateSchema) {
    return;
  }

  const tuyaHomebridgeMap = getTuyaHomebridgeMap(accessory);

  service.getCharacteristic(accessory.Characteristic.SecuritySystemCurrentState)
    .onGet(() => {
      const alarmTriggered = accessory.getStatus(sosStateSchema.code)!.value;

      return alarmTriggered ? accessory.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED :
        tuyaHomebridgeMap.get(accessory.getStatus(masterModeSchema.code)!.value);
    });
}
