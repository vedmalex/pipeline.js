import { defaultsDeep, get, set } from 'lodash'

import { StageObject } from './types'

export const ContextSymbol = Symbol('Context')
export const OriginalObject = Symbol('OriginalObject')
export const ProxySymbol = Symbol('Handler')
export interface ContextProxy<T> {
  fork<Config extends T>(config: Partial<Config>): ProxyType<T & Config>
  // addChild(child: object): unknown
  get(path: keyof T): any
  // addSubtree(lctx: object): unknown
  getParent(): ProxyType<T>
  getRoot(): ProxyType<T>
  setParent(parent: ProxyType<T>): void
  setRoot(parent: ProxyType<T>): void
  hasChild(ctx: object): boolean
  // hasSubtree(ctx: object): boolean
  toObject(clean?: boolean): T
  toJSON(): string
  toString(): string
  get original(): T
  [OriginalObject]?: true
  [key: string | symbol | number]: any
}

export type ProxyType<T> = ContextProxy<T> & T
export type ContextType<T> = T extends StageObject ? ProxyType<T> : T

var count = 0
var allContexts: Record<string, Context<any>> = {}

export enum RESERVATIONS {
  prop,
  func_this,
  func_ctx,
}

export const RESERVED = {
  getParent: RESERVATIONS.func_ctx,
  getRoot: RESERVATIONS.func_ctx,
  setParent: RESERVATIONS.func_ctx,
  setRoot: RESERVATIONS.func_ctx,
  toString: RESERVATIONS.func_ctx,
  original: RESERVATIONS.prop,
  __parent: RESERVATIONS.prop,
  __root: RESERVATIONS.prop,
  __stack: RESERVATIONS.prop,
  hasChild: RESERVATIONS.func_ctx,
  hasSubtree: RESERVATIONS.func_ctx,
  ensure: RESERVATIONS.func_ctx,
  addChild: RESERVATIONS.func_ctx,
  addSubtree: RESERVATIONS.func_ctx,
  toJSON: RESERVATIONS.func_ctx,
  toObject: RESERVATIONS.func_ctx,
  fork: RESERVATIONS.func_this,
  get: RESERVATIONS.func_this,
  allContexts: RESERVATIONS.func_this,
}
/**
 *  The **Context** itself
 *  @param {Object} config The object that is the source for the **Context**.
 */
export class Context<Input extends StageObject> implements ContextProxy<Input> {
  public static ensure<Input>(_config?: Input): ProxyType<Input> {
    if (Context.isProxy<Input>(_config)) {
      return _config
    } else {
      if (typeof _config === 'object' && _config !== null) {
        return this.create(_config)
      } else {
        return this.create()
      }
    }
  }

  public static create<Input>(input?: unknown): ProxyType<Input> {
    return new Context(input ?? {}) as unknown as ProxyType<Input>
  }

  public static isProxy<Input>(obj?: unknown): obj is ProxyType<Input> {
    return typeof obj == 'object' && obj !== null ? obj[ContextSymbol] : false
  }

  protected ctx: Input extends StageObject ? Input : never
  protected proxy: any
  protected __parent!: ProxyType<Input>
  protected __root!: ProxyType<Input>
  protected __stack?: string[]
  protected id: number;
  [OriginalObject]?: true
  get original() {
    return this.ctx
  }

  protected constructor(config: Input extends StageObject ? Input : never) {
    this.ctx = config
    this.id = count++
    allContexts[this.id] = this
    const res = new Proxy(this, {
      get(target: Context<Input>, key: string | symbol | number, _proxy: any): any {
        if (key == ContextSymbol) {
          return true
        }
        if (key == ProxySymbol) {
          return _proxy
        }
        if (key == 'allContexts') {
          return allContexts
        }

        if (!(key in RESERVED)) {
          if (key in target.ctx) {
            return target.ctx[key]
          } else {
            return target.__parent?.[key]
          }
        } else {
          if (RESERVED[key as keyof typeof RESERVED] == RESERVATIONS.func_ctx) {
            return target[key].bind(target)
          }
          if (RESERVED[key as keyof typeof RESERVED] == RESERVATIONS.func_this) {
            return target[key].bind(target)
          } else {
            return target[key] // just props
          }
        }
      },
      set(target: Context<Input>, key: keyof typeof RESERVED | string | symbol | number, value): boolean {
        if (!(key in RESERVED)) {
          target.ctx[key] = value
          return true
        } else if (
          typeof key == 'string'
          && key in RESERVED
          && RESERVED[key as keyof typeof RESERVED] != RESERVATIONS.prop
        ) {
          return false
        } else {
          target[key] = value
          return true
        }
      },
      deleteProperty(target: Context<Input>, key: string | symbol) {
        if (!(key in RESERVED)) {
          return delete target.ctx[key]
        } else {
          return false
        }
      },
      has(target: Context<Input>, key: string | symbol) {
        if (!(key in RESERVED)) {
          if (target.__parent) {
            return key in target.ctx || key in target.__parent
          } else {
            return key in target.ctx
          }
        } else {
          return false
        }
      },
      ownKeys(target: Context<Input>) {
        if (target.__parent) {
          return [...Reflect.ownKeys(target.ctx), ...Reflect.ownKeys(target.__parent)]
        } else {
          return Reflect.ownKeys(target.ctx)
        }
      },
    })

    this.proxy = res

    return res
  }

  /**
   * Makes fork of current context and add it to current as a child context
   * @api public
   * @param {Object|Context} [config] new properties that must exists in new fork
   * @retrun {Context}
   */
  fork<Child extends Input>(ctx?: Partial<Child>): ProxyType<Input & Child> {
    var child = Context.ensure<Child>(ctx as Child)
    this.addChild(child)
    return child as ProxyType<Input & Child>
  }

  protected addChild<Child extends Input>(child: ProxyType<Child>) {
    if (!this.hasChild(child)) {
      child.setParent(this.proxy)
    }
  }

  /**
   * Same but different as a fork. it make possible get piece of context as context;
   * @param path String path to context object that need to be a Context instance
   * @return {Context} | {Primitive type}
   */
  get(path: keyof Input): any {
    var root = get(this.ctx, path) as any
    if (root instanceof Object) {
      var result = root
      if (!Context.isProxy(result)) {
        var lctx = Context.ensure(result)
        this.addSubtree(lctx)
        set(this.original, path, lctx)
        result = lctx
      }
      return result
    } else {
      return root
    }
  }

  protected addSubtree(lctx: object): unknown {
    if (Context.isProxy<Input>(lctx)) {
      if (!this.hasSubtree(lctx)) {
        lctx.setRoot(this.proxy)
      }
      return lctx
    } else {
      return lctx
    }
  }

  /**
   * Return parent Context
   * @api public
   * @return {Context}
   */
  getParent() {
    return this.__parent
  }
  getRoot() {
    return this.__root
  }
  setParent(parent: ProxyType<Input>) {
    this.__parent = parent
  }
  setRoot(root: ProxyType<Input>) {
    this.__root = root
  }
  /**
   * checks wheater or not context has specific child context
   * it return `true` also if `ctx` is `this`;
   * @api public
   * @return {Boolean}
   */
  hasChild(ctx: unknown): boolean {
    if (Context.isProxy<Input>(ctx) && ctx.__parent) {
      return ctx.__parent == this.proxy || this.proxy == ctx
    } else {
      return false
    }
  }
  protected hasSubtree(ctx: unknown): boolean {
    if (Context.isProxy<Input>(ctx) && ctx.__root) {
      return ctx.__root == this.proxy || this.proxy == ctx
    } else {
      return false
    }
  }

  /**
   * Convert context to raw Object;
   * @api public
   * @param {Boolean} [clean]  `true` it need to clean object from referenced Types except Function and raw Object(js hash)
   * @return {Object}
   */
  toObject(): Input {
    const obj = {} as Input
    defaultsDeep(obj, this.ctx)
    if (this.__parent) {
      // TODO: взять весь объект по всей структуре дерева
      defaultsDeep(obj, this.__parent.toObject(false))
    }
    return obj
  }

  /**
   * Conterts context to JSON
   * @api public
   * @return {String}
   */
  toJSON(): string {
    // always cleaning the object
    return JSON.stringify(this.toObject())
  }

  /**
   * toString
   */
  toString(): string {
    return '[pipeline Context]'
  }
}
