import { UnsetMarker } from '../../stage/types';
import { Rescue } from '../../stages/rescue';
import { RescueConfig } from '../../stages/rescue/RescueConfig';
import { RescueDef, RescueBuilder, BuilderDef } from './../types';


export function rescue<TConfig extends RescueConfig<any, any>>(
  _def: Partial<RescueDef<TConfig>> = {}
): RescueBuilder<{
  _type: UnsetMarker;
  _input: UnsetMarker;
  _output: UnsetMarker;
  _run: UnsetMarker;
  _stage: UnsetMarker;
  _usage: {
    _build: 1;
  };
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      _def.cfg.stage = stage;
      return rescue({
        ..._def,
        stage: stage,
      }) as any;
    },
    rescue(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      if (_def.cfg.stage) {
        _def.cfg.input = _def.cfg.stage.config.input;
        _def.cfg.output = _def.cfg.stage.config.output;
      } else {
        throw new Error('define stage before use of rescue');
      }
      _def.cfg.rescue = fn;
      return rescue({
        ..._def,
        rescue: fn as any,
      }) as any;
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig;
      }
      return new Rescue(_def.cfg) as any;
    },
  };
}
