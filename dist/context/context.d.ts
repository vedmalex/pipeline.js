import { StageObject } from './utils/types';
import { ContextType } from './ContextType';
import { IContextProxy } from './IContextProxy';
import { OriginalObject } from '.';
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