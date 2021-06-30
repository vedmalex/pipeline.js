export declare const ContextSymbol: unique symbol;
export declare const ProxySymbol: unique symbol;
export declare enum RESERVATIONS {
    prop = 0,
    func_this = 1,
    func_ctx = 2
}
export declare type Context<T extends object> = IContextProxy<T> & T;
export interface IContextProxy<T extends object> {
    getParent(): Context<T>;
    setParent(parent: Context<T>): void;
    toJSON(): string;
    toObject(clean?: boolean): T;
    toString(): string;
    fork<C extends T>(config: Partial<Context<C>>): Context<C>;
    get(path: string): any;
    [key: string]: any;
}
export declare class ContextFactory<T extends object> implements IContextProxy<T> {
    static ensure<T extends object>(_config?: Partial<T>): Context<T>;
    static isContext<T extends object>(obj?: any): obj is IContextProxy<T>;
    protected ctx: T;
    protected proxy: any;
    protected __parent: Context<T>;
    protected __stack?: string[];
    private constructor();
    fork<C extends T>(config: Partial<Context<C>>): Context<C>;
    get(path: string): any;
    getParent(): Context<T>;
    setParent(parent: Context<T>): void;
    protected hasChild<C extends T>(ctx: Context<C>): boolean;
    protected ensureIsChild<C extends T>(ctx: Context<C>): Context<C>;
    protected addChild<C extends T>(ctx: Context<C>): void;
    toObject<T extends object>(): T;
    toJSON(): string;
    toString(): string;
}
//# sourceMappingURL=context.d.ts.map