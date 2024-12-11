import BaseAccessory from "./BaseAccessory";
import { configureOn } from "./characteristic/On";
import { configureLight } from "./characteristic/Light";

const SCHEMA_CODE = {
  MUSIC_ON: ["switch_music"],
  LIGHT_ON: ["switch_led"],
  LIGHT_COLOR: ["colour_data"],
};

export default class WhiteNoiseMachineAccessory extends BaseAccessory {
  requiredSchema() {
    return [SCHEMA_CODE.MUSIC_ON, SCHEMA_CODE.LIGHT_ON];
  }

  configureServices() {
    // Music / White Noise
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.MUSIC_ON));

    // Light
    if (this.lightServiceType() === this.Service.Lightbulb) {
      configureLight(
        this,
        this.lightService(),
        this.getSchema(...SCHEMA_CODE.LIGHT_ON),
        undefined,
        undefined,
        this.getSchema(...SCHEMA_CODE.LIGHT_COLOR),
        undefined
      );
    } else if (this.lightServiceType() === this.Service.Switch) {
      configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.LIGHT_ON));
      const unusedService = this.accessory.getService(this.Service.Lightbulb);
      unusedService && this.accessory.removeService(unusedService);
    }
  }

  lightServiceType() {
    if (this.getSchema(...SCHEMA_CODE.LIGHT_COLOR)) {
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
