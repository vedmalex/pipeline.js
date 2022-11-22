import { StageObject } from './utils/types';
export declare const ContextSymbol: unique symbol;
export declare const ProxySymbol: unique symbol;
export declare enum RESERVATIONS {
    prop = 0,
    func_this = 1,
    func_ctx = 2
}
export type ContextType<T> = IContextProxy<T> & T;
export interface IContextProxy<T> {
    getParent(): ContextType<T>;
    getRoot(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    setRoot(parent: ContextType<T>): void;
    toJSON(): string;
    toObject(clean?: boolean): T;
    toString(): string;
    fork<C extends StageObject>(config: C): ContextType<T & C>;
    get(path: string): any;
    [key: string]: any;
}
export declare class Context<T extends StageObject> implements IContextProxy<T> {
    static ensure<T extends StageObject>(_config?: Partial<T>): ContextType<T>;
    static isContext<T extends StageObject>(obj?: unknown): obj is IContextProxy<T>;
    protected ctx: T;
    protected proxy: any;
    protected __parent: ContextType<T>;
    protected __root: ContextType<T>;
    protected __stack?: string[];
    protected id: number;
    constructor(config: T);
    fork<C extends StageObject>(ctx: C): ContextType<T & C>;
    addChild<C>(child: ContextType<C>): ContextType<C>;
    get(path: string): any;
    addSubtree<C>(lctx: ContextType<C>): ContextType<C>;
    getParent(): ContextType<T>;
    getRoot(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    setRoot(root: ContextType<T>): void;
    hasChild<C>(ctx: ContextType<C>): boolean;
    hasSubtree<C>(ctx: ContextType<C>): boolean;
    toObject<T>(): T;
    toJSON(): string;
    toString(): string;
}
//# sourceMappingURL=context.d.ts.map