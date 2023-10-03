import { BaseStageConfig } from '../../stage/StageConfig';
import { UnsetMarker } from '../../stage/types';
import { BuilderDef, Builder } from '../types';
import { rescue } from './rescue';
import { stage } from './stage';


export function builder<TConfig extends BaseStageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {}
): Builder<{
  _type: UnsetMarker;
  _input: UnsetMarker;
  _output: UnsetMarker;
  _usage: {
    output: 1;
    run: 1;
    build: 1;
  };
  _run: UnsetMarker;
  _stage: UnsetMarker;
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    type(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      /// сделать передачу типа
      _def.type = input;
      switch (true) {
        case input === 'stage':
          return stage(_def as any) as any;
        case input === 'rescue':
          return rescue(_def as any) as any;
        default:
          throw new Error('not implemented');
      }
    },
  };
}
