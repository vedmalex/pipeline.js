import { WrapConfig } from './WrapConfig'
import { StageBuilder } from '../../stage'

export class WrapBuilder<R, T, C extends WrapConfig<R, T>> extends StageBuilder<R, C> {
  constructor() {
    super()
  }
}
