import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class HumidifierAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureActive();
    this.configureTargetState();
    this.configureCurrentState();
    this.configureCurrentRelativeHumidity();
    this.configureRelativeHumidityHumidifierThreshold();
    this.configureTemperatureSensor();
  }

  mainService() {
    return this.accessory.getService(this.Service.HumidifierDehumidifier)
      || this.accessory.addService(this.Service.HumidifierDehumidifier);
  }

  configureActive(){
    const { ACTIVE, INACTIVE } = this.Characteristic.Active;
    this.mainService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getStatus('switch');
        return (status?.value as boolean) ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        this.sendCommands([{ code: 'switch', value: (value === ACTIVE) ? true : false }]);
      });
  }

  configureTargetState(){
    const { HUMIDIFIER} = this.Characteristic.TargetHumidifierDehumidifierState;
    const validValues = [ HUMIDIFIER ];

    this.mainService().getCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState)
      .onGet(() => {
        return HUMIDIFIER;
      }).setProps({ validValues });
  }

  configureCurrentState(){
    const { INACTIVE, HUMIDIFYING } = this.Characteristic.CurrentHumidifierDehumidifierState;

    this.mainService().getCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState)
      .onGet(() => {
        const status = this.getStatus('switch');
        return (status?.value as boolean) ? HUMIDIFYING : INACTIVE;
      });
  }

  configureCurrentRelativeHumidity(){
    this.mainService().getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
      .onGet(() => {
        const status = this.getStatus('humidity_current');
        const humidity = Math.min(100, Math.max(0, status?.value as number));
        return humidity;
      });
  }

  configureRelativeHumidityHumidifierThreshold(){
    const schema = this.getSchema('humidity_set');
    const s = JSON.parse(schema?.values as string);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.RelativeHumidityHumidifierThreshold)
      .onGet(() => {
        const status = this.getStatus('humidity_set');
        let humidity_set = Math.max(0, status?.value as number);
        humidity_set = Math.min(100, humidity_set);
        return humidity_set;
      })
      .onSet(value => {
        let humidity_set = Math.max(s['min'], value as number);
        humidity_set = Math.min(s['max'], humidity_set);
        this.sendCommands([{ code: 'humidity_set', value: humidity_set }]);
        // also set spray mode to humidity
        this.setSprayModeToHumidity();
      }).setProps({ minStep: s['step']});
  }

  configureTemperatureSensor() {
    const service = this.accessory.getService(this.Service.TemperatureSensor)
      || this.accessory.addService(this.Service.TemperatureSensor);

    service.getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const status = this.getStatus('temp_current');
        let temperature = Math.max(-270, status!.value as number);
        temperature = Math.min(100, temperature);
        return temperature;
      });

  }

  setSprayModeToHumidity(){
    this.sendCommands([{ code: 'spray_mode', value: 'humidity' }]);
  }

}
