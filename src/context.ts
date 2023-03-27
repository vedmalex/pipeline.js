/**
 * Module dependency
 */
import { defaultsDeep, get, set } from 'lodash'
import { StageObject } from './utils/types/types'

export const ContextSymbol = Symbol('Context')
export const OriginalObject = Symbol('OriginalObject')
export const ProxySymbol = Symbol('Handler')

/*!
 * List of reserver words for context.
 * Used to check wheater or not property is the Context-class property
 */

export enum RESERVATIONS {
  prop,
  func_this,
  func_ctx,
}
const RESERVED: Record<string, RESERVATIONS> = {
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

// добавить время обработки ctx на процессоре
// оптимизировать код, чтобы работал быстрее....
// может быть где-то убрать где-то добавить.
// контекст может быть массивом, не обязательно
// весь объект инициализировать сделать внутреннее хранилище, для неизменяемости ссылки....

export type ContextType<T> = T extends StageObject ? IContextProxy<T> & T : never

export interface IContextProxy<T extends StageObject> {
  getParent(): ContextType<T>
  getRoot(): ContextType<T>
  setParent(parent: ContextType<T>): void
  setRoot(parent: ContextType<T>): void
  toJSON(): string
  toObject(clean?: boolean): T
  toString(): string
  fork<C extends StageObject>(config?: C): ContextType<T & C>
  get(path: keyof T): any
  get original(): T
  [OriginalObject]?: true
  [key: string | symbol | number]: any
}

var count = 0
var allContexts: Record<string, Context<any>> = {}
/**
 *  The **Context** itself
 *  @param {Object} config The object that is the source for the **Context**.
 */
export class Context<T extends StageObject> implements IContextProxy<T> {
  public static ensure<T extends StageObject>(_config?: T): ContextType<T> {
    if (Context.isContext<T>(_config)) {
      return _config
    } else {
      if (typeof _config === 'object' && _config !== null) {
        return this.create(_config)
      } else {
        return this.create()
      }
    }
  }

  public static create<T extends StageObject>(input?: object): ContextType<T> {
    return new Context<T>((input ?? {}) as T) as unknown as ContextType<T>
  }

  public static isContext<T extends StageObject>(obj?: unknown): obj is ContextType<T> {
    return typeof obj == 'object' && obj !== null ? obj[ContextSymbol] : false
  }

  protected ctx: T
  protected proxy: any
  protected __parent!: ContextType<T>
  protected __root!: ContextType<T>
  protected __stack?: string[]
  protected id: number;
  [OriginalObject]?: true
  get original() {
    return this.ctx
  }

  protected constructor(config: object) {
    this.ctx = config as T
    this.id = count++
    allContexts[this.id] = this
    const res = new Proxy(this, {
      get(target: Context<T>, key: string | symbol | number, _proxy: any): any {
        if (key == ContextSymbol) return true
        if (key == ProxySymbol) return _proxy
        if (key == 'allContexts') return allContexts

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
          } else return target[key] // just props
        }
      },
      set(target: Context<T>, key: keyof typeof RESERVED | string | symbol, value): boolean {
        if (!(key in RESERVED)) {
          target.ctx[key] = value
          return true
        } else if (
          typeof key == 'string' &&
          key in RESERVED &&
          RESERVED[key as keyof typeof RESERVED] != RESERVATIONS.prop
        ) {
          return false
        } else {
          target[key] = value
          return true
        }
      },
      deleteProperty(target: Context<T>, key: string | symbol) {
        if (!(key in RESERVED)) {
          return delete target.ctx[key]
        } else {
          return false
        }
      },
      has(target: Context<T>, key: string | symbol) {
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
      ownKeys(target: Context<T>) {
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
  fork<C extends StageObject>(ctx?: C): ContextType<T & C> {
    var child = Context.ensure(ctx)
    this.addChild(child)
    return child as ContextType<T & C>
  }

  addChild(child: object): unknown {
    if (Context.isContext(child)) {
      if (!this.hasChild(child)) {
        child.setParent(this.proxy)
      }
      return child
    } else return child
  }

  /**
   * Same but different as a fork. it make possible get piece of context as context;
   * @param path String path to context object that need to be a Context instance
   * @return {Context} | {Primitive type}
   */
  get(path: keyof T): any {
    var root = get(this.ctx, path) as any
    if (root instanceof Object) {
      var result = root
      if (!Context.isContext(result)) {
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

  addSubtree(lctx: object): unknown {
    if (Context.isContext(lctx)) {
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
  setParent(parent: ContextType<T>) {
    this.__parent = parent
  }
  setRoot(root: ContextType<T>) {
    this.__root = root
  }
  /**
   * checks wheater or not context has specific child context
   * it return `true` also if `ctx` is `this`;
   * @api public
   * @return {Boolean}
   */
  hasChild(ctx: object): boolean {
    if (Context.isContext(ctx) && ctx.__parent) {
      return ctx.__parent == this.proxy || this.proxy == ctx
    } else {
      return false
    }
  }
  hasSubtree(ctx: object): boolean {
    if (Context.isContext(ctx) && ctx.__root) {
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
  toObject(): T {
    const obj = {} as T
    defaultsDeep(obj, this.ctx)
    if (this.__parent) {
      // TODO: взять весь объект по всей структуре дерева
      defaultsDeep(obj, this.__parent.toObject())
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
