import { UnsetMarker } from '../../stage/types'
import { Wrap } from '../../stages/wrap'
import { WrapConfig } from '../../stages/wrap/WrapConfig'
import { BuilderDef, WrapBuilder, WrapDef } from '../types'

export function wrap<TConfig extends WrapConfig<any, any, any, any>>(
  _def: Partial<WrapDef<TConfig>> = {},
): WrapBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _run: UnsetMarker
  _stage: UnsetMarker
  _usage: {
    _build: 1
  }
  _wrapee_input: UnsetMarker
  _wrapee_output: UnsetMarker
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input
      return wrap({
        ..._def,
        inputs: input,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.output = output
      return wrap({
        ..._def,
        outputs: output,
      }) as any
    },
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return wrap({
        ..._def,
        stage: stage,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Wrap(_def.cfg) as any
    },
    prepare(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.prepare = fn as any
      return wrap({
        ..._def,
        prepare: fn as any,
      }) as any
    },
    finalize(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.finalize = fn as any
      return wrap({
        ..._def,
        finalize: fn as any,
      }) as any
    },
  }
}
