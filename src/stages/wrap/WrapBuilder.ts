import { WrapConfig } from './WrapConfig'
import { StageBuilder, StageObject } from '../../stage'

export class WrapBuilder<R extends StageObject, T extends StageObject, C extends WrapConfig<R, T>> extends StageBuilder<
  R,
  C
> {
  constructor() {
    super()
  }
}
