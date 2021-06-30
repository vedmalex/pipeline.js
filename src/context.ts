/**
 * Module dependency
 */
import { get, set, defaultsDeep } from 'lodash'

export const ContextSymbol = Symbol('Context')
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
  setParent: RESERVATIONS.func_ctx,
  toString: RESERVATIONS.func_ctx,
  __parent: RESERVATIONS.prop,
  __stack: RESERVATIONS.prop,
  hasChild: RESERVATIONS.func_ctx,
  ensure: RESERVATIONS.func_ctx,
  ensureIsChild: RESERVATIONS.func_ctx,
  addChild: RESERVATIONS.func_ctx,
  toJSON: RESERVATIONS.func_ctx,
  toObject: RESERVATIONS.func_ctx,
  fork: RESERVATIONS.func_this,
  overwrite: RESERVATIONS.func_ctx,
  get: RESERVATIONS.func_this,
}

// добавить время обработки ctx на процессоре
// оптимизировать код, чтобы работал быстрее....
// может быть где-то убрать где-то добавить.
//контекст может быть массивом, не обязательно
// весь объект инициализировать сделать внутреннее хранилище, для неизменяемости ссылки....

export type Context<T extends object> = IContextProxy<T> & T

export interface IContextProxy<T extends object> {
  getParent(): Context<T>
  setParent(parent: Context<T>): void
  toJSON(): string
  toObject(clean?: boolean): T
  toString(): string
  fork<C extends T>(config: Partial<Context<C>>): Context<C>
  get(path: string): any
  [key: string]: any
}

/**
 *  The **Context** itself
 *  @param {Object} config The object that is the source for the **Context**.
 */
export class ContextFactory<T extends object> implements IContextProxy<T> {
  public static ensure<T extends object>(_config?: Partial<T>): Context<T> {
    if (ContextFactory.isContext<T>(_config)) {
      return _config as unknown as Context<T>
    } else {
      return new ContextFactory(_config ?? {}) as unknown as Context<T>
    }
  }
  public static isContext<T extends object>(
    obj?: any,
  ): obj is IContextProxy<T> {
    return obj ? obj[ContextSymbol] : false
  }
  protected ctx: T
  protected proxy: any
  protected __parent!: Context<T>
  protected __stack?: string[]

  private constructor(config: T) {
    this.ctx = config

    const res = new Proxy(this, {
      get(target: ContextFactory<T>, key: string | symbol, _proxy: any): any {
        if (key == ContextSymbol) return true
        if (key == ProxySymbol) return _proxy

        if (!RESERVED.hasOwnProperty(key)) {
          return (target.ctx as any)[key]
        } else {
          if (RESERVED[key as keyof typeof RESERVED] == RESERVATIONS.func_ctx) {
            return (target as any)[key].bind(target)
          }
          if (
            RESERVED[key as keyof typeof RESERVED] == RESERVATIONS.func_this
          ) {
            return (target as any)[key]
          } else return (target as any)[key] // just props
        }
      },
      set(
        target: ContextFactory<T>,
        key: keyof typeof RESERVED | string | symbol,
        value,
      ): boolean {
        if (!RESERVED.hasOwnProperty(key)) {
          ;(target.ctx as any)[key] = value
          return true
        } else if (
          typeof key == 'string' &&
          RESERVED.hasOwnProperty(key) &&
          RESERVED[key as keyof typeof RESERVED] != RESERVATIONS.prop
        ) {
          return false
        } else {
          ;(target as any)[key] = value
          return true
        }
      },
      deleteProperty(target: ContextFactory<T>, key: string | symbol) {
        if (!RESERVED.hasOwnProperty(key)) {
          return delete target.ctx[key as keyof T]
        } else {
          return false
        }
      },
      has(target: ContextFactory<T>, key: string | symbol) {
        if (!RESERVED.hasOwnProperty(key)) {
          return key in target.ctx
        } else {
          return false
        }
      },
      ownKeys(target: ContextFactory<T>) {
        return Reflect.ownKeys(target.ctx)
      },
    })

    this.proxy = res

    return res
  }

  /**
   * Makes fork of current context and add it to current as a child context
   * @api public
   * @param {Object|ContextFactory} [config] new properties that must exists in new fork
   * @retrun {Context}
   */
  fork<C extends T>(config: Partial<Context<C>>): Context<C> {
    var child = ContextFactory.ensure<C>(config)
    this.addChild(child)
    defaultsDeep(child, this.toObject())
    return child
  }

  /**
   * Same but different as a fork. it make possible get piece of context as context;
   * @param path String path to context object that need to be a Context instance
   * @return {ContextFactory} | {Primitive type}
   */
  get(path: string): any {
    var root = get(this, path)
    if (root instanceof Object) {
      var result = root
      if (!ContextFactory.isContext(result)) {
        result = this.ensureIsChild(result)
        set(this, path, result)
      }
      return result
    }
  }

  /**
   * Return parent Context
   * @api public
   * @return {ContextFactory}
   */
  getParent() {
    return this.__parent
  }
  setParent(parent: Context<T>) {
    this.__parent = parent
  }
  /**
   * checks wheater or not context has specific child context
   * it return `true` also if `ctx` is `this`;
   * @api public
   * @return {Boolean}
   */
  protected hasChild<C extends T>(ctx: Context<C>): boolean {
    if (ContextFactory.isContext(ctx) && ctx.__parent) {
      return (
        ctx.__parent == (this.proxy as unknown as Context<C>) ||
        (this.proxy as unknown as Context<C>) == ctx
      )
    } else {
      return false
    }
  }

  /**
   * Ensures that the context is the child of current context<T>, and returns right context
   * @api public
   * @param {Object|ContextFactory} ctx
   * @return {ContextFactory}
   */
  protected ensureIsChild<C extends T>(ctx: Context<C>): Context<C> {
    var lctx = ContextFactory.ensure<C>(ctx)
    this.addChild<C>(lctx)
    return lctx as Context<C>
  }

  /**
   * Add child Context to current
   * !Note! All children contexts has parent list of error. This allow to be sure that any fork
   * @api protected
   * @param {ContextFactory} ctx new child context
   */
  protected addChild<C extends T>(ctx: Context<C>) {
    if (!this.hasChild<C>(ctx)) {
      var child = ContextFactory.ensure<C>(ctx)
      child.setParent(this.proxy as unknown as Context<C>)
    }
  }

  /**
   * Convert context to raw Object;
   * @api public
   * @param {Boolean} [clean]  `true` it need to clean object from referenced Types except Function and raw Object(js hash)
   * @return {Object}
   */
  toObject<T extends object>(): T {
    const obj = {} as T
    defaultsDeep(obj, this.ctx)
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
