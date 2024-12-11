import BaseAccessory from './BaseAccessory';
import { configureOn } from './characteristic/On';
import { configureLight } from './characteristic/Light';

const SCHEMA_CODE = {
  LIGHT_ON: ['switch_led'],
  LIGHT_COLOR: ['colour_data'],
  MUSIC_ON: ['switch_music'],
};

export default class WhiteNoiseLightAccessory extends BaseAccessory {
  requiredSchema() {
    return [SCHEMA_CODE.LIGHT_ON, SCHEMA_CODE.MUSIC_ON];
  }

  configureServices() {
    // Light
    if (this.lightServiceType() === this.Service.Lightbulb) {
      configureLight(
        this,
        this.lightService(),
        this.getSchema(...SCHEMA_CODE.LIGHT_ON),
        undefined,
        undefined,
        this.lightColorSchema(),
        undefined,
      );
    } else if (this.lightServiceType() === this.Service.Switch) {
      configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.LIGHT_ON));
      const unusedService = this.accessory.getService(this.Service.Lightbulb);
      unusedService && this.accessory.removeService(unusedService);
    }

    // White Noise
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.MUSIC_ON));
  }

  lightColorSchema() {
    const colorSchema = this.getSchema(...SCHEMA_CODE.LIGHT_COLOR);
    if (!colorSchema) {
      return;
    }

    const { h, s, v } = (colorSchema.property || {}) as never;
    if (!h || !s || !v) {
      // Set sensible defaults for missing properties
      colorSchema.property = {
        h: { min: 0, scale: 0, unit: '', max: 360, step: 1 },
        s: { min: 0, scale: 0, unit: '', max: 1000, step: 1 },
        v: { min: 0, scale: 0, unit: '', max: 1000, step: 1 },
      };
    }

    return colorSchema;
  }

  lightServiceType() {
    if (this.lightColorSchema()) {
      return this.Service.Lightbulb;
    }
    return this.Service.Switch;
  }

  lightService() {
    return (
      this.accessory.getService(this.Service.Lightbulb) ||
      this.accessory.addService(this.Service.Lightbulb)
    );
  }
}
