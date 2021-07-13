export declare const ContextSymbol: unique symbol;
export declare const ProxySymbol: unique symbol;
export declare enum RESERVATIONS {
    prop = 0,
    func_this = 1,
    func_ctx = 2
}
export declare type ContextType<T extends object> = IContextProxy<T> & T;
export interface IContextProxy<T extends object> {
    getParent(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    toJSON(): string;
    toObject(clean?: boolean): T;
    toString(): string;
    fork<C extends T>(config: Partial<ContextType<C>>): ContextType<C>;
    get(path: string): any;
    [key: string]: any;
}
export declare class Context<T extends object> implements IContextProxy<T> {
    static ensure<T extends object>(_config?: Partial<T>): ContextType<T>;
    static isContext<T extends object>(obj?: any): obj is IContextProxy<T>;
    protected ctx: T;
    protected proxy: any;
    protected __parent: ContextType<T>;
    protected __stack?: string[];
    constructor(config: T);
    fork<C extends T>(config: Partial<ContextType<C>>): ContextType<C>;
    get(path: string): any;
    getParent(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    protected hasChild<C extends T>(ctx: ContextType<C>): boolean;
    protected ensureIsChild<C extends T>(ctx: ContextType<C>): ContextType<C>;
    protected addChild<C extends T>(ctx: ContextType<C>): void;
    toObject<T extends object>(): T;
    toJSON(): string;
    toString(): string;
}
//# sourceMappingURL=context.d.ts.map