import { StageObject } from '../types';
export declare const ContextSymbol: unique symbol;
export declare const OriginalObject: unique symbol;
export declare const ProxySymbol: unique symbol;
export interface IContextProxy<T extends StageObject> {
    getParent(): ContextType<T>;
    getRoot(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    setRoot(parent: ContextType<T>): void;
    toJSON(): string;
    toObject(clean?: boolean): T;
    toString(): string;
    fork<C extends StageObject>(config?: C): ContextType<T & C>;
    get(path: keyof T): any;
    get original(): T;
    [OriginalObject]?: true;
    [key: string | symbol | number]: any;
}
export type ContextType<T> = T extends StageObject ? IContextProxy<T> & T : never;
export declare enum RESERVATIONS {
    prop = 0,
    func_this = 1,
    func_ctx = 2
}
export declare const RESERVED: Record<string, RESERVATIONS>;
export declare class Context<T extends StageObject> implements IContextProxy<T> {
    static ensure<T extends StageObject>(_config?: T): ContextType<T>;
    static create<T extends StageObject>(input?: object): ContextType<T>;
    static isContext<T extends StageObject>(obj?: unknown): obj is ContextType<T>;
    protected ctx: T;
    protected proxy: any;
    protected __parent: ContextType<T>;
    protected __root: ContextType<T>;
    protected __stack?: string[];
    protected id: number;
    [OriginalObject]?: true;
    get original(): T;
    protected constructor(config: object);
    fork<C extends StageObject>(ctx?: C): ContextType<T & C>;
    addChild(child: object): unknown;
    get(path: keyof T): any;
    addSubtree(lctx: object): unknown;
    getParent(): ContextType<T>;
    getRoot(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    setRoot(root: ContextType<T>): void;
    hasChild(ctx: object): boolean;
    hasSubtree(ctx: object): boolean;
    toObject(): T;
    toJSON(): string;
    toString(): string;
}
//# sourceMappingURL=Context.d.ts.map