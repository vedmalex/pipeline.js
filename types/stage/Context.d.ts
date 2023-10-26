import { StageObject } from './types';
export declare const ContextSymbol: unique symbol;
export declare const OriginalObject: unique symbol;
export declare const ProxySymbol: unique symbol;
export interface ContextProxy<T> {
    fork<Config extends T>(config: Partial<Config>): ProxyType<T & Config>;
    get(path: keyof T): any;
    getParent(): ProxyType<T>;
    getRoot(): ProxyType<T>;
    setParent(parent: ProxyType<T>): void;
    setRoot(parent: ProxyType<T>): void;
    hasChild(ctx: object): boolean;
    toObject(clean?: boolean): T;
    toJSON(): string;
    toString(): string;
    get original(): T;
    [OriginalObject]?: true;
    [key: string | symbol | number]: any;
}
export type ProxyType<T> = ContextProxy<T> & T;
export type ContextType<T> = T extends StageObject ? ProxyType<T> : T;
export declare enum RESERVATIONS {
    prop = 0,
    func_this = 1,
    func_ctx = 2
}
export declare const RESERVED: {
    getParent: RESERVATIONS;
    getRoot: RESERVATIONS;
    setParent: RESERVATIONS;
    setRoot: RESERVATIONS;
    toString: RESERVATIONS;
    original: RESERVATIONS;
    __parent: RESERVATIONS;
    __root: RESERVATIONS;
    __stack: RESERVATIONS;
    hasChild: RESERVATIONS;
    hasSubtree: RESERVATIONS;
    ensure: RESERVATIONS;
    addChild: RESERVATIONS;
    addSubtree: RESERVATIONS;
    toJSON: RESERVATIONS;
    toObject: RESERVATIONS;
    fork: RESERVATIONS;
    get: RESERVATIONS;
    allContexts: RESERVATIONS;
};
export declare class Context<Input extends StageObject> implements ContextProxy<Input> {
    static ensure<Input>(_config?: Input): ProxyType<Input>;
    static create<Input>(input?: unknown): ProxyType<Input>;
    static isProxy<Input>(obj?: unknown): obj is ProxyType<Input>;
    protected ctx: Input extends StageObject ? Input : never;
    protected proxy: any;
    protected __parent: ProxyType<Input>;
    protected __root: ProxyType<Input>;
    protected __stack?: string[];
    protected id: number;
    [OriginalObject]?: true;
    get original(): Input extends object ? Input : never;
    protected constructor(config: Input extends StageObject ? Input : never);
    fork<Child extends Input>(ctx?: Partial<Child>): ProxyType<Input & Child>;
    protected addChild<Child extends Input>(child: ProxyType<Child>): void;
    get(path: keyof Input): any;
    protected addSubtree(lctx: object): unknown;
    getParent(): ProxyType<Input>;
    getRoot(): ProxyType<Input>;
    setParent(parent: ProxyType<Input>): void;
    setRoot(root: ProxyType<Input>): void;
    hasChild(ctx: unknown): boolean;
    protected hasSubtree(ctx: unknown): boolean;
    toObject(): Input;
    toJSON(): string;
    toString(): string;
}
