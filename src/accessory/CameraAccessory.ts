import BaseAccessory from './BaseAccessory';
import { configureOccupancyDetected } from './characteristic/OccupancyDetected';
import { configureMotionDetected } from './characteristic/MotionDetected';

const SCHEMA_CODE = {
  MOTION_DETECT: ['movement_detect_pic'],
  DOORBELL: ['doorbell_ring_exist'],
};

export default class MotionSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [];
  }

  configureServices() {
    configureMotionDetected(this, undefined, this.getSchema(...SCHEMA_CODE.MOTION_DETECT));
    configureOccupancyDetected(this, undefined, this.getSchema(...SCHEMA_CODE.DOORBELL));
  }

}
