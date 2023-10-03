import { Stage } from '../../stage/stage';
import { StageConfig } from '../../stage/StageConfig';
import { UnsetMarker } from '../../stage/types';
import { BuilderDef, StageBuilder } from './../types';


export function stage<TConfig extends StageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {}
): StageBuilder<{
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
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      _def.cfg.input = input;
      return stage({
        ..._def,
        inputs: input,
      }) as any;
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      _def.cfg.output = output;
      return stage({
        ..._def,
        outputs: output,
      }) as any;
    },
    run(run) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      _def.cfg.run = run as any;
      return stage({
        ..._def,
      }) as any;
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      return new Stage(_def.cfg) as any;
    },
  };
}
