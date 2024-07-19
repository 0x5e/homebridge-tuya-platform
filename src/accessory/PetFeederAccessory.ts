import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { CharacteristicValue } from 'homebridge';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  LIGHT: ['light'],
  QUICK_FEED: ['quick_feed'],
  SLOW_FEED: ['slow_feed'],
  MANUAL_FEED: ['manual_feed'],
  MEAL_PLAN: ['meal_plan'],
  BATTERY_PERCENTAGE: ['battery_percentage'],
  FEED_REPORT: ['feed_report'],
  FEED_STATE: ['feed_state'],
};

export default class PetFeederAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE];
  }

  configureServices() {
    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureLight();
    this.configureQuickFeed();
    this.configureSlowFeed();
    this.configureManualFeed();
    this.configureMealPlan();
    this.configureBatteryPercentage();
    this.configureFeedReport();
    this.configureFeedState();
  }

  mainService() {
    return this.accessory.getService(this.Service.Switch)
      || this.accessory.addService(this.Service.Switch);
  }

  configureLight() {
    const schema = this.getSchema(...SCHEMA_CODE.LIGHT);
    if (!schema) {
      this.log.warn('Light is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        await this.sendCommands([{ code: schema.code, value: value as boolean }]);
      });
  }

  configureQuickFeed() {
    const schema = this.getSchema(...SCHEMA_CODE.QUICK_FEED);
    if (!schema) {
      this.log.warn('Quick feed is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        if (value as boolean) {
          await this.sendCommands([{ code: schema.code, value: true }]);
        }
      });
  }

  configureSlowFeed() {
    const schema = this.getSchema(...SCHEMA_CODE.SLOW_FEED);
    if (!schema) {
      this.log.warn('Slow feed is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        if (value as boolean) {
          await this.sendCommands([{ code: schema.code, value: true }]);
        }
      });
  }

  configureManualFeed() {
    const schema = this.getSchema(...SCHEMA_CODE.MANUAL_FEED);
    if (!schema) {
      this.log.warn('Manual feed is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        if (value as boolean) {
          await this.sendCommands([{ code: schema.code, value: 1 }]);
        }
      });
  }

  configureMealPlan() {
    const schema = this.getSchema(...SCHEMA_CODE.MEAL_PLAN);
    if (!schema) {
      this.log.warn('Meal plan is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        if (value as boolean) {
          await this.sendCommands([{ code: schema.code, value: value as boolean }]);
        }
      });
  }

  configureBatteryPercentage() {
    const schema = this.getSchema(...SCHEMA_CODE.BATTERY_PERCENTAGE);
    if (!schema) {
      this.log.warn('Battery percentage is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.BatteryLevel)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as number;
      });
  }

  configureFeedReport() {
    const schema = this.getSchema(...SCHEMA_CODE.FEED_REPORT);
    if (!schema) {
      this.log.warn('Feed report is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.StatusActive)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as number;
      });
  }

  configureFeedState() {
    const schema = this.getSchema(...SCHEMA_CODE.FEED_STATE);
    if (!schema) {
      this.log.warn('Feed state is not supported.');
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.StatusActive)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value === 'feeding';
      });
  }
}
