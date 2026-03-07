import { Stage } from './stage'
import { createLinkedAbortController, getExecutionSignal } from './execution_signal'
import { empty_run } from './utils/empty_run'
import { CleanError, createCodeError, createError } from './utils/ErrorList'
import { ErrorCode } from './utils/errors'
import { run_or_execute } from './utils/run_or_execute'
import {
  AllowedStage,
  CallbackFunction,
  getParallelConfig,
  ParallelJoinMode,
  ParallelConfig,
  ParallelTrailingMode,
  Possible,
  StageObject,
  StageRun,
} from './utils/types'

/**
 * Process staging in parallel way
 * ### config as _Object_
 *
 * - `stage`
 * 		evaluating stage
 * - `split`
 * 		function that split existing stage into smalls parts, it needed
 * - `combine`
 * 		if any result combining is need, this can be used to combine splited parts and update context
 *
 * > **Note**
 * 		`split` does not require `combine` it will return parent context;
 * 		in cases that have no declaration for `split` configured or default will be used
 *
 * @param {Object} config configuration object
 */
export class Parallel<
  T extends StageObject,
  R extends StageObject,
> extends Stage<T, ParallelConfig<T, R>> {
  constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>) {
    super()
    if (config) {
      this._config = getParallelConfig<T, R>(config)
    }
  }

  split(ctx: T): Array<R> {
    return this._config.split ? this._config.split(ctx) : [ctx]
  }

  combine(
    ctx: T,
    children: Array<R>,
  ): T {
    let res: T
    if (this.config.combine) {
      let c = this.config.combine(ctx, children)
      res = c ?? ctx
    } else {
      res = ctx
    }
    return res
  }

  public override get reportName() {
    return `PLL:${this.config.name ? this.config.name : ''}`
  }
  public override toString() {
    return '[pipeline Pipeline]'
  }

  public override get name(): string {
    return this._config.name ?? this._config.stage?.name ?? ''
  }

  get concurrency(): number | undefined {
    return normalizeParallelConcurrency(this._config.concurrency)
  }

  get join(): ParallelJoinMode {
    return normalizeParallelJoin(this._config.join)
  }

  get quorum(): number | undefined {
    return normalizeParallelQuorum(this._config.quorum)
  }

  get trailing(): ParallelTrailingMode {
    return normalizeParallelTrailing(this.join, this._config.trailing)
  }

  get trailingTimeout(): number | undefined {
    return normalizeParallelTrailingTimeout(this._config.trailingTimeout)
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    if (this.config.stage) {
      const run: StageRun<T> = (
        initialErr: Possible<CleanError>,
        initialCtx: T,
        done: CallbackFunction<T>,
      ) => {
        const children = this.split(initialCtx)
        const len = children ? children.length : 0

        if (len === 0) {
          return done(initialErr, initialCtx)
        }

        try {
          const errors: Error[] = []
          const controllers = new Array<AbortController | null>(children.length).fill(null)
          const successfulChildren = new Array<R | undefined>(children.length)
          const join = this.join
          const trailing = this.trailing
          const trailingTimeout = this.trailingTimeout
          const concurrency = Math.min(this.concurrency ?? children.length, children.length)
          const successTarget = resolveParallelSuccessTarget(join, this.quorum, children.length)
          let nextIndex = 0
          let active = 0
          let pending = children.length
          let successCount = 0
          let thresholdMet = false
          let settled = false
          let drainTimer: ReturnType<typeof setTimeout> | null = null

          const clearDrainTimer = () => {
            if (drainTimer) {
              clearTimeout(drainTimer)
              drainTimer = null
            }
          }

          const abortActiveChildren = () => {
            for (let i = 0; i < controllers.length; i++) {
              const controller = controllers[i]
              if (controller && !controller.signal.aborted) {
                controller.abort(createCodeError(ErrorCode.ERR_STAGE_ABORTED))
              }
              controllers[i] = null
            }
          }

          const finishSuccess = (resultChildren: Array<R>) => {
            if (settled) {
              return
            }

            settled = true
            clearDrainTimer()

            if (join !== 'all') {
              abortActiveChildren()
            }

            try {
              done(undefined, this.combine(initialCtx, resultChildren))
            } catch (err) {
              done(err as CleanError, initialCtx)
            }
          }

          const finishError = () => {
            if (settled) {
              return
            }

            settled = true
            clearDrainTimer()
            done(createError(errors), initialCtx)
          }

          const collectSuccessfulChildren = () =>
            successfulChildren.filter((child): child is R => child !== undefined)

          const startDrainTimer = () => {
            if (
              settled ||
              drainTimer ||
              trailing !== 'drain-active' ||
              trailingTimeout === undefined
            ) {
              return
            }

            drainTimer = setTimeout(() => {
              drainTimer = null
              finishSuccess(join === 'all' ? children : collectSuccessfulChildren())
            }, trailingTimeout)
          }

          const onChildSettled = (
            index: number,
            child: R,
            err: Possible<CleanError>,
            retCtx?: Possible<R>,
          ) => {
            controllers[index] = null

            if (settled) {
              return
            }

            active -= 1
            pending -= 1

            if (err) {
              errors.push(new Error('parallel - error', {
                cause: {
                  stage: this.name,
                  index,
                  err,
                  ctx: child,
                },
              }))
            } else {
              children[index] = (retCtx ?? child) as R

              if (successfulChildren[index] === undefined) {
                successfulChildren[index] = children[index]
                successCount += 1
              }

              if (successCount >= successTarget) {
                thresholdMet = true

                if (trailing === 'ignore') {
                  finishSuccess(join === 'all' ? children : collectSuccessfulChildren())
                  return
                }

                startDrainTimer()

                if (active === 0) {
                  finishSuccess(join === 'all' ? children : collectSuccessfulChildren())
                  return
                }

                return
              }
            }

            if (thresholdMet && trailing === 'drain-active') {
              if (active === 0) {
                finishSuccess(join === 'all' ? children : collectSuccessfulChildren())
              }
              return
            }

            if (pending === 0) {
              if (successCount < successTarget) {
                finishError()
              } else {
                finishSuccess(join === 'all' ? children : collectSuccessfulChildren())
              }
              return
            }

            drain()
          }

          const launchChild = (index: number) => {
            const child = children[index]
            const linkedController = createLinkedAbortController(getExecutionSignal(initialCtx))
            const controller = linkedController.controller
            let sync = true
            let settledSync = false
            let syncErr: Possible<CleanError>
            let syncCtx: Possible<R>

            active += 1
            controllers[index] = controller

            run_or_execute(
              this.config.stage,
              initialErr,
              child,
              (err: Possible<CleanError>, retCtx?: Possible<R>) => {
                linkedController.cleanup()
                if (sync) {
                  settledSync = true
                  syncErr = err
                  syncCtx = retCtx
                  return
                }

                onChildSettled(index, child, err, retCtx)
              },
              controller.signal,
            )

            sync = false

            if (settledSync) {
              onChildSettled(index, child, syncErr, syncCtx)
            }
          }

          const drain = () => {
            while (
              !settled &&
              !(thresholdMet && trailing === 'drain-active') &&
              active < concurrency &&
              nextIndex < children.length
            ) {
              const index = nextIndex
              nextIndex += 1
              launchChild(index)
            }
          }

          drain()
        } catch (err) {
          done(err as CleanError, initialCtx)
        }
      }
      this.run = run
    } else {
      this.run = empty_run
    }

    return super.compile()
  }
}

export type ParallelErrorInput = {
  stage?: string
  index: number
  err: Error
  ctx: any
}

export class ParallelError<T> extends Error {
  override name: string
  stage?: string
  index: number
  err: Error
  ctx: T
  constructor(init: ParallelErrorInput) {
    super(init.err.message)
    this.name = 'ParallerStageError'
    this.stage = init.stage
    this.ctx = init.ctx
    this.err = init.err
    this.index = init.index
  }
  override toString() {
    return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err.message}
    stack is: ${this.err.stack}`
  }
}

export function normalizeParallelConcurrency(
  concurrency?: number,
): number | undefined {
  if (typeof concurrency !== 'number' || !Number.isFinite(concurrency)) {
    return undefined
  }

  return Math.max(1, Math.floor(concurrency))
}

export function normalizeParallelJoin(
  join?: ParallelJoinMode,
): ParallelJoinMode {
  return join === 'any' || join === 'quorum' ? join : 'all'
}

export function normalizeParallelQuorum(
  quorum?: number,
): number | undefined {
  if (typeof quorum !== 'number' || !Number.isFinite(quorum)) {
    return undefined
  }

  return Math.max(1, Math.floor(quorum))
}

export function normalizeParallelTrailing(
  join: ParallelJoinMode,
  trailing?: ParallelTrailingMode,
): ParallelTrailingMode {
  if (join === 'all') {
    return 'ignore'
  }

  return trailing === 'drain-active' ? 'drain-active' : 'ignore'
}

export function normalizeParallelTrailingTimeout(
  trailingTimeout?: number,
): number | undefined {
  if (typeof trailingTimeout !== 'number' || !Number.isFinite(trailingTimeout)) {
    return undefined
  }

  return trailingTimeout > 0 ? trailingTimeout : undefined
}

export function resolveParallelSuccessTarget(
  join: ParallelJoinMode,
  quorum: number | undefined,
  childCount: number,
) {
  if (join === 'any') {
    return 1
  }

  if (join === 'quorum') {
    return Math.min(quorum ?? childCount, childCount)
  }

  return childCount
}
