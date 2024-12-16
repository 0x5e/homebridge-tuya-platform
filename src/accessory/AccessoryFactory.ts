import { PlatformAccessory } from 'homebridge';
import TuyaDevice from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';

import BaseAccessory from './BaseAccessory';
import LightAccessory from './LightAccessory';
import DimmerAccessory from './DimmerAccessory';
import OutletAccessory from './OutletAccessory';
import SwitchAccessory from './SwitchAccessory';
import WirelessSwitchAccessory from './WirelessSwitchAccessory';
import SceneSwitchAccessory from './SceneSwitchAccessory';
import FanAccessory from './FanAccessory';
import GarageDoorAccessory from './GarageDoorAccessory';
import WindowAccessory from './WindowAccessory';
import WindowCoveringAccessory from './WindowCoveringAccessory';
import LockAccessory from './LockAccessory';
import ThermostatAccessory from './ThermostatAccessory';
import HeaterAccessory from './HeaterAccessory';
import ValveAccessory from './ValveAccessory';
import ContactSensorAccessory from './ContactSensorAccessory';
import LeakSensorAccessory from './LeakSensorAccessory';
import CarbonMonoxideSensorAccessory from './CarbonMonoxideSensorAccessory';
import CarbonDioxideSensorAccessory from './CarbonDioxideSensorAccessory';
import SmokeSensorAccessory from './SmokeSensorAccessory';
import TemperatureHumiditySensorAccessory from './TemperatureHumiditySensorAccessory';
import LightSensorAccessory from './LightSensorAccessory';
import MotionSensorAccessory from './MotionSensorAccessory';
import AirQualitySensorAccessory from './AirQualitySensorAccessory';
import HumanPresenceSensorAccessory from './HumanPresenceSensorAccessory';
import HumidifierAccessory from './HumidifierAccessory';
import DehumidifierAccessory from './DehumidifierAccessory';
import DiffuserAccessory from './DiffuserAccessory';
import AirPurifierAccessory from './AirPurifierAccessory';
import ExtractionHoodAccessory from './ExtractionHoodAccessory';
import CameraAccessory from './CameraAccessory';
import SceneAccessory from './SceneAccessory';
import AirConditionerAccessory from './AirConditionerAccessory';
import IRControlHubAccessory from './IRControlHubAccessory';
import IRGenericAccessory from './IRGenericAccessory';
import IRAirConditionerAccessory from './IRAirConditionerAccessory';
import SecuritySystemAccessory from './SecuritySystemAccessory';
import VibrationSensorAccessory from './VibrationSensorAccessory';
import WeatherStationAccessory from './WeatherStationAccessory';
import DoorbellAccessory from './DoorbellAccessory';
import PetFeederAccessory from './PetFeederAccessory';
import WhiteNoiseLightAccessory from './WhiteNoiseLightAccessory';


export default class AccessoryFactory {
  static createAccessory(
    platform: TuyaPlatform,
    accessory: PlatformAccessory,
    device: TuyaDevice,
  ): BaseAccessory[] {

    let handlers : BaseAccessory[] = [];
    switch (device.category) {

      // Lighting
      case 'dj':
      case 'dsd':
      case 'xdd':
      case 'fwd':
      case 'dc':
      case 'dd':
      case 'gyd':
      case 'tyndj':
      case 'sxd':
        handlers = [new LightAccessory(platform, accessory)];
        break;
      case 'tgq':
      case 'tgkg':
        handlers = [new DimmerAccessory(platform, accessory)];
        break;

      // Electrical Products
      case 'dlq':
      case 'kg':
      case 'tdq':
      case 'qjdcz':
      case 'szjqr':
        handlers = [new SwitchAccessory(platform, accessory)];
        break;
      case 'cz':
      case 'pc':
      case 'wkcz':
        handlers = [new OutletAccessory(platform, accessory)];
        break;
      case 'wxkg':
        handlers = [new WirelessSwitchAccessory(platform, accessory)];
        break;
      case 'cjkg':
        handlers = [new SceneSwitchAccessory(platform, accessory)];
        break;
      case 'bzyd':
        handler = new WhiteNoiseLightAccessory(platform, accessory);
        break;

      // Large Home Appliances
      case 'kt':
      case 'ktkzq':
        handlers = [new AirConditionerAccessory(platform, accessory)];
        break;

      // Small Home Appliances
      case 'qn':
        handlers = [new HeaterAccessory(platform, accessory)];
        break;
      case 'kj':
        handlers = [new AirPurifierAccessory(platform, accessory)];
        break;
      case 'xxj':
        handlers = [new DiffuserAccessory(platform, accessory)];
        break;
      case 'ckmkzq':
        handlers = [new GarageDoorAccessory(platform, accessory)];
        break;
      case 'cl':
        handlers = [
          new WindowCoveringAccessory(platform, accessory)];
        break;
      case 'clkg':
        handlers = [
          new WindowCoveringAccessory(platform, accessory),
          new LightAccessory(platform, accessory),
        ];
        break;
      case 'cwwsq':
        handler = new PetFeederAccessory(platform, accessory);
        break;
      case 'mc':
        handlers = [new WindowAccessory(platform, accessory)];
        break;
      case 'wk':
      case 'wkf':
        handlers = [new ThermostatAccessory(platform, accessory)];
        break;
      case 'ggq':
      case 'sfkzq':
        handlers = [new ValveAccessory(platform, accessory)];
        break;
      case 'jsq':
        handlers = [new HumidifierAccessory(platform, accessory)];
        break;
      case 'cs':
        handlers = [new DehumidifierAccessory(platform, accessory)];
        break;
      case 'fs':
      case 'fsd':
      case 'fskg':
        handlers = [new FanAccessory(platform, accessory)];
        break;
      case 'yyj':
        handler = new ExtractionHoodAccessory(platform, accessory);
        break;

      // Security & Video Surveillance
      case 'sp':
        handlers = [new CameraAccessory(platform, accessory)];
        break;
      case 'ywbj':
        handlers = [new SmokeSensorAccessory(platform, accessory)];
        break;
      case 'mcs':
        handlers = [new ContactSensorAccessory(platform, accessory)];
        break;
      case 'zd':
        handlers = [new VibrationSensorAccessory(platform, accessory)];
        break;
      case 'rqbj':
      case 'jwbj':
      case 'sj':
        handlers = [new LeakSensorAccessory(platform, accessory)];
        break;
      case 'cobj':
      case 'cocgq':
        handlers = [new CarbonMonoxideSensorAccessory(platform, accessory)];
        break;
      case 'co2bj':
      case 'co2cgq':
        handlers = [new CarbonDioxideSensorAccessory(platform, accessory)];
        break;
      case 'wsdcg':
        handlers = [new TemperatureHumiditySensorAccessory(platform, accessory)];
        break;
      case 'ldcg':
        handlers = [new LightSensorAccessory(platform, accessory)];
        break;
      case 'pir':
        handlers = [new MotionSensorAccessory(platform, accessory)];
        break;
      case 'pm25':
      case 'pm2.5':
      case 'pm25cgq':
      case 'hjjcy':
        handlers = [new AirQualitySensorAccessory(platform, accessory)];
        break;
      case 'hps':
        handlers = [new HumanPresenceSensorAccessory(platform, accessory)];
        break;
      case 'ms':
      case 'jtmspro':
        handlers = [new LockAccessory(platform, accessory)];
        break;
      case 'mal':
        handlers = [new SecuritySystemAccessory(platform, accessory)];
        break;
      case 'wxml':
        handlers = [new DoorbellAccessory(platform, accessory)];
        break;
      case 'qxj':
        handler = new WeatherStationAccessory(platform, accessory);
        break;

      // Other
      case 'scene':
        handlers = [new SceneAccessory(platform, accessory)];
        break;
    }

    // IR Control Hub
    if (device.isIRControlHub()) {
      handlers = [new IRControlHubAccessory(platform, accessory)];
    }

    // IR Remote Control
    if (device.isIRRemoteControl()) {
      switch (device.remote_keys?.category_id) {
        case 5: // AC
          handlers = [new IRAirConditionerAccessory(platform, accessory)];
          break;
        default:
          handlers = [new IRGenericAccessory(platform, accessory)];
          break;
      }
    }
    for (let handler of handlers){
      if (!handler.checkRequirements()) {
        platform.log.warn(`Unsupported device: ${device.name}.`);
        handler = new BaseAccessory(platform, accessory);
        handlers.push(handler);
      }

      handler.configureServices();
      handler.configureStatusActive();
      handler.updateAllValues();
      handler.intialized = true;
    }

    return handlers;
  }
}
