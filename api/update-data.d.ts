type RequestLike = {
    method?: string;
    [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array | string>;
};
type ResponseLike = {
    statusCode: number;
    getHeader?(name: string): string | number | string[] | undefined;
    setHeader(name: string, value: string): void;
    end(body?: string): void;
};
export default function handler(req: RequestLike, res: ResponseLike): Promise<void>;
export {};
