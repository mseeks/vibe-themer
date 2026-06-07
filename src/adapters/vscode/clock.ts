import { type Clock, type Millis } from '../../ports';

export const systemClock: Clock = {
  now: (): Millis => Date.now() as Millis,
};
