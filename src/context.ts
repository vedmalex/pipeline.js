/**
 * Module dependency
 */
import { get, set, defaultsDeep } from 'lodash'
import { clone } from './util'

export const ContextSymbol = Symbol('Context')

/*!
 * List of reserver words for context.
 * Used to check wheater or not property is the Context-class property
 */

const RESERVED = {
  getParent: false,
  setParent: false,
  toString: false,
  __parent: true,
  __stack: true,
  hasChild: false,
  ensure: false,
  ensureIsChild: false,
  addChild: false,
  toJSON: false,
  toObject: false,
  fork: false,
  overwrite: false,
  get: false,
}

// добавить время обработки ctx на процессоре
// оптимизировать код, чтобы работал быстрее....
// может быть где-то убрать где-то добавить.
//контекст может быть массивом, не обязательно
// весь объект инициализировать сделать внутреннее хранилище, для неизменяемости ссылки....

export type Context<T extends object> = IContextProxy<T> & T

export interface IContextProxy<T extends object> {
  getParent()
  setParent(parent: Context<T>)
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
  public static ensure<T extends object>(config: Partial<T>): Context<T> {
    if (ContextFactory.isContext<T>(config)) {
      return config as unknown as Context<T>
    } else {
      return new ContextFactory(config) as unknown as Context<T>
    }
  }
  public static isContext<T extends object>(obj: any): obj is IContextProxy<T> {
    return !!obj[ContextSymbol]
  }
  protected ctx: T
  protected __parent: Context<T>
  protected __stack: string[]

  private constructor(config: T) {
    this.ctx = config
    const res = new Proxy(this, {
      get(target: ContextFactory<T>, key: string | symbol, _proxy) {
        if (key == ContextSymbol) return true

        if (!RESERVED.hasOwnProperty(key)) {
          return target.ctx[key]
        } else {
          return target[key]
        }
      },
      set(target: ContextFactory<T>, key: string | symbol, value) {
        if (!RESERVED.hasOwnProperty(key)) {
          target.ctx[key] = value
          return true
        } else if (!RESERVED[key]) {
          return false
        } else {
          target[key] = value
          return true
        }
      },
      deleteProperty(target: ContextFactory<T>, key: string | symbol) {
        if (!RESERVED.hasOwnProperty(key)) {
          return delete target.ctx[key]
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
        ctx.__parent == (this as unknown as Context<C>) ||
        (this as unknown as Context<C>) == ctx
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
      child.setParent(this as unknown as Context<C>)
    }
  }

  /**
   * Convert context to raw Object;
   * @api public
   * @param {Boolean} [clean]  `true` it need to clean object from referenced Types except Function and raw Object(js hash)
   * @return {Object}
   */
  toObject<T extends object>(clean?: boolean): T {
    const obj = {} as T
    for (var p of Object.getOwnPropertyNames(this)) {
      if (!RESERVED.hasOwnProperty(p)) {
        obj[p] = clone(this[p], clean)
      }
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
    return JSON.stringify(this.toObject(true))
  }

  /**
   * toString
   */
  toString(): string {
    return '[pipeline Context]'
  }
}
